import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

// Initialize Google Cloud Storage
const storage = new Storage({
	projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
	keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Path to service account key
});

const bucketName =
	process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "fame-event-storage";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const eventId = formData.get("eventId") as string;
		const artistId = formData.get("artistId") as string;
		const fileType = formData.get("fileType") as string; // 'music', 'image', 'document'

		if (!file || !eventId) {
			return NextResponse.json(
				{ error: "File and eventId are required" },
				{ status: 400 }
			);
		}

		// Generate unique filename
		const fileExtension = file.name.split(".").pop();
		const fileName = `${eventId}/${fileType}/${
			artistId || "general"
		}/${uuidv4()}.${fileExtension}`;

		// Convert file to buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Upload to Google Cloud Storage
		const bucket = storage.bucket(bucketName);
		const gcsFile = bucket.file(fileName);

		await gcsFile.save(buffer, {
			metadata: {
				contentType: file.type,
				metadata: {
					eventId,
					artistId: artistId || "",
					fileType,
					originalName: file.name,
					uploadedAt: new Date().toISOString(),
				},
			},
		});

		// Make file publicly accessible
		await gcsFile.makePublic();

		// Get public URL
		const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

		return NextResponse.json({
			success: true,
			url: publicUrl,
			fileName,
			metadata: {
				eventId,
				artistId,
				fileType,
				originalName: file.name,
				size: file.size,
				contentType: file.type,
			},
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{ error: "Failed to upload file" },
			{ status: 500 }
		);
	}
}
