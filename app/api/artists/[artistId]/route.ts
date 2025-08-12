import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, paths } from "@/lib/gcs";
import GCSService from "@/lib/google-cloud-storage";
import { ArtistProfile, ApiError, ApiSuccess } from "@/lib/types/artist";

// GET /api/artists/[artistId] - Fetch individual artist profile
export async function GET(
	request: NextRequest,
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = params;

		if (!artistId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_ARTIST_ID",
						message: "Artist ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Try to read the full aggregated artist data from GCS structured files
		const artistPath = `artists/${artistId}/profile.json`;

		try {
			// Primary: aggregate from structured files (profile, technical, music, gallery)
			let artistData = (await GCSService.getArtistData(
				artistId
			)) as ArtistProfile | null;

			// Fallback 1: new single profile.json if aggregation returns null
			if (!artistData) {
				artistData = await readJsonFile<ArtistProfile>(artistPath);
			}

			// Fallback 2: legacy flat file path if profile.json not present
			if (!artistData) {
				const legacyPath = paths.artistFile(artistId);
				artistData = await readJsonFile<ArtistProfile>(legacyPath);
			}

			if (!artistData) {
				return NextResponse.json(
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

			// Normalize flat fields from technicalRequirements for backward compatibility
			const tr = (artistData as any).technicalRequirements || {};
			const normalized: ArtistProfile = {
				...artistData,
				costumeColor:
					artistData.costumeColor ?? tr.costumeColor ?? artistData.costumeColor,
				customCostumeColor:
					artistData.customCostumeColor ?? tr.customCostumeColor,
				lightColorSingle:
					artistData.lightColorSingle ?? tr.lightColorSingle ?? artistData.lightColorSingle,
				lightColorTwo:
					artistData.lightColorTwo ?? tr.lightColorTwo ?? "none",
				lightColorThree:
					artistData.lightColorThree ?? tr.lightColorThree ?? "none",
				lightRequests:
					artistData.lightRequests ?? tr.lightRequests ?? "",
				stagePositionStart:
					artistData.stagePositionStart ?? tr.stagePositionStart ?? "",
				stagePositionEnd:
					artistData.stagePositionEnd ?? tr.stagePositionEnd ?? "",
				customStagePosition:
					artistData.customStagePosition ?? tr.customStagePosition,
				mcNotes: artistData.mcNotes ?? tr.mcNotes ?? "",
				stageManagerNotes:
					artistData.stageManagerNotes ?? tr.stageManagerNotes ?? "",
				// Ensure media arrays exist when missing
				musicTracks: artistData.musicTracks ?? [],
				galleryFiles: artistData.galleryFiles ?? [],
			};

			const successResponse: ApiSuccess<ArtistProfile> = {
				success: true,
				data: normalized,
				timestamp: new Date().toISOString(),
			};
			return NextResponse.json(successResponse);
		} catch (gcsError) {
			console.error(
				`Error reading artist ${artistId} from GCS:`,
				gcsError
			);

			// Check if it's a "not found" error
			if (
				(gcsError as any)?.code === 404 ||
				(gcsError as any)?.message?.includes("No such object")
			) {
				return NextResponse.json(
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

			// Other GCS errors
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "STORAGE_ERROR",
						message: "Failed to retrieve artist profile",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in GET /api/artists/[artistId]:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// PUT /api/artists/[artistId] - Update artist profile
export async function PUT(
	request: NextRequest,
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = params;
		const updateData = await request.json();

		if (!artistId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_ARTIST_ID",
						message: "Artist ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Read existing artist data
		const artistPath = `artists/${artistId}/profile.json`;

		try {
			const existingData = await readJsonFile<ArtistProfile>(artistPath);

			if (!existingData) {
				return NextResponse.json(
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

			// Merge the update data with existing data
			const updatedArtist: ArtistProfile = {
				...existingData,
				...updateData,
				id: artistId, // Ensure ID doesn't change
				updatedAt: new Date().toISOString(),
			};

			// Save updated data back to GCS
			await writeJsonFile(artistPath, updatedArtist);

			return NextResponse.json({
				success: true,
				data: updatedArtist,
				message: "Artist profile updated successfully",
				timestamp: new Date().toISOString(),
			});
		} catch (gcsError) {
			console.error(
				`Error updating artist ${artistId} in GCS:`,
				gcsError
			);

			if (
				(gcsError as any)?.code === 404 ||
				(gcsError as any)?.message?.includes("No such object")
			) {
				return NextResponse.json(
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

			return NextResponse.json(
				{
					success: false,
					error: {
						code: "STORAGE_ERROR",
						message: "Failed to update artist profile",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in PUT /api/artists/[artistId]:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// DELETE /api/artists/[artistId] - Delete artist profile (optional)
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { artistId: string } }
) {
	try {
		const { artistId } = params;

		if (!artistId) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_ARTIST_ID",
						message: "Artist ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// For now, we'll just mark the artist as inactive instead of deleting
		const artistPath = `artists/${artistId}/profile.json`;

		try {
			const existingData = await readJsonFile<ArtistProfile>(artistPath);

			if (!existingData) {
				return NextResponse.json(
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

			// Mark as inactive instead of deleting
			const updatedArtist: ArtistProfile = {
				...existingData,
				status: "inactive",
				updatedAt: new Date().toISOString(),
			};

			await writeJsonFile(artistPath, updatedArtist);

			return NextResponse.json({
				success: true,
				message: "Artist profile deactivated successfully",
				timestamp: new Date().toISOString(),
			});
		} catch (gcsError) {
			console.error(
				`Error deactivating artist ${artistId} in GCS:`,
				gcsError
			);

			return NextResponse.json(
				{
					success: false,
					error: {
						code: "STORAGE_ERROR",
						message: "Failed to deactivate artist profile",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error("Error in DELETE /api/artists/[artistId]:", error);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "An internal error occurred",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
