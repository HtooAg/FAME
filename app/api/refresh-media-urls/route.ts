import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

/**
 * Utility endpoint to refresh expired media URLs for artists
 */
export async function POST(request: NextRequest) {
	try {
		const { artistId, eventId } = await request.json();

		if (!artistId) {
			return NextResponse.json(
				{ error: "Artist ID is required" },
				{ status: 400 }
			);
		}

		// Get current artist data
		const artistData = await GCSService.getArtistData(artistId);

		if (!artistData) {
			return NextResponse.json(
				{ error: "Artist not found" },
				{ status: 404 }
			);
		}

		let refreshedCount = 0;
		const errors: string[] = [];

		// Refresh music track URLs
		if (artistData.musicTracks && Array.isArray(artistData.musicTracks)) {
			for (let i = 0; i < artistData.musicTracks.length; i++) {
				const track = artistData.musicTracks[i];
				if (track.file_path && GCSService.isBlobUrl(track.file_url)) {
					try {
						const newUrl = await GCSService.getSignedUrl(
							track.file_path,
							24 * 60 * 60
						);
						artistData.musicTracks[i].file_url = newUrl;
						refreshedCount++;
					} catch (error: any) {
						errors.push(
							`Failed to refresh music track "${track.song_title}": ${error.message}`
						);
					}
				}
			}
		}

		// Refresh gallery file URLs
		if (artistData.galleryFiles && Array.isArray(artistData.galleryFiles)) {
			for (let i = 0; i < artistData.galleryFiles.length; i++) {
				const file = artistData.galleryFiles[i];
				if (
					file.file_path &&
					GCSService.isBlobUrl(file.url || file.file_url)
				) {
					try {
						const newUrl = await GCSService.getSignedUrl(
							file.file_path,
							24 * 60 * 60
						);
						artistData.galleryFiles[i].url = newUrl;
						if (artistData.galleryFiles[i].file_url) {
							artistData.galleryFiles[i].file_url = newUrl;
						}
						refreshedCount++;
					} catch (error: any) {
						errors.push(
							`Failed to refresh gallery file "${file.name}": ${error.message}`
						);
					}
				}
			}
		}

		// Save updated artist data if any URLs were refreshed
		if (refreshedCount > 0) {
			await GCSService.saveArtistData(artistData);
		}

		return NextResponse.json({
			success: true,
			artistId,
			refreshedCount,
			errors: errors.length > 0 ? errors : undefined,
			message: `Refreshed ${refreshedCount} media URLs${
				errors.length > 0 ? ` with ${errors.length} errors` : ""
			}`,
		});
	} catch (error: any) {
		console.error("Error refreshing media URLs:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to refresh media URLs" },
			{ status: 500 }
		);
	}
}

export async function GET() {
	return NextResponse.json({
		message: "Media URL Refresh API",
		usage: {
			"POST /api/refresh-media-urls": {
				description: "Refresh expired media URLs for an artist",
				body: {
					artistId: "string (required) - Artist ID",
					eventId: "string (optional) - Event ID for context",
				},
			},
		},
		example: {
			artistId: "artist_1234567890_abcdefghi",
			eventId: "event_123",
		},
	});
}
