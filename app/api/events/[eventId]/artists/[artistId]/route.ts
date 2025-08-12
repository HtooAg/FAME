import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";
import { readJsonFile, writeJsonFile, paths } from "@/lib/gcs";
import jwt from "jsonwebtoken";
import { broadcastEventsUpdate } from "@/app/api/websocket/route";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

// Helper function to get authenticated user from JWT
async function getAuthenticatedUser(request: NextRequest) {
	const token = request.cookies.get("auth-token")?.value;
	if (!token) {
		throw new Error("No authentication token");
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as any;
		return decoded;
	} catch (error) {
		throw new Error("Invalid authentication token");
	}
}

// GET /api/events/[eventId]/artists/[artistId] - Get a specific artist
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;

		// Get artist data from Google Cloud Storage
		const artist = await GCSService.getArtistData(artistId);

		if (!artist || artist.eventId !== eventId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found for this event",
					},
				},
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			artist: artist,
		});
	} catch (error) {
		console.error(
			"Error fetching artist from Google Cloud Storage:",
			error
		);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "FETCH_ARTIST_ERROR",
					message: "Failed to fetch artist from Google Cloud Storage",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}

// PUT /api/events/[eventId]/artists/[artistId] - Update a specific artist
export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;
		const { musicTracks, galleryFiles, ...artistData } =
			await request.json();

		// Get existing artist data from Google Cloud Storage
		const existingArtist = await GCSService.getArtistData(artistId);

		if (!existingArtist || existingArtist.eventId !== eventId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found for this event",
					},
				},
				{ status: 404 }
			);
		}

		// Update the artist data
		const updatedArtist = {
			...existingArtist,
			// Map the form data to our storage format
			artistName: artistData.artist_name || existingArtist.artistName,
			realName: artistData.real_name || existingArtist.realName,
			email: artistData.email || existingArtist.email,
			phone: artistData.phone || existingArtist.phone,
			style: artistData.style || existingArtist.style,
			performanceType:
				artistData.performance_type || existingArtist.performanceType,
			performanceDuration:
				artistData.performance_duration ||
				existingArtist.performanceDuration,
			biography: artistData.biography || existingArtist.biography,
			equipment: artistData.props_needed || existingArtist.equipment,
			specialRequirements:
				artistData.notes || existingArtist.specialRequirements,
			// Technical information
			costumeColor:
				artistData.costume_color || existingArtist.costumeColor,
			customCostumeColor:
				artistData.custom_costume_color ||
				existingArtist.customCostumeColor,
			lightColorSingle:
				artistData.light_color_single ||
				existingArtist.lightColorSingle,
			lightColorTwo:
				artistData.light_color_two || existingArtist.lightColorTwo,
			lightColorThree:
				artistData.light_color_three || existingArtist.lightColorThree,
			lightRequests:
				artistData.light_requests || existingArtist.lightRequests,
			stagePositionStart:
				artistData.stage_position_start ||
				existingArtist.stagePositionStart,
			stagePositionEnd:
				artistData.stage_position_end ||
				existingArtist.stagePositionEnd,
			customStagePosition:
				artistData.custom_stage_position ||
				existingArtist.customStagePosition,
			// Social media
			socialMedia: {
				instagram:
					artistData.instagram_link ||
					existingArtist.socialMedia?.instagram ||
					"",
				facebook:
					artistData.facebook_link ||
					existingArtist.socialMedia?.facebook ||
					"",
				youtube:
					artistData.youtube_link ||
					existingArtist.socialMedia?.youtube ||
					"",
				tiktok:
					artistData.tiktok_link ||
					existingArtist.socialMedia?.tiktok ||
					"",
				website:
					artistData.website_link ||
					existingArtist.socialMedia?.website ||
					"",
			},
			// Additional notes
			mcNotes: artistData.mc_notes || existingArtist.mcNotes,
			stageManagerNotes:
				artistData.stage_manager_notes ||
				existingArtist.stageManagerNotes,
			showLink: artistData.show_link || existingArtist.showLink,
			// Music and media
			musicTracks: musicTracks || existingArtist.musicTracks || [],
			galleryFiles: galleryFiles || existingArtist.galleryFiles || [],
			// Update timestamp
			updatedAt: new Date().toISOString(),
		};

		// Save updated artist data to Google Cloud Storage
		await GCSService.saveArtistData(updatedArtist);

		console.log(
			`Artist data updated in Google Cloud Storage for artist: ${artistId}`
		);

		return NextResponse.json({
			success: true,
			artist: updatedArtist,
			message: "Artist updated successfully",
		});
	} catch (error) {
		console.error("Error updating artist in Google Cloud Storage:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "UPDATE_ARTIST_ERROR",
					message: "Failed to update artist in Google Cloud Storage",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}

// PATCH /api/events/[eventId]/artists/[artistId] - Update specific fields (like performance date)
export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;
		const updateData = await request.json();

		// Get existing artist data from Google Cloud Storage
		const existingArtist = await GCSService.getArtistData(artistId);

		if (!existingArtist || existingArtist.eventId !== eventId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found for this event",
					},
				},
				{ status: 404 }
			);
		}

		// Update the artist data with new fields
		const updatedArtist = {
			...existingArtist,
			...updateData,
			updatedAt: new Date().toISOString(),
		};

		// Save updated artist data to Google Cloud Storage
		await GCSService.saveArtistData(updatedArtist);

		// Update the event's artist index if performance date changed
		if (updateData.performanceDate !== undefined) {
			const artistsIndex = await readJsonFile(
				paths.artistsIndex(eventId),
				[]
			);
			const updatedIndex = artistsIndex.map((a: any) =>
				a.id === artistId
					? { ...a, performanceDate: updateData.performanceDate }
					: a
			);
			await writeJsonFile(paths.artistsIndex(eventId), updatedIndex);
		}

		// Broadcast the update to all connected clients
		await broadcastEventsUpdate();

		return NextResponse.json({
			success: true,
			artist: updatedArtist,
			message: "Artist updated successfully",
		});
	} catch (error) {
		console.error("Error updating artist in Google Cloud Storage:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "UPDATE_ARTIST_ERROR",
					message: "Failed to update artist in Google Cloud Storage",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}

// DELETE /api/events/[eventId]/artists/[artistId] - Delete a specific artist
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string; artistId: string } }
) {
	try {
		const { eventId, artistId } = params;

		// Get artist data to verify it exists
		const artist = await GCSService.getArtistData(artistId);

		if (!artist || artist.eventId !== eventId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "ARTIST_NOT_FOUND",
						message: "Artist not found for this event",
					},
				},
				{ status: 404 }
			);
		}

		// Remove from artists index
		const artistsIndex = await readJsonFile(
			paths.artistsIndex(eventId),
			[]
		);
		const updatedIndex = artistsIndex.filter((a: any) => a.id !== artistId);
		await writeJsonFile(paths.artistsIndex(eventId), updatedIndex);

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

		for (const file of filesToDelete) {
			try {
				await GCSService.deleteFile(file);
			} catch (error) {
				console.warn(`Failed to delete file ${file}:`, error);
			}
		}

		// Broadcast the update to all connected clients
		await broadcastEventsUpdate();

		return NextResponse.json({
			success: true,
			message: "Artist deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting artist:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "DELETE_ARTIST_ERROR",
					message: "Failed to delete artist",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}
