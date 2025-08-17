import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile, upsertArrayFile, paths } from "@/lib/gcs";
import { Event } from "@/lib/types/event";
import { eventFormSchema } from "@/lib/schemas/event";
import { ApiResponse } from "@/lib/types/api";
import { v4 as uuidv4 } from "uuid";
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

// GET /api/events - List events for the authenticated stage manager
export async function GET(
	request: NextRequest
): Promise<NextResponse<ApiResponse<Event[]>>> {
	try {
		const user = await getAuthenticatedUser(request);

		// Only stage managers can access events
		if (user.role !== "stage_manager") {
			return NextResponse.json<ApiResponse>(
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

		// Read all events and filter by stage manager
		const allEvents =
			(await readJsonFile<Event[]>(paths.eventsIndex, [])) ?? [];
		console.log("All events:", allEvents); // Debug log
		console.log(
			"User ID from JWT:",
			user.userId,
			"Type:",
			typeof user.userId
		); // Debug log

		const stageManagerEvents = allEvents.filter((event) => {
			console.log(
				"Comparing event.stageManagerId:",
				event.stageManagerId,
				"Type:",
				typeof event.stageManagerId,
				"with user.userId:",
				user.userId,
				"Type:",
				typeof user.userId
			); // Debug log
			return (
				event.stageManagerId == user.userId ||
				event.stageManagerId === user.userId.toString()
			);
		});

		console.log("Filtered events for user:", stageManagerEvents); // Debug log

		return NextResponse.json<ApiResponse<Event[]>>({
			success: true,
			data: stageManagerEvents,
		});
	} catch (error) {
		console.error("Error fetching events:", error);
		console.error(
			"Error details:",
			error instanceof Error ? error.message : String(error)
		);
		return NextResponse.json<ApiResponse>(
			{
				success: false,
				error: {
					code: "FETCH_EVENTS_ERROR",
					message: "Failed to fetch events",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}

// POST /api/events - Create a new event
export async function POST(
	request: NextRequest
): Promise<NextResponse<ApiResponse<Event>>> {
	try {
		const user = await getAuthenticatedUser(request);

		// Only stage managers can create events
		if (user.role !== "stage_manager") {
			return NextResponse.json<ApiResponse>(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: "Only stage managers can create events",
					},
				},
				{ status: 403 }
			);
		}

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

		const { name, venueName, startDate, endDate, description } =
			validationResult.data;

		// Create new event
		const eventId = uuidv4();
		const now = new Date().toISOString();

		const newEvent: Event = {
			id: eventId,
			name,
			venueName,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			description,
			stageManagerId: user.userId,
			showDates: [],
			status: "draft",
			createdAt: now,
			updatedAt: now,
		};

		// Save individual event file
		await writeJsonFile(paths.eventFile(eventId), newEvent);

		// Update events index
		await upsertArrayFile(paths.eventsIndex, newEvent, "id");

		// Broadcast the update to all connected clients
		await broadcastEventsUpdate();

		return NextResponse.json<ApiResponse<Event>>(
			{
				success: true,
				data: newEvent,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating event:", error);
		console.error(
			"Error details:",
			error instanceof Error ? error.message : String(error)
		);
		return NextResponse.json<ApiResponse>(
			{
				success: false,
				error: {
					code: "CREATE_EVENT_ERROR",
					message: "Failed to create event",
					details:
						error instanceof Error ? error.message : String(error),
				},
			},
			{ status: 500 }
		);
	}
}
