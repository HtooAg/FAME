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
	// Try to get token from Authorization header
	const authHeader = request.headers.get("authorization");
	if (authHeader && authHeader.startsWith("Bearer ")) {
		const token = authHeader.substring(7);
		return verifyToken(token);
	}

	// Try to get token from cookies
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

export interface BulkStatusUpdate {
	artistId: string;
	performance_status?: string;
	performance_order?: number;
	performance_date?: string;
}

export interface BulkUpdateRequest {
	updates: BulkStatusUpdate[];
	performanceDate?: string;
}

/**
 * Bulk update artist statuses
 * POST /api/events/[eventId]/artists/status/bulk
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const { updates, performanceDate }: BulkUpdateRequest =
			await request.json();

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

		if (!updates || !Array.isArray(updates) || updates.length === 0) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "INVALID_UPDATES",
						message:
							"Updates array is required and must not be empty",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Validate updates
		for (const update of updates) {
			if (!update.artistId) {
				return NextResponse.json<ApiResponse<null>>(
					{
						success: false,
						error: {
							code: "INVALID_UPDATE",
							message: "Each update must have an artistId",
						},
						timestamp: new Date().toISOString(),
					},
					{ status: 400 }
				);
			}
		}

		// Get user info for tracking
		const user = getUserFromRequest(request);

		// Initialize cache manager
		await statusCacheManager.initialize(eventId);

		// Convert to cache manager format
		const cacheUpdates = updates.map((update) => ({
			artistId: update.artistId,
			eventId,
			updates: {
				performance_status: update.performance_status,
				performance_order: update.performance_order,
				performance_date: update.performance_date || performanceDate,
				eventId,
				artistId: update.artistId,
				timestamp: new Date().toISOString(),
				version: 1,
				dirty: true,
			},
		}));

		// Perform bulk update via cache manager
		const resolutions = await statusCacheManager.batchUpdateStatuses(
			cacheUpdates,
			user?.userId
		);

		// Prepare response data
		const responseData = {
			updatedCount: resolutions.length,
			updates: resolutions.map((resolution) => ({
				artistId: resolution.resolved.artistId,
				status: resolution.resolved.performance_status,
				order: resolution.resolved.performance_order,
				date: resolution.resolved.performance_date,
				conflicts: resolution.conflicts,
				strategy: resolution.strategy,
			})),
			timestamp: new Date().toISOString(),
		};

		console.log(
			`Bulk updated ${resolutions.length} artist statuses for event: ${eventId}`
		);

		return NextResponse.json<ApiResponse<typeof responseData>>({
			success: true,
			data: responseData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error in bulk status update:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to perform bulk status update",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

/**
 * Get bulk status information
 * GET /api/events/[eventId]/artists/status/bulk?performanceDate=YYYY-MM-DD
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const { searchParams } = new URL(request.url);
		const performanceDate = searchParams.get("performanceDate");

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

		// Get cache statistics
		const stats = await statusCacheManager.getStats();

		// If performance date is provided, warm up cache for that date
		if (performanceDate) {
			await statusCacheManager.warmupCache(eventId, performanceDate);
		}

		const responseData = {
			eventId,
			performanceDate,
			cacheStats: stats.cacheStats,
			queueStats: stats.queueStats,
			websocketStats: stats.websocketStats,
			lastSyncTime: stats.lastSyncTime,
			syncErrors: stats.syncErrors,
			totalOperations: stats.totalOperations,
		};

		return NextResponse.json<ApiResponse<typeof responseData>>({
			success: true,
			data: responseData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error getting bulk status info:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to get bulk status information",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
