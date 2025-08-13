import { NextRequest } from "next/server";
import { WebSocketServer } from "ws";
import { readJsonFile, paths } from "@/lib/gcs";
import { Event } from "@/lib/types/event";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

// Global WebSocket server instance
let wss: WebSocketServer | null = null;

// Store authenticated connections with user info
const authenticatedConnections = new Map();

// Helper function to verify JWT token
function verifyToken(token: string) {
	try {
		return jwt.verify(token, JWT_SECRET) as any;
	} catch (error) {
		return null;
	}
}

// Initialize WebSocket server if not already created
function initWebSocketServer() {
	if (wss) return wss;

	wss = new WebSocketServer({
		port: 8080,
		verifyClient: () => {
			// Allow all connections, we'll authenticate after connection
			return true;
		},
	});

	wss.on("connection", (ws, request) => {
		console.log("New WebSocket connection");

		// Attempt cookie-based authentication immediately on connect
		try {
			const cookieHeader = request.headers["cookie"] as
				| string
				| undefined;
			if (cookieHeader) {
				const cookies = Object.fromEntries(
					cookieHeader.split("; ").map((c) => {
						const [k, ...v] = c.split("=");

						return [k, v.join("=")];
					})
				);
				const token = cookies["auth-token"];
				if (token) {
					const user = verifyToken(token);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						authenticatedConnections.set(ws, user);
						ws.send(
							JSON.stringify({
								type: "authenticated",
								success: true,
								userId: user.userId,
								method: "cookie",
								role: user.role,
							})
						);

						// Send initial data only for stage managers
						if (user.role === "stage_manager") {
							sendEventsToUser(ws, user);
						}
					}
				}
			}
		} catch (e) {
			console.error("Cookie auth failed:", e);
		}

		ws.on("message", async (message) => {
			try {
				const data = JSON.parse(message.toString());

				if (data.type === "authenticate") {
					const user = verifyToken(data.token);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						authenticatedConnections.set(ws, user);
						ws.send(
							JSON.stringify({
								type: "authenticated",
								success: true,
								userId: user.userId,
								method: "message",
								role: user.role,
							})
						);

						// Send initial events data only for stage managers
						if (user.role === "stage_manager") {
							await sendEventsToUser(ws, user);
						}
					} else {
						ws.send(
							JSON.stringify({
								type: "authenticated",
								success: false,
								error: "Invalid token or unauthorized",
							})
						);
						ws.close();
					}
				} else if (data.type === "request_events") {
					const user = authenticatedConnections.get(ws);
					if (user && user.role === "stage_manager") {
						await sendEventsToUser(ws, user);
					}
				} else if (
					data.type === "subscribe" &&
					data.channel === "artist_submissions"
				) {
					// Subscribe to artist submission notifications for specific event
					const user = authenticatedConnections.get(ws);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						// Store subscription info on the WebSocket connection
						if (!(ws as any).eventSubscriptions) {
							(ws as any).eventSubscriptions = new Set();
						}
						(ws as any).eventSubscriptions.add(data.eventId);

						ws.send(
							JSON.stringify({
								type: "subscription_confirmed",
								channel: "artist_submissions",
								eventId: data.eventId,
								timestamp: new Date().toISOString(),
							})
						);

						console.log(
							`User ${user.userId} subscribed to artist submissions for event ${data.eventId}`
						);
					} else {
						ws.send(
							JSON.stringify({
								type: "subscription_error",
								error: "Unauthorized to subscribe to artist submissions",
							})
						);
					}
				} else if (
					data.type === "unsubscribe" &&
					data.channel === "artist_submissions"
				) {
					// Unsubscribe from artist submission notifications
					const user = authenticatedConnections.get(ws);
					if (user && (ws as any).eventSubscriptions) {
						(ws as any).eventSubscriptions.delete(data.eventId);

						ws.send(
							JSON.stringify({
								type: "unsubscription_confirmed",
								channel: "artist_submissions",
								eventId: data.eventId,
								timestamp: new Date().toISOString(),
							})
						);

						console.log(
							`User ${user.userId} unsubscribed from artist submissions for event ${data.eventId}`
						);
					}
				}
			} catch (error) {
				console.error("WebSocket message error:", error);
			}
		});

		ws.on("close", () => {
			console.log("WebSocket connection closed");
			authenticatedConnections.delete(ws);
		});

		ws.on("error", (error) => {
			console.error("WebSocket error:", error);
			authenticatedConnections.delete(ws);
		});
	});

	console.log("WebSocket server started on port 8080");
	return wss;
}

