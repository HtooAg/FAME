import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";
import { broadcastArtistRegistration } from "@/app/api/websocket/route";

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
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_EVENT_ID",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Get all artists for the event
		// First, try to get real artist data from GCS
		let artists: any[] = [];

		try {
			// List all artist files for this event
			const artistFiles = await GCSService.listFiles(
				`events/${eventId}/artists/`
			);

			// Extract artist IDs from file paths
			const artistIds = artistFiles
				.map((filePath) =>
					filePath.split("/").pop()?.replace(".json", "")
				)
				.filter((id): id is string => !!id);

			if (artistIds.length > 0) {
				// Use batch fetching for better performance
				artists = await GCSService.batchGetArtistData(artistIds);
			}
		} catch (error) {
			console.error("Error fetching artists from GCS:", error);
			// Fall back to sample data if no real data exists
			artists = await GCSService.getEventArtists(eventId);
		}

		// If no artists found, return empty array
		if (artists.length === 0) {
			return NextResponse.json<ApiResponse<any[]>>({
				success: true,
				data: [],
				timestamp: new Date().toISOString(),
			});
		}

		// Ensure all artists have proper media URLs
		const artistsWithValidUrls = await Promise.all(
			artists.map(async (artist) => {
				if (!artist) return null;

				try {
					// Refresh media URLs if needed
					const musicTracks = await Promise.all(
						(artist.musicTracks || []).map(async (track: any) => {
							if (
								GCSService.isBlobUrl(track.file_url) &&
								track.file_path
							) {
								try {
									track.file_url =
										await GCSService.getSignedUrl(
											track.file_path,
											24 * 60 * 60
										);
								} catch (error) {
									console.error(
										"Failed to refresh music track URL:",
										error
									);
									track.file_url = null;
								}
							}
							return track;
						})
					);

					const galleryFiles = await Promise.all(
						(artist.galleryFiles || []).map(async (file: any) => {
							if (
								GCSService.isBlobUrl(file.url) &&
								file.file_path
							) {
								try {
									file.url = await GCSService.getSignedUrl(
										file.file_path,
										24 * 60 * 60
									);
								} catch (error) {
									console.error(
										"Failed to refresh gallery file URL:",
										error
									);
									file.url = null;
								}
							}
							return file;
						})
					);

					return {
						...artist,
						musicTracks,
						galleryFiles,
					};
				} catch (error) {
					console.error("Error processing artist media URLs:", error);
					return artist;
				}
			})
		);

		const validArtists = artistsWithValidUrls.filter(
			(artist) => artist !== null
		);

		return NextResponse.json<ApiResponse<any[]>>({
			success: true,
			data: validArtists,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error fetching event artists:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch event artists",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const artistData = await request.json();

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_EVENT_ID",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Validate required fields
		if (!artistData.artistName || !artistData.email) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_REQUIRED_FIELDS",
						message: "Artist name and email are required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Generate artist ID
		const artistId = `artist_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;

		// Prepare complete artist data
		const completeArtistData = {
			id: artistId,
			eventId,
			...artistData,
			status: "pending",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		// Save artist data to GCS
		await GCSService.saveArtistData(completeArtistData);

		// Get the saved data with proper media URLs
		const savedArtist = await GCSService.getArtistData(artistId);

		// Broadcast artist registration to WebSocket subscribers
		try {
			await broadcastArtistRegistration(eventId, savedArtist);
			console.log(
				`Broadcasted artist registration for ${
					savedArtist.artistName || savedArtist.artist_name
				}`
			);
		} catch (error) {
			console.error("Error broadcasting artist registration:", error);
			// Don't fail the request if broadcasting fails
		}

		return NextResponse.json<ApiResponse<any>>(
			{
				success: true,
				data: savedArtist,
				timestamp: new Date().toISOString(),
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error("Error creating artist:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to create artist",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
