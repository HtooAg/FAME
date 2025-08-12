import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const artistId = formData.get("artistId") as string;
		const fileType = formData.get("fileType") as string; // 'music' or 'gallery'

		if (!file || !artistId || !fileType) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		// Create upload directory structure
		const uploadDir = join(process.cwd(), "uploads", artistId, fileType);
		if (!existsSync(uploadDir)) {
			mkdirSync(uploadDir, { recursive: true });
		}

		// Generate unique filename
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substr(2, 9);
		const extension = file.name.split(".").pop();
		const filename = `${timestamp}_${randomId}.${extension}`;
		const filePath = join(uploadDir, filename);

		// Convert file to buffer and save
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		writeFileSync(filePath, buffer);

		// Return file information
		const fileInfo = {
			url: `/uploads/${artistId}/${fileType}/${filename}`,
			filename,
			originalName: file.name,
			size: file.size,
			contentType: file.type,
			uploadedAt: new Date().toISOString(),
		};

		return NextResponse.json({
			message: "File uploaded successfully",
			file: fileInfo,
		});
	} catch (error) {
		console.error("Error uploading file:", error);
		return NextResponse.json(
			{ error: "Failed to upload file" },
			{ status: 500 }
		);
	}
}

// Handle file serving
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const filePath = searchParams.get("path");

		if (!filePath) {
			return NextResponse.json(
				{ error: "File path required" },
				{ status: 400 }
			);
		}

		const fullPath = join(process.cwd(), "uploads", filePath);

		if (!existsSync(fullPath)) {
			return NextResponse.json(
				{ error: "File not found" },
				{ status: 404 }
			);
		}

		// In a real implementation, you would stream the file
		// For now, return file info
		return NextResponse.json({
			message: "File exists",
			path: filePath,
		});
	} catch (error) {
		console.error("Error serving file:", error);
		return NextResponse.json(
			{ error: "Failed to serve file" },
			{ status: 500 }
		);
	}
}
