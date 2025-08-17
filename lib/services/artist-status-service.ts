import {
	artistStatusSchema,
	statusTransitionSchema,
	updateArtistStatusSchema,
	type StatusHistoryEntry,
	type UpdateArtistStatusRequest,
	type ArtistProfile,
} from "@/lib/schemas/artist";
import { GCSService } from "@/lib/google-cloud-storage";
import { broadcastArtistStatusChange } from "@/app/api/websocket/route";
import { ServiceResult, ArtistStatusServiceResult } from "@/lib/types/services";

export class ArtistStatusService {
	/**
	 * Update artist status with validation and history tracking
	 */
	static async updateArtistStatus(
		eventId: string,
		artistId: string,
		statusUpdate: UpdateArtistStatusRequest
	): Promise<ArtistStatusServiceResult> {
		try {
			// Validate the status update request
			const validatedUpdate =
				updateArtistStatusSchema.parse(statusUpdate);

			// Get current artist data
			const currentArtist = await GCSService.getArtistData(artistId);
			if (!currentArtist) {
				return {
					success: false,
					error: "Artist not found",
				};
			}

			// Verify artist belongs to the event
			if (currentArtist.eventId !== eventId) {
				return {
					success: false,
					error: "Artist does not belong to this event",
				};
			}

			// Validate status transition
			const currentStatus = currentArtist.status || null;
			const transitionValidation = statusTransitionSchema.safeParse({
				from: currentStatus,
				to: validatedUpdate.newStatus,
			});

			if (!transitionValidation.success) {
				return {
					success: false,
					error: `Invalid status transition from ${
						currentStatus || "none"
					} to ${validatedUpdate.newStatus}`,
				};
			}

			// Create status history entry
			const historyEntry: StatusHistoryEntry = {
				id: `status_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`,
				previousStatus: currentStatus,
				newStatus: validatedUpdate.newStatus,
				changedBy: validatedUpdate.changedBy,
				changedByName: validatedUpdate.changedByName,
				reason: validatedUpdate.reason,
				timestamp: new Date().toISOString(),
				metadata: {
					eventId,
					artistId,
					userAgent: "artist-management-system",
				},
			};

			// Update artist data with new status and history
			const updatedArtist = {
				...currentArtist,
				status: validatedUpdate.newStatus,
				statusHistory: [
					...(currentArtist.statusHistory || []),
					historyEntry,
				],
				updatedAt: new Date().toISOString(),
			};

			// Save updated artist data
			await GCSService.saveArtistData(updatedArtist);

			// Get fresh data with proper media URLs
			const refreshedArtist = await GCSService.getArtistData(artistId);

			// Broadcast status change notification
			try {
				await broadcastArtistStatusChange(eventId, refreshedArtist);
				console.log(
					`Broadcasted status change for artist ${artistId}: ${currentStatus} -> ${validatedUpdate.newStatus}`
				);
			} catch (error) {
				console.error("Error broadcasting status change:", error);
				// Don't fail the request if broadcasting fails
			}

			return {
				success: true,
				data: refreshedArtist,
			};
		} catch (error: any) {
			console.error("Error updating artist status:", error);
			return {
				success: false,
				error: error.message || "Failed to update artist status",
			};
		}
	}

	/**
	 * Get status history for an artist
	 */
	static async getStatusHistory(
		artistId: string
	): Promise<StatusHistoryEntry[]> {
		try {
			const artistData = await GCSService.getArtistData(artistId);
			return artistData?.statusHistory || [];
		} catch (error) {
			console.error("Error getting status history:", error);
			return [];
		}
	}

	/**
	 * Get valid status transitions for current status
	 */
	static getValidTransitions(currentStatus: string | null): string[] {
		const validTransitions: Record<string, string[]> = {
			null: ["pending"],
			pending: ["approved", "rejected", "withdrawn"],
			approved: ["active", "inactive", "withdrawn"],
			active: ["inactive", "withdrawn"],
			inactive: ["active", "withdrawn"],
			rejected: ["pending"],
			withdrawn: ["pending"],
		};

		const fromStatus = currentStatus || "null";
		return validTransitions[fromStatus] || [];
	}

	/**
	 * Get status display information
	 */
	static getStatusInfo(status: string | null): {
		label: string;
		color: string;
		description: string;
	} {
		const statusInfo: Record<
			string,
			{ label: string; color: string; description: string }
		> = {
			pending: {
				label: "Pending Review",
				color: "yellow",
				description: "Application submitted, awaiting review",
			},
			approved: {
				label: "Approved",
				color: "green",
				description: "Application approved, ready for assignment",
			},
			active: {
				label: "Active",
				color: "blue",
				description: "Assigned to performance date and active",
			},
			inactive: {
				label: "Inactive",
				color: "gray",
				description: "Temporarily inactive or on hold",
			},
			rejected: {
				label: "Rejected",
				color: "red",
				description: "Application rejected",
			},
			withdrawn: {
				label: "Withdrawn",
				color: "orange",
				description: "Artist withdrew their application",
			},
		};

		return statusInfo[status || "pending"] || statusInfo["pending"];
	}

	/**
	 * Validate if a status change is allowed
	 */
	static isValidTransition(from: string | null, to: string): boolean {
		const validTransitions = this.getValidTransitions(from);
		return validTransitions.includes(to);
	}

	/**
	 * Auto-update status based on performance date assignment
	 */
	static async autoUpdateStatusOnAssignment(
		eventId: string,
		artistId: string,
		performanceDate: string | null,
		changedBy: string,
		changedByName: string
	): Promise<void> {
		try {
			const artistData = await GCSService.getArtistData(artistId);
			if (!artistData) return;

			const currentStatus = artistData.status || "pending";
			let newStatus: string | null = null;

			// Auto-transition logic based on assignment
			if (performanceDate && currentStatus === "approved") {
				// When assigned to a performance date, move to active
				newStatus = "active";
			} else if (!performanceDate && currentStatus === "active") {
				// When unassigned, move back to approved
				newStatus = "approved";
			}

			if (newStatus && this.isValidTransition(currentStatus, newStatus)) {
				await this.updateArtistStatus(eventId, artistId, {
					artistId,
					newStatus: newStatus as
						| "pending"
						| "approved"
						| "active"
						| "inactive"
						| "rejected"
						| "withdrawn",
					reason: performanceDate
						? `Auto-activated upon assignment to ${performanceDate}`
						: "Auto-approved upon unassignment",
					changedBy,
					changedByName,
				});
			}
		} catch (error) {
			console.error("Error auto-updating status on assignment:", error);
		}
	}
}
