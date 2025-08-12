import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { lookup } from "mime-types";

export async function GET(
	request: NextRequest,
	{ params }: { params: { path: string[] } }
) {
	try {
		const filePath = params.path.join("/");
		const fullPath = join(process.cwd(), "uploads", filePath);

		if (!existsSync(fullPath)) {
			return NextResponse.json(
				{ error: "File not found" },
				{ status: 404 }
			);
		}

		const fileBuffer = readFileSync(fullPath);
		const mimeType = lookup(fullPath) || "application/octet-stream";

		return new NextResponse(fileBuffer, {
			headers: {
				"Content-Type": mimeType,
				"Cache-Control": "public, max-age=31536000",
			},
		});
	} catch (error) {
		console.error("Error serving file:", error);
		return NextResponse.json(
			{ error: "Failed to serve file" },
			{ status: 500 }
		);
	}
}
