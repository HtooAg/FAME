import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, upsertArrayFile, paths } from "@/lib/gcs";
import { Event } from "@/lib/types/event";
import { ApiResponse, EventPageParams } from "@/lib/types/api";
import jwt from "jsonwebtoken";
import { broadcastEventsUpdate } from "@/app/api/websocket/route";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

// Helper function to get authenticated user from JWT
async function getAuthenticatedUser(request: NextRequest) {
	const token = request.cookies.get("auth-token")?.value;
	if (!token) {
		throw new Error("No authentication token");
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as any;
		return decoded;
	} catch (error) {
		throw new Error("Invalid authentication token");
	}
}

// POST /api/events/[eventId]/show-dates - Save show dates for an event
export async function POST(
	request: NextRequest,
	{ params }: { params: EventPageParams }
): Promise<NextResponse<ApiResponse<Event>>> {
	try {
		const user = await getAuthenticatedUser(request);

		// Only stage managers can manage show dates
		if (user.role !== "stage_manager") {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Only stage managers can manage show dates",
					},
				},
				{ status: 403 }
			);
		}

		const eventId = params.eventId;
		const body = await request.json();

		// Validate the request body
		if (!body.dates || !Array.isArray(body.dates)) {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid show dates data",
					},
				},
				{ status: 400 }
			);
		}

		// Read the event to verify it exists and belongs to the user
		const event = await readJsonFile<Event | null>(
			paths.eventFile(eventId),
			null
		);

		if (!event) {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "EVENT_NOT_FOUND",
						message: "Event not found",
					},
				},
				{ status: 404 }
			);
		}

		// Check if the event belongs to the current stage manager
		if (
			event.stageManagerId != user.userId &&
			event.stageManagerId !== user.userId.toString()
		) {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "You don't have access to this event",
					},
				},
				{ status: 403 }
			);
		}

		// Update the event with show dates
		const updatedEvent: Event = {
			...event,
			showDates: body.dates,
			updatedAt: new Date().toISOString(),
		};

		// Save the updated event
		await writeJsonFile(paths.eventFile(eventId), updatedEvent);

		// Update the events index
		await upsertArrayFile(paths.eventsIndex, updatedEvent, "id");

		// Broadcast the update to all connected clients
		await broadcastEventsUpdate();

		return NextResponse.json<ApiResponse<Event>>({
			success: true,
			data: updatedEvent,
		});
	} catch (error) {
		console.error("Error saving show dates:", error);
		return NextResponse.json<ApiResponse>(
			{
				success: false,
				error: {
					code: "SAVE_SHOW_DATES_ERROR",
					message: "Failed to save show dates",
				},
			},
			{ status: 500 }
		);
	}
}
