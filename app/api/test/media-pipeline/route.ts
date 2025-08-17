import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";
import { validateMediaFile } from "@/lib/media-validation";

/**
 * Test endpoint to verify media upload and playback functionality
 */
export async function POST(request: NextRequest) {
	try {
		const { action, ...params } = await request.json();

		switch (action) {
			case "validate-file":
				return handleValidateFile(params);
			case "check-file-exists":
				return handleCheckFileExists(params);
			case "test-signed-url":
				return handleTestSignedUrl(params);
			case "test-blob-detection":
				return handleTestBlobDetection(params);
			default:
				return NextResponse.json(
					{ error: "Invalid action" },
					{ status: 400 }
				);
		}
	} catch (error: any) {
		console.error("Media pipeline test error:", error);
		return NextResponse.json(
			{ error: error.message || "Test failed" },
			{ status: 500 }
		);
	}
}

async function handleValidateFile(params: any) {
	const { fileName, fileSize, fileType, mediaType } = params;

	if (!fileName || !fileSize || !fileType || !mediaType) {
		return NextResponse.json(
			{
				error: "Missing required parameters: fileName, fileSize, fileType, mediaType",
			},
			{ status: 400 }
		);
	}

	const validation = validateMediaFile(
		{
			name: fileName,
			size: fileSize,
			type: fileType,
		},
		mediaType
	);

	return NextResponse.json({
		success: true,
		validation,
		message: validation.isValid
			? "File validation passed"
			: "File validation failed",
	});
}

async function handleCheckFileExists(params: any) {
	const { filePath } = params;

	if (!filePath) {
		return NextResponse.json(
			{ error: "Missing required parameter: filePath" },
			{ status: 400 }
		);
	}

	const exists = await GCSService.fileExists(filePath);

	return NextResponse.json({
		success: true,
		exists,
		filePath,
		message: exists ? "File exists in GCS" : "File not found in GCS",
	});
}

async function handleTestSignedUrl(params: any) {
	const { filePath } = params;

	if (!filePath) {
		return NextResponse.json(
			{ error: "Missing required parameter: filePath" },
			{ status: 400 }
		);
	}

	try {
		// Check if file exists first
		const exists = await GCSService.fileExists(filePath);
		if (!exists) {
			return NextResponse.json({
				success: false,
				error: "File not found in GCS",
				filePath,
			});
		}

		// Generate signed URL
		const signedUrl = await GCSService.getSignedUrl(filePath, 3600); // 1 hour

		return NextResponse.json({
			success: true,
			signedUrl,
			filePath,
			expiresIn: 3600,
			message: "Signed URL generated successfully",
		});
	} catch (error: any) {
		return NextResponse.json({
			success: false,
			error: error.message,
			filePath,
		});
	}
}

async function handleTestBlobDetection(params: any) {
	const { url } = params;

	if (!url) {
		return NextResponse.json(
			{ error: "Missing required parameter: url" },
			{ status: 400 }
		);
	}

	const isBlob = GCSService.isBlobUrl(url);

	return NextResponse.json({
		success: true,
		url,
		isBlob,
		message: isBlob
			? "URL is a blob URL that needs refreshing"
			: "URL is valid",
	});
}

export async function GET() {
	return NextResponse.json({
		message: "Media Pipeline Test API",
		endpoints: {
			"POST /api/test/media-pipeline": {
				description: "Test various media pipeline functions",
				actions: [
					{
						action: "validate-file",
						params: [
							"fileName",
							"fileSize",
							"fileType",
							"mediaType",
						],
						description: "Validate a media file for upload",
					},
					{
						action: "check-file-exists",
						params: ["filePath"],
						description: "Check if a file exists in GCS",
					},
					{
						action: "test-signed-url",
						params: ["filePath"],
						description: "Generate a signed URL for a file",
					},
					{
						action: "test-blob-detection",
						params: ["url"],
						description: "Test blob URL detection",
					},
				],
			},
		},
		examples: {
			validateFile: {
				action: "validate-file",
				fileName: "test.mp3",
				fileSize: 5000000,
				fileType: "audio/mpeg",
				mediaType: "audio",
			},
			checkFileExists: {
				action: "check-file-exists",
				filePath: "artists/test-artist/music/test-file.mp3",
			},
			testSignedUrl: {
				action: "test-signed-url",
				filePath: "artists/test-artist/music/test-file.mp3",
			},
			testBlobDetection: {
				action: "test-blob-detection",
				url: "blob:http://localhost:3000/abc123",
			},
		},
	});
}
