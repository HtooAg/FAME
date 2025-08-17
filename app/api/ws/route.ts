import { NextRequest } from "next/server";
import { WebSocketServer } from "ws";
import { BuildContext } from "@/lib/build-context";
import { buildLogger } from "@/lib/build-logger";
import { buildErrorHandler } from "@/lib/build-error-handler";

// Force dynamic rendering since this route uses request.headers
export const dynamic = "force-dynamic";

// Global WebSocket server instance
let wss: WebSocketServer | null = null;

// Store authenticated connections with user info
const authenticatedConnections = new Map();

// Helper function to verify JWT token
function verifyToken(token: string) {
	try {
		const jwt = require("jsonwebtoken");
		const JWT_SECRET =
			process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
		return jwt.verify(token, JWT_SECRET) as any;
	} catch (error) {
		return null;
	}
}

// Initialize WebSocket server if not already created
function initWebSocketServer() {
	// Skip WebSocket initialization during build process or if explicitly disabled
	if (process.env.NEXT_BUILD_SKIP_WEBSOCKET === "true") {
		buildLogger.serviceStatus(
			"websocket",
			"disabled",
			"NEXT_BUILD_SKIP_WEBSOCKET=true"
		);
		return null;
	}

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

			buildLogger.serviceStatus(
				"websocket",
				"enabled",
				`Server created on port ${port}`,
				{ port }
			);
			serverCreated = true;
			break;
		} catch (error) {
			lastError = error as Error;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			buildLogger.warn(
				"WEBSOCKET",
				`Port ${port} is in use, trying next port`,
				{ port, error: errorMessage }
			);
			continue;
		}
	}

	if (!serverCreated || !wss) {
		const error = buildErrorHandler.handleWebSocketError(
			lastError || new Error("Unknown WebSocket creation error"),
			ports[0],
			ports.slice(1)
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
	wss.on("error", (error) => {
		console.error("WebSocket server error:", error);
		if ((error as any).code === "EADDRINUSE") {
			console.log(
				"Port is already in use, server will attempt to use existing connection"
			);
		}
	});

	return wss;
}

// Broadcast emergency alert to all users
export async function broadcastEmergencyAlert(eventId: string, data: any) {
	if (!wss || process.env.NEXT_BUILD_SKIP_WEBSOCKET === "true") {
		console.log(
			"WebSocket server not available for broadcasting (disabled or not initialized)"
		);
		return;
	}

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
	if (!wss || process.env.NEXT_BUILD_SKIP_WEBSOCKET === "true") {
		console.log(
			"WebSocket server not available for broadcasting (disabled or not initialized)"
		);
		return;
	}

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

// Broadcast live board update to all subscribed users
export async function broadcastLiveBoardUpdate(eventId: string, data: any) {
	if (!wss || process.env.NEXT_BUILD_SKIP_WEBSOCKET === "true") {
		console.log(
			"WebSocket server not available for broadcasting (disabled or not initialized)"
		);
		return;
	}

	console.log(`Broadcasting live board update for event ${eventId}`);

	for (const [ws, user] of authenticatedConnections.entries()) {
		if (
			ws.readyState === ws.OPEN &&
			(user?.role === "stage_manager" || user?.role === "super_admin")
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

// API endpoint to handle WebSocket upgrade
export async function GET(request: NextRequest) {
	try {
		// Check if WebSocket is disabled
		if (process.env.NEXT_BUILD_SKIP_WEBSOCKET === "true") {
			return new Response(
				JSON.stringify({
					success: false,
					message: "WebSocket server disabled during build",
					environment: process.env.NODE_ENV,
				}),
				{
					status: 503, // Service Unavailable
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const server = initWebSocketServer();
		if (!server) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "WebSocket server initialization failed",
					message:
						"Server could not be created - this may be during build time or due to port conflicts",
					buildContext: BuildContext.getEnvironmentInfo(),
				}),
				{
					status: 503,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Get the actual port the server is listening on
		const actualPort = (server as any).options?.port || 8080;

		// Check if this is a WebSocket upgrade request
		const upgrade = request.headers.get("upgrade");
		if (upgrade === "websocket") {
			// This is a WebSocket upgrade request
			// In a production environment, you'd handle the upgrade here
			// For now, we'll return connection info
			return new Response(
				JSON.stringify({
					success: true,
					message: "WebSocket server ready for connections",
					port: actualPort,
					endpoint: `/ws`,
				}),
				{
					status: 101, // Switching Protocols
					headers: {
						"Content-Type": "application/json",
						Upgrade: "websocket",
						Connection: "Upgrade",
					},
				}
			);
		}

		// Regular HTTP request - return server info
		return new Response(
			JSON.stringify({
				success: true,
				message: "WebSocket server initialized",
				port: actualPort,
				endpoint: `/ws`,
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
