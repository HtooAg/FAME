import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const MC_DATA_FILE = join(process.cwd(), "data", "mc-data.json");

interface MCData {
	eventId: string;
	performanceOrder: any[];
	announcements: any[];
	introductions: { [artistId: string]: string };
}

function getMCData(): MCData[] {
	if (!existsSync(MC_DATA_FILE)) {
		return [];
	}
	try {
		const data = readFileSync(MC_DATA_FILE, "utf8");
		return JSON.parse(data);
	} catch (error) {
		console.error("Error reading MC data file:", error);
		return [];
	}
}

function saveMCData(mcData: MCData[]) {
	try {
		writeFileSync(MC_DATA_FILE, JSON.stringify(mcData, null, 2));
	} catch (error) {
		console.error("Error saving MC data file:", error);
		throw error;
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;

		// Get performance order with artist details
		const performanceOrderFile = join(
			process.cwd(),
			"data",
			"performance-orders.json"
		);
		const artistsFile = join(process.cwd(), "data", "artists.json");

		let performanceOrder = [];

		if (existsSync(performanceOrderFile) && existsSync(artistsFile)) {
			const orders = JSON.parse(
				readFileSync(performanceOrderFile, "utf8")
			);
			const artists = JSON.parse(readFileSync(artistsFile, "utf8"));
			const eventOrder = orders.find((o: any) => o.eventId === eventId);

			if (eventOrder) {
				performanceOrder = eventOrder.performanceOrder.map(
					(slot: any, index: number) => {
						const artist = artists.find(
							(a: any) => a.id === slot.artistId
						);
						return {
							...slot,
							realName: artist?.realName || "Unknown",
							biography: artist?.biography || "",
							experience: artist?.experience || "",
							specialRequirements:
								artist?.specialRequirements || "",
							status:
								index === 0
									? "current"
									: index < 3
									? "upcoming"
									: "scheduled",
						};
					}
				);
			}
		}

		// Get MC data
		const mcDataList = getMCData();
		const eventMCData = mcDataList.find((d) => d.eventId === eventId);

		return NextResponse.json({
			performanceOrder,
			announcements: eventMCData?.announcements || [
				{
					id: "1",
					type: "general",
					title: "Welcome Announcement",
					content: "Welcome everyone to tonight's spectacular show!",
					timing: "Show Start",
				},
				{
					id: "2",
					type: "intermission",
					title: "Intermission",
					content:
						"We'll be back in 15 minutes with more amazing performances!",
					timing: "Mid-Show",
				},
				{
					id: "3",
					type: "closing",
					title: "Closing Remarks",
					content:
						"Thank you all for joining us tonight! Drive safely!",
					timing: "Show End",
				},
			],
			introductions: eventMCData?.introductions || {},
		});
	} catch (error) {
		console.error("Error fetching MC dashboard data:", error);
		return NextResponse.json(
			{ error: "Failed to fetch MC dashboard data" },
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;
		const { artistId, introduction } = await request.json();

		const mcDataList = getMCData();
		const existingDataIndex = mcDataList.findIndex(
			(d) => d.eventId === eventId
		);

		if (existingDataIndex >= 0) {
			mcDataList[existingDataIndex].introductions[artistId] =
				introduction;
		} else {
			mcDataList.push({
				eventId,
				performanceOrder: [],
				announcements: [],
				introductions: { [artistId]: introduction },
			});
		}

		saveMCData(mcDataList);

		return NextResponse.json({
			message: "Introduction saved successfully",
		});
	} catch (error) {
		console.error("Error saving introduction:", error);
		return NextResponse.json(
			{ error: "Failed to save introduction" },
			{ status: 500 }
		);
	}
}
