"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface NotificationMessage {
	id: string;
	type:
		| "artist_registered"
		| "status_updated"
		| "profile_updated"
		| "event_created"
		| "rehearsal_scheduled";
	title: string;
	message: string;
	data?: any;
	timestamp: string;
	recipients: ("super-admin" | "stage-manager" | "artist")[];
	eventId?: string;
	artistId?: string;
	read?: boolean;
}

interface NotificationContextType {
	notifications: NotificationMessage[];
	unreadCount: number;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	clearNotifications: () => void;
	refreshData: () => void;
	isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
	undefined
);

export const useNotifications = () => {
	const context = useContext(NotificationContext);
	if (!context) {
		throw new Error(
			"useNotifications must be used within a NotificationProvider"
		);
	}
	return context;
};

interface NotificationProviderProps {
	children: React.ReactNode;
	userRole: "super-admin" | "stage-manager" | "artist";
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
	children,
	userRole,
}) => {
	const [notifications, setNotifications] = useState<NotificationMessage[]>(
		[]
	);
	const [isConnected, setIsConnected] = useState(false);
	const [connectionId, setConnectionId] = useState<string | null>(null);
	const { toast } = useToast();

	useEffect(() => {
		// Initialize WebSocket connection simulation
		// In a real implementation, this would be a WebSocket connection
		const initConnection = async () => {
			try {
				const response = await fetch(
					`/api/websocket?role=${userRole}&connectionId=conn_${Date.now()}`
				);
				if (response.ok) {
					const data = await response.json();
					setConnectionId(data.connectionId);
					setIsConnected(true);

					toast({
						title: "Connected",
						description: "Real-time notifications enabled",
					});
				}
			} catch (error) {
				console.error(
					"Failed to connect to notification service:",
					error
				);
				setIsConnected(false);
			}
		};

		initConnection();

		// Simulate receiving notifications (in real app, this would be WebSocket messages)
		const interval = setInterval(() => {
			// This is just for demo - in real app, notifications come via WebSocket
			if (Math.random() > 0.95) {
				// 5% chance every 5 seconds
				const mockNotification: NotificationMessage = {
					id: `notif_${Date.now()}`,
					type: "artist_registered",
					title: "New Artist Registration",
					message: "A new artist has registered for an event",
					timestamp: new Date().toISOString(),
					recipients: [userRole],
					read: false,
				};

				addNotification(mockNotification);
			}
		}, 5000);

		return () => {
			clearInterval(interval);
			if (connectionId) {
				// Cleanup connection
				fetch("/api/websocket", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "disconnect",
						data: { connectionId },
					}),
				});
			}
		};
	}, [userRole, connectionId, toast]);

	const addNotification = (notification: NotificationMessage) => {
		setNotifications((prev) => [notification, ...prev]);

		// Show toast for new notifications
		toast({
			title: notification.title,
			description: notification.message,
		});
	};

	const markAsRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((notif) =>
				notif.id === id ? { ...notif, read: true } : notif
			)
		);
	};

	const markAllAsRead = () => {
		setNotifications((prev) =>
			prev.map((notif) => ({ ...notif, read: true }))
		);
	};

	const clearNotifications = () => {
		setNotifications([]);
	};

	const refreshData = async () => {
		// Trigger data refresh
		toast({
			title: "Refreshing",
			description: "Updating data from server...",
		});

		// In a real app, this would trigger a data refresh
		window.location.reload();
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	const contextValue: NotificationContextType = {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		clearNotifications,
		refreshData,
		isConnected,
	};

	return (
		<NotificationContext.Provider value={contextValue}>
			{children}
		</NotificationContext.Provider>
	);
};

export const NotificationBell: React.FC = () => {
	const {
		notifications,
		unreadCount,
		markAsRead,
		markAllAsRead,
		clearNotifications,
		refreshData,
		isConnected,
	} = useNotifications();

	return (
		<div className="flex items-center gap-2">
			{/* Refresh Button */}
			<Button
				variant="outline"
				size="sm"
				onClick={refreshData}
				className="flex items-center gap-2"
			>
				<RefreshCw className="h-4 w-4" />
				Refresh
			</Button>

			{/* Notification Bell */}
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" size="sm" className="relative">
						<Bell className="h-4 w-4" />
						{unreadCount > 0 && (
							<Badge
								variant="destructive"
								className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
							>
								{unreadCount > 99 ? "99+" : unreadCount}
							</Badge>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80" align="end">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="font-semibold">Notifications</h4>
							<div className="flex items-center gap-2">
								<div
									className={`w-2 h-2 rounded-full ${
										isConnected
											? "bg-green-500"
											: "bg-red-500"
									}`}
								/>
								<span className="text-xs text-muted-foreground">
									{isConnected ? "Connected" : "Disconnected"}
								</span>
							</div>
						</div>

						{notifications.length > 0 && (
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={markAllAsRead}
									className="text-xs"
								>
									Mark all read
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={clearNotifications}
									className="text-xs"
								>
									Clear all
								</Button>
							</div>
						)}

						<div className="max-h-96 overflow-y-auto space-y-2">
							{notifications.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No notifications yet
								</p>
							) : (
								notifications.map((notification) => (
									<div
										key={notification.id}
										className={`p-3 rounded-lg border cursor-pointer transition-colors ${
											notification.read
												? "bg-muted/50"
												: "bg-background hover:bg-muted/50"
										}`}
										onClick={() =>
											markAsRead(notification.id)
										}
									>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h5 className="font-medium text-sm">
													{notification.title}
												</h5>
												<p className="text-xs text-muted-foreground mt-1">
													{notification.message}
												</p>
												<p className="text-xs text-muted-foreground mt-2">
													{new Date(
														notification.timestamp
													).toLocaleString()}
												</p>
											</div>
											{!notification.read && (
												<div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
											)}
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
};
