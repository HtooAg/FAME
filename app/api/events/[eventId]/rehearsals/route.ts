import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";
import WebSocketService from "@/lib/websocket-service";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;

		// Get rehearsals from GCS
		const rehearsals = await GCSService.readJSON(
			`events/${eventId}/rehearsals.json`
		);

		return NextResponse.json({
			rehearsals: rehearsals || [],
		});
	} catch (error) {
		console.error("Error fetching rehearsals:", error);
		return NextResponse.json(
			{ error: "Failed to fetch rehearsals" },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;
		const rehearsalData = await request.json();

		// Get existing rehearsals
		const existingRehearsals =
			(await GCSService.readJSON(`events/${eventId}/rehearsals.json`)) ||
			[];

		// Add new rehearsal
		const updatedRehearsals = [...existingRehearsals, rehearsalData];

		// Save to GCS
		await GCSService.saveJSON(
			updatedRehearsals,
			`events/${eventId}/rehearsals.json`
		);

		// Send notification to the artist
		WebSocketService.notifyRehearsalScheduled({
			id: rehearsalData.id,
			artistId: rehearsalData.artistId,
			artistName: rehearsalData.artist.artistName,
			scheduledTime: `${rehearsalData.scheduledDate} ${rehearsalData.scheduledTime}`,
			eventId: eventId,
		});

		return NextResponse.json({
			message: "Rehearsal scheduled successfully",
			rehearsal: rehearsalData,
		});
	} catch (error) {
		console.error("Error creating rehearsal:", error);
		return NextResponse.json(
			{ error: "Failed to schedule rehearsal" },
			{ status: 500 }
		);
	}
}
