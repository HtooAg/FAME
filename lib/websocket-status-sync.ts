/**
 * WebSocket Status Synchronization
 *
 * Handles real-time synchronization of artist status updates between clients
 * with automatic reconnection and fallback to polling.
 */

import type { CachedArtistStatus } from "./artist-status-cache";

export interface StatusSyncMessage {
	type: "artist_status_update" | "bulk_status_sync" | "ping" | "pong";
	eventId: string;
	artistId?: string;
	status?: CachedArtistStatus;
	statuses?: CachedArtistStatus[];
	timestamp: string;
	senderId: string;
	messageId?: string;
}

export interface WebSocketOptions {
	url?: string;
	maxReconnectAttempts?: number;
	reconnectDelayMs?: number;
	maxReconnectDelayMs?: number;
	pingIntervalMs?: number;
	enableFallbackPolling?: boolean;
	fallbackPollingIntervalMs?: number;
}

export interface SyncStats {
	connected: boolean;
	reconnectAttempts: number;
	messagesSent: number;
	messagesReceived: number;
	lastPingTime?: number;
	latency?: number;
}

export class WebSocketStatusSync {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private pingInterval: NodeJS.Timeout | null = null;
	private fallbackPollingInterval: NodeJS.Timeout | null = null;

	private options: Required<WebSocketOptions>;
	private eventHandlers = new Map<string, Function[]>();
	private senderId: string;

	private stats: SyncStats = {
		connected: false,
		reconnectAttempts: 0,
		messagesSent: 0,
		messagesReceived: 0,
	};

	constructor(options: WebSocketOptions = {}) {
		this.options = {
			url: this.getWebSocketUrl(),
			maxReconnectAttempts: 5,
			reconnectDelayMs: 1000,
			maxReconnectDelayMs: 30000,
			pingIntervalMs: 30000,
			enableFallbackPolling: true,
			fallbackPollingIntervalMs: 10000,
			...options,
		};

		this.senderId = this.generateSenderId();
	}

