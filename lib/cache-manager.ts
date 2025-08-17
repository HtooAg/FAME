/**
 * Cache Manager
 *
 * Coordinates cache operations and provides a simple interface
 * for managing artist status caching.
 */

import {
	ArtistStatusCache,
	type CachedArtistStatus,
	type CacheStats,
} from "./artist-status-cache";
import {
	resolveStatusConflict,
	createCachedStatus,
	validateCachedStatus,
	isSignificantUpdate,
	type ConflictResolutionResult,
} from "./cache-utils";

export interface CacheManagerOptions {
	enableAutoCleanup?: boolean;
	maxRetries?: number;
	batchSize?: number;
}

export class CacheManager {
	private cache: ArtistStatusCache;
	private options: Required<CacheManagerOptions>;

	constructor(options: CacheManagerOptions = {}) {
		this.cache = new ArtistStatusCache();
		this.options = {
			enableAutoCleanup: true,
			maxRetries: 3,
			batchSize: 10,
			...options,
		};
	}

	/**
	 * Get artist status from cache
	 */
	async getArtistStatus(
		artistId: string
	): Promise<CachedArtistStatus | null> {
		try {
			return this.cache.get(artistId);
		} catch (error) {
			console.error(
				`Error getting artist status from cache: ${artistId}`,
				error
			);
			return null;
		}
	}

	/**
	 * Set artist status in cache
	 */
	async setArtistStatus(status: CachedArtistStatus): Promise<boolean> {
		try {
			if (!validateCachedStatus(status)) {
				console.error("Invalid cached status data:", status);
				return false;
			}

			this.cache.set(status.artistId, status);
			return true;
		} catch (error) {
			console.error(
				`Error setting artist status in cache: ${status.artistId}`,
				error
			);
			return false;
		}
	}

	/**
	 * Update artist status with conflict resolution
	 */
	async updateArtistStatus(
		artistId: string,
		updates: Partial<CachedArtistStatus>
	): Promise<ConflictResolutionResult | null> {
		try {
			const existing = this.cache.get(artistId);

			if (!existing) {
				// No existing entry, create new one
				if (!updates.eventId || !updates.performance_status) {
					console.error(
						"Missing required fields for new status entry"
					);
					return null;
				}

				const newStatus = createCachedStatus(
					artistId,
					updates.eventId,
					updates.performance_status,
					updates.performance_order,
					updates.performance_date
				);

				this.cache.set(artistId, newStatus);

				return {
					resolved: newStatus,
					conflicts: [],
					strategy: "timestamp",
				};
			}

			// Check if update is significant
			if (!isSignificantUpdate(existing, updates)) {
				return {
					resolved: existing,
					conflicts: [],
					strategy: "timestamp",
				};
			}

			// Create updated status for conflict resolution
			const updatedStatus: CachedArtistStatus = {
				...existing,
				...updates,
				timestamp: new Date().toISOString(),
				version: existing.version + 1,
				dirty: true,
			};

			// Resolve conflicts
			const resolution = resolveStatusConflict(existing, updatedStatus);

			// Update cache with resolved status
			this.cache.set(artistId, resolution.resolved);

			return resolution;
		} catch (error) {
			console.error(
				`Error updating artist status in cache: ${artistId}`,
				error
			);
			return null;
		}
	}

	/**
	 * Mark artist status as dirty (needs sync)
	 */
	async markDirty(artistId: string): Promise<boolean> {
		try {
			this.cache.markDirty(artistId);
			return true;
		} catch (error) {
			console.error(
				`Error marking artist status as dirty: ${artistId}`,
				error
			);
			return false;
		}
	}

	/**
	 * Mark artist status as clean (synced)
	 */
	async markClean(artistId: string): Promise<boolean> {
		try {
			this.cache.markClean(artistId);
			return true;
		} catch (error) {
			console.error(
				`Error marking artist status as clean: ${artistId}`,
				error
			);
			return false;
		}
	}

	/**
	 * Get all dirty entries that need syncing
	 */
	async getDirtyEntries(): Promise<CachedArtistStatus[]> {
		try {
			return this.cache.getDirtyEntries();
		} catch (error) {
			console.error("Error getting dirty entries from cache", error);
			return [];
		}
	}

	/**
	 * Batch update multiple artist statuses
	 */
	async batchUpdateStatuses(
		updates: Array<{
			artistId: string;
			updates: Partial<CachedArtistStatus>;
		}>
	): Promise<ConflictResolutionResult[]> {
		const results: ConflictResolutionResult[] = [];

		for (const { artistId, updates: statusUpdates } of updates) {
			const result = await this.updateArtistStatus(
				artistId,
				statusUpdates
			);
			if (result) {
				results.push(result);
			}
		}

		return results;
	}

	/**
	 * Check if artist status exists in cache
	 */
	async hasArtistStatus(artistId: string): Promise<boolean> {
		try {
			return this.cache.has(artistId);
		} catch (error) {
			console.error(
				`Error checking if artist status exists: ${artistId}`,
				error
			);
			return false;
		}
	}

	/**
	 * Remove artist status from cache
	 */
	async removeArtistStatus(artistId: string): Promise<boolean> {
		try {
			return this.cache.delete(artistId);
		} catch (error) {
			console.error(
				`Error removing artist status from cache: ${artistId}`,
				error
			);
			return false;
		}
	}

	/**
	 * Clear all cached statuses
	 */
	async clearCache(): Promise<boolean> {
		try {
			this.cache.clear();
			return true;
		} catch (error) {
			console.error("Error clearing cache", error);
			return false;
		}
	}

	/**
	 * Get cache statistics
	 */
	async getCacheStats(): Promise<CacheStats> {
		try {
			return this.cache.getStats();
		} catch (error) {
			console.error("Error getting cache stats", error);
			return {
				totalEntries: 0,
				dirtyEntries: 0,
				expiredEntries: 0,
				hitRate: 0,
				memoryUsage: 0,
			};
		}
	}

	/**
	 * Perform manual cache cleanup
	 */
	async cleanup(): Promise<number> {
		try {
			return this.cache.cleanup();
		} catch (error) {
			console.error("Error during cache cleanup", error);
			return 0;
		}
	}

	/**
	 * Destroy cache manager and cleanup resources
	 */
	async destroy(): Promise<void> {
		try {
			this.cache.destroy();
		} catch (error) {
			console.error("Error destroying cache manager", error);
		}
	}

	/**
	 * Get cache instance for advanced operations
	 */
	getCacheInstance(): ArtistStatusCache {
		return this.cache;
	}
}

// Export singleton instance
export const cacheManager = new CacheManager();
