import { NextRequest, NextResponse } from "next/server";
import { ArtistStatusService } from "@/lib/services/artist-status-service";
import { updateArtistStatusSchema } from "@/lib/schemas/artist";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
	timestamp: string;
}

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

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;
		const body = await request.json();

		if (!eventId || !artistId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID and Artist ID are required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Authenticate user
		const user = getUserFromRequest(request);
		if (
			!user ||
			(user.role !== "stage_manager" && user.role !== "super_admin")
		) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Unauthorized to update artist status",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 401 }
			);
		}

		// Validate request body
		const statusUpdateRequest = {
			artistId,
			newStatus: body.newStatus,
			reason: body.reason,
			changedBy: user.userId,
			changedByName: user.name || user.email || "Unknown User",
		};

		const validation =
			updateArtistStatusSchema.safeParse(statusUpdateRequest);
		if (!validation.success) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: validation.error.errors
							.map((e) => e.message)
							.join(", "),
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Update artist status
		const result = await ArtistStatusService.updateArtistStatus(
			eventId,
			artistId,
			validation.data
		);

		if (!result.success) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "STATUS_UPDATE_FAILED",
						message:
							result.error || "Failed to update artist status",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: result.data,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error updating artist status:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to update artist status",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;

		if (!eventId || !artistId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID and Artist ID are required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Authenticate user
		const user = getUserFromRequest(request);
		if (
			!user ||
			(user.role !== "stage_manager" && user.role !== "super_admin")
		) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Unauthorized to view artist status history",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 401 }
			);
		}

		// Get status history
		const statusHistory = await ArtistStatusService.getStatusHistory(
			artistId
		);

		// Get valid transitions for current status
		const artistData = await ArtistStatusService.getStatusHistory(artistId);
		const currentStatus =
			artistData.length > 0
				? artistData[artistData.length - 1]?.newStatus
				: null;
		const validTransitions =
			ArtistStatusService.getValidTransitions(currentStatus);

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: {
				statusHistory,
				currentStatus,
				validTransitions,
				statusInfo: ArtistStatusService.getStatusInfo(currentStatus),
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error getting artist status:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to get artist status",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
