import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";
import WebSocketService from "@/lib/websocket-service";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; rehearsalId: string } }
) {
	try {
		const eventId = params.eventId;
		const rehearsalId = params.rehearsalId;
		const updateData = await request.json();

		// Get existing rehearsals
		const rehearsals =
			(await GCSService.readJSON(`events/${eventId}/rehearsals.json`)) ||
			[];

		// Find and update the rehearsal
		const rehearsalIndex = rehearsals.findIndex(
			(r: any) => r.id === rehearsalId
		);

		if (rehearsalIndex === -1) {
			return NextResponse.json(
				{ error: "Rehearsal not found" },
				{ status: 404 }
			);
		}

		// Update the rehearsal
		rehearsals[rehearsalIndex] = {
			...rehearsals[rehearsalIndex],
			...updateData,
		};

		// Save to GCS
		await GCSService.saveJSON(
			rehearsals,
			`events/${eventId}/rehearsals.json`
		);

		// Send notification if rating was updated
		if (updateData.rating && updateData.status === "completed") {
			WebSocketService.sendNotification({
				id: `rehearsal_rated_${Date.now()}`,
				type: "rehearsal_scheduled",
				title: "Rehearsal Completed",
				message: `Your rehearsal has been completed with a ${updateData.rating}-star rating`,
				data: {
					rehearsalId,
					rating: updateData.rating,
					feedback: updateData.feedback,
					eventId,
				},
				timestamp: new Date().toISOString(),
				recipients: ["artist"],
				eventId,
				artistId: rehearsals[rehearsalIndex].artistId,
			});
		}

		return NextResponse.json({
			message: "Rehearsal updated successfully",
			rehearsal: rehearsals[rehearsalIndex],
		});
	} catch (error) {
		console.error("Error updating rehearsal:", error);
		return NextResponse.json(
			{ error: "Failed to update rehearsal" },
			{ status: 500 }
		);
	}
}
