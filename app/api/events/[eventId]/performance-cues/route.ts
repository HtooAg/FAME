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

		// Get performance cues data from GCS
		const fileName = `${eventId}/data/performance-cues.json`;
		const file = bucket.file(fileName);

		try {
			const [exists] = await file.exists();
			if (!exists) {
				return NextResponse.json({ cues: [] });
			}

			const [contents] = await file.download();
			const cues = JSON.parse(contents.toString());

			return NextResponse.json({ cues });
		} catch (error) {
			// File doesn't exist, return empty array
			return NextResponse.json({ cues: [] });
		}
	} catch (error) {
		console.error("Error fetching performance cues:", error);
		return NextResponse.json(
			{ error: "Failed to fetch performance cues" },
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
		const cueData = await request.json();

		const bucket = storage.bucket(bucketName);
		const fileName = `${eventId}/data/performance-cues.json`;
		const file = bucket.file(fileName);

		// Get existing cues
		let cues = [];
		try {
			const [exists] = await file.exists();
			if (exists) {
				const [contents] = await file.download();
				cues = JSON.parse(contents.toString());
			}
		} catch (error) {
			// File doesn't exist, start with empty array
		}

		// Calculate next performance order
		const nextOrder =
			cues.length > 0
				? Math.max(...cues.map((c: any) => c.performanceOrder || 0)) + 1
				: 1;

		// Add new cue with ID and timestamps
		const newCue = {
			id: `cue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			...cueData,
			performanceOrder: nextOrder,
			isCompleted: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		cues.push(newCue);

		// Save back to GCS
		await file.save(JSON.stringify(cues, null, 2), {
			metadata: {
				contentType: "application/json",
			},
		});

		// Broadcast update via WebSocket
		WebSocketManager.broadcast(eventId, {
			type: "CUE_ADDED",
			data: newCue,
		});

		return NextResponse.json({ success: true, cue: newCue });
	} catch (error) {
		console.error("Error creating performance cue:", error);
		return NextResponse.json(
			{ error: "Failed to create performance cue" },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const { cueId, ...updateData } = await request.json();

		const bucket = storage.bucket(bucketName);
		const fileName = `${eventId}/data/performance-cues.json`;
		const file = bucket.file(fileName);

		// Get existing cues
		const [contents] = await file.download();
		const cues = JSON.parse(contents.toString());

		// Update cue
		const cueIndex = cues.findIndex((c: any) => c.id === cueId);
		if (cueIndex === -1) {
			return NextResponse.json(
				{ error: "Performance cue not found" },
				{ status: 404 }
			);
		}

		cues[cueIndex] = {
			...cues[cueIndex],
			...updateData,
			updatedAt: new Date().toISOString(),
		};

		// Save back to GCS
		await file.save(JSON.stringify(cues, null, 2), {
			metadata: {
				contentType: "application/json",
			},
		});

		// Broadcast update via WebSocket
		WebSocketManager.broadcast(eventId, {
			type: "CUE_UPDATED",
			data: cues[cueIndex],
		});

		return NextResponse.json({ success: true, cue: cues[cueIndex] });
	} catch (error) {
		console.error("Error updating performance cue:", error);
		return NextResponse.json(
			{ error: "Failed to update performance cue" },
			{ status: 500 }
		);
	}
}
