import { NextRequest, NextResponse } from "next/server";
import { ArtistValidator, ValidationResult } from "./artist-validation";

export interface ValidationOptions {
	requireAuth?: boolean;
	rateLimitKey?: string;
	maxRequestSize?: number;
	allowedMethods?: string[];
}

export class ValidationMiddleware {
	private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
	private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
	private static readonly MAX_REQUESTS_PER_WINDOW = 100;

	// Simple in-memory rate limiting (in production, use Redis)
	private static rateLimitStore = new Map<
		string,
		{ count: number; resetTime: number }
	>();

	/**
	 * Validate incoming API request
	 */
	static async validateRequest(
		request: NextRequest,
		validationType:
			| "artist-create"
			| "artist-update"
			| "artist-assign"
			| "file-upload",
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
				if (
					validationType !== "file-upload" &&
					!contentType?.includes("application/json")
				) {
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

			// Parse and validate request body
			let data: any;
			try {
				if (validationType === "file-upload") {
					// Handle multipart form data for file uploads
					const formData = await request.formData();
					data = this.parseFormData(formData);
				} else {
					data = await request.json();
				}
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

			// Validate data based on type
			let validation: ValidationResult;
			switch (validationType) {
				case "artist-create":
					validation = ArtistValidator.validateApiRequest(
						data,
						"create"
					);
					break;
				case "artist-update":
					validation = ArtistValidator.validateApiRequest(
						data,
						"update"
					);
					break;
				case "artist-assign":
					validation = ArtistValidator.validateApiRequest(
						data,
						"assign"
					);
					break;
				case "file-upload":
					validation = this.validateFileUploadRequest(data);
					break;
				default:
					return {
						isValid: false,
						errors: ["Unknown validation type"],
						response: NextResponse.json(
							{
								success: false,
								error: "Internal validation error",
							},
							{ status: 500 }
						),
					};
			}

			if (!validation.isValid) {
				return {
					isValid: false,
					errors: validation.errors,
					response: NextResponse.json(
						{
							success: false,
							error: "Validation failed",
							details: validation.errors,
						},
						{ status: 400 }
					),
				};
			}

			return {
				isValid: true,
				errors: [],
				data: validation.sanitizedData || data,
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
	 * Parse multipart form data for file uploads
	 */
	private static parseFormData(formData: FormData): any {
		const data: any = {};

		for (const [key, value] of formData.entries()) {
			if (value instanceof File) {
				data[key] = value;
			} else {
				// Try to parse JSON values
				try {
					data[key] = JSON.parse(value);
				} catch {
					data[key] = value;
				}
			}
		}

		return data;
	}

	/**
	 * Validate file upload request
	 */
	private static validateFileUploadRequest(data: any): ValidationResult {
		const errors: string[] = [];

		if (!data.file || !(data.file instanceof File)) {
			errors.push("File is required");
		}

		if (!data.type || !["audio", "video", "image"].includes(data.type)) {
			errors.push("Valid file type is required (audio, video, or image)");
		}

		if (errors.length > 0) {
			return { isValid: false, errors };
		}

		// Use existing file validation
		return ArtistValidator.validateFileUploadEnhanced(data.file, data.type);
	}

	/**
	 * Sanitize request headers
	 */
	static sanitizeHeaders(headers: Headers): Record<string, string> {
		const sanitized: Record<string, string> = {};
		const allowedHeaders = [
			"content-type",
			"authorization",
			"user-agent",
			"accept",
			"accept-language",
		];

		for (const [key, value] of headers.entries()) {
			if (allowedHeaders.includes(key.toLowerCase())) {
				// Basic sanitization - remove potential injection attempts
				sanitized[key] = value.replace(/[<>'"]/g, "");
			}
		}

		return sanitized;
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

	/**
	 * Validate authentication token (placeholder - implement based on your auth system)
	 */
	static async validateAuth(request: NextRequest): Promise<{
		isValid: boolean;
		user?: any;
		error?: string;
	}> {
		try {
			const authHeader = request.headers.get("authorization");

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return {
					isValid: false,
					error: "Missing or invalid authorization header",
				};
			}

			const token = authHeader.substring(7);

			// TODO: Implement actual JWT validation
			// This is a placeholder - replace with your actual auth validation
			if (!token || token.length < 10) {
				return {
					isValid: false,
					error: "Invalid token format",
				};
			}

			// Mock user data - replace with actual token validation
			return {
				isValid: true,
				user: {
					id: "user123",
					role: "stage_manager",
					email: "user@example.com",
				},
			};
		} catch (error) {
			return {
				isValid: false,
				error: "Authentication validation failed",
			};
		}
	}
}
