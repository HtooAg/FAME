/**
 * Conflict Resolution Service
 *
 * Handles conflicts between concurrent status updates and provides
 * user notification and resolution mechanisms.
 */

import type { CachedArtistStatus } from "./artist-status-cache";
import type { ConflictResolutionResult } from "./cache-utils";

export interface ConflictNotification {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	conflictType: "status" | "order" | "assignment";
	localValue: any;
	remoteValue: any;
	resolvedValue: any;
	strategy: "timestamp" | "version" | "manual";
	timestamp: string;
	resolved: boolean;
	userId?: string;
}

export interface ConflictResolutionOptions {
	autoResolve?: boolean;
	preferLocal?: boolean;
	notifyUser?: boolean;
	logConflicts?: boolean;
}

export class ConflictResolutionService {
	private conflicts = new Map<string, ConflictNotification>();
	private listeners = new Set<(conflict: ConflictNotification) => void>();
	private options: Required<ConflictResolutionOptions>;

	constructor(options: ConflictResolutionOptions = {}) {
		this.options = {
			autoResolve: true,
			preferLocal: false,
			notifyUser: true,
			logConflicts: true,
			...options,
		};
	}

	/**
	 * Handle a conflict between local and remote status updates
	 */
	async handleStatusConflict(
		eventId: string,
		artistId: string,
		artistName: string,
		localStatus: CachedArtistStatus,
		remoteStatus: CachedArtistStatus,
		resolution: ConflictResolutionResult
	): Promise<ConflictNotification> {
		const conflictId = this.generateConflictId(eventId, artistId);

		const conflict: ConflictNotification = {
			id: conflictId,
			eventId,
			artistId,
			artistName,
			conflictType: "status",
			localValue: {
				status: localStatus.performance_status,
				order: localStatus.performance_order,
				timestamp: localStatus.timestamp,
				version: localStatus.version,
			},
			remoteValue: {
				status: remoteStatus.performance_status,
				order: remoteStatus.performance_order,
				timestamp: remoteStatus.timestamp,
				version: remoteStatus.version,
			},
			resolvedValue: {
				status: resolution.resolved.performance_status,
				order: resolution.resolved.performance_order,
				timestamp: resolution.resolved.timestamp,
				version: resolution.resolved.version,
			},
			strategy: resolution.strategy,
			timestamp: new Date().toISOString(),
			resolved: this.options.autoResolve,
		};

		// Store conflict
		this.conflicts.set(conflictId, conflict);

		// Log conflict if enabled
		if (this.options.logConflicts) {
			console.warn("Status conflict detected:", {
				artistId,
				artistName,
				local: conflict.localValue,
				remote: conflict.remoteValue,
				resolved: conflict.resolvedValue,
				strategy: conflict.strategy,
				conflicts: resolution.conflicts,
			});
		}

		// Notify listeners if enabled
		if (this.options.notifyUser) {
			this.notifyListeners(conflict);
		}

		// Auto-resolve if enabled
		if (this.options.autoResolve) {
			await this.resolveConflict(conflictId, resolution.resolved);
		}

		return conflict;
	}

	/**
	 * Handle order conflicts when multiple users reorder items
	 */
	async handleOrderConflict(
		eventId: string,
		localOrder: Array<{ id: string; order: number }>,
		remoteOrder: Array<{ id: string; order: number }>
	): Promise<ConflictNotification[]> {
		const conflicts: ConflictNotification[] = [];

		// Find items with different orders
		const conflictingItems = localOrder.filter((localItem) => {
			const remoteItem = remoteOrder.find((r) => r.id === localItem.id);
			return remoteItem && remoteItem.order !== localItem.order;
		});

		for (const item of conflictingItems) {
			const remoteItem = remoteOrder.find((r) => r.id === item.id)!;
			const conflictId = this.generateConflictId(
				eventId,
				item.id,
				"order"
			);

			const conflict: ConflictNotification = {
				id: conflictId,
				eventId,
				artistId: item.id,
				artistName: `Item ${item.id}`,
				conflictType: "order",
				localValue: { order: item.order },
				remoteValue: { order: remoteItem.order },
				resolvedValue: { order: remoteItem.order }, // Remote wins for order conflicts
				strategy: "timestamp",
				timestamp: new Date().toISOString(),
				resolved: this.options.autoResolve,
			};

			conflicts.push(conflict);
			this.conflicts.set(conflictId, conflict);

			if (this.options.notifyUser) {
				this.notifyListeners(conflict);
			}
		}

		return conflicts;
	}

	/**
	 * Manually resolve a conflict
	 */
	async resolveConflict(
		conflictId: string,
		resolvedValue: any,
		userId?: string
	): Promise<boolean> {
		const conflict = this.conflicts.get(conflictId);
		if (!conflict) {
			return false;
		}

		conflict.resolved = true;
		conflict.resolvedValue = resolvedValue;
		conflict.userId = userId;

		// Log resolution
		if (this.options.logConflicts) {
			console.log("Conflict resolved:", {
				conflictId,
				resolvedValue,
				userId: userId || "system",
			});
		}

		// Notify listeners of resolution
		this.notifyListeners(conflict);

		return true;
	}

