// WebSocket service for real-time notifications
export interface NotificationMessage {
	id: string;
	type:
		| "artist_registered"
		| "artist_assigned"
		| "artist_unassigned"
		| "artist_deleted"
		| "artist_status_changed"
		| "artist_media_updated"
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
}

export class WebSocketService {
	private static connections: Map<string, WebSocket> = new Map();
	private static userRoles: Map<string, string> = new Map();

	/**
	 * Add a WebSocket connection
	 */
	static addConnection(
		connectionId: string,
		ws: WebSocket,
		userRole: string
	) {
		this.connections.set(connectionId, ws);
		this.userRoles.set(connectionId, userRole);

		console.log(
			`WebSocket connection added: ${connectionId} (${userRole})`
		);
	}

	/**
	 * Remove a WebSocket connection
	 */
	static removeConnection(connectionId: string) {
		this.connections.delete(connectionId);
		this.userRoles.delete(connectionId);

		console.log(`WebSocket connection removed: ${connectionId}`);
	}

	/**
	 * Send notification to specific recipients
	 */
	static sendNotification(notification: NotificationMessage) {
		const message = JSON.stringify(notification);

		this.connections.forEach((ws, connectionId) => {
			const userRole = this.userRoles.get(connectionId);

			if (userRole && notification.recipients.includes(userRole as any)) {
				try {
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(message);
					}
				} catch (error) {
					console.error(
						`Error sending notification to ${connectionId}:`,
						error
					);
					this.removeConnection(connectionId);
				}
			}
		});

