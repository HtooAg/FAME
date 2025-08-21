import { NextRequest, NextResponse } from "next/server";

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	sanitizedData?: any;
}

export interface ValidationOptions {
	requireAuth?: boolean;
	rateLimitKey?: string;
	maxRequestSize?: number;
	allowedMethods?: string[];
}

/**
 * Server-safe validation middleware that doesn't use File API
 */
export class ServerSafeValidationMiddleware {
	private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
	private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
	private static readonly MAX_REQUESTS_PER_WINDOW = 100;

	// Simple in-memory rate limiting (in production, use Redis)
	private static rateLimitStore = new Map<
		string,
		{ count: number; resetTime: number }
	>();

	/**
	 * Validate incoming API request without File API dependencies
	 */
	static async validateRequest(
		request: NextRequest,
		validationType: string,
		options: ValidationOptions = {}
	): Promise<{
		isValid: boolean;
		errors: string[];
		data?: any;
		response?: NextResponse;
	}> {
		try {
			// Method validation
			if (
				options.allowedMethods &&
				!options.allowedMethods.includes(request.method)
			) {
				return {
					isValid: false,
					errors: [`Method ${request.method} not allowed`],
					response: NextResponse.json(
						{ success: false, error: "Method not allowed" },
						{ status: 405 }
					),
				};
			}

			// Rate limiting
			if (options.rateLimitKey) {
				const rateLimitResult = this.checkRateLimit(
					options.rateLimitKey
				);
				if (!rateLimitResult.allowed) {
					return {
						isValid: false,
						errors: ["Rate limit exceeded"],
						response: NextResponse.json(
							{
								success: false,
								error: "Too many requests",
								retryAfter: rateLimitResult.retryAfter,
							},
							{ status: 429 }
						),
					};
				}
			}

			// Content-Type validation for JSON requests
			if (["POST", "PUT", "PATCH"].includes(request.method)) {
				const contentType = request.headers.get("content-type");
				if (!contentType?.includes("application/json")) {
					return {
						isValid: false,
						errors: ["Content-Type must be application/json"],
						response: NextResponse.json(
							{ success: false, error: "Invalid Content-Type" },
							{ status: 400 }
						),
					};
				}
			}

			// Request size validation
			const contentLength = request.headers.get("content-length");
			const maxSize = options.maxRequestSize || this.DEFAULT_MAX_SIZE;
			if (contentLength && parseInt(contentLength) > maxSize) {
				return {
					isValid: false,
					errors: [`Request size exceeds ${maxSize} bytes`],
					response: NextResponse.json(
						{ success: false, error: "Request too large" },
						{ status: 413 }
					),
				};
			}

			// Parse request body
			let data: any;
			try {
				data = await request.json();
			} catch (error) {
				return {
					isValid: false,
					errors: ["Invalid JSON in request body"],
					response: NextResponse.json(
						{ success: false, error: "Invalid request format" },
						{ status: 400 }
					),
				};
			}

			// Basic validation - just check if data exists
			if (!data || typeof data !== "object") {
				return {
					isValid: false,
					errors: ["Request data must be an object"],
					response: NextResponse.json(
						{ success: false, error: "Invalid request data" },
						{ status: 400 }
					),
				};
			}

			return {
				isValid: true,
				errors: [],
				data: data,
			};
		} catch (error) {
			console.error("Validation middleware error:", error);
			return {
				isValid: false,
				errors: ["Internal validation error"],
				response: NextResponse.json(
					{ success: false, error: "Internal server error" },
					{ status: 500 }
				),
			};
		}
	}

	/**
	 * Rate limiting check
	 */
	private static checkRateLimit(key: string): {
		allowed: boolean;
		retryAfter?: number;
	} {
		const now = Date.now();
		const record = this.rateLimitStore.get(key);

		if (!record || now > record.resetTime) {
			// Reset or create new record
			this.rateLimitStore.set(key, {
				count: 1,
				resetTime: now + this.RATE_LIMIT_WINDOW,
			});
			return { allowed: true };
		}

		if (record.count >= this.MAX_REQUESTS_PER_WINDOW) {
			return {
				allowed: false,
				retryAfter: Math.ceil((record.resetTime - now) / 1000),
			};
		}

		record.count++;
		return { allowed: true };
	}

	/**
	 * Extract client IP for rate limiting
	 */
	static getClientIP(request: NextRequest): string {
		// Check various headers for the real IP
		const forwarded = request.headers.get("x-forwarded-for");
		const realIP = request.headers.get("x-real-ip");
		const cfIP = request.headers.get("cf-connecting-ip");

		if (forwarded) {
			return forwarded.split(",")[0].trim();
		}

		if (realIP) {
			return realIP;
		}

		if (cfIP) {
			return cfIP;
		}

		// Fallback to connection IP
		return request.ip || "unknown";
	}

