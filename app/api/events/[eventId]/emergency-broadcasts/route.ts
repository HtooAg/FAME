import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { WebSocketManager } from "@/lib/websocket-manager";

const storage = new Storage({
	projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
	keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
});

const bucketName =
	process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "fame-event-storage";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const bucket = storage.bucket(bucketName);

		// Get emergency broadcasts data from GCS
		const fileName = `${eventId}/data/emergency-broadcasts.json`;
		const file = bucket.file(fileName);

		try {
			const [exists] = await file.exists();
			if (!exists) {
				return NextResponse.json({ broadcasts: [] });
			}

			const [contents] = await file.download();
			const allBroadcasts = JSON.parse(contents.toString());

			// Filter only active broadcasts
			const broadcasts = allBroadcasts.filter(
				(broadcast: any) => broadcast.isActive
			);

			return NextResponse.json({ broadcasts });
		} catch (error) {
			// File doesn't exist, return empty array
			return NextResponse.json({ broadcasts: [] });
		}
	} catch (error) {
		console.error("Error fetching emergency broadcasts:", error);
		return NextResponse.json(
			{ error: "Failed to fetch emergency broadcasts" },
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
		const broadcastData = await request.json();

		const bucket = storage.bucket(bucketName);
		const fileName = `${eventId}/data/emergency-broadcasts.json`;
		const file = bucket.file(fileName);

		// Get existing broadcasts
		let broadcasts = [];
		try {
			const [exists] = await file.exists();
			if (exists) {
				const [contents] = await file.download();
				broadcasts = JSON.parse(contents.toString());
			}
		} catch (error) {
			// File doesn't exist, start with empty array
		}

		// Add new broadcast with ID and timestamps
		const newBroadcast = {
			id: `broadcast_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			...broadcastData,
			isActive: true,
			createdAt: new Date().toISOString(),
		};

		broadcasts.push(newBroadcast);

		// Save back to GCS
		await file.save(JSON.stringify(broadcasts, null, 2), {
			metadata: {
				contentType: "application/json",
			},
		});

		// Broadcast update via WebSocket
		WebSocketManager.broadcast(eventId, {
			type: "EMERGENCY_BROADCAST",
			data: newBroadcast,
		});

		return NextResponse.json({ success: true, broadcast: newBroadcast });
	} catch (error) {
		console.error("Error creating emergency broadcast:", error);
		return NextResponse.json(
			{ error: "Failed to create emergency broadcast" },
			{ status: 500 }
		);
	}
}
