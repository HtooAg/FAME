import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";
import { readJsonFile, writeJsonFile } from "@/lib/gcs";
import { broadcastPerformanceOrderUpdate } from "@/app/api/websocket/route";

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
	timestamp: string;
}

interface PerformanceSlot {
	id: string;
	artistId: string;
	artistName: string;
	style: string;
	duration: number;
	order: number;
	startTime: string;
	endTime: string;
	eventId: string;
	status?: "upcoming" | "current" | "completed";
}

interface PerformanceOrder {
	eventId: string;
	showStartTime: string;
	performanceOrder: PerformanceSlot[];
	updatedAt: string;
	showStatus?:
		| "not_started"
		| "started"
		| "paused"
		| "intermission"
		| "completed";
	currentPerformanceId?: string;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Try to get performance order from GCS
		let performanceOrderData: PerformanceOrder | null = null;

		try {
			performanceOrderData = await readJsonFile<PerformanceOrder>(
				`events/${eventId}/performance-order.json`
			);
		} catch (error) {
			console.log(
				`No performance order found for event ${eventId}, creating default`
			);
		}

		// If no performance order exists, create a default one
		if (!performanceOrderData) {
			performanceOrderData = {
				eventId,
				showStartTime: "19:00",
				performanceOrder: [],
				updatedAt: new Date().toISOString(),
				showStatus: "not_started",
			};
		}

		// Enrich performance order with latest artist data
		const enrichedPerformanceOrder = await Promise.all(
			performanceOrderData.performanceOrder.map(async (slot) => {
				try {
					const artistData = await GCSService.getArtistData(
						slot.artistId
					);
					if (artistData) {
						return {
							...slot,
							artistName:
								artistData.artistName ||
								artistData.artist_name ||
								slot.artistName,
							style: artistData.style || slot.style,
							realName:
								artistData.realName || artistData.real_name,
							biography: artistData.biography,
							specialRequirements: artistData.specialRequirements,
							mcNotes: artistData.mcNotes,
							// Add music track info for DJ
							musicTracks: artistData.musicTracks || [],
							// Add technical requirements
							lightColorSingle: artistData.lightColorSingle,
							lightColorTwo: artistData.lightColorTwo,
							lightColorThree: artistData.lightColorThree,
							equipment: artistData.equipment,
						};
					}
					return slot;
				} catch (error) {
					console.error(
						`Error enriching artist data for ${slot.artistId}:`,
						error
					);
					return slot;
				}
			})
		);

		const enrichedData = {
			...performanceOrderData,
			performanceOrder: enrichedPerformanceOrder,
		};

		return NextResponse.json<ApiResponse<PerformanceOrder>>({
			success: true,
			data: enrichedData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error fetching performance order:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch performance order",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const body = await request.json();

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		const {
			performanceOrder,
			showStartTime,
			showStatus,
			currentPerformanceId,
		} = body;

		// Validate performance order data
		if (performanceOrder && !Array.isArray(performanceOrder)) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Performance order must be an array",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Validate show start time format
		if (
			showStartTime &&
			!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(showStartTime)
		) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Show start time must be in HH:MM format",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Create the performance order data
		const performanceOrderData: PerformanceOrder = {
			eventId,
			showStartTime: showStartTime || "19:00",
			performanceOrder: (performanceOrder || []).map(
				(slot: any, index: number) => ({
					...slot,
					eventId,
					order: index + 1,
				})
			),
			updatedAt: new Date().toISOString(),
			showStatus: showStatus || "not_started",
			currentPerformanceId,
		};

		// Save to GCS
		await writeJsonFile(
			`events/${eventId}/performance-order.json`,
			performanceOrderData
		);

		// Broadcast the performance order update to all connected users
		try {
			await broadcastPerformanceOrderUpdate(
				eventId,
				performanceOrderData.performanceOrder,
				performanceOrderData.showStartTime
			);
			console.log(
				`Broadcasted performance order update for event ${eventId}`
			);
		} catch (error) {
			console.error(
				"Error broadcasting performance order update:",
				error
			);
			// Don't fail the request if broadcasting fails
		}

		return NextResponse.json<ApiResponse<PerformanceOrder>>({
			success: true,
			data: performanceOrderData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error saving performance order:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to save performance order",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const body = await request.json();

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Get existing performance order
		const existingData: PerformanceOrder =
			await readJsonFile<PerformanceOrder>(
				`events/${eventId}/performance-order.json`,
				{
					eventId,
					showStartTime: "19:00",
					performanceOrder: [],
					updatedAt: new Date().toISOString(),
					showStatus: "not_started",
				}
			);

		// Update with provided data
		const updatedData: PerformanceOrder = {
			...existingData,
			...body,
			eventId, // Ensure eventId is not overwritten
			updatedAt: new Date().toISOString(),
		};

		// Save to GCS
		await writeJsonFile(
			`events/${eventId}/performance-order.json`,
			updatedData
		);

		// Broadcast the performance order update to all connected users
		try {
			await broadcastPerformanceOrderUpdate(
				eventId,
				updatedData.performanceOrder,
				updatedData.showStartTime
			);
			console.log(
				`Broadcasted performance order update for event ${eventId}`
			);
		} catch (error) {
			console.error(
				"Error broadcasting performance order update:",
				error
			);
			// Don't fail the request if broadcasting fails
		}

		return NextResponse.json<ApiResponse<PerformanceOrder>>({
			success: true,
			data: updatedData,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error updating performance order:", error);

		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to update performance order",
				},
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
