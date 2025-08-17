import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;

		// Download emergency broadcasts from GCS
		const fileName = `events/${eventId}/emergency-broadcasts/broadcasts.json`;

		try {
			const broadcasts = await GCSService.readJSON(fileName);

			// Filter only active broadcasts
			const activeBroadcasts = broadcasts.filter(
				(broadcast: any) => broadcast.is_active
			);

			return NextResponse.json({
				success: true,
				data: activeBroadcasts,
			});
		} catch (error) {
			// If file doesn't exist, return empty array
			return NextResponse.json({
				success: true,
				data: [],
			});
		}
	} catch (error) {
		console.error("Error fetching emergency broadcasts:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch emergency broadcasts",
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const body = await request.json();
		const { message, emergency_code, is_active = true } = body;

		if (!message || !emergency_code) {
			return NextResponse.json(
				{
					success: false,
					error: "Message and emergency code are required",
				},
				{ status: 400 }
			);
		}

		// Create new broadcast
		const newBroadcast = {
			id: `broadcast_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			message,
			emergency_code,
			is_active,
			created_at: new Date().toISOString(),
		};

		// Download existing broadcasts
		const fileName = `events/${eventId}/emergency-broadcasts/broadcasts.json`;
		let broadcasts = [];

		try {
			broadcasts = (await GCSService.readJSON(fileName)) || [];
		} catch (error) {
			// File doesn't exist, start with empty array
			broadcasts = [];
		}

		// Add new broadcast
		broadcasts.push(newBroadcast);

		// Upload updated broadcasts to GCS
		await GCSService.saveJSON(broadcasts, fileName);

		// Broadcast to all connected dashboards via SSE
		try {
			const { broadcastToAllClients } = await import(
				"@/app/api/events/[eventId]/live-updates/route"
			);
			broadcastToAllClients({
				type: "emergency-alert",
				data: newBroadcast,
				eventId,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error(
				"Failed to broadcast emergency alert via SSE:",
				error
			);
		}

		return NextResponse.json({
			success: true,
			data: newBroadcast,
		});
	} catch (error) {
		console.error("Error creating emergency broadcast:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create emergency broadcast",
			},
			{ status: 500 }
		);
	}
}
