import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";
import WebSocketService from "@/lib/websocket-service";

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;
		const showOrderData = await request.json();

		// Save published show order to GCS
		await GCSService.saveJSON(
			showOrderData,
			`events/${eventId}/show-order.json`
		);

		// Send notification to all artists in the show order
		for (const item of showOrderData.items) {
			WebSocketService.sendNotification({
				id: `show_order_published_${Date.now()}_${item.artistId}`,
				type: "event_created",
				title: "Show Order Published",
				message: `You're scheduled to perform at ${item.startTime} on ${showOrderData.showDate}`,
				data: {
					eventId,
					showOrderId: showOrderData.id,
					artistId: item.artistId,
					position: item.position,
					startTime: item.startTime,
					endTime: item.endTime,
					showDate: showOrderData.showDate,
				},
				timestamp: new Date().toISOString(),
				recipients: ["artist"],
				eventId,
				artistId: item.artistId,
			});
		}

		// Send notification to stage managers and super admins
		WebSocketService.sendNotification({
			id: `show_order_published_${Date.now()}`,
			type: "event_created",
			title: "Show Order Published",
			message: `Show order for ${showOrderData.showDate} has been published to all artists`,
			data: {
				eventId,
				showOrderId: showOrderData.id,
				showDate: showOrderData.showDate,
				artistCount: showOrderData.items.length,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId,
		});

		return NextResponse.json({
			message: "Show order published successfully",
			showOrder: showOrderData,
		});
	} catch (error) {
		console.error("Error publishing show order:", error);
		return NextResponse.json(
			{ error: "Failed to publish show order" },
			{ status: 500 }
		);
	}
}