// Send events data to a specific user
async function sendEventsToUser(ws: any, user: any) {
	try {
		const allEvents = await readJsonFile<Event[]>(paths.eventsIndex, []);

		// Handle case where allEvents might be null
		if (!allEvents) {
			ws.send(
				JSON.stringify({
					type: "events_update",
					data: [],
					timestamp: new Date().toISOString(),
				})
			);
			return;
		}

		const userEvents = allEvents.filter((event: Event) => {
			const eventSM = String((event as any).stageManagerId);
			const userIdStr = String((user as any).userId);
			return eventSM === userIdStr;
		});

		ws.send(
			JSON.stringify({
				type: "events_update",
				data: userEvents,
				timestamp: new Date().toISOString(),
			})
		);
	} catch (error) {
		console.error("Error sending events to user:", error);
	}
}

// Broadcast events update to all authenticated users
export async function broadcastEventsUpdate() {
	if (!wss) return;

	for (const [ws, user] of authenticatedConnections.entries()) {
		if (ws.readyState === ws.OPEN && user?.role === "stage_manager") {
			await sendEventsToUser(ws, user);
		}
	}
}

// Broadcast a user account status update to a specific user (e.g., stage manager)
export async function broadcastUserStatusUpdate(
	targetUserId: string,
	payload: { status: string; message?: string; [k: string]: any }
) {
	if (!wss) return;
	for (const [ws, user] of authenticatedConnections.entries()) {
		const u = user as any;
		if (
			ws.readyState === ws.OPEN &&
			String(u?.userId) === String(targetUserId)
		) {
			try {
				ws.send(
					JSON.stringify({
						type: "account_status",
						userId: targetUserId,
						...payload,
						timestamp: new Date().toISOString(),
					})
				);
			} catch (e) {
				console.error("broadcastUserStatusUpdate send error:", e);
			}
		}
	}
}

// Broadcast artist update to subscribed users
export async function broadcastArtistUpdate(
	eventId: string,
	artistData: any,
	updateType: string
) {
	if (!wss) return;

	console.log(
		`Broadcasting artist update: ${updateType} for event ${eventId}`
	);

	for (const [ws, user] of authenticatedConnections.entries()) {
		if (
			ws.readyState === ws.OPEN &&
			(user?.role === "stage_manager" || user?.role === "super_admin") &&
			(ws as any).eventSubscriptions?.has(eventId)
		) {
			try {
				ws.send(
					JSON.stringify({
						type: updateType,
						data: artistData,
						eventId,
						timestamp: new Date().toISOString(),
					})
				);

				console.log(
					`Sent ${updateType} notification to user ${user.userId}`
				);
			} catch (e) {
				console.error("Error broadcasting artist update:", e);
			}
		}
	}
}

// Broadcast artist registration notification
export async function broadcastArtistRegistration(
	eventId: string,
	artistData: any
) {
	await broadcastArtistUpdate(eventId, artistData, "artist_registered");
}

// Broadcast artist assignment notification
export async function broadcastArtistAssignment(
	eventId: string,
	artistData: any
) {
	await broadcastArtistUpdate(eventId, artistData, "artist_assigned");
}

// Broadcast artist status change notification
export async function broadcastArtistStatusChange(
	eventId: string,
	artistData: any
) {
	await broadcastArtistUpdate(eventId, artistData, "artist_status_changed");
}

// Broadcast artist deletion notification
export async function broadcastArtistDeletion(
	eventId: string,
	artistData: any
) {
	await broadcastArtistUpdate(eventId, artistData, "artist_deleted");
}

// API endpoint to initialize WebSocket server
export async function GET(request: NextRequest) {
	try {
		initWebSocketServer();
		return new Response(
			JSON.stringify({
				success: true,
				message: "WebSocket server initialized",
				port: 8080,
			}),
			{
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("WebSocket initialization error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: "Failed to initialize WebSocket server",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
