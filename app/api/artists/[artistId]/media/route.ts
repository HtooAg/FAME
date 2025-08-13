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
		const { searchParams } = new URL(request.url);

		const mediaType = searchParams.get("type") as "music" | "gallery";
		const startIndex = parseInt(searchParams.get("start") || "0");
		const count = parseInt(searchParams.get("count") || "10");

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

		if (!mediaType || !["music", "gallery"].includes(mediaType)) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "INVALID_MEDIA_TYPE",
						message: "Media type must be 'music' or 'gallery'",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Load media URLs lazily
		const mediaItems = await GCSService.loadArtistMediaUrls(
			artistId,
			mediaType,
			startIndex,
			count
		);

		return NextResponse.json<ApiResponse<any[]>>({
			success: true,
			data: mediaItems,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error loading artist media:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to load artist media",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
