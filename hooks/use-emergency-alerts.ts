import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EmergencyBroadcast {
	id: string;
	message: string;
	emergency_code: string;
	is_active: boolean;
	created_at: string;
}

export function useEmergencyAlerts(eventId: string) {
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [lastCheck, setLastCheck] = useState<string>("");
	const { toast } = useToast();

	const fetchEmergencyBroadcasts = async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/emergency-broadcasts`
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					const broadcasts = data.data || [];

					// Check for new broadcasts since last check
					if (lastCheck) {
						const newBroadcasts = broadcasts.filter(
							(broadcast: EmergencyBroadcast) =>
								new Date(broadcast.created_at) >
								new Date(lastCheck)
						);

						// Show toast for new broadcasts
						newBroadcasts.forEach(
							(broadcast: EmergencyBroadcast) => {
								toast({
									title: `${broadcast.emergency_code.toUpperCase()} EMERGENCY ALERT`,
									description: broadcast.message,
									variant: "destructive",
								});
							}
						);
					}

					setEmergencyBroadcasts(broadcasts);
					setLastCheck(new Date().toISOString());
				}
			}
		} catch (error) {
			console.error("Error fetching emergency broadcasts:", error);
		}
	};

	const getEmergencyColor = (code: string) => {
		switch (code) {
			case "red":
				return "bg-red-500 text-white";
			case "blue":
				return "bg-blue-500 text-white";
			case "green":
				return "bg-green-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	// Fetch emergency broadcasts on mount and then poll every 5 seconds
	useEffect(() => {
		if (!eventId) return;

		fetchEmergencyBroadcasts();

		const interval = setInterval(fetchEmergencyBroadcasts, 5000);

		return () => clearInterval(interval);
	}, [eventId]);

	return {
		emergencyBroadcasts,
		fetchEmergencyBroadcasts,
		getEmergencyColor,
	};
}
