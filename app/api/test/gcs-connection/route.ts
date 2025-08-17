import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

/**
 * Test endpoint to verify Google Cloud Storage connection and permissions
 */
export async function GET() {
	try {
		// Check environment variables
		const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
		const keyFile = process.env.GOOGLE_CLOUD_KEY_FILE;
		const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
		const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || "fame-data";

		const envCheck = {
			GOOGLE_CLOUD_PROJECT_ID: !!projectId,
			GOOGLE_CLOUD_KEY_FILE: !!keyFile,
			GOOGLE_CLOUD_CREDENTIALS: !!credentials,
			GOOGLE_CLOUD_BUCKET_NAME: !!process.env.GOOGLE_CLOUD_BUCKET_NAME,
		};

		if (!projectId) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing GOOGLE_CLOUD_PROJECT_ID environment variable",
					envCheck,
				},
				{ status: 500 }
			);
		}

		// Initialize storage
		const storageConfig: any = {
			projectId,
		};

		if (keyFile) {
			storageConfig.keyFilename = keyFile;
		} else if (credentials) {
			try {
				storageConfig.credentials = JSON.parse(credentials);
			} catch (error) {
				return NextResponse.json(
					{
						success: false,
						error: "Invalid GOOGLE_CLOUD_CREDENTIALS JSON format",
						envCheck,
					},
					{ status: 500 }
				);
			}
		}

		const storage = new Storage(storageConfig);
		const bucket = storage.bucket(bucketName);

		// Test bucket access
		try {
			const [exists] = await bucket.exists();
			if (!exists) {
				return NextResponse.json(
					{
						success: false,
						error: `Bucket '${bucketName}' does not exist`,
						envCheck,
						bucketName,
					},
					{ status: 404 }
				);
			}
		} catch (error: any) {
			return NextResponse.json(
				{
					success: false,
					error: `Failed to access bucket '${bucketName}': ${error.message}`,
					envCheck,
					bucketName,
				},
				{ status: 403 }
			);
		}

		// Test file listing (basic permission check)
		try {
			const [files] = await bucket.getFiles({ maxResults: 1 });

			// Test signed URL generation with a dummy file
			let signedUrlTest = null;
			if (files.length > 0) {
				try {
					const [signedUrl] = await files[0].getSignedUrl({
						action: "read",
						expires: Date.now() + 60 * 1000, // 1 minute
					});
					signedUrlTest = {
						success: true,
						fileName: files[0].name,
						signedUrl: signedUrl.substring(0, 100) + "...", // Truncate for security
					};
				} catch (error: any) {
					signedUrlTest = {
						success: false,
						error: error.message,
					};
				}
			}

			return NextResponse.json({
				success: true,
				message: "Google Cloud Storage connection successful",
				envCheck,
				bucketName,
				fileCount: files.length,
				signedUrlTest,
				permissions: {
					bucketAccess: true,
					listFiles: true,
					generateSignedUrls: signedUrlTest?.success || false,
				},
			});
		} catch (error: any) {
			return NextResponse.json(
				{
					success: false,
					error: `Permission error: ${error.message}`,
					envCheck,
					bucketName,
					permissions: {
						bucketAccess: true,
						listFiles: false,
						generateSignedUrls: false,
					},
				},
				{ status: 403 }
			);
		}
	} catch (error: any) {
		console.error("GCS connection test error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "GCS connection test failed",
			},
			{ status: 500 }
		);
	}
}
