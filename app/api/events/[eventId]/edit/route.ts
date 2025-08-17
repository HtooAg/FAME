import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, upsertArrayFile, paths } from "@/lib/gcs";
import { Event } from "@/lib/types/event";
import { eventFormSchema } from "@/lib/schemas/event";
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

// PUT /api/events/[eventId]/edit - Update a specific event
export async function PUT(
	request: NextRequest,
	{ params }: { params: EventPageParams }
): Promise<NextResponse<ApiResponse<Event>>> {
	try {
		console.log("Updating event:", params.eventId);
		const user = await getAuthenticatedUser(request);
		console.log("User authenticated:", user.userId, user.role);

		// Only stage managers can edit events
		if (user.role !== "stage_manager") {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Only stage managers can edit events",
					},
				},
				{ status: 403 }
			);
		}

		const eventId = params.eventId;
		const body = await request.json();

		// Validate the request body
		const validationResult = eventFormSchema.safeParse({
			...body,
			startDate: new Date(body.startDate),
			endDate: new Date(body.endDate),
		});

		if (!validationResult.success) {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid event data",
						details: validationResult.error.errors,
					},
				},
				{ status: 400 }
			);
		}

		// Read the existing event
		const eventFilePath = paths.eventFile(eventId);
		const existingEvent = await readJsonFile<Event | null>(
			eventFilePath,
			null
		);

		if (!existingEvent) {
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
			existingEvent.stageManagerId != user.userId &&
			existingEvent.stageManagerId !== user.userId.toString()
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

		const { name, venueName, startDate, endDate, description } =
			validationResult.data;

		// Update the event
		const updatedEvent: Event = {
			...existingEvent,
			name,
			venueName,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			description,
			updatedAt: new Date().toISOString(),
		};

		// Save the updated event
		await writeJsonFile(eventFilePath, updatedEvent);

		// Update the events index
		await upsertArrayFile(paths.eventsIndex, updatedEvent, "id");

		// Broadcast the update to all connected clients
		await broadcastEventsUpdate();

		console.log("Event updated successfully");
		return NextResponse.json<ApiResponse<Event>>({
			success: true,
			data: updatedEvent,
		});
	} catch (error) {
		console.error("Error updating event:", error);
		console.error(
			"Error details:",
			error instanceof Error ? error.message : String(error)
		);
		return NextResponse.json<ApiResponse>(
			{
				success: false,
				error: {
					code: "UPDATE_EVENT_ERROR",
					message: "Failed to update event",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}
