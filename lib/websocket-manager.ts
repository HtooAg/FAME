import { WebSocket } from "ws";

interface WebSocketConnection {
	ws: WebSocket;
	eventId: string;
	userId?: string;
}

class WebSocketManagerClass {
	private connections: Map<string, WebSocketConnection> = new Map();
	private eventSubscriptions: Map<string, Set<string>> = new Map();

	addConnection(
		connectionId: string,
		ws: WebSocket,
		eventId: string,
		userId?: string
	) {
		this.connections.set(connectionId, { ws, eventId, userId });

		// Add to event subscriptions
		if (!this.eventSubscriptions.has(eventId)) {
			this.eventSubscriptions.set(eventId, new Set());
		}
		this.eventSubscriptions.get(eventId)!.add(connectionId);

		// Handle connection close
		ws.on("close", () => {
			this.removeConnection(connectionId);
		});

		ws.on("error", (error) => {
			console.error("WebSocket error:", error);
			this.removeConnection(connectionId);
		});
	}

	removeConnection(connectionId: string) {
		const connection = this.connections.get(connectionId);
		if (connection) {
			// Remove from event subscriptions
			const eventConnections = this.eventSubscriptions.get(
				connection.eventId
			);
			if (eventConnections) {
				eventConnections.delete(connectionId);
				if (eventConnections.size === 0) {
					this.eventSubscriptions.delete(connection.eventId);
				}
			}

			this.connections.delete(connectionId);
		}
	}

	broadcast(eventId: string, message: any) {
		const eventConnections = this.eventSubscriptions.get(eventId);
		if (!eventConnections) return;

		const messageString = JSON.stringify(message);

		eventConnections.forEach((connectionId) => {
			const connection = this.connections.get(connectionId);
			if (connection && connection.ws.readyState === WebSocket.OPEN) {
				try {
					connection.ws.send(messageString);
				} catch (error) {
					console.error("Error sending WebSocket message:", error);
					this.removeConnection(connectionId);
				}
			}
		});
	}

	broadcastToUser(userId: string, message: any) {
		const messageString = JSON.stringify(message);

		this.connections.forEach((connection, connectionId) => {
			if (
				connection.userId === userId &&
				connection.ws.readyState === WebSocket.OPEN
			) {
				try {
					connection.ws.send(messageString);
				} catch (error) {
					console.error("Error sending WebSocket message:", error);
					this.removeConnection(connectionId);
				}
			}
		});
	}

	getConnectionCount(eventId?: string): number {
		if (eventId) {
			return this.eventSubscriptions.get(eventId)?.size || 0;
		}
		return this.connections.size;
	}
}

export const WebSocketManager = new WebSocketManagerClass();
