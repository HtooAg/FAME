import { ValidationError } from "../storage/errors";

/**
 * Input validation utilities for security hardening
 */

export interface ValidationRule {
	field: string;
	required?: boolean;
	type?: "string" | "email" | "number" | "boolean";
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	allowedValues?: any[];
	sanitize?: boolean;
}

export class InputValidator {
	/**
	 * Validate and sanitize user input data
	 */
	static validateUserData(data: any, rules: ValidationRule[]): any {
		const validated: any = {};
		const errors: string[] = [];

		for (const rule of rules) {
			const value = data[rule.field];

			// Check required fields
			if (
				rule.required &&
				(value === undefined || value === null || value === "")
			) {
				errors.push(`${rule.field} is required`);
				continue;
			}

			// Skip validation for optional empty fields
			if (
				!rule.required &&
				(value === undefined || value === null || value === "")
			) {
				continue;
			}

			// Type validation
			if (rule.type) {
				switch (rule.type) {
					case "string":
						if (typeof value !== "string") {
							errors.push(`${rule.field} must be a string`);
							continue;
						}
						break;
					case "email":
						if (
							typeof value !== "string" ||
							!this.isValidEmail(value)
						) {
							errors.push(
								`${rule.field} must be a valid email address`
							);
							continue;
						}
						break;
					case "number":
						if (
							typeof value !== "number" &&
							!this.isNumeric(value)
						) {
							errors.push(`${rule.field} must be a number`);
							continue;
						}
						break;
					case "boolean":
						if (typeof value !== "boolean") {
							errors.push(`${rule.field} must be a boolean`);
							continue;
						}
						break;
				}
			}

			// Length validation
			if (
				rule.minLength &&
				typeof value === "string" &&
				value.length < rule.minLength
			) {
				errors.push(
					`${rule.field} must be at least ${rule.minLength} characters long`
				);
				continue;
			}

			if (
				rule.maxLength &&
				typeof value === "string" &&
				value.length > rule.maxLength
			) {
				errors.push(
					`${rule.field} must be no more than ${rule.maxLength} characters long`
				);
				continue;
			}

			// Pattern validation
			if (
				rule.pattern &&
				typeof value === "string" &&
				!rule.pattern.test(value)
			) {
				errors.push(`${rule.field} format is invalid`);
				continue;
			}

			// Allowed values validation
			if (rule.allowedValues && !rule.allowedValues.includes(value)) {
				errors.push(
					`${rule.field} must be one of: ${rule.allowedValues.join(
						", "
					)}`
				);
				continue;
			}

			// Sanitize if requested
			let sanitizedValue = value;
			if (rule.sanitize && typeof value === "string") {
				sanitizedValue = this.sanitizeString(value);
			}

			validated[rule.field] = sanitizedValue;
		}

		if (errors.length > 0) {
			throw new ValidationError(
				`Validation failed: ${errors.join(", ")}`,
				undefined,
				data
			);
		}

		return validated;
	}

