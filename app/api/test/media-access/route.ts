import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

/**
 * Test endpoint to verify media file access and signed URL generation
 */
export async function POST(request: NextRequest) {
	try {
		const { filePath, action } = await request.json();

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path is required" },
				{ status: 400 }
			);
		}

		switch (action) {
			case "check-exists":
				const exists = await GCSService.fileExists(filePath);
				return NextResponse.json({
					success: true,
					exists,
					filePath,
					message: exists
						? "File exists in GCS"
						: "File not found in GCS",
				});

			case "generate-signed-url":
				try {
					const signedUrl = await GCSService.getSignedUrl(
						filePath,
						24 * 60 * 60
					);
					return NextResponse.json({
						success: true,
						signedUrl,
						filePath,
						expiresIn: 24 * 60 * 60,
						message: "Signed URL generated successfully",
					});
				} catch (error: any) {
					return NextResponse.json(
						{
							success: false,
							error: error.message,
							filePath,
						},
						{ status: 500 }
					);
				}

			case "test-access":
				try {
					// First check if file exists
					const fileExists = await GCSService.fileExists(filePath);
					if (!fileExists) {
						return NextResponse.json(
							{
								success: false,
								error: "File not found in GCS",
								filePath,
							},
							{ status: 404 }
						);
					}

					// Generate signed URL
					const signedUrl = await GCSService.getSignedUrl(
						filePath,
						3600
					);

					// Test if the signed URL is accessible
					const testResponse = await fetch(signedUrl, {
						method: "HEAD",
					});

					return NextResponse.json({
						success: true,
						signedUrl,
						filePath,
						accessible: testResponse.ok,
						statusCode: testResponse.status,
						message: testResponse.ok
							? "File is accessible"
							: "File access failed",
					});
				} catch (error: any) {
					return NextResponse.json(
						{
							success: false,
							error: error.message,
							filePath,
						},
						{ status: 500 }
					);
				}

			default:
				return NextResponse.json(
					{
						error: "Invalid action. Use: check-exists, generate-signed-url, or test-access",
					},
					{ status: 400 }
				);
		}
	} catch (error: any) {
		console.error("Media access test error:", error);
		return NextResponse.json(
			{ error: error.message || "Test failed" },
			{ status: 500 }
		);
	}
}

export async function GET() {
	return NextResponse.json({
		message: "Media Access Test API",
		usage: {
			"POST /api/test/media-access": {
				description: "Test media file access and signed URL generation",
				body: {
					filePath: "string (required) - GCS file path",
					action: "string (required) - check-exists | generate-signed-url | test-access",
				},
			},
		},
		examples: {
			checkExists: {
				filePath: "artists/test-artist/music/test-file.mp3",
				action: "check-exists",
			},
			generateSignedUrl: {
				filePath: "artists/test-artist/music/test-file.mp3",
				action: "generate-signed-url",
			},
			testAccess: {
				filePath: "artists/test-artist/music/test-file.mp3",
				action: "test-access",
			},
		},
	});
}
