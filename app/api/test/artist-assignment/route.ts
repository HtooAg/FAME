import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const eventId = searchParams.get("eventId");

		if (!eventId) {
			return NextResponse.json(
				{
					success: false,
					error: "Event ID is required",
				},
				{ status: 400 }
			);
		}

		const testResults = {
			totalArtists: 0,
			assignedArtists: 0,
			unassignedArtists: 0,
			artists: [] as any[],
			errors: [] as string[],
		};

		try {
			// Get all artists for the event
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
				// Fetch all artist data
				const artists = await GCSService.batchGetArtistData(artistIds);

				testResults.totalArtists = artists.length;

				// Analyze assignment status
				artists.forEach((artist) => {
					if (!artist) return;

					const hasAssignment = !!(
						artist.performanceDate || artist.performance_date
					);

					if (hasAssignment) {
						testResults.assignedArtists++;
					} else {
						testResults.unassignedArtists++;
					}

					testResults.artists.push({
						id: artist.id,
						name: artist.artistName || artist.artist_name,
						performanceDate:
							artist.performanceDate || artist.performance_date,
						status: artist.status || "pending",
						hasAssignment,
					});
				});
			}
		} catch (error: any) {
			testResults.errors.push(`Error fetching artists: ${error.message}`);
		}

		return NextResponse.json({
			success: true,
			eventId,
			results: testResults,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error testing artist assignments:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to test artist assignments",
				details: error.message,
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { eventId, artistId, performanceDate } = await request.json();

		if (!eventId || !artistId) {
			return NextResponse.json(
				{
					success: false,
					error: "Event ID and Artist ID are required",
				},
				{ status: 400 }
			);
		}

		// Test assignment by directly updating the artist data
		const currentData = await GCSService.getArtistData(artistId);
		if (!currentData) {
			return NextResponse.json(
				{
					success: false,
					error: "Artist not found",
				},
				{ status: 404 }
			);
		}

		// Update the artist data
		const updatedData = {
			...currentData,
			performance_date: performanceDate,
			performanceDate: performanceDate,
			updatedAt: new Date().toISOString(),
		};

		// Save to GCS
		await GCSService.saveArtistData(updatedData);

		// Verify the save worked
		const verificationData = await GCSService.getArtistData(artistId);
		const savedCorrectly = !!(
			verificationData?.performanceDate ||
			verificationData?.performance_date
		);

		return NextResponse.json({
			success: true,
			message: "Test assignment completed",
			artistId,
			performanceDate,
			savedCorrectly,
			verificationData: {
				performanceDate: verificationData?.performanceDate,
				performance_date: verificationData?.performance_date,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error testing artist assignment:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to test artist assignment",
				details: error.message,
			},
			{ status: 500 }
		);
	}
}
