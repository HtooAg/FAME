/**
 * Error Recovery Service
 *
 * Handles error recovery mechanisms for cache corruption,
 * network failures, and data inconsistencies.
 */

import { statusCacheManager } from "./status-cache-manager";
import { GCSService } from "./google-cloud-storage";
import type { CachedArtistStatus } from "./artist-status-cache";

export interface RecoveryOperation {
	id: string;
	type:
		| "cache_corruption"
		| "network_failure"
		| "data_inconsistency"
		| "sync_failure";
	eventId: string;
	performanceDate?: string;
	timestamp: string;
	status: "pending" | "in_progress" | "completed" | "failed";
	error?: string;
	retryCount: number;
	maxRetries: number;
}

export interface RecoveryStats {
	totalOperations: number;
	successfulRecoveries: number;
	failedRecoveries: number;
	averageRecoveryTime: number;
	lastRecoveryTime?: string;
}

export class ErrorRecoveryService {
	private operations = new Map<string, RecoveryOperation>();
	private listeners = new Set<(operation: RecoveryOperation) => void>();
	private recoveryInProgress = false;

	/**
	 * Detect and recover from cache corruption
	 */
	async recoverFromCacheCorruption(
		eventId: string,
		performanceDate: string
	): Promise<boolean> {
		const operationId = this.createOperation(
			"cache_corruption",
			eventId,
			performanceDate
		);

		try {
			console.log("Starting cache corruption recovery...");

			// Clear corrupted cache
			await statusCacheManager.destroy();

			// Reinitialize cache manager
			await statusCacheManager.initialize(eventId);

			// Perform full sync from storage
			await statusCacheManager.fullSyncFromStorage(
				eventId,
				performanceDate
			);

			// Verify cache integrity
			const stats = await statusCacheManager.getStats();
			if (stats.cacheStats.totalEntries === 0) {
				throw new Error("Cache still empty after recovery");
			}

			this.completeOperation(operationId);
			console.log("Cache corruption recovery completed successfully");
			return true;
		} catch (error) {
			this.failOperation(
				operationId,
				error instanceof Error ? error.message : "Unknown error"
			);
			console.error("Cache corruption recovery failed:", error);
			return false;
		}
	}

	/**
	 * Recover from network failures
	 */
	async recoverFromNetworkFailure(
		eventId: string,
		performanceDate: string,
		failedOperations: any[] = []
	): Promise<boolean> {
		const operationId = this.createOperation(
			"network_failure",
			eventId,
			performanceDate
		);

		try {
			console.log("Starting network failure recovery...");

			// Wait for network connectivity
			await this.waitForNetworkConnectivity();

			// Retry failed operations
			for (const operation of failedOperations) {
				await this.retryFailedOperation(operation);
			}

			// Sync dirty cache entries
			const syncSuccess = await statusCacheManager.syncToStorage(
				eventId,
				performanceDate
			);
			if (!syncSuccess) {
				throw new Error("Failed to sync cache after network recovery");
			}

			this.completeOperation(operationId);
			console.log("Network failure recovery completed successfully");
			return true;
		} catch (error) {
			this.failOperation(
				operationId,
				error instanceof Error ? error.message : "Unknown error"
			);
			console.error("Network failure recovery failed:", error);
			return false;
		}
	}

	/**
	 * Recover from data inconsistencies between cache and storage
	 */
	async recoverFromDataInconsistency(
		eventId: string,
		performanceDate: string,
		inconsistentArtistIds: string[] = []
	): Promise<boolean> {
		const operationId = this.createOperation(
			"data_inconsistency",
			eventId,
			performanceDate
		);

		try {
			console.log("Starting data inconsistency recovery...");

			// Get current statuses from both cache and storage
			const cacheStats = await statusCacheManager.getStats();
			const storageStatuses = await GCSService.getCurrentStatuses(
				eventId,
				performanceDate
			);

			// Resolve inconsistencies for specific artists
			for (const artistId of inconsistentArtistIds) {
				await this.resolveArtistInconsistency(
					artistId,
					eventId,
					performanceDate
				);
			}

			// If no specific artists provided, do full reconciliation
			if (inconsistentArtistIds.length === 0) {
				await this.performFullReconciliation(eventId, performanceDate);
			}

			this.completeOperation(operationId);
			console.log("Data inconsistency recovery completed successfully");
			return true;
		} catch (error) {
			this.failOperation(
				operationId,
				error instanceof Error ? error.message : "Unknown error"
			);
			console.error("Data inconsistency recovery failed:", error);
			return false;
		}
	}

	/**
	 * Recover from sync failures
	 */
	async recoverFromSyncFailure(
		eventId: string,
		performanceDate: string
	): Promise<boolean> {
		const operationId = this.createOperation(
			"sync_failure",
			eventId,
			performanceDate
		);

		try {
			console.log("Starting sync failure recovery...");

			// Get dirty entries that failed to sync
			const dirtyEntries = await statusCacheManager.getDirtyEntries();

			if (dirtyEntries.length === 0) {
				console.log("No dirty entries to recover");
				this.completeOperation(operationId);
				return true;
			}

			// Attempt to sync each dirty entry individually
			let successCount = 0;
			for (const entry of dirtyEntries) {
				try {
					await GCSService.updateArtistPerformanceStatus(
						entry.artistId,
						entry.eventId,
						{
							performance_status: entry.performance_status,
							performance_order: entry.performance_order,
							performance_date: entry.performance_date,
						}
					);

					// Mark as clean in cache
					await statusCacheManager.markClean(entry.artistId);
					successCount++;
				} catch (entryError) {
					console.error(
						`Failed to sync entry for artist ${entry.artistId}:`,
						entryError
					);
				}
			}

			if (successCount === 0) {
				throw new Error("Failed to sync any dirty entries");
			}

			this.completeOperation(operationId);
			console.log(
				`Sync failure recovery completed: ${successCount}/${dirtyEntries.length} entries synced`
			);
			return true;
		} catch (error) {
			this.failOperation(
				operationId,
				error instanceof Error ? error.message : "Unknown error"
			);
			console.error("Sync failure recovery failed:", error);
			return false;
		}
	}

