import jwt from "jsonwebtoken";
import { AuthenticationError } from "../storage/errors";

/**
 * JWT security utilities
 */

export interface JWTPayload {
	userId: string;
	email: string;
	role: string;
	eventId?: string;
	iat?: number;
	exp?: number;
}

export class JWTSecurity {
	private static readonly JWT_SECRET =
		process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
	private static readonly TOKEN_EXPIRY = "7d"; // 7 days
	private static readonly REFRESH_THRESHOLD = 24 * 60 * 60; // 24 hours in seconds

	/**
	 * Generate a secure JWT token
	 */
	static generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
		// Validate JWT secret strength
		if (this.JWT_SECRET.length < 32) {
			console.warn(
				"JWT_SECRET is too short. Use at least 32 characters for production."
			);
		}

		if (this.JWT_SECRET === "dev-secret-do-not-use-in-prod") {
			console.warn(
				"Using default JWT secret. Set JWT_SECRET environment variable for production."
			);
		}

		const tokenPayload: JWTPayload = {
			...payload,
			iat: Math.floor(Date.now() / 1000),
		};

		return jwt.sign(tokenPayload, this.JWT_SECRET, {
			expiresIn: this.TOKEN_EXPIRY,
			issuer: "fame-app",
			audience: "fame-users",
		});
	}

	/**
	 * Verify and decode JWT token
	 */
	static verifyToken(token: string): JWTPayload {
		try {
			const decoded = jwt.verify(token, this.JWT_SECRET, {
				issuer: "fame-app",
				audience: "fame-users",
			}) as JWTPayload;

			return decoded;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new AuthenticationError(
					"Token has expired",
					"INVALID_CREDENTIALS",
					401
				);
			} else if (error instanceof jwt.JsonWebTokenError) {
				throw new AuthenticationError(
					"Invalid token",
					"INVALID_CREDENTIALS",
					401
				);
			} else {
				throw new AuthenticationError(
					"Token verification failed",
					"INVALID_CREDENTIALS",
					401
				);
			}
		}
	}

	/**
	 * Check if token needs refresh (within 24 hours of expiry)
	 */
	static needsRefresh(token: string): boolean {
		try {
			const decoded = jwt.decode(token) as JWTPayload;
			if (!decoded || !decoded.exp) {
				return true;
			}

			const now = Math.floor(Date.now() / 1000);
			const timeUntilExpiry = decoded.exp - now;

			return timeUntilExpiry < this.REFRESH_THRESHOLD;
		} catch {
			return true;
		}
	}

	/**
	 * Refresh token if needed
	 */
	static refreshToken(token: string): string | null {
		try {
			const decoded = this.verifyToken(token);

			if (this.needsRefresh(token)) {
				// Generate new token with same payload (excluding iat/exp)
				const { iat, exp, ...payload } = decoded;
				return this.generateToken(payload);
			}

			return null; // No refresh needed
		} catch {
			return null; // Invalid token, can't refresh
		}
	}

	/**
	 * Extract token from Authorization header or cookie
	 */
	static extractToken(
		authHeader?: string,
		cookieValue?: string
	): string | null {
		// Try Authorization header first
		if (authHeader && authHeader.startsWith("Bearer ")) {
			return authHeader.substring(7);
		}

		// Fallback to cookie
		if (cookieValue) {
			return cookieValue;
		}

		return null;
	}

	/**
	 * Create secure cookie options
	 */
	static getCookieOptions(
		isProduction: boolean = process.env.NODE_ENV === "production"
	) {
		return {
			httpOnly: true,
			secure: isProduction,
			sameSite: "strict" as const,
			maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
			path: "/",
		};
	}

	/**
	 * Validate JWT secret strength
	 */
	static validateSecretStrength(): { valid: boolean; warnings: string[] } {
		const warnings: string[] = [];
		let valid = true;

		if (this.JWT_SECRET === "dev-secret-do-not-use-in-prod") {
			warnings.push(
				"Using default JWT secret - set JWT_SECRET environment variable"
			);
			valid = false;
		}

		if (this.JWT_SECRET.length < 32) {
			warnings.push(
				"JWT secret is too short - use at least 32 characters"
			);
			valid = false;
		}

		if (!/[A-Z]/.test(this.JWT_SECRET)) {
			warnings.push("JWT secret should contain uppercase letters");
		}

		if (!/[a-z]/.test(this.JWT_SECRET)) {
			warnings.push("JWT secret should contain lowercase letters");
		}

		if (!/[0-9]/.test(this.JWT_SECRET)) {
			warnings.push("JWT secret should contain numbers");
		}

		if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.JWT_SECRET)) {
			warnings.push("JWT secret should contain special characters");
		}

		return { valid, warnings };
	}
}

/**
 * Security headers utility
 */
export class SecurityHeaders {
	/**
	 * Get security headers for API responses
	 */
	static getSecurityHeaders(): Record<string, string> {
		return {
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options": "DENY",
			"X-XSS-Protection": "1; mode=block",
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"Content-Security-Policy":
				"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
			"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		};
	}

	/**
	 * Apply security headers to response
	 */
	static applyHeaders(response: Response): Response {
		const headers = this.getSecurityHeaders();

		for (const [key, value] of Object.entries(headers)) {
			response.headers.set(key, value);
		}

		return response;
	}
}