		console.log(
			`Notification sent to ${notification.recipients.join(", ")}: ${
				notification.title
			}`
		);
	}

	/**
	 * Send notification to all connections
	 */
	static broadcast(notification: NotificationMessage) {
		const message = JSON.stringify(notification);

		this.connections.forEach((ws, connectionId) => {
			try {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(message);
				}
			} catch (error) {
				console.error(`Error broadcasting to ${connectionId}:`, error);
				this.removeConnection(connectionId);
			}
		});

		console.log(`Broadcast notification: ${notification.title}`);
	}

	/**
	 * Create notification for artist registration
	 */
	static notifyArtistRegistration(artistData: any) {
		const notification: NotificationMessage = {
			id: `artist_reg_${Date.now()}`,
			type: "artist_registered",
			title: "New Artist Registration",
			message: `${artistData.artistName} has registered for ${artistData.eventName}`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName,
				eventId: artistData.eventId,
				eventName: artistData.eventName,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for status update
	 */
	static notifyStatusUpdate(
		artistData: any,
		oldStatus: string,
		newStatus: string
	) {
		const notification: NotificationMessage = {
			id: `status_update_${Date.now()}`,
			type: "status_updated",
			title: "Artist Status Updated",
			message: `${artistData.artistName}'s status changed from ${oldStatus} to ${newStatus}`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName,
				oldStatus,
				newStatus,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager", "artist"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for profile update
	 */
	static notifyProfileUpdate(artistData: any) {
		const notification: NotificationMessage = {
			id: `profile_update_${Date.now()}`,
			type: "profile_updated",
			title: "Artist Profile Updated",
			message: `${artistData.artistName} has updated their profile`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for event creation
	 */
	static notifyEventCreated(eventData: any) {
		const notification: NotificationMessage = {
			id: `event_created_${Date.now()}`,
			type: "event_created",
			title: "New Event Created",
			message: `Event "${eventData.name}" has been created`,
			data: {
				eventId: eventData.id,
				eventName: eventData.name,
				venue: eventData.venue,
				startDate: eventData.start_date,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId: eventData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for rehearsal scheduling
	 */
	static notifyRehearsalScheduled(rehearsalData: any) {
		const notification: NotificationMessage = {
			id: `rehearsal_scheduled_${Date.now()}`,
			type: "rehearsal_scheduled",
			title: "Rehearsal Scheduled",
			message: `Rehearsal scheduled for ${rehearsalData.artistName}`,
			data: {
				rehearsalId: rehearsalData.id,
				artistId: rehearsalData.artistId,
				artistName: rehearsalData.artistName,
				scheduledTime: rehearsalData.scheduledTime,
				eventId: rehearsalData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager", "artist"],
			eventId: rehearsalData.eventId,
			artistId: rehearsalData.artistId,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for artist assignment to performance date
	 */
	static notifyArtistAssignment(artistData: any, performanceDate: string) {
		const notification: NotificationMessage = {
			id: `artist_assigned_${Date.now()}`,
			type: "artist_assigned",
			title: "Artist Assigned to Performance",
			message: `${
				artistData.artistName || artistData.artist_name
			} has been assigned to perform on ${new Date(
				performanceDate
			).toLocaleDateString()}`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName || artistData.artist_name,
				performanceDate,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager", "artist"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for artist unassignment from performance date
	 */
	static notifyArtistUnassignment(artistData: any) {
		const notification: NotificationMessage = {
			id: `artist_unassigned_${Date.now()}`,
			type: "artist_unassigned",
			title: "Artist Unassigned from Performance",
			message: `${
				artistData.artistName || artistData.artist_name
			} has been moved back to submitted applications`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName || artistData.artist_name,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager", "artist"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for artist deletion
	 */
	static notifyArtistDeletion(artistData: any) {
		const notification: NotificationMessage = {
			id: `artist_deleted_${Date.now()}`,
			type: "artist_deleted",
			title: "Artist Profile Deleted",
			message: `${
				artistData.artistName || artistData.artist_name
			}'s profile has been removed`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName || artistData.artist_name,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for artist status change
	 */
	static notifyArtistStatusChange(artistData: any, oldStatus?: string) {
		const notification: NotificationMessage = {
			id: `artist_status_${Date.now()}`,
			type: "artist_status_changed",
			title: "Artist Status Updated",
			message: oldStatus
				? `${
						artistData.artistName || artistData.artist_name
				  }'s status changed from ${oldStatus} to ${artistData.status}`
				: `${
						artistData.artistName || artistData.artist_name
				  }'s status updated to ${artistData.status}`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName || artistData.artist_name,
				status: artistData.status,
				oldStatus,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager", "artist"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Create notification for artist media update
	 */
	static notifyArtistMediaUpdate(
		artistData: any,
		mediaType: "music" | "gallery"
	) {
		const notification: NotificationMessage = {
			id: `artist_media_${Date.now()}`,
			type: "artist_media_updated",
			title: "Artist Media Updated",
			message: `${
				artistData.artistName || artistData.artist_name
			} has updated their ${mediaType} files`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName || artistData.artist_name,
				mediaType,
				eventId: artistData.eventId,
			},
			timestamp: new Date().toISOString(),
			recipients: ["super-admin", "stage-manager"],
			eventId: artistData.eventId,
			artistId: artistData.id,
		};

		this.sendNotification(notification);
	}

	/**
	 * Send notification to specific user by ID
	 */
	static sendNotificationToUser(
		userId: string,
		notification: NotificationMessage
	) {
		this.connections.forEach((ws, connectionId) => {
			// Assuming connectionId contains userId information
			if (
				connectionId.includes(userId) &&
				ws.readyState === WebSocket.OPEN
			) {
				try {
					ws.send(JSON.stringify(notification));
					console.log(
						`Notification sent to user ${userId}: ${notification.title}`
					);
				} catch (error) {
					console.error(
						`Error sending notification to user ${userId}:`,
						error
					);
					this.removeConnection(connectionId);
				}
			}
		});
	}

	/**
	 * Send notification to all users in a specific event
	 */
	static sendNotificationToEvent(
		eventId: string,
		notification: NotificationMessage
	) {
		this.connections.forEach((ws, connectionId) => {
			// This would need to be enhanced with proper event subscription tracking
			if (ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(
						JSON.stringify({
							...notification,
							eventId,
						})
					);
				} catch (error) {
					console.error(
						`Error sending event notification to ${connectionId}:`,
						error
					);
					this.removeConnection(connectionId);
				}
			}
		});

		console.log(
			`Event notification sent to event ${eventId}: ${notification.title}`
		);
	}

	/**
	 * Get connection count
	 */
	static getConnectionCount(): number {
		return this.connections.size;
	}

	/**
	 * Get connections by role
	 */
	static getConnectionsByRole(role: string): number {
		let count = 0;
		this.userRoles.forEach((userRole) => {
			if (userRole === role) count++;
		});
		return count;
	}

	/**
	 * Get active connections info
	 */
	static getConnectionsInfo(): { connectionId: string; role: string }[] {
		const connections: { connectionId: string; role: string }[] = [];
		this.userRoles.forEach((role, connectionId) => {
			connections.push({ connectionId, role });
		});
		return connections;
	}
}

export default WebSocketService;
