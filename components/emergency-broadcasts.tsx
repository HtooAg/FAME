import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmergencyAlerts } from "@/hooks/use-emergency-alerts";

interface EmergencyBroadcastsProps {
	eventId: string;
	showClearButton?: boolean;
	onClearBroadcast?: (broadcastId: string) => void;
}

export function EmergencyBroadcasts({
	eventId,
	showClearButton = false,
	onClearBroadcast,
}: EmergencyBroadcastsProps) {
	const { emergencyBroadcasts, getEmergencyColor } =
		useEmergencyAlerts(eventId);

	if (emergencyBroadcasts.length === 0) {
		return null;
	}

	return (
		<div className="border-b border-border">
			{emergencyBroadcasts.map((broadcast) => (
				<div
					key={broadcast.id}
					className={`p-4 ${getEmergencyColor(
						broadcast.emergency_code
					)}`}
				>
					<div className="container mx-auto flex justify-between items-center">
						<div className="flex items-center gap-3">
							<AlertTriangle className="h-5 w-5" />
							<div>
								<span className="font-bold">
									{broadcast.emergency_code.toUpperCase()}{" "}
									ALERT:
								</span>
								<span className="ml-2">
									{broadcast.message}
								</span>
							</div>
						</div>
						{showClearButton && onClearBroadcast && (
							<Button
								size="sm"
								variant="outline"
								className="bg-white/20 hover:bg-white/30"
								onClick={() => onClearBroadcast(broadcast.id)}
							>
								Clear Alert
							</Button>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
