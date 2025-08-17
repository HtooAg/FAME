import { NextRequest, NextResponse } from "next/server";

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	const { eventId } = params;

	// Create a readable stream for Server-Sent Events
	const stream = new ReadableStream({
		start(controller) {
			// Store this connection
			const connectionId = `${eventId}-${Date.now()}-${Math.random()}`;
			connections.set(connectionId, controller);

			// Send initial connection message
			controller.enqueue(
				`data: ${JSON.stringify({
					type: "connected",
					eventId,
					timestamp: new Date().toISOString(),
				})}\n\n`
			);

			// Clean up on close
			request.signal.addEventListener("abort", () => {
				connections.delete(connectionId);
				try {
					controller.close();
				} catch (e) {
					// Connection already closed
				}
			});
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Cache-Control",
		},
	});
}

// Function to broadcast messages to all connected clients
export function broadcastToEventClients(eventId: string, data: any) {
	const message = `data: ${JSON.stringify(data)}\n\n`;

	for (const [connectionId, controller] of connections.entries()) {
		if (connectionId.startsWith(eventId)) {
			try {
				controller.enqueue(message);
			} catch (error) {
				// Connection closed, remove it
				connections.delete(connectionId);
			}
		}
	}
}

// Function to broadcast to all clients
export function broadcastToAllClients(data: any) {
	const message = `data: ${JSON.stringify(data)}\n\n`;

	for (const [connectionId, controller] of connections.entries()) {
		try {
			controller.enqueue(message);
		} catch (error) {
			// Connection closed, remove it
			connections.delete(connectionId);
		}
	}
}
