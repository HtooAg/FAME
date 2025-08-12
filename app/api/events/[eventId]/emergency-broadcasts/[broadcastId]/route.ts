import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { WebSocketManager } from "@/lib/websocket-manager";

const storage = new Storage({
	projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
	keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
});

const bucketName =
	process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "fame-event-storage";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string; broadcastId: string } }
) {
	try {
		const { eventId, broadcastId } = params;

		const bucket = storage.bucket(bucketName);
		const fileName = `${eventId}/data/emergency-broadcasts.json`;
		const file = bucket.file(fileName);

		// Get existing broadcasts
		const [contents] = await file.download();
		const broadcasts = JSON.parse(contents.toString());

		// Mark broadcast as inactive instead of deleting
		const broadcastIndex = broadcasts.findIndex(
			(b: any) => b.id === broadcastId
		);
		if (broadcastIndex === -1) {
			return NextResponse.json(
				{ error: "Emergency broadcast not found" },
				{ status: 404 }
			);
		}

		broadcasts[broadcastIndex].isActive = false;
		broadcasts[broadcastIndex].deactivatedAt = new Date().toISOString();

		// Save back to GCS
		await file.save(JSON.stringify(broadcasts, null, 2), {
			metadata: {
				contentType: "application/json",
			},
		});

		// Broadcast update via WebSocket
		WebSocketManager.broadcast(eventId, {
			type: "EMERGENCY_CLEARED",
			data: { broadcastId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deactivating emergency broadcast:", error);
		return NextResponse.json(
			{ error: "Failed to deactivate emergency broadcast" },
			{ status: 500 }
		);
	}
}
