import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";

// Force dynamic rendering since this route uses request.url
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");

		if (artistId) {
			// Get specific artist profile from GCS
			const profile = await GCSService.getArtistData(artistId);

			if (!profile) {
				return NextResponse.json(
					{ error: "Artist profile not found" },
					{ status: 404 }
				);
			}

			return NextResponse.json(profile);
		}

		// For demo purposes, get the latest artist from a sample event
		// In a real app, this would be based on user authentication
		try {
			// Try to get artists from a sample event
			const sampleEventId = "01bf1015-f94b-4944-9d10-470ebd69778e"; // Use existing event ID
			const eventArtists = await GCSService.getEventArtists(
				sampleEventId
			);

			if (eventArtists.length === 0) {
				return NextResponse.json(
					{ error: "No artist profiles found" },
					{ status: 404 }
				);
			}

			// Return the most recent artist
			const latestArtist = eventArtists[eventArtists.length - 1];
			return NextResponse.json(latestArtist);
		} catch (error) {
			// If GCS fails, return a fallback response
			return NextResponse.json(
				{ error: "No artist profiles found in Google Cloud Storage" },
				{ status: 404 }
			);
		}
	} catch (error) {
		console.error("Error fetching artist profile:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch artist profile from Google Cloud Storage",
			},
			{ status: 500 }
		);
	}
}
