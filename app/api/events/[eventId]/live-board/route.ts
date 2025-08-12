import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const LIVE_BOARD_FILE = join(process.cwd(), "data", "live-board.json");

interface LiveBoardData {
	eventId: string;
	isLive: boolean;
	performanceOrder: any[];
	systemStatus: {
		audio: "good" | "warning" | "error";
		lighting: "good" | "warning" | "error";
		stage: "clear" | "setup" | "performance";
		microphones: number;
		activeMics: number;
	};
	updatedAt: string;
}

function getLiveBoardData(): LiveBoardData[] {
	if (!existsSync(LIVE_BOARD_FILE)) {
		return [];
	}
	try {
		const data = readFileSync(LIVE_BOARD_FILE, "utf8");
		return JSON.parse(data);
	} catch (error) {
		console.error("Error reading live board file:", error);
		return [];
	}
}

function saveLiveBoardData(data: LiveBoardData[]) {
	try {
		writeFileSync(LIVE_BOARD_FILE, JSON.stringify(data, null, 2));
	} catch (error) {
		console.error("Error saving live board file:", error);
		throw error;
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;

		// Get performance order
		const performanceOrderFile = join(
			process.cwd(),
			"data",
			"performance-orders.json"
		);
		let performanceOrder = [];

		if (existsSync(performanceOrderFile)) {
			const orders = JSON.parse(
				readFileSync(performanceOrderFile, "utf8")
			);
			const eventOrder = orders.find((o: any) => o.eventId === eventId);
			if (eventOrder) {
				performanceOrder = eventOrder.performanceOrder.map(
					(slot: any, index: number) => ({
						...slot,
						status:
							index === 0
								? "on-stage"
								: index === 1
								? "ready"
								: "waiting",
					})
				);
			}
		}

		// Get live board data
		const liveBoardData = getLiveBoardData();
		const eventData = liveBoardData.find((d) => d.eventId === eventId);

		return NextResponse.json({
			performanceOrder,
			isLive: eventData?.isLive || false,
			systemStatus: eventData?.systemStatus || {
				audio: "good",
				lighting: "good",
				stage: "clear",
				microphones: 4,
				activeMics: 0,
			},
		});
	} catch (error) {
		console.error("Error fetching live board data:", error);
		return NextResponse.json(
			{ error: "Failed to fetch live board data" },
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
		const { performanceId, status, timestamp, isLive, systemStatus } =
			await request.json();

		const liveBoardData = getLiveBoardData();
		const existingDataIndex = liveBoardData.findIndex(
			(d) => d.eventId === eventId
		);

		// Get current performance order
		const performanceOrderFile = join(
			process.cwd(),
			"data",
			"performance-orders.json"
		);
		let performanceOrder = [];

		if (existsSync(performanceOrderFile)) {
			const orders = JSON.parse(
				readFileSync(performanceOrderFile, "utf8")
			);
			const eventOrder = orders.find((o: any) => o.eventId === eventId);
			if (eventOrder) {
				performanceOrder = eventOrder.performanceOrder;
			}
		}

		// Update performance status if provided
		if (performanceId && status) {
			performanceOrder = performanceOrder.map((slot: any) => {
				if (slot.id === performanceId) {
					return {
						...slot,
						status,
						actualStartTime:
							status === "on-stage"
								? timestamp
								: slot.actualStartTime,
						actualEndTime:
							status === "completed"
								? timestamp
								: slot.actualEndTime,
					};
				}
				return slot;
			});
		}

		const updatedData: LiveBoardData = {
			eventId,
			isLive:
				isLive !== undefined
					? isLive
					: existingDataIndex >= 0
					? liveBoardData[existingDataIndex].isLive
					: false,
			performanceOrder,
			systemStatus:
				systemStatus ||
				(existingDataIndex >= 0
					? liveBoardData[existingDataIndex].systemStatus
					: {
							audio: "good",
							lighting: "good",
							stage: "clear",
							microphones: 4,
							activeMics: 0,
					  }),
			updatedAt: new Date().toISOString(),
		};

		if (existingDataIndex >= 0) {
			liveBoardData[existingDataIndex] = updatedData;
		} else {
			liveBoardData.push(updatedData);
		}

		saveLiveBoardData(liveBoardData);

		return NextResponse.json({
			message: "Live board updated successfully",
			data: updatedData,
		});
	} catch (error) {
		console.error("Error updating live board:", error);
		return NextResponse.json(
			{ error: "Failed to update live board" },
			{ status: 500 }
		);
	}
}
