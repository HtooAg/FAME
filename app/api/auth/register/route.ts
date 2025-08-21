import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { storageManager } from "@/lib/storage/storage-manager";
import { ErrorHandler, ValidationError } from "@/lib/storage/errors";
import { logRegistration } from "@/lib/storage/logger";
import { InputValidator, RateLimiter } from "@/lib/security/validation";
import { SecurityHeaders } from "@/lib/security/jwt";
import type { UserData } from "@/lib/storage/storage-manager";

export async function POST(request: NextRequest) {
	let requestData: any = {};

	try {
		requestData = await request.json();

		// Rate limiting based on IP address
		const clientIP = request.ip || "unknown";
		if (RateLimiter.isRateLimited(clientIP)) {
			const resetTime = RateLimiter.getResetTime(clientIP);
			logRegistration(
				requestData.email || "unknown",
				false,
				"Rate limited",
				{ ip: clientIP, resetTime }
			);

			return NextResponse.json(
				{
					error: "Too many registration attempts",
					message: `Please try again in ${Math.ceil(
						resetTime / 60000
					)} minutes`,
					retryAfter: resetTime,
				},
				{ status: 429 }
			);
		}

		// Validate and sanitize input
		const { name, email, password, eventName } =
			InputValidator.validateRegistrationData(requestData);

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

		// Check if user already exists
		const existingUser = await storageManager.getUser(email);
		if (existingUser) {
			return NextResponse.json(
				{ error: "An account with this email already exists" },
				{ status: 409 }
			);
		}

		const id = await storageManager.getNextId();
		const hashedPassword = await bcrypt.hash(
			password,
			parseInt(process.env.BCRYPT_ROUNDS || "10")
		);

		// Create user data structure
		const userData: UserData = {
			id: id.toString(),
			name,
			email,
			password: hashedPassword,
			role: "stage_manager",
			accountStatus: "pending",
			subscriptionStatus: "trial",
			subscriptionEndDate: "",
			eventName,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			metadata: {
				ipAddress: request.ip || "unknown",
				userAgent: request.headers.get("user-agent") || "unknown",
				storageSource: "local", // Will be updated by storage manager
			},
		};

		// Save the registration using storage manager (handles both GCS and local)
		await storageManager.saveUser(userData);

		// Create notification for super admin
		try {
			// Try to save notification, but don't fail registration if this fails
			const notification = {
				id: `reg-${id}`,
				type: "new_registration",
				stageManagerId: id,
				stageManagerName: name,
				message: `New stage manager registration: ${name} (${email})`,
				eventName,
				timestamp: new Date().toISOString(),
				read: false,
			};

			// Save notification using the same storage approach
			if (await storageManager.isGCSAvailable()) {
				const GCSService = (await import("@/lib/google-cloud-storage"))
					.default;
				await GCSService.saveJSON(
					notification,
					`notifications/admin/registration-${id}.json`
				);
			} else {
				// Save to local storage as fallback
				const { localFileStorage } = await import(
					"@/lib/storage/local-storage"
				);
				await localFileStorage.saveJSON(
					`notifications/admin/registration-${id}.json`,
					notification
				);
			}
		} catch (notificationError) {
			console.error("Failed to create notification:", notificationError);
			// Don't fail the registration for notification errors
		}

		// Log successful registration
		logRegistration(email, true, "Registration successful", {
			ip: clientIP,
			userId: id,
			eventName,
		});

		// Log storage health for debugging
		const healthStatus = await storageManager.getHealthStatus();
		console.log("Registration completed with storage health:", {
			gcs: healthStatus.gcs.available,
			local: healthStatus.local.available,
			fallbackActive: healthStatus.fallbackActive,
		});

		// Clear rate limiting on successful registration
		RateLimiter.clearAttempts(clientIP);

		let response = NextResponse.json({
			message:
				"Registration submitted successfully. Await admin approval.",
			id,
		});

		// Apply security headers
		response = SecurityHeaders.applyHeaders(response) as NextResponse;

		return response;
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			{
				operation: "register",
				email: requestData?.email || "unknown",
				ip: request.ip,
			}
		);

		// Return appropriate error response
		if (error instanceof ValidationError) {
			const errorResponse = ErrorHandler.createErrorResponse(error);
			return NextResponse.json(errorResponse, { status: 400 });
		}

		// Handle storage errors
		if (error instanceof Error && error.message.includes("Storage")) {
			const serviceError = new Error(
				"Registration service temporarily unavailable"
			);
			const errorResponse =
				ErrorHandler.createErrorResponse(serviceError);
			return NextResponse.json(errorResponse, { status: 503 });
		}

		// Handle duplicate email
		if (
			error instanceof Error &&
			error.message.includes("already exists")
		) {
			const duplicateError = new Error(
				"An account with this email already exists"
			);
			const errorResponse =
				ErrorHandler.createErrorResponse(duplicateError);
			return NextResponse.json(errorResponse, { status: 409 });
		}

		// Generic error
		const genericError = new Error("Registration failed");
		const errorResponse = ErrorHandler.createErrorResponse(genericError);
		return NextResponse.json(errorResponse, { status: 500 });
	}
}
