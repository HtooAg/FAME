import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";

interface WebSocketMessage {
	type: string;
	data?: any;
	success?: boolean;
	error?: string;
	timestamp?: string;
}

export function useWebSocket() {
	const { user } = useAuth();
	const [isConnected, setIsConnected] = useState(false);
	const [events, setEvents] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttempts = useRef(0);
	const maxReconnectAttempts = 5;

	const connect = () => {
		if (!user || user.role !== "stage_manager") return;

		try {
			console.log("Connecting to WebSocket...");
			const ws = new WebSocket("ws://localhost:8080");
			wsRef.current = ws;

			ws.onopen = () => {
				console.log("WebSocket connected");
				setIsConnected(true);
				reconnectAttempts.current = 0;
				// Server will authenticate using the HTTP-only cookie from the upgrade request
			};

			ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					console.log("WebSocket message received:", message);

					switch (message.type) {
						case "authenticated":
							if (message.success) {
								console.log("WebSocket authenticated successfully");
								// Request initial events data
								ws.send(JSON.stringify({ type: "request_events" }));
							} else {
								console.error("WebSocket authentication failed:", message.error);
								ws.close();
							}
							break;

						case "events_update":
							console.log("Events updated via WebSocket:", message.data);
							setEvents(message.data || []);
							setLoading(false);
							break;

						default:
							console.log(
								"Unknown WebSocket message type:",
								message.type
							);
					}
				} catch (error) {
					console.error("Error parsing WebSocket message:", error);
				}
			};

			ws.onclose = (event) => {
				console.log(
					"WebSocket disconnected:",
					event.code,
					event.reason
				);
				setIsConnected(false);
				wsRef.current = null;

				// Attempt to reconnect if not a normal closure
				if (
					event.code !== 1000 &&
					reconnectAttempts.current < maxReconnectAttempts
				) {
					const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
					console.log(`Attempting to reconnect in ${delay}ms...`);

					reconnectTimeoutRef.current = setTimeout(() => {
						reconnectAttempts.current++;
						connect();
					}, delay);
				}
			};

			ws.onerror = (error) => {
				console.error("WebSocket error:", error);
			};
		} catch (error) {
			console.error("Error creating WebSocket connection:", error);
		}
	};

	const disconnect = () => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.close(1000, "Component unmounting");
			wsRef.current = null;
		}
		setIsConnected(false);
	};

	const requestEvents = () => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({ type: "request_events" }));
		}
	};

	useEffect(() => {
		// Initialize WebSocket server first
		fetch("/api/websocket")
			.then((response) => response.json())
			.then((data) => {
				console.log("WebSocket server initialized:", data);
				// Small delay to ensure server is ready
				setTimeout(connect, 1000);
			})
			.catch((error) => {
				console.error("Failed to initialize WebSocket server:", error);
			});

		return () => {
			disconnect();
		};
	}, [user]);

	return {
		isConnected,
		events,
		loading,
		requestEvents,
		disconnect,
	};
}
