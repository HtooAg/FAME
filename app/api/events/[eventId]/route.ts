import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, paths } from "@/lib/gcs";
import { Event } from "@/lib/types/event";
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

// GET /api/events/[eventId] - Get a specific event
export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		console.log("Fetching individual event:", params.eventId);
		const user = await getAuthenticatedUser(request);
		console.log("User authenticated:", user.userId, user.role);

		// Only stage managers can access events
		if (user.role !== "stage_manager") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Only stage managers can access events",
					},
				},
				{ status: 403 }
			);
		}

		const eventId = params.eventId;
		console.log("Event ID:", eventId);

		// Try to read the individual event file
		const eventFilePath = paths.eventFile(eventId);
		console.log("Event file path:", eventFilePath);
		const event = await readJsonFile<Event>(eventFilePath);
		console.log("Event found:", !!event);

		if (!event) {
			console.log("Event not found at path:", eventFilePath);
			return NextResponse.json(
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
		console.log(
			"Checking ownership - event.stageManagerId:",
			event.stageManagerId,
			"user.userId:",
			user.userId
		);
		const eventSmId = String(event.stageManagerId);
		const userIdStr = String(user.userId);
		if (eventSmId !== userIdStr) {
			console.log("User doesn't have access to this event");
			return NextResponse.json(
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

		console.log("Returning event successfully");
		return NextResponse.json({
			success: true,
			data: event,
		});
	} catch (error) {
		console.error("Error fetching event:", error);
		console.error(
			"Error details:",
			error instanceof Error ? error.message : String(error)
		);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "FETCH_EVENT_ERROR",
					message: "Failed to fetch event",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}

// DELETE /api/events/[eventId] - Delete a specific event
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		console.log("Deleting event:", params.eventId);
		const user = await getAuthenticatedUser(request);
		console.log("User authenticated:", user.userId, user.role);

		// Only stage managers can delete events
		if (user.role !== "stage_manager") {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Only stage managers can delete events",
					},
				},
				{ status: 403 }
			);
		}

		const eventId = params.eventId;

		// First, read the event to verify it exists and belongs to the user
		const eventFilePath = paths.eventFile(eventId);
		const event = await readJsonFile<Event>(eventFilePath);

		if (!event) {
			return NextResponse.json(
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
		const eventSmId = String(event.stageManagerId);
		const userIdStr = String(user.userId);
		if (eventSmId !== userIdStr) {
			return NextResponse.json(
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

		// Remove from events index
		const eventsIndex = await readJsonFile<Event[]>(
			paths.eventsIndex,
			[] as Event[]
		);
		const updatedIndex = eventsIndex.filter((e) => e.id !== eventId);
		await writeJsonFile(paths.eventsIndex, updatedIndex);

		// Note: We're not deleting the individual event file to maintain data integrity
		// The file will remain but won't be accessible through the index

		// Broadcast the update to all connected clients
		await broadcastEventsUpdate();

		console.log("Event deleted successfully");
		return NextResponse.json({
			success: true,
			message: "Event deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting event:", error);
		console.error(
			"Error details:",
			error instanceof Error ? error.message : String(error)
		);
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "DELETE_EVENT_ERROR",
					message: "Failed to delete event",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}
