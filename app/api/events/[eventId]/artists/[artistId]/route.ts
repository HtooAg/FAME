import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";
import {
	broadcastArtistAssignment,
	broadcastArtistStatusChange,
	broadcastArtistDeletion,
} from "@/app/api/websocket/route";
import { ArtistStatusService } from "@/lib/services/artist-status-service";
import { statusCacheManager } from "@/lib/status-cache-manager";
import { createCachedStatus } from "@/lib/cache-utils";
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

		// Try to get artist data from cache first, fallback to storage
		let artistData;
		try {
			// Initialize cache manager if not already done
			await statusCacheManager.initialize(eventId);

			// Try cache first for performance status
			const cachedStatus = await statusCacheManager.getArtistStatus(
				artistId,
				eventId
			);

			// Get full artist data from storage
			artistData = await GCSService.getArtistData(artistId);

			// Merge cached status if available and more recent
			if (cachedStatus && artistData) {
				const cachedTime = new Date(cachedStatus.timestamp).getTime();
				const storageTime = new Date(
					artistData.updatedAt || 0
				).getTime();

				if (cachedTime > storageTime) {
					// Use cached status data
					artistData.performance_status =
						cachedStatus.performance_status;
					artistData.performance_order =
						cachedStatus.performance_order;
					artistData.performance_date = cachedStatus.performance_date;
				}
			}
		} catch (cacheError) {
			console.error("Cache error, falling back to storage:", cacheError);
			artistData = await GCSService.getArtistData(artistId);
		}

		if (!artistData) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Verify artist belongs to the event
		if (artistData.eventId !== eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_IN_EVENT",
						message: "Artist does not belong to this event",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 403 }
			);
		}

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: artistData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error fetching artist:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch artist data",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;
		const updates = await request.json();

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

		// Get current artist data
		const currentData = await GCSService.getArtistData(artistId);
		if (!currentData) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Verify artist belongs to the event
		if (currentData.eventId !== eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_IN_EVENT",
						message: "Artist does not belong to this event",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 403 }
			);
		}

		// Merge updates with current data
		const updatedData = {
			...currentData,
			...updates,
			updatedAt: new Date().toISOString(),
		};

		console.log(
			`Saving artist data for ${artistId} with performance fields:`,
			{
				performance_order: updatedData.performance_order,
				performance_status: updatedData.performance_status,
				performance_date:
					updatedData.performance_date || updatedData.performanceDate,
			}
		);

		// Save updated data
		await GCSService.saveArtistData(updatedData);

		// If performance-related fields are being updated, use caching layer
		if (
			updates.performance_status !== undefined ||
			updates.performance_order !== undefined ||
			updates.performance_date !== undefined ||
			updates.performanceDate !== undefined
		) {
			console.log(`Updating performance data for artist ${artistId}:`, {
				performance_status: updates.performance_status,
				performance_order: updates.performance_order,
				performance_date:
					updates.performance_date || updates.performanceDate,
			});

			try {
				// Initialize cache manager if not already done
				await statusCacheManager.initialize(eventId);

				// Get user info for tracking
				const user = getUserFromRequest(request);

				// Update via cache manager (optimistic update + background sync)
				const cacheUpdates = {
					performance_status: updates.performance_status,
					performance_order: updates.performance_order,
					performance_date:
						updates.performance_date || updates.performanceDate,
					eventId,
					artistId,
					timestamp: new Date().toISOString(),
					version: 1,
					dirty: true,
				};

				const resolution = await statusCacheManager.updateArtistStatus(
					artistId,
					eventId,
					cacheUpdates,
					user?.userId
				);

				if (resolution) {
					console.log(
						`Successfully updated performance data via cache for artist ${artistId}`
					);

					// Update the local data with cached values for immediate response
					updatedData.performance_status =
						resolution.resolved.performance_status;
					updatedData.performance_order =
						resolution.resolved.performance_order;
					updatedData.performance_date =
						resolution.resolved.performance_date;
				}

				// Also update via the traditional method as fallback
				await GCSService.updateArtistPerformanceStatus(
					artistId,
					eventId,
					{
						performance_status: updates.performance_status,
						performance_order: updates.performance_order,
						performance_date:
							updates.performance_date || updates.performanceDate,
					}
				);
			} catch (error) {
				console.error(
					`Failed to update performance data for artist ${artistId}:`,
					error
				);
				// Don't fail the whole request, but log the error
			}
		}

		// Return updated data with fresh media URLs
		const refreshedData = await GCSService.getArtistData(artistId);

		// Handle auto-status updates for performance date changes
		if (
			updates.performance_date !== undefined ||
			updates.performanceDate !== undefined
		) {
			// Get user info for status change tracking
			const user = getUserFromRequest(request);
			if (user) {
				try {
					await ArtistStatusService.autoUpdateStatusOnAssignment(
						eventId,
						artistId,
						updates.performance_date || updates.performanceDate,
						user.userId,
						user.name || user.email || "System"
					);
				} catch (error) {
					console.error(
						"Error auto-updating status on assignment:",
						error
					);
				}
			}
		}

		// Broadcast appropriate update based on what changed
		try {
			if (
				updates.performance_date !== undefined ||
				updates.performanceDate !== undefined
			) {
				// Performance date assignment/unassignment
				await broadcastArtistAssignment(eventId, refreshedData);
				console.log(
					`Broadcasted artist assignment for ${
						refreshedData.artistName || refreshedData.artist_name
					}`
				);
			} else if (updates.status !== undefined) {
				// Status change
				await broadcastArtistStatusChange(eventId, refreshedData);
				console.log(
					`Broadcasted artist status change for ${
						refreshedData.artistName || refreshedData.artist_name
					}`
				);
			} else {
				// General update
				await broadcastArtistStatusChange(eventId, refreshedData);
				console.log(
					`Broadcasted artist update for ${
						refreshedData.artistName || refreshedData.artist_name
					}`
				);
			}
		} catch (error) {
			console.error("Error broadcasting artist update:", error);
			// Don't fail the request if broadcasting fails
		}

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: refreshedData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error updating artist:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to update artist data",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
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

		// Get current artist data to verify it exists and belongs to event
		const currentData = await GCSService.getArtistData(artistId);
		if (!currentData) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Verify artist belongs to the event
		if (currentData.eventId !== eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_IN_EVENT",
						message: "Artist does not belong to this event",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 403 }
			);
		}

		// Delete artist files from GCS
		const filesToDelete = [
			`artists/${artistId}/profile.json`,
			`artists/${artistId}/technical.json`,
			`artists/${artistId}/social.json`,
			`artists/${artistId}/notes.json`,
			`artists/${artistId}/music.json`,
			`artists/${artistId}/gallery.json`,
			`events/${eventId}/artists/${artistId}.json`,
		];

		await Promise.all(
			filesToDelete.map(async (filePath) => {
				try {
					await GCSService.deleteFile(filePath);
				} catch (error) {
					console.error(`Error deleting file ${filePath}:`, error);
					// Continue with other deletions even if one fails
				}
			})
		);

		// Broadcast artist deletion
		try {
			await broadcastArtistDeletion(eventId, currentData);
			console.log(
				`Broadcasted artist deletion for ${
					currentData.artistName || currentData.artist_name
				}`
			);
		} catch (error) {
			console.error("Error broadcasting artist deletion:", error);
			// Don't fail the request if broadcasting fails
		}

		return NextResponse.json<ApiResponse<null>>({
			success: true,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error deleting artist:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to delete artist",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