	/**
	 * Get all unresolved conflicts for an event
	 */
	getUnresolvedConflicts(eventId: string): ConflictNotification[] {
		return Array.from(this.conflicts.values()).filter(
			(conflict) => conflict.eventId === eventId && !conflict.resolved
		);
	}

	/**
	 * Get conflict history for an event
	 */
	getConflictHistory(
		eventId: string,
		limit: number = 50
	): ConflictNotification[] {
		return Array.from(this.conflicts.values())
			.filter((conflict) => conflict.eventId === eventId)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() -
					new Date(a.timestamp).getTime()
			)
			.slice(0, limit);
	}

	/**
	 * Clear resolved conflicts older than specified time
	 */
	cleanupOldConflicts(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
		const cutoffTime = Date.now() - maxAgeMs;
		let removedCount = 0;

		for (const [conflictId, conflict] of this.conflicts.entries()) {
			if (
				conflict.resolved &&
				new Date(conflict.timestamp).getTime() < cutoffTime
			) {
				this.conflicts.delete(conflictId);
				removedCount++;
			}
		}

		return removedCount;
	}

	/**
	 * Register conflict notification listener
	 */
	onConflict(listener: (conflict: ConflictNotification) => void): void {
		this.listeners.add(listener);
	}

	/**
	 * Remove conflict notification listener
	 */
	offConflict(listener: (conflict: ConflictNotification) => void): void {
		this.listeners.delete(listener);
	}

	/**
	 * Get conflict statistics
	 */
	getStats(eventId?: string): {
		totalConflicts: number;
		unresolvedConflicts: number;
		autoResolvedConflicts: number;
		manualResolvedConflicts: number;
		conflictsByType: Record<string, number>;
	} {
		const conflicts = eventId
			? Array.from(this.conflicts.values()).filter(
					(c) => c.eventId === eventId
			  )
			: Array.from(this.conflicts.values());

		const stats = {
			totalConflicts: conflicts.length,
			unresolvedConflicts: conflicts.filter((c) => !c.resolved).length,
			autoResolvedConflicts: conflicts.filter(
				(c) => c.resolved && !c.userId
			).length,
			manualResolvedConflicts: conflicts.filter(
				(c) => c.resolved && c.userId
			).length,
			conflictsByType: {} as Record<string, number>,
		};

		// Count by type
		for (const conflict of conflicts) {
			stats.conflictsByType[conflict.conflictType] =
				(stats.conflictsByType[conflict.conflictType] || 0) + 1;
		}

		return stats;
	}

	/**
	 * Create user-friendly conflict message
	 */
	formatConflictMessage(conflict: ConflictNotification): string {
		switch (conflict.conflictType) {
			case "status":
				return `Status conflict for ${conflict.artistName}: Local "${conflict.localValue.status}" vs Remote "${conflict.remoteValue.status}". Resolved to "${conflict.resolvedValue.status}" using ${conflict.strategy} strategy.`;

			case "order":
				return `Order conflict for ${conflict.artistName}: Local position ${conflict.localValue.order} vs Remote position ${conflict.remoteValue.order}. Resolved to position ${conflict.resolvedValue.order}.`;

			case "assignment":
				return `Assignment conflict for ${conflict.artistName}: Multiple users tried to assign simultaneously. Resolved using ${conflict.strategy} strategy.`;

			default:
				return `Conflict detected for ${conflict.artistName}. Resolved using ${conflict.strategy} strategy.`;
		}
	}

	/**
	 * Export conflicts for debugging
	 */
	exportConflicts(eventId?: string): any {
		const conflicts = eventId
			? Array.from(this.conflicts.values()).filter(
					(c) => c.eventId === eventId
			  )
			: Array.from(this.conflicts.values());

		return {
			timestamp: new Date().toISOString(),
			eventId,
			conflicts: conflicts.map((conflict) => ({
				...conflict,
				message: this.formatConflictMessage(conflict),
			})),
			stats: this.getStats(eventId),
		};
	}

	/**
	 * Generate unique conflict ID
	 */
	private generateConflictId(
		eventId: string,
		artistId: string,
		type: string = "status"
	): string {
		return `conflict_${eventId}_${artistId}_${type}_${Date.now()}`;
	}

	/**
	 * Notify all listeners of a conflict
	 */
	private notifyListeners(conflict: ConflictNotification): void {
		for (const listener of this.listeners) {
			try {
				listener(conflict);
			} catch (error) {
				console.error("Error in conflict listener:", error);
			}
		}
	}
}

// Export singleton instance
export const conflictResolutionService = new ConflictResolutionService();
