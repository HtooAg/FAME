import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

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
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = params;

		if (!artistId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_ARTIST_ID",
						message: "Artist ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Validate artist ID format
		if (typeof artistId !== "string" || artistId.length < 5) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "INVALID_ARTIST_ID",
						message: "Invalid artist ID format",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Fetch complete artist data with proper media URLs
		const artistData = await GCSService.getArtistData(artistId);

		if (!artistData) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist profile not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: artistData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error fetching artist data:", error);

		// Handle specific error types
		if (error.code === "ENOENT") {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist profile not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

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
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = params;
		const updates = await request.json();

		if (!artistId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_ARTIST_ID",
						message: "Artist ID is required",
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
						message: "Artist profile not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Merge updates with current data
		const updatedData = {
			...currentData,
			...updates,
			updatedAt: new Date().toISOString(),
		};

		// Save updated data
		await GCSService.saveArtistData(updatedData);

		// Return updated data with fresh media URLs
		const refreshedData = await GCSService.getArtistData(artistId);

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: refreshedData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error updating artist data:", error);

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