	/**
	 * Connect to WebSocket server
	 */
	connect(): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			return;
		}

		try {
			console.log(`Connecting to WebSocket: ${this.options.url}`);
			this.ws = new WebSocket(this.options.url);

			this.ws.onopen = this.handleOpen.bind(this);
			this.ws.onmessage = this.handleMessage.bind(this);
			this.ws.onclose = this.handleClose.bind(this);
			this.ws.onerror = this.handleError.bind(this);
		} catch (error) {
			console.error("Failed to create WebSocket connection:", error);
			this.scheduleReconnect();
		}
	}

	/**
	 * Disconnect from WebSocket server
	 */
	disconnect(): void {
		this.clearReconnectTimeout();
		this.clearPingInterval();
		this.clearFallbackPolling();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.stats.connected = false;
		this.emit("disconnected");
	}

	/**
	 * Send status update to other clients
	 */
	sendStatusUpdate(status: CachedArtistStatus): void {
		const message: StatusSyncMessage = {
			type: "artist_status_update",
			eventId: status.eventId,
			artistId: status.artistId,
			status,
			timestamp: new Date().toISOString(),
			senderId: this.senderId,
			messageId: this.generateMessageId(),
		};

		this.sendMessage(message);
	}

	/**
	 * Request bulk sync of all statuses for an event
	 */
	requestBulkSync(eventId: string): void {
		const message: StatusSyncMessage = {
			type: "bulk_status_sync",
			eventId,
			timestamp: new Date().toISOString(),
			senderId: this.senderId,
			messageId: this.generateMessageId(),
		};

		this.sendMessage(message);
	}

	/**
	 * Register event handler
	 */
	on(event: string, handler: Function): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(handler);
	}

	/**
	 * Remove event handler
	 */
	off(event: string, handler: Function): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	/**
	 * Register status update callback
	 */
	onStatusUpdate(callback: (status: CachedArtistStatus) => void): void {
		this.on("status_update", callback);
	}

	/**
	 * Register bulk sync callback
	 */
	onBulkSync(callback: (statuses: CachedArtistStatus[]) => void): void {
		this.on("bulk_sync", callback);
	}

	/**
	 * Get connection statistics
	 */
	getStats(): SyncStats {
		return { ...this.stats };
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Handle WebSocket open event
	 */
	private handleOpen(): void {
		console.log("WebSocket connected successfully");
		this.stats.connected = true;
		this.reconnectAttempts = 0;
		this.stats.reconnectAttempts = 0;

		this.clearReconnectTimeout();
		this.startPingInterval();
		this.clearFallbackPolling();

		this.emit("connected");
	}

	/**
	 * Handle WebSocket message event
	 */
	private handleMessage(event: MessageEvent): void {
		try {
			const message: StatusSyncMessage = JSON.parse(event.data);
			this.stats.messagesReceived++;

			// Ignore messages from self
			if (message.senderId === this.senderId) {
				return;
			}

			// Handle different message types
			switch (message.type) {
				case "artist_status_update":
					if (message.status) {
						this.emit("status_update", message.status);
					}
					break;

				case "bulk_status_sync":
					if (message.statuses) {
						this.emit("bulk_sync", message.statuses);
					}
					break;

				case "ping":
					this.sendPong(message.messageId);
					break;

				case "pong":
					this.handlePong(message.messageId);
					break;

				default:
					console.warn("Unknown message type:", message.type);
			}
		} catch (error) {
			console.error("Failed to parse WebSocket message:", error);
		}
	}

	/**
	 * Handle WebSocket close event
	 */
	private handleClose(event: CloseEvent): void {
		console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
		this.stats.connected = false;
		this.clearPingInterval();

		this.emit("disconnected");

		// Attempt reconnection if not manually closed
		if (event.code !== 1000) {
			this.scheduleReconnect();
		}
	}

	/**
	 * Handle WebSocket error event
	 */
	private handleError(event: Event): void {
		console.error("WebSocket error:", event);
		this.emit("error", event);
	}

	/**
	 * Send message through WebSocket
	 */
	private sendMessage(message: StatusSyncMessage): void {
		if (!this.isConnected()) {
			console.warn("Cannot send message: WebSocket not connected");
			return;
		}

		try {
			this.ws!.send(JSON.stringify(message));
			this.stats.messagesSent++;
		} catch (error) {
			console.error("Failed to send WebSocket message:", error);
		}
	}

	/**
	 * Send ping message
	 */
	private sendPing(): void {
		const messageId = this.generateMessageId();
		const message: StatusSyncMessage = {
			type: "ping",
			eventId: "",
			timestamp: new Date().toISOString(),
			senderId: this.senderId,
			messageId,
		};

		this.stats.lastPingTime = Date.now();
		this.sendMessage(message);
	}

	/**
	 * Send pong response
	 */
	private sendPong(messageId?: string): void {
		const message: StatusSyncMessage = {
			type: "pong",
			eventId: "",
			timestamp: new Date().toISOString(),
			senderId: this.senderId,
			messageId,
		};

		this.sendMessage(message);
	}

	/**
	 * Handle pong response
	 */
	private handlePong(messageId?: string): void {
		if (this.stats.lastPingTime) {
			this.stats.latency = Date.now() - this.stats.lastPingTime;
		}
	}

	/**
	 * Schedule reconnection attempt
	 */
	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
			console.error(
				"Max reconnection attempts reached, enabling fallback polling"
			);
			this.enableFallbackPolling();
			return;
		}

		this.reconnectAttempts++;
		this.stats.reconnectAttempts = this.reconnectAttempts;

		const delay = Math.min(
			this.options.reconnectDelayMs *
				Math.pow(2, this.reconnectAttempts - 1),
			this.options.maxReconnectDelayMs
		);

		console.log(
			`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
		);

		this.reconnectTimeout = setTimeout(() => {
			this.connect();
		}, delay);
	}

	/**
	 * Clear reconnection timeout
	 */
	private clearReconnectTimeout(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}

	/**
	 * Start ping interval
	 */
	private startPingInterval(): void {
		this.clearPingInterval();
		this.pingInterval = setInterval(() => {
			this.sendPing();
		}, this.options.pingIntervalMs);
	}

	/**
	 * Clear ping interval
	 */
	private clearPingInterval(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}

	/**
	 * Enable fallback polling when WebSocket fails
	 */
	private enableFallbackPolling(): void {
		if (!this.options.enableFallbackPolling) {
			return;
		}

		console.log("Enabling fallback polling for status updates");

		this.fallbackPollingInterval = setInterval(() => {
			this.emit("fallback_poll_request");
		}, this.options.fallbackPollingIntervalMs);
	}

	/**
	 * Clear fallback polling
	 */
	private clearFallbackPolling(): void {
		if (this.fallbackPollingInterval) {
			clearInterval(this.fallbackPollingInterval);
			this.fallbackPollingInterval = null;
		}
	}

	/**
	 * Emit event to registered handlers
	 */
	private emit(event: string, ...args: any[]): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.forEach((handler) => {
				try {
					handler(...args);
				} catch (error) {
					console.error(
						`Error in event handler for ${event}:`,
						error
					);
				}
			});
		}
	}

	/**
	 * Generate WebSocket URL
	 */
	private getWebSocketUrl(): string {
		if (typeof window !== "undefined") {
			const protocol =
				window.location.protocol === "https:" ? "wss:" : "ws:";
			return `${protocol}//${window.location.host}/api/websocket`;
		}
		return "ws://localhost:3000/api/websocket";
	}

	/**
	 * Generate unique sender ID
	 */
	private generateSenderId(): string {
		return `client_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Generate unique message ID
	 */
	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

// Export singleton instance
export const webSocketStatusSync = new WebSocketStatusSync();
