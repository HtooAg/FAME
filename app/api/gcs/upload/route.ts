import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const eventId = formData.get("eventId") as string;
		const artistId = formData.get("artistId") as string;
		const fileType = formData.get("fileType") as string; // "music", "images", "videos"

		console.log("Upload request:", {
			fileName: file?.name,
			fileSize: file?.size,
			fileType,
			eventId,
			artistId,
		});

		if (!file) {
			return NextResponse.json(
				{
					success: false,
					error: "No file provided",
				},
				{ status: 400 }
			);
		}

		if (!eventId || !artistId || !fileType) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required parameters: eventId, artistId, or fileType",
				},
				{ status: 400 }
			);
		}

		// Convert file to buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Generate unique filename
		const timestamp = Date.now();
		const randomString = Math.random().toString(36).substring(2, 11);
		const fileExtension = file.name.split(".").pop() || "";
		const fileName = `${file.name.replace(
			/[^a-zA-Z0-9.-]/g,
			"_"
		)}_${timestamp}_${randomString}.${fileExtension}`;

		// Determine folder structure based on file type
		const folder = `events/${eventId}/artists/${artistId}/${fileType}`;

		console.log("Uploading to GCS:", { fileName, folder });

		// Upload file to Google Cloud Storage
		const uploadResult = await GCSService.uploadFile(
			buffer,
			fileName,
			folder,
			file.type
		);

		console.log("Upload successful:", uploadResult);

		return NextResponse.json({
			success: true,
			url: uploadResult.url,
			fileName: uploadResult.gcsPath,
			size: uploadResult.size,
			contentType: uploadResult.contentType,
		});
	} catch (error) {
		console.error("Error uploading file to GCS:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to upload file",
			},
			{ status: 500 }
		);
	}
}
