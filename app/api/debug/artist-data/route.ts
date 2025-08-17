import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

// Force dynamic rendering since this route uses request.url
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");
		const eventId = searchParams.get("eventId");

		if (!artistId) {
			return NextResponse.json(
				{
					success: false,
					error: "Artist ID is required",
				},
				{ status: 400 }
			);
		}

		// Get artist data
		const artistData = await GCSService.getArtistData(artistId);

		// Also get event-specific data if eventId provided
		let eventSpecificData = null;
		if (eventId) {
			try {
				eventSpecificData = await GCSService.readJSON(
					`events/${eventId}/artists/${artistId}.json`
				);
			} catch (error) {
				console.log(
					`No event-specific data found for artist ${artistId} in event ${eventId}`
				);
			}
		}

		return NextResponse.json({
			success: true,
			artistId,
			eventId,
			artistData,
			eventSpecificData,
			performanceAssignment: {
				fromArtistData: {
					performanceDate: artistData?.performanceDate,
					performance_date: artistData?.performance_date,
				},
				fromEventData: eventSpecificData
					? {
							performanceDate: eventSpecificData.performanceDate,
							performance_date:
								eventSpecificData.performance_date,
					  }
					: null,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: unknown) {
		console.error("Error debugging artist data:", error);
		const message =
			typeof error === "object" && error && "message" in error
				? String((error as any).message)
				: "Unknown error";
		return NextResponse.json(
			{
				success: false,
				error: "Failed to debug artist data",
				details: message,
			},
			{ status: 500 }
		);
	}
}