	/**
	 * Automatic recovery based on error type
	 */
	async autoRecover(
		errorType: string,
		eventId: string,
		performanceDate: string,
		context?: any
	): Promise<boolean> {
		if (this.recoveryInProgress) {
			console.log("Recovery already in progress, skipping auto-recovery");
			return false;
		}

		this.recoveryInProgress = true;

		try {
			switch (errorType) {
				case "cache_corruption":
					return await this.recoverFromCacheCorruption(
						eventId,
						performanceDate
					);

				case "network_failure":
					return await this.recoverFromNetworkFailure(
						eventId,
						performanceDate,
						context?.failedOperations
					);

				case "data_inconsistency":
					return await this.recoverFromDataInconsistency(
						eventId,
						performanceDate,
						context?.inconsistentArtistIds
					);

				case "sync_failure":
					return await this.recoverFromSyncFailure(
						eventId,
						performanceDate
					);

				default:
					console.warn(
						`Unknown error type for auto-recovery: ${errorType}`
					);
					return false;
			}
		} finally {
			this.recoveryInProgress = false;
		}
	}

	/**
	 * Get recovery statistics
	 */
	getRecoveryStats(): RecoveryStats {
		const operations = Array.from(this.operations.values());
		const completed = operations.filter((op) => op.status === "completed");
		const failed = operations.filter((op) => op.status === "failed");

		const recoveryTimes = completed
			.map((op) => new Date(op.timestamp).getTime())
			.filter((time) => !isNaN(time));

		const averageRecoveryTime =
			recoveryTimes.length > 0
				? recoveryTimes.reduce((sum, time) => sum + time, 0) /
				  recoveryTimes.length
				: 0;

		return {
			totalOperations: operations.length,
			successfulRecoveries: completed.length,
			failedRecoveries: failed.length,
			averageRecoveryTime,
			lastRecoveryTime:
				operations.length > 0
					? operations[operations.length - 1].timestamp
					: undefined,
		};
	}

	/**
	 * Register recovery operation listener
	 */
	onRecoveryOperation(
		listener: (operation: RecoveryOperation) => void
	): void {
		this.listeners.add(listener);
	}

	/**
	 * Remove recovery operation listener
	 */
	offRecoveryOperation(
		listener: (operation: RecoveryOperation) => void
	): void {
		this.listeners.delete(listener);
	}

	/**
	 * Create a new recovery operation
	 */
	private createOperation(
		type: RecoveryOperation["type"],
		eventId: string,
		performanceDate?: string
	): string {
		const operationId = `recovery_${type}_${eventId}_${Date.now()}`;

		const operation: RecoveryOperation = {
			id: operationId,
			type,
			eventId,
			performanceDate,
			timestamp: new Date().toISOString(),
			status: "in_progress",
			retryCount: 0,
			maxRetries: 3,
		};

		this.operations.set(operationId, operation);
		this.notifyListeners(operation);

		return operationId;
	}

	/**
	 * Mark operation as completed
	 */
	private completeOperation(operationId: string): void {
		const operation = this.operations.get(operationId);
		if (operation) {
			operation.status = "completed";
			this.notifyListeners(operation);
		}
	}

	/**
	 * Mark operation as failed
	 */
	private failOperation(operationId: string, error: string): void {
		const operation = this.operations.get(operationId);
		if (operation) {
			operation.status = "failed";
			operation.error = error;
			this.notifyListeners(operation);
		}
	}

	/**
	 * Wait for network connectivity
	 */
	private async waitForNetworkConnectivity(
		timeoutMs: number = 30000
	): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeoutMs) {
			try {
				// Simple connectivity test
				const response = await fetch("/api/health", {
					method: "HEAD",
					cache: "no-cache",
				});

				if (response.ok) {
					return;
				}
			} catch (error) {
				// Continue waiting
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		throw new Error("Network connectivity timeout");
	}

	/**
	 * Retry a failed operation
	 */
	private async retryFailedOperation(operation: any): Promise<void> {
		// Implementation would depend on the specific operation type
		console.log("Retrying failed operation:", operation);
	}

	/**
	 * Resolve inconsistency for a specific artist
	 */
	private async resolveArtistInconsistency(
		artistId: string,
		eventId: string,
		performanceDate: string
	): Promise<void> {
		// Get status from both sources
		const cachedStatus = await statusCacheManager.getArtistStatus(
			artistId,
			eventId
		);
		const storageStatus =
			await GCSService.getArtistStatusWithConflictResolution(
				artistId,
				eventId,
				cachedStatus || undefined
			);

		if (storageStatus) {
			// Update cache with resolved status
			await statusCacheManager.updateArtistStatus(
				artistId,
				eventId,
				storageStatus
			);
		}
	}

	/**
	 * Perform full reconciliation between cache and storage
	 */
	private async performFullReconciliation(
		eventId: string,
		performanceDate: string
	): Promise<void> {
		// Clear cache and reload from storage
		await statusCacheManager.fullSyncFromStorage(eventId, performanceDate);
	}

	/**
	 * Notify all listeners of operation update
	 */
	private notifyListeners(operation: RecoveryOperation): void {
		for (const listener of this.listeners) {
			try {
				listener(operation);
			} catch (error) {
				console.error("Error in recovery operation listener:", error);
			}
		}
	}
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();
