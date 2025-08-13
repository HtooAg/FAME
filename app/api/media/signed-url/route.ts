import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function POST(request: NextRequest) {
	try {
		const { filePath } = await request.json();

		if (!filePath) {
			return NextResponse.json(
				{ success: false, error: "File path is required" },
				{ status: 400 }
			);
		}

		// Validate file path format
		if (
			typeof filePath !== "string" ||
			filePath.includes("..") ||
			filePath.startsWith("/")
		) {
			return NextResponse.json(
				{ success: false, error: "Invalid file path format" },
				{ status: 400 }
			);
		}

		// Check if file exists before generating signed URL
		const fileExists = await GCSService.fileExists(filePath);
		if (!fileExists) {
			return NextResponse.json(
				{ success: false, error: "File not found in storage" },
				{ status: 404 }
			);
		}

		// Generate signed URL with 24-hour expiration
		const signedUrl = await GCSService.getSignedUrl(filePath, 24 * 60 * 60);

		return NextResponse.json({
			success: true,
			signedUrl,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
		});
	} catch (error: any) {
		console.error("Error generating signed URL:", error);

		// Handle specific error types
		if (error.message?.includes("not found")) {
			return NextResponse.json(
				{ success: false, error: "File not found in storage" },
				{ status: 404 }
			);
		} else if (error.message?.includes("access")) {
			return NextResponse.json(
				{ success: false, error: "Access denied to file" },
				{ status: 403 }
			);
		} else {
			return NextResponse.json(
				{ success: false, error: "Failed to generate signed URL" },
				{ status: 500 }
			);
		}
	}
}

// GET endpoint for checking file existence
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const filePath = searchParams.get("filePath");

		if (!filePath) {
			return NextResponse.json(
				{ success: false, error: "File path is required" },
				{ status: 400 }
			);
		}

		const fileExists = await GCSService.fileExists(filePath);

		return NextResponse.json({
			success: true,
			exists: fileExists,
		});
	} catch (error) {
		console.error("Error checking file existence:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to check file existence" },
			{ status: 500 }
		);
	}
}
