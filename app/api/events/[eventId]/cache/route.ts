import { NextRequest, NextResponse } from "next/server";
import { statusCacheManager } from "@/lib/status-cache-manager";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

// Helper function to verify JWT token and get user info
function verifyToken(token: string) {
	try {
		return jwt.verify(token, JWT_SECRET) as any;
	} catch (error) {
		return null;
	}
}

// Helper function to get user info from request
function getUserFromRequest(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	if (authHeader && authHeader.startsWith("Bearer ")) {
		const token = authHeader.substring(7);
		return verifyToken(token);
	}

	const cookieHeader = request.headers.get("cookie");
	if (cookieHeader) {
		const cookies = Object.fromEntries(
			cookieHeader.split("; ").map((c) => {
				const [k, ...v] = c.split("=");
				return [k, v.join("=")];
			})
		);
		const token = cookies["auth-token"];
		if (token) {
			return verifyToken(token);
		}
	}

	return null;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
	timestamp: string;
}

/**
 * Get cache statistics and status
 * GET /api/events/[eventId]/cache
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Initialize cache manager
		await statusCacheManager.initialize(eventId);

		// Get comprehensive statistics
		const stats = await statusCacheManager.getStats();

		return NextResponse.json<ApiResponse<typeof stats>>({
			success: true,
			data: stats,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error getting cache stats:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to get cache statistics",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

/**
 * Cache management operations
 * POST /api/events/[eventId]/cache
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const { action, performanceDate } = await request.json();

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		if (!action) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_ACTION",
						message: "Action is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Verify user has permission (optional - implement based on your auth system)
		const user = getUserFromRequest(request);
		if (!user) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Authentication required for cache operations",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 401 }
			);
		}

		// Initialize cache manager
		await statusCacheManager.initialize(eventId);

		let result: any = {};

		switch (action) {
			case "warmup":
				await statusCacheManager.warmupCache(eventId, performanceDate);
				result = { message: "Cache warmed up successfully" };
				break;

			case "sync":
				if (!performanceDate) {
					return NextResponse.json<ApiResponse<null>>(
						{
							success: false,
							error: {
								code: "MISSING_PERFORMANCE_DATE",
								message:
									"Performance date is required for sync operation",
							},
							timestamp: new Date().toISOString(),
						},
						{ status: 400 }
					);
				}
				const syncSuccess = await statusCacheManager.syncToStorage(
					eventId,
					performanceDate
				);
				result = {
					message: syncSuccess
						? "Sync completed successfully"
						: "Sync failed",
					success: syncSuccess,
				};
				break;

			case "fullSync":
				if (!performanceDate) {
					return NextResponse.json<ApiResponse<null>>(
						{
							success: false,
							error: {
								code: "MISSING_PERFORMANCE_DATE",
								message:
									"Performance date is required for full sync operation",
							},
							timestamp: new Date().toISOString(),
						},
						{ status: 400 }
					);
				}
				await statusCacheManager.fullSyncFromStorage(
					eventId,
					performanceDate
				);
				result = { message: "Full sync from storage completed" };
				break;

			case "clear":
				// This is a destructive operation, might want additional checks
				await statusCacheManager.destroy();
				await statusCacheManager.initialize(eventId);
				result = { message: "Cache cleared successfully" };
				break;

			default:
				return NextResponse.json<ApiResponse<null>>(
					{
						success: false,
						error: {
							code: "INVALID_ACTION",
							message: `Unknown action: ${action}. Valid actions: warmup, sync, fullSync, clear`,
						},
						timestamp: new Date().toISOString(),
					},
					{ status: 400 }
				);
		}

		console.log(
			`Cache ${action} operation completed for event: ${eventId}`
		);

		return NextResponse.json<ApiResponse<typeof result>>({
			success: true,
			data: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error in cache operation:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to perform cache operation",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
