import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RealtimeMessage {
	type: string;
	data?: any;
	eventId?: string;
	timestamp?: string;
}

interface UseRealtimeUpdatesOptions {
	eventId: string;
	onEmergencyAlert?: (data: any) => void;
	onEmergencyClear?: (data: any) => void;
	onLiveBoardUpdate?: (data: any) => void;
	onMessage?: (message: RealtimeMessage) => void;
}

export function useRealtimeUpdates({
	eventId,
	onEmergencyAlert,
	onEmergencyClear,
	onLiveBoardUpdate,
	onMessage,
}: UseRealtimeUpdatesOptions) {
	const [connected, setConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);
	const { toast } = useToast();

	useEffect(() => {
		if (!eventId) return;

		const connectRealTime = () => {
			try {
				// Use Server-Sent Events for reliable real-time updates
				eventSourceRef.current = new EventSource(
					`/api/events/${eventId}/live-updates`
				);

				eventSourceRef.current.onopen = () => {
					console.log(
						"Real-time connection established for event:",
						eventId
					);
					setConnected(true);
				};

				eventSourceRef.current.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);

						// Handle specific message types
						if (data.type === "emergency-alert") {
							if (onEmergencyAlert) {
								onEmergencyAlert(data.data);
							}
							toast({
								title: `${data.data.emergency_code.toUpperCase()} EMERGENCY ALERT`,
								description: data.data.message,
								variant: "destructive",
							});
						} else if (data.type === "emergency-clear") {
							if (onEmergencyClear) {
								onEmergencyClear(data);
							}
							toast({
								title: "Emergency alert cleared",
								description:
									"Emergency broadcast has been deactivated",
							});
						} else if (data.type === "live-board-update") {
							if (onLiveBoardUpdate) {
								onLiveBoardUpdate(data.data);
							}
						}

						// Call generic message handler
						if (onMessage) {
							onMessage(data);
						}
					} catch (error) {
						console.error(
							"Error parsing real-time message:",
							error
						);
					}
				};

				eventSourceRef.current.onerror = (error) => {
					console.warn(
						"Real-time connection error, will retry:",
						error
					);
					setConnected(false);

					// Reconnect after 3 seconds
					setTimeout(() => {
						if (eventSourceRef.current) {
							eventSourceRef.current.close();
						}
						connectRealTime();
					}, 3000);
				};
			} catch (error) {
				console.error(
					"Failed to establish real-time connection:",
					error
				);
				setConnected(false);
			}
		};

		connectRealTime();

		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}
		};
	}, [
		eventId,
		onEmergencyAlert,
		onEmergencyClear,
		onLiveBoardUpdate,
		onMessage,
		toast,
	]);

	return { connected };
}
