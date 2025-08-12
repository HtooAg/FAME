import { NextRequest, NextResponse } from "next/server";
import GCSService from "@/lib/google-cloud-storage";
import WebSocketService from "@/lib/websocket-service";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;

		// Get show order from GCS
		const showOrder = await GCSService.readJSON(
			`events/${eventId}/show-order.json`
		);

		return NextResponse.json(showOrder);
	} catch (error) {
		console.error("Error fetching show order:", error);
		return NextResponse.json(
			{ error: "Failed to fetch show order" },
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
		const showOrderData = await request.json();

		// Save show order to GCS
		await GCSService.saveJSON(
			showOrderData,
			`events/${eventId}/show-order.json`
		);

		// Send notification to artists and super admins
		WebSocketService.sendNotification({
			id: `show_order_created_${Date.now()}`,
			type: "event_created",
			title: "Show Order Created",
			message: `Show order has been created for ${showOrderData.showDate}`,
			data: {
				eventId,
				showOrderId: showOrderData.id,
				showDate: showOrderData.showDate,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId,
		});

		return NextResponse.json({
			message: "Show order created successfully",
			showOrder: showOrderData,
		});
	} catch (error) {
		console.error("Error creating show order:", error);
		return NextResponse.json(
			{ error: "Failed to create show order" },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;
		const showOrderData = await request.json();

		// Update show order in GCS
		await GCSService.saveJSON(
			showOrderData,
			`events/${eventId}/show-order.json`
		);

		return NextResponse.json({
			message: "Show order updated successfully",
			showOrder: showOrderData,
		});
	} catch (error) {
		console.error("Error updating show order:", error);
		return NextResponse.json(
			{ error: "Failed to update show order" },
			{ status: 500 }
		);
	}
}
