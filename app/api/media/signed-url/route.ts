import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { filePath } = body;

		console.log("Signed URL request for path:", filePath);

		if (!filePath) {
			return NextResponse.json(
				{
					success: false,
					error: "File path is required",
				},
				{ status: 400 }
			);
		}

		// Generate a signed URL for the file
		const signedUrl = await GCSService.getSignedUrl(filePath, 24 * 60 * 60); // 24 hours

		console.log("Generated signed URL successfully for:", filePath);

		return NextResponse.json({
			success: true,
			signedUrl,
		});
	} catch (error) {
		console.error("Error generating signed URL:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to generate signed URL",
			},
			{ status: 500 }
		);
	}
}