	/**
	 * Create standardized error response
	 */
	static createErrorResponse(
		message: string,
		status: number = 400,
		details?: string[]
	): NextResponse {
		return NextResponse.json(
			{
				success: false,
				error: message,
				details: details || [],
				timestamp: new Date().toISOString(),
			},
			{ status }
		);
	}

	/**
	 * Create standardized success response
	 */
	static createSuccessResponse(
		data: any,
		message: string = "Success"
	): NextResponse {
		return NextResponse.json({
			success: true,
			message,
			data,
			timestamp: new Date().toISOString(),
		});
	}
}

/**
 * Server-safe artist validator that doesn't use File API
 */
export class ServerSafeArtistValidator {
	/**
	 * Basic artist data validation without File API dependencies
	 */
	static validateArtistDataWithSchema(data: any): ValidationResult {
		const errors: string[] = [];

		// Basic required field validation
		if (!data.artistName || typeof data.artistName !== "string") {
			errors.push("Artist name is required");
		}

		if (!data.email || typeof data.email !== "string") {
			errors.push("Email is required");
		}

		if (
			!data.performanceDuration ||
			typeof data.performanceDuration !== "number"
		) {
			errors.push("Performance duration is required");
		}

		return {
			isValid: errors.length === 0,
			errors,
			sanitizedData: errors.length === 0 ? data : undefined,
		};
	}

	/**
	 * Batch validation for multiple artists
	 */
	static validateBatchArtistData(artists: any[]): {
		validArtists: any[];
		errors: string[];
		warnings?: string[];
	} {
		const validArtists: any[] = [];
		const errors: string[] = [];

		artists.forEach((artist, index) => {
			const validation = this.validateArtistDataWithSchema(artist);
			if (validation.isValid && validation.sanitizedData) {
				validArtists.push(validation.sanitizedData);
			} else {
				errors.push(
					`Artist ${index + 1}: ${validation.errors.join(", ")}`
				);
			}
		});

		return { validArtists, errors };
	}

	/**
	 * Check profile completeness
	 */
	static checkProfileCompleteness(data: any): {
		completeness: number;
		missingFields: string[];
		recommendations: string[];
	} {
		const requiredFields = ["artistName", "email", "performanceDuration"];

		const missingFields: string[] = [];
		let completedFields = 0;

		requiredFields.forEach((field) => {
			if (data[field] && data[field] !== "") {
				completedFields++;
			} else {
				missingFields.push(field);
			}
		});

		const completeness = Math.round(
			(completedFields / requiredFields.length) * 100
		);

		return {
			completeness,
			missingFields,
			recommendations: missingFields.map(
				(field) => `Add ${field} to complete profile`
			),
		};
	}
}

/**
 * Server-safe data integrity checker
 */
export class ServerSafeDataIntegrityChecker {
	static checkArtistProfileIntegrity(data: any): {
		isValid: boolean;
		score: number;
		issues: any[];
		warnings: any[];
	} {
		const issues: any[] = [];
		const warnings: any[] = [];

		// Basic integrity checks without File API
		if (!data.artistName) {
			issues.push({
				field: "artistName",
				type: "missing_required",
				message: "Artist name is required",
				severity: "high",
			});
		}

		if (!data.email) {
			issues.push({
				field: "email",
				type: "missing_required",
				message: "Email is required",
				severity: "high",
			});
		}

		const score = Math.max(
			0,
			100 - issues.length * 20 - warnings.length * 5
		);

		return {
			isValid: issues.length === 0,
			score,
			issues,
			warnings,
		};
	}

	static checkBatchIntegrity(profiles: any[]): {
		duplicateEmails: string[];
		duplicateArtistNames: string[];
		duplicatePhones: string[];
		conflictingPerformanceDates: any[];
	} {
		const emails = profiles
			.map((p) => p.email?.toLowerCase())
			.filter(Boolean);
		const artistNames = profiles
			.map((p) => p.artistName?.toLowerCase())
			.filter(Boolean);
		const phones = profiles
			.map((p) => p.phone?.replace(/[\s\-\(\)]/g, ""))
			.filter(Boolean);

		const duplicateEmails = emails.filter(
			(email, index) => emails.indexOf(email) !== index
		);
		const duplicateArtistNames = artistNames.filter(
			(name, index) => artistNames.indexOf(name) !== index
		);
		const duplicatePhones = phones.filter(
			(phone, index) => phones.indexOf(phone) !== index
		);

		return {
			duplicateEmails: [...new Set(duplicateEmails)],
			duplicateArtistNames: [...new Set(duplicateArtistNames)],
			duplicatePhones: [...new Set(duplicatePhones)],
			conflictingPerformanceDates: [],
		};
	}
}