	/**
	 * Validate email format
	 */
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
	}

	/**
	 * Check if value is numeric
	 */
	static isNumeric(value: any): boolean {
		return !isNaN(parseFloat(value)) && isFinite(value);
	}

	/**
	 * Sanitize string input to prevent XSS and injection attacks
	 */
	static sanitizeString(input: string): string {
		return input
			.trim()
			.replace(/[<>]/g, "") // Remove potential HTML tags
			.replace(/['"]/g, "") // Remove quotes that could break SQL/JS
			.replace(/[\\]/g, "") // Remove backslashes
			.substring(0, 1000); // Limit length to prevent DoS
	}

	/**
	 * Validate password strength
	 */
	static validatePassword(password: string): {
		valid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (password.length < 8) {
			errors.push("Password must be at least 8 characters long");
		}

		if (password.length > 128) {
			errors.push("Password must be no more than 128 characters long");
		}

		if (!/[a-z]/.test(password)) {
			errors.push("Password must contain at least one lowercase letter");
		}

		if (!/[A-Z]/.test(password)) {
			errors.push("Password must contain at least one uppercase letter");
		}

		if (!/[0-9]/.test(password)) {
			errors.push("Password must contain at least one number");
		}

		if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
			errors.push("Password must contain at least one special character");
		}

		// Check for common weak passwords
		const commonPasswords = [
			"password",
			"123456",
			"123456789",
			"qwerty",
			"abc123",
			"password123",
			"admin",
			"letmein",
			"welcome",
			"monkey",
		];

		if (commonPasswords.includes(password.toLowerCase())) {
			errors.push("Password is too common and easily guessable");
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validate user registration data
	 */
	static validateRegistrationData(data: any): any {
		const rules: ValidationRule[] = [
			{
				field: "name",
				required: true,
				type: "string",
				minLength: 2,
				maxLength: 100,
				sanitize: true,
			},
			{
				field: "email",
				required: true,
				type: "email",
				maxLength: 254,
			},
			{
				field: "password",
				required: true,
				type: "string",
				minLength: 8,
				maxLength: 128,
			},
			{
				field: "eventName",
				required: false,
				type: "string",
				maxLength: 200,
				sanitize: true,
			},
		];

		const validated = this.validateUserData(data, rules);

		// Additional password validation
		const passwordValidation = this.validatePassword(validated.password);
		if (!passwordValidation.valid) {
			throw new ValidationError(
				`Password validation failed: ${passwordValidation.errors.join(
					", "
				)}`,
				"password",
				validated.password
			);
		}

		return validated;
	}

	/**
	 * Validate login data
	 */
	static validateLoginData(data: any): any {
		const rules: ValidationRule[] = [
			{
				field: "email",
				required: true,
				type: "email",
				maxLength: 254,
			},
			{
				field: "password",
				required: true,
				type: "string",
				minLength: 1,
				maxLength: 128,
			},
		];

		return this.validateUserData(data, rules);
	}
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
	private static attempts = new Map<
		string,
		{ count: number; resetTime: number }
	>();
	private static readonly MAX_ATTEMPTS = 5;
	private static readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

	/**
	 * Check if request should be rate limited
	 */
	static isRateLimited(identifier: string): boolean {
		const now = Date.now();
		const attempt = this.attempts.get(identifier);

		if (!attempt) {
			this.attempts.set(identifier, {
				count: 1,
				resetTime: now + this.WINDOW_MS,
			});
			return false;
		}

		if (now > attempt.resetTime) {
			// Reset window
			this.attempts.set(identifier, {
				count: 1,
				resetTime: now + this.WINDOW_MS,
			});
			return false;
		}

		if (attempt.count >= this.MAX_ATTEMPTS) {
			return true;
		}

		attempt.count++;
		return false;
	}

	/**
	 * Get remaining attempts for identifier
	 */
	static getRemainingAttempts(identifier: string): number {
		const attempt = this.attempts.get(identifier);
		if (!attempt || Date.now() > attempt.resetTime) {
			return this.MAX_ATTEMPTS;
		}
		return Math.max(0, this.MAX_ATTEMPTS - attempt.count);
	}

	/**
	 * Get time until reset for identifier
	 */
	static getResetTime(identifier: string): number {
		const attempt = this.attempts.get(identifier);
		if (!attempt || Date.now() > attempt.resetTime) {
			return 0;
		}
		return attempt.resetTime - Date.now();
	}

	/**
	 * Clear attempts for identifier (e.g., after successful login)
	 */
	static clearAttempts(identifier: string): void {
		this.attempts.delete(identifier);
	}

	/**
	 * Clean up expired entries
	 */
	static cleanup(): void {
		const now = Date.now();
		for (const [key, attempt] of this.attempts.entries()) {
			if (now > attempt.resetTime) {
				this.attempts.delete(key);
			}
		}
	}
}

// Clean up rate limiter every 5 minutes
setInterval(() => {
	RateLimiter.cleanup();
}, 5 * 60 * 1000);
