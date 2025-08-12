import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";

export async function POST(request: NextRequest) {
	try {
		const { email, artistName } = await request.json();

		// In a real app, you would search through all artists in GCS
		// For now, we'll simulate finding an artist

		// Try to find artist by email and name
		// This is a simplified search - in production, you'd have a proper index
		const sampleArtist = {
			id: "artist_1755011489205_xswjcvfdv",
			artistName: "Water Festival Stage",
			realName: "John Wick (Htoo Aung Wai)",
			email: "john@gmail.com",
			phone: "052 211 6024",
			style: "Death Metal",
			performanceType: "other",
			performanceDuration: 5,
			biography: "I like Death Metal.",
			costumeColor: "red",
			lightColorSingle: "blue",
			lightColorTwo: "magenta",
			lightColorThree: "amber",
			stagePositionStart: "downstage-left",
			stagePositionEnd: "left",
			socialMedia: {
				instagram: "https://www.officeolympics.io",
				facebook: "https://www.officeolympics.io",
				youtube: "https://www.officeolympics.io",
				tiktok: "https://www.officeolympics.io",
				website: "https://www.officeolympics.io",
			},
			eventId: "01bf1015-f94b-4944-9d10-470ebd69778e",
			eventName: "EDM Festival",
			status: "pending",
			createdAt: "2025-08-12T15:11:29.205Z",
			musicTracks: [
				{
					song_title: "Metal",
					duration: 2,
					notes: "No one",
					is_main_track: true,
					tempo: "medium",
				},
			],
			galleryFiles: [],
		};

		// Check if the provided credentials match
		if (
			sampleArtist.email.toLowerCase() === email.toLowerCase() &&
			sampleArtist.artistName.toLowerCase() === artistName.toLowerCase()
		) {
			return NextResponse.json({
				success: true,
				artist: sampleArtist,
			});
		}

		// In a real implementation, you would:
		// 1. Search through GCS for artists with matching email
		// 2. Verify the artist name matches
		// 3. Return the artist data if found

		return NextResponse.json(
			{ error: "Artist not found" },
			{ status: 404 }
		);
	} catch (error) {
		console.error("Artist login error:", error);
		return NextResponse.json({ error: "Login failed" }, { status: 500 });
	}
}
