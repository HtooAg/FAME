import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { storageManager } from "@/lib/storage/storage-manager";
import { AuthenticationError, ErrorHandler } from "@/lib/storage/errors";
import { logAuthAttempt } from "@/lib/storage/logger";
import { InputValidator, RateLimiter } from "@/lib/security/validation";
import { JWTSecurity, SecurityHeaders } from "@/lib/security/jwt";

export async function POST(request: NextRequest) {
	try {
		const requestData = await request.json();

		// Validate and sanitize input
		const { email, password } =
			InputValidator.validateLoginData(requestData);

		// Rate limiting based on IP address
		const clientIP = request.ip || "unknown";
		if (RateLimiter.isRateLimited(clientIP)) {
			const resetTime = RateLimiter.getResetTime(clientIP);
			logAuthAttempt(email, false, "Rate limited", {
				ip: clientIP,
				resetTime,
			});

			return NextResponse.json(
				{
					error: "Too many login attempts",
					message: `Please try again in ${Math.ceil(
						resetTime / 60000
					)} minutes`,
					retryAfter: resetTime,
				},
				{ status: 429 }
			);
		}

		console.log("Login attempt for email:", email); // Debug log

		// Initialize storage manager if not already done
		try {
			await storageManager.initialize();
		} catch (initError) {
			console.error("Storage initialization failed:", initError);
			return NextResponse.json(
				{ error: "Service temporarily unavailable" },
				{ status: 503 }
			);
		}

		// Get user from unified storage (checks both GCS and local with fallback)
		const user = await storageManager.getUser(email);

		if (!user) {
			logAuthAttempt(email, false, "User not found", { ip: request.ip });
			const authError = new AuthenticationError(
				"Invalid credentials",
				"INVALID_CREDENTIALS",
				401
			);
			const errorResponse = ErrorHandler.createErrorResponse(authError);
			return NextResponse.json(errorResponse, { status: 401 });
		}

		console.log(
			"User found with status:",
			user.accountStatus,
			"role:",
			user.role,
			"storage source:",
			user.metadata?.storageSource || "unknown"
		); // Debug log

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			logAuthAttempt(email, false, "Invalid password", {
				ip: request.ip,
				userId: user.id,
			});
			const authError = new AuthenticationError(
				"Invalid credentials",
				"INVALID_CREDENTIALS",
				401
			);
			const errorResponse = ErrorHandler.createErrorResponse(authError);
			return NextResponse.json(errorResponse, { status: 401 });
		}

		// Handle different account statuses (super_admin bypasses most checks)
		if (user.role !== "super_admin") {
			if (user.accountStatus === "suspended") {
				logAuthAttempt(email, false, "Account suspended", {
					ip: request.ip,
					userId: user.id,
				});
				const authError = new AuthenticationError(
					"Account suspended",
					"ACCOUNT_SUSPENDED",
					403
				);
				const errorResponse =
					ErrorHandler.createErrorResponse(authError);
				return NextResponse.json(
					{ ...errorResponse, accountStatus: "suspended" },
					{ status: 403 }
				);
			}

			if (user.accountStatus === "deactivated") {
				logAuthAttempt(email, false, "Account deactivated", {
					ip: request.ip,
					userId: user.id,
				});
				const authError = new AuthenticationError(
					"Account deactivated",
					"ACCOUNT_DEACTIVATED",
					403
				);
				const errorResponse =
					ErrorHandler.createErrorResponse(authError);
				return NextResponse.json(
					{ ...errorResponse, accountStatus: "deactivated" },
					{ status: 403 }
				);
			}

			if (user.accountStatus === "rejected") {
				logAuthAttempt(email, false, "Account rejected", {
					ip: request.ip,
					userId: user.id,
				});
				const authError = new AuthenticationError(
					"Account rejected",
					"ACCOUNT_REJECTED",
					403
				);
				const errorResponse =
					ErrorHandler.createErrorResponse(authError);
				return NextResponse.json(
					{ ...errorResponse, accountStatus: "rejected" },
					{ status: 403 }
				);
			}

			// Allow pending users to login but they'll be redirected appropriately
			if (user.accountStatus === "pending") {
				console.log(
					"Account pending - allowing login but will redirect to pending page"
				);
			}
		}

		// Update last login time
		try {
			const updatedUser = {
				...user,
				metadata: {
					...user.metadata,
					lastLogin: new Date().toISOString(),
				},
			};
			await storageManager.saveUser(updatedUser);
		} catch (updateError) {
			console.error("Failed to update last login time:", updateError);
			// Don't fail the login for this
		}

		// Generate secure JWT token
		const tokenPayload = {
			userId: user.id,
			email: user.email,
			role: user.role,
			eventId: user.eventId,
		};
		const token = JWTSecurity.generateToken(tokenPayload);

		let response = NextResponse.json({
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			eventId: user.eventId,
			accountStatus: user.accountStatus,
			subscriptionStatus: user.subscriptionStatus,
			subscriptionEndDate: user.subscriptionEndDate,
		});

		// Apply security headers
		response = SecurityHeaders.applyHeaders(response) as NextResponse;

		// Set secure cookie
		const cookieOptions = JWTSecurity.getCookieOptions();
		response.cookies.set("auth-token", token, cookieOptions);

		// Clear rate limiting on successful login
		RateLimiter.clearAttempts(clientIP);

		// Log successful authentication
		logAuthAttempt(email, true, "Login successful", {
			ip: request.ip,
			userId: user.id,
			role: user.role,
			accountStatus: user.accountStatus,
			storageSource: user.metadata?.storageSource,
		});

		// Log storage health for debugging
		const healthStatus = await storageManager.getHealthStatus();
		console.log("Storage health:", {
			gcs: healthStatus.gcs.available,
			local: healthStatus.local.available,
			fallbackActive: healthStatus.fallbackActive,
		});

		return response;
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			{
				operation: "login",
				email: email || "unknown",
				ip: request.ip,
			}
		);

		// Return appropriate error response
		if (error instanceof AuthenticationError) {
			const errorResponse = ErrorHandler.createErrorResponse(error);
			return NextResponse.json(errorResponse, {
				status: error.statusCode,
			});
		}

		// Handle storage errors
		if (error instanceof Error && error.message.includes("Storage")) {
			const serviceError = new AuthenticationError(
				"Authentication service temporarily unavailable",
				"SERVICE_UNAVAILABLE",
				503
			);
			const errorResponse =
				ErrorHandler.createErrorResponse(serviceError);
			return NextResponse.json(errorResponse, { status: 503 });
		}

		// Generic error
		const genericError = new Error("Internal server error");
		const errorResponse = ErrorHandler.createErrorResponse(genericError);
		return NextResponse.json(errorResponse, { status: 500 });
	}
}
