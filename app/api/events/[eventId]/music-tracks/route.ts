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
		const { searchParams } = new URL(request.url);
		const artistIds = searchParams.get("artistIds")?.split(",") || [];

		const bucket = storage.bucket(bucketName);

		// Get music tracks data from GCS
		const fileName = `${eventId}/data/music-tracks.json`;
		const file = bucket.file(fileName);

		try {
			const [exists] = await file.exists();
			if (!exists) {
				return NextResponse.json({ tracks: [] });
			}

			const [contents] = await file.download();
			const allTracks = JSON.parse(contents.toString());

			// Filter tracks by artist IDs if provided
			const tracks =
				artistIds.length > 0
					? allTracks.filter((track: any) =>
							artistIds.includes(track.artistId)
					  )
					: allTracks;

			return NextResponse.json({ tracks });
		} catch (error) {
			// File doesn't exist, return empty array
			return NextResponse.json({ tracks: [] });
		}
	} catch (error) {
		console.error("Error fetching music tracks:", error);
		return NextResponse.json(
			{ error: "Failed to fetch music tracks" },
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
		const trackData = await request.json();

		const bucket = storage.bucket(bucketName);
		const fileName = `${eventId}/data/music-tracks.json`;
		const file = bucket.file(fileName);

		// Get existing tracks
		let tracks = [];
		try {
			const [exists] = await file.exists();
			if (exists) {
				const [contents] = await file.download();
				tracks = JSON.parse(contents.toString());
			}
		} catch (error) {
			// File doesn't exist, start with empty array
		}

		// Add new track with ID and timestamps
		const newTrack = {
			id: `track_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			...trackData,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		tracks.push(newTrack);

		// Save back to GCS
		await file.save(JSON.stringify(tracks, null, 2), {
			metadata: {
				contentType: "application/json",
			},
		});

		// Broadcast update via WebSocket
		WebSocketManager.broadcast(eventId, {
			type: "MUSIC_TRACK_ADDED",
			data: newTrack,
		});

		return NextResponse.json({ success: true, track: newTrack });
	} catch (error) {
		console.error("Error creating music track:", error);
		return NextResponse.json(
			{ error: "Failed to create music track" },
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
		const { trackId, ...updateData } = await request.json();

		const bucket = storage.bucket(bucketName);
		const fileName = `${eventId}/data/music-tracks.json`;
		const file = bucket.file(fileName);

		// Get existing tracks
		const [contents] = await file.download();
		const tracks = JSON.parse(contents.toString());

		// Update track
		const trackIndex = tracks.findIndex((t: any) => t.id === trackId);
		if (trackIndex === -1) {
			return NextResponse.json(
				{ error: "Music track not found" },
				{ status: 404 }
			);
		}

		tracks[trackIndex] = {
			...tracks[trackIndex],
			...updateData,
			updatedAt: new Date().toISOString(),
		};

		// Save back to GCS
		await file.save(JSON.stringify(tracks, null, 2), {
			metadata: {
				contentType: "application/json",
			},
		});

		// Broadcast update via WebSocket
		WebSocketManager.broadcast(eventId, {
			type: "MUSIC_TRACK_UPDATED",
			data: tracks[trackIndex],
		});

		return NextResponse.json({ success: true, track: tracks[trackIndex] });
	} catch (error) {
		console.error("Error updating music track:", error);
		return NextResponse.json(
			{ error: "Failed to update music track" },
			{ status: 500 }
		);
	}
}
