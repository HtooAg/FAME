import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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
								? "current"
								: index < 3
								? "upcoming"
								: "scheduled",
					})
				);
			}
		}

		return NextResponse.json({
			performanceOrder,
			audioTracks: [
				{
					id: "1",
					title: "Upbeat Intro",
					artist: "DJ Mix",
					duration: 180,
				},
				{
					id: "2",
					title: "Smooth Jazz",
					artist: "Background",
					duration: 240,
				},
				{
					id: "3",
					title: "Rock Anthem",
					artist: "High Energy",
					duration: 210,
				},
				{
					id: "4",
					title: "Acoustic Chill",
					artist: "Relaxed",
					duration: 195,
				},
				{
					id: "5",
					title: "Electronic Beat",
					artist: "Modern",
					duration: 220,
				},
			],
			systemStatus: {
				audio: "good",
				mainOutput: -12,
				monitor: -18,
				microphone: -6,
			},
		});
	} catch (error) {
		console.error("Error fetching DJ dashboard data:", error);
		return NextResponse.json(
			{ error: "Failed to fetch DJ dashboard data" },
			{ status: 500 }
		);
	}
}
