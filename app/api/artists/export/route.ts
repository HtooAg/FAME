import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const artistId = searchParams.get("artistId");
		const format = searchParams.get("format") || "json";

		// Read main artists data
		const artistsFile = join(process.cwd(), "data", "artists.json");
		let artists = [];

		if (existsSync(artistsFile)) {
			const fileContent = readFileSync(artistsFile, "utf8");
			artists = JSON.parse(fileContent);
		}

		// If specific artist requested
		if (artistId) {
			const artist = artists.find((a: any) => a.id === artistId);
			if (!artist) {
				return NextResponse.json(
					{ error: "Artist not found" },
					{ status: 404 }
				);
			}

			// Get GCS structure data if exists
			const gcsDir = join(
				process.cwd(),
				"data",
				"gcs-structure",
				"artists",
				artistId
			);
			let gcsData = {};

			if (existsSync(gcsDir)) {
				const files = readdirSync(gcsDir);
				files.forEach((file) => {
					if (file.endsWith(".json")) {
						const filePath = join(gcsDir, file);
						const content = readFileSync(filePath, "utf8");
						const key = file.replace(".json", "");
						gcsData[key] = JSON.parse(content);
					}
				});
			}

			// Get uploaded files info
			const uploadsDir = join(process.cwd(), "uploads", artistId);
			let uploadedFiles = {};

			if (existsSync(uploadsDir)) {
				const categories = readdirSync(uploadsDir);
				categories.forEach((category) => {
					const categoryDir = join(uploadsDir, category);
					if (statSync(categoryDir).isDirectory()) {
						const files = readdirSync(categoryDir);
						uploadedFiles[category] = files.map((file) => ({
							name: file,
							path: `/uploads/${artistId}/${category}/${file}`,
							size: statSync(join(categoryDir, file)).size,
						}));
					}
				});
			}

			const exportData = {
				artist,
				gcsStructure: gcsData,
				uploadedFiles,
				exportedAt: new Date().toISOString(),
			};

			if (format === "csv") {
				// Convert to CSV format
				const csv = convertToCSV(exportData);
				return new NextResponse(csv, {
					headers: {
						"Content-Type": "text/csv",
						"Content-Disposition": `attachment; filename="artist_${artistId}_export.csv"`,
					},
				});
			}

			return NextResponse.json(exportData);
		}

		// Return all artists data
		const allData = {
			artists,
			totalCount: artists.length,
			statusBreakdown: {
				pending: artists.filter((a: any) => a.status === "pending")
					.length,
				approved: artists.filter((a: any) => a.status === "approved")
					.length,
				active: artists.filter((a: any) => a.status === "active")
					.length,
			},
			exportedAt: new Date().toISOString(),
		};

		return NextResponse.json(allData);
	} catch (error) {
		console.error("Error exporting artist data:", error);
		return NextResponse.json(
			{ error: "Failed to export artist data" },
			{ status: 500 }
		);
	}
}

function convertToCSV(data: any): string {
	const artist = data.artist;
	const headers = [
		"ID",
		"Artist Name",
		"Real Name",
		"Email",
		"Phone",
		"Style",
		"Performance Type",
		"Duration",
		"Biography",
		"Costume Color",
		"Light Color 1",
		"Light Color 2",
		"Light Color 3",
		"Stage Start",
		"Stage End",
		"Instagram",
		"Facebook",
		"YouTube",
		"TikTok",
		"Website",
		"Show Link",
		"MC Notes",
		"Stage Manager Notes",
		"Status",
		"Created At",
	];

	const row = [
		artist.id,
		artist.artistName,
		artist.realName,
		artist.email,
		artist.phone,
		artist.style,
		artist.performanceType,
		artist.performanceDuration,
		`"${artist.biography?.replace(/"/g, '""') || ""}"`,
		artist.costumeColor,
		artist.lightColorSingle,
		artist.lightColorTwo,
		artist.lightColorThree,
		artist.stagePositionStart,
		artist.stagePositionEnd,
		artist.socialMedia?.instagram || "",
		artist.socialMedia?.facebook || "",
		artist.socialMedia?.youtube || "",
		artist.socialMedia?.tiktok || "",
		artist.socialMedia?.website || "",
		artist.showLink || "",
		`"${artist.mcNotes?.replace(/"/g, '""') || ""}"`,
		`"${artist.stageManagerNotes?.replace(/"/g, '""') || ""}"`,
		artist.status,
		artist.createdAt,
	];

	return [headers.join(","), row.join(",")].join("\n");
}
