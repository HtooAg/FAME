import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string; broadcastId: string } }
) {
	try {
		const { eventId, broadcastId } = params;
		const body = await request.json();
		const { is_active } = body;

		// Download existing broadcasts
		const fileName = `events/${eventId}/emergency-broadcasts/broadcasts.json`;

		try {
			let broadcasts = await GCSService.readJSON(fileName);

			// Find and update the broadcast
			const broadcastIndex = broadcasts.findIndex(
				(b: any) => b.id === broadcastId
			);

			if (broadcastIndex === -1) {
				return NextResponse.json(
					{
						success: false,
						error: "Broadcast not found",
					},
					{ status: 404 }
				);
			}

			// Update the broadcast
			broadcasts[broadcastIndex] = {
				...broadcasts[broadcastIndex],
				is_active,
				updated_at: new Date().toISOString(),
			};

			// Upload updated broadcasts to GCS
			await GCSService.saveJSON(broadcasts, fileName);

			// Broadcast clear to all connected dashboards via SSE
			if (!is_active) {
				try {
					const { broadcastToAllClients } = await import(
						"@/app/api/events/[eventId]/live-updates/route"
					);
					broadcastToAllClients({
						type: "emergency-clear",
						broadcastId,
						eventId,
						timestamp: new Date().toISOString(),
					});
				} catch (error) {
					console.error(
						"Failed to broadcast emergency clear via SSE:",
						error
					);
				}
			}

			return NextResponse.json({
				success: true,
				data: broadcasts[broadcastIndex],
			});
		} catch (error) {
			return NextResponse.json(
				{
					success: false,
					error: "Broadcasts file not found",
				},
				{ status: 404 }
			);
		}
	} catch (error) {
		console.error("Error updating emergency broadcast:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update emergency broadcast",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string; broadcastId: string } }
) {
	try {
		const { eventId, broadcastId } = params;

		// Download existing broadcasts
		const fileName = `events/${eventId}/emergency-broadcasts/broadcasts.json`;

		try {
			let broadcasts = await GCSService.readJSON(fileName);

			// Filter out the broadcast to delete
			broadcasts = broadcasts.filter((b: any) => b.id !== broadcastId);

			// Upload updated broadcasts to GCS
			await GCSService.saveJSON(broadcasts, fileName);

			return NextResponse.json({
				success: true,
				message: "Broadcast deleted successfully",
			});
		} catch (error) {
			return NextResponse.json(
				{
					success: false,
					error: "Broadcasts file not found",
				},
				{ status: 404 }
			);
		}
	} catch (error) {
		console.error("Error deleting emergency broadcast:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to delete emergency broadcast",
			},
			{ status: 500 }
		);
	}
}
