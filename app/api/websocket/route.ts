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
	if (wss) {
		console.log(
			"WebSocket server already exists, reusing existing instance"
		);
		return wss;
	}

	// Try different ports if 8080 is in use
	const ports = [8080, 8081, 8082, 8083, 8084];
	let serverCreated = false;
	let lastError: Error | null = null;

	for (const port of ports) {
		try {
			wss = new WebSocketServer({
				port: port,
				perMessageDeflate: false, // Disable compression to avoid buffer issues
				verifyClient: () => {
					// Allow all connections, we'll authenticate after connection
					return true;
				},
			});

			console.log(
				`WebSocket server created successfully on port ${port}`
			);
			serverCreated = true;
			break;
		} catch (error) {
			lastError = error as Error;
			console.log(`Port ${port} is in use, trying next port...`);
			continue;
		}
	}

	if (!serverCreated || !wss) {
		console.error(
			"Failed to create WebSocket server on any available port:",
			lastError
		);
		return null;
	}

	wss.on("connection", (ws, request) => {
		console.log("New WebSocket connection");

		// Set up error handling for this connection
		ws.on("error", (error) => {
			console.error("WebSocket connection error:", error);
			// Clean up the connection
			authenticatedConnections.delete(ws);
		});

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
				} else if (
					data.type === "subscribe" &&
					data.channel?.startsWith("live-board-")
				) {
					// Subscribe to live board updates for specific event
					const user = authenticatedConnections.get(ws);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						const eventId = data.channel.replace("live-board-", "");

						if (!(ws as any).liveBoardSubscriptions) {
							(ws as any).liveBoardSubscriptions = new Set();
						}
						(ws as any).liveBoardSubscriptions.add(eventId);

						ws.send(
							JSON.stringify({
								type: "subscription_confirmed",
								channel: data.channel,
								eventId: eventId,
								timestamp: new Date().toISOString(),
							})
						);

						console.log(
							`User ${user.userId} subscribed to live board for event ${eventId}`
						);
					}
				} else if (data.type === "live-board-update") {
					// Broadcast live board update to all subscribed users
					const user = authenticatedConnections.get(ws);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						broadcastLiveBoardUpdate(data.eventId, data.data);
					}
				} else if (data.type === "emergency-alert") {
					// Broadcast emergency alert to all users
					const user = authenticatedConnections.get(ws);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						broadcastEmergencyAlert(data.eventId, data.data);
					}
				} else if (data.type === "emergency-clear") {
					// Broadcast emergency clear to all users
					const user = authenticatedConnections.get(ws);
					if (
						user &&
						(user.role === "stage_manager" ||
							user.role === "super_admin")
					) {
						broadcastEmergencyClear(data.eventId, data.broadcastId);
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

	// Add error handling for the server
	if (wss) {
		wss.on("error", (error) => {
			console.error("WebSocket server error:", error);
			if ((error as any).code === "EADDRINUSE") {
				console.log(
					"Port is already in use, server will attempt to use existing connection"
				);
			}
		});
	}

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

// Broadcast performance order update to all connected users for an event
export async function broadcastPerformanceOrderUpdate(
	eventId: string,
	performanceOrder: any[],
	showStartTime?: string
) {
	if (!wss) return;

	console.log(`Broadcasting performance order update for event ${eventId}`);

	for (const [ws, user] of authenticatedConnections.entries()) {
		if (
			ws.readyState === ws.OPEN &&
			(user?.role === "stage_manager" ||
				user?.role === "super_admin" ||
				user?.role === "dj" ||
				user?.role === "mc") &&
			(ws as any).eventSubscriptions?.has(eventId)
		) {
			try {
				ws.send(
					JSON.stringify({
						type: "performance_order_updated",
						data: {
							performanceOrder,
							showStartTime,
							eventId,
						},
						eventId,
						timestamp: new Date().toISOString(),
					})
				);

				console.log(
					`Sent performance order update to ${user.role} user ${user.userId}`
				);
			} catch (e) {
				console.error(
					"Error broadcasting performance order update:",
					e
				);
			}
		}
	}
}

// Broadcast show status update (started, paused, etc.)
export async function broadcastShowStatusUpdate(
	eventId: string,
	status: "started" | "paused" | "stopped" | "intermission",
	currentPerformanceId?: string,
	nextPerformanceId?: string
) {
	if (!wss) return;

	console.log(
		`Broadcasting show status update for event ${eventId}: ${status}`
	);

	for (const [ws, user] of authenticatedConnections.entries()) {
		if (
			ws.readyState === ws.OPEN &&
			(user?.role === "stage_manager" ||
				user?.role === "super_admin" ||
				user?.role === "dj" ||
				user?.role === "mc") &&
			(ws as any).eventSubscriptions?.has(eventId)
		) {
			try {
				ws.send(
					JSON.stringify({
						type: "show_status_updated",
						data: {
							status,
							currentPerformanceId,
							nextPerformanceId,
							eventId,
						},
						eventId,
						timestamp: new Date().toISOString(),
					})
				);

				console.log(
					`Sent show status update to ${user.role} user ${user.userId}`
				);
			} catch (e) {
				console.error("Error broadcasting show status update:", e);
			}
		}
	}
}

// Broadcast live board update to all subscribed users
export async function broadcastLiveBoardUpdate(eventId: string, data: any) {
	if (!wss) return;

	console.log(`Broadcasting live board update for event ${eventId}`);

	for (const [ws, user] of authenticatedConnections.entries()) {
		if (
			ws.readyState === ws.OPEN &&
			(user?.role === "stage_manager" || user?.role === "super_admin") &&
			(ws as any).liveBoardSubscriptions?.has(eventId)
		) {
			try {
				ws.send(
					JSON.stringify({
						type: "live-board-update",
						data,
						eventId,
						timestamp: new Date().toISOString(),
					})
				);

				console.log(`Sent live board update to user ${user.userId}`);
			} catch (e) {
				console.error("Error broadcasting live board update:", e);
			}
		}
	}
}

// Broadcast emergency alert to all users
export async function broadcastEmergencyAlert(eventId: string, data: any) {
	if (!wss) return;

	console.log(`Broadcasting emergency alert for event ${eventId}`);

	// Send to all authenticated users (not just subscribed ones for emergency alerts)
	for (const [ws, user] of authenticatedConnections.entries()) {
		if (ws.readyState === ws.OPEN) {
			try {
				ws.send(
					JSON.stringify({
						type: "emergency-alert",
						data,
						eventId,
						timestamp: new Date().toISOString(),
					})
				);

				console.log(`Sent emergency alert to user ${user.userId}`);
			} catch (e) {
				console.error("Error broadcasting emergency alert:", e);
			}
		}
	}
}

// Broadcast emergency clear to all users
export async function broadcastEmergencyClear(
	eventId: string,
	broadcastId: string
) {
	if (!wss) return;

	console.log(`Broadcasting emergency clear for event ${eventId}`);

	// Send to all authenticated users
	for (const [ws, user] of authenticatedConnections.entries()) {
		if (ws.readyState === ws.OPEN) {
			try {
				ws.send(
					JSON.stringify({
						type: "emergency-clear",
						broadcastId,
						eventId,
						timestamp: new Date().toISOString(),
					})
				);

				console.log(`Sent emergency clear to user ${user.userId}`);
			} catch (e) {
				console.error("Error broadcasting emergency clear:", e);
			}
		}
	}
}

// API endpoint to initialize WebSocket server
export async function GET(request: NextRequest) {
	try {
		const server = initWebSocketServer();
		if (!server) {
			throw new Error("Failed to create WebSocket server");
		}

		// Get the actual port the server is listening on
		const actualPort = (server as any).options?.port || 8080;

		return new Response(
			JSON.stringify({
				success: true,
				message: "WebSocket server initialized",
				port: actualPort,
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
				details:
					error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
