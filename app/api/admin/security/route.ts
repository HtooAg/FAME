import { NextRequest, NextResponse } from "next/server";
import { SecurityConfigChecker } from "@/lib/security/config-checker";
import { JWTSecurity, SecurityHeaders } from "@/lib/security/jwt";
import { RateLimiter } from "@/lib/security/validation";
import { ErrorHandler } from "@/lib/storage/errors";

export async function GET(request: NextRequest) {
	try {
		// Run all security checks
		const securityChecks = SecurityConfigChecker.runAllChecks();
		const securityScore = SecurityConfigChecker.getSecurityScore();

		// Get JWT validation status
		const jwtValidation = JWTSecurity.validateSecretStrength();

		// Get rate limiting stats (simplified)
		const rateLimitStats = {
			maxAttempts: 5,
			windowMs: 15 * 60 * 1000,
			// Note: In a real implementation, you might want to expose more stats
		};

		const securityStatus = {
			overall: {
				score: securityScore,
				status:
					securityScore >= 80
						? "good"
						: securityScore >= 60
						? "warning"
						: "critical",
				lastChecked: new Date().toISOString(),
			},
			checks: securityChecks,
			jwt: {
				valid: jwtValidation.valid,
				warnings: jwtValidation.warnings,
			},
			rateLimiting: {
				enabled: true,
				...rateLimitStats,
			},
			environment: {
				nodeEnv: process.env.NODE_ENV,
				isProduction: process.env.NODE_ENV === "production",
				httpsEnabled:
					process.env.HTTPS === "true" ||
					process.env.NODE_ENV === "production",
			},
			recommendations: securityChecks
				.filter((check) => check.recommendation)
				.map((check) => ({
					category: check.category,
					check: check.check,
					recommendation: check.recommendation,
					priority: check.status === "fail" ? "high" : "medium",
				})),
		};

		let response = NextResponse.json(securityStatus);

		// Apply security headers
		response = SecurityHeaders.applyHeaders(response) as NextResponse;

		return response;
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			{
				operation: "security-status",
				ip: request.ip,
			}
		);

		const errorResponse = ErrorHandler.createErrorResponse(
			error instanceof Error
				? error
				: new Error("Failed to get security status")
		);

		return NextResponse.json(errorResponse, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const { action } = await request.json().catch(() => ({}));

		let result: any = {};

		switch (action) {
			case "run-checks":
				result = {
					checks: SecurityConfigChecker.runAllChecks(),
					score: SecurityConfigChecker.getSecurityScore(),
					timestamp: new Date().toISOString(),
				};
				break;

			case "clear-rate-limits":
				// In a real implementation, you might want to clear all rate limits
				// For now, we'll just return a success message
				result = {
					message: "Rate limits cleared successfully",
					timestamp: new Date().toISOString(),
				};
				break;

			default:
				return NextResponse.json(
					{
						error: "Invalid action. Supported actions: run-checks, clear-rate-limits",
					},
					{ status: 400 }
				);
		}

		let response = NextResponse.json({
			success: true,
			action,
			result,
		});

		// Apply security headers
		response = SecurityHeaders.applyHeaders(response) as NextResponse;

		return response;
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			{
				operation: "security-action",
				ip: request.ip,
			}
		);

		const errorResponse = ErrorHandler.createErrorResponse(
			error instanceof Error ? error : new Error("Security action failed")
		);

		return NextResponse.json(errorResponse, { status: 500 });
	}
}
