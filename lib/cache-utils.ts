/**
 * Cache Utility Functions
 *
 * Provides helper functions for cache operations, conflict resolution,
 * and memory management.
 */

import type { CachedArtistStatus } from "./artist-status-cache";

export interface ConflictResolutionResult {
	resolved: CachedArtistStatus;
	conflicts: string[];
	strategy: "timestamp" | "version" | "manual";
}

export interface CacheMetrics {
	cacheHits: number;
	cacheMisses: number;
	syncOperations: number;
	conflictResolutions: number;
	lastCleanup: string;
}

/**
 * Resolve conflicts between two artist status entries
 */
export function resolveStatusConflict(
	local: CachedArtistStatus,
	remote: CachedArtistStatus
): ConflictResolutionResult {
	const conflicts: string[] = [];

	// Start with the local version
	const resolved: CachedArtistStatus = { ...local };

	// Compare timestamps (most recent wins)
	const localTime = new Date(local.timestamp).getTime();
	const remoteTime = new Date(remote.timestamp).getTime();

	if (remoteTime > localTime) {
		// Remote is newer, use remote values
		resolved.performance_status = remote.performance_status;
		resolved.performance_order = remote.performance_order;
		resolved.performance_date = remote.performance_date;
		resolved.timestamp = remote.timestamp;
		resolved.version = Math.max(local.version, remote.version) + 1;

		if (local.performance_status !== remote.performance_status) {
			conflicts.push(
				`Status changed from ${local.performance_status} to ${remote.performance_status}`
			);
		}
		if (local.performance_order !== remote.performance_order) {
			conflicts.push(
				`Order changed from ${local.performance_order} to ${remote.performance_order}`
			);
		}

		return {
			resolved,
			conflicts,
			strategy: "timestamp",
		};
	} else if (localTime > remoteTime) {
		// Local is newer, keep local values but increment version
		resolved.version = Math.max(local.version, remote.version) + 1;

		return {
			resolved,
			conflicts: [],
			strategy: "timestamp",
		};
	} else {
		// Same timestamp, use version numbers
		if (remote.version > local.version) {
			resolved.performance_status = remote.performance_status;
			resolved.performance_order = remote.performance_order;
			resolved.performance_date = remote.performance_date;
			resolved.version = remote.version + 1;

			if (local.performance_status !== remote.performance_status) {
				conflicts.push(
					`Status conflict resolved by version: ${local.performance_status} -> ${remote.performance_status}`
				);
			}

			return {
				resolved,
				conflicts,
				strategy: "version",
			};
		} else {
			// Local version is newer or equal, keep local
			resolved.version = Math.max(local.version, remote.version) + 1;

			return {
				resolved,
				conflicts: [],
				strategy: "version",
			};
		}
	}
}

/**
 * Create a new cached status entry
 */
export function createCachedStatus(
	artistId: string,
	eventId: string,
	status: string,
	order?: number,
	date?: string
): CachedArtistStatus {
	return {
		artistId,
		eventId,
		performance_status: status,
		performance_order: order,
		performance_date: date,
		timestamp: new Date().toISOString(),
		version: 1,
		dirty: true,
	};
}

/**
 * Validate cached status data
 */
export function validateCachedStatus(
	status: any
): status is CachedArtistStatus {
	return (
		typeof status === "object" &&
		status !== null &&
		typeof status.artistId === "string" &&
		typeof status.eventId === "string" &&
		typeof status.performance_status === "string" &&
		typeof status.timestamp === "string" &&
		typeof status.version === "number" &&
		typeof status.dirty === "boolean"
	);
}

/**
 * Calculate cache efficiency metrics
 */
export function calculateCacheEfficiency(
	hits: number,
	misses: number,
	syncOps: number
): number {
	const totalRequests = hits + misses;
	if (totalRequests === 0) return 0;

	const hitRate = hits / totalRequests;
	const syncRate = syncOps / totalRequests;

	// Efficiency score: high hit rate, low sync rate
	return Math.round((hitRate * 0.8 + (1 - syncRate) * 0.2) * 100);
}

/**
 * Generate cache key for artist status
 */
export function generateCacheKey(artistId: string, eventId?: string): string {
	return eventId ? `${eventId}:${artistId}` : artistId;
}

/**
 * Parse cache key to extract artist and event IDs
 */
export function parseCacheKey(key: string): {
	artistId: string;
	eventId?: string;
} {
	const parts = key.split(":");
	if (parts.length === 2) {
		return { eventId: parts[0], artistId: parts[1] };
	}
	return { artistId: key };
}

/**
 * Batch process status updates for efficiency
 */
export function batchStatusUpdates(
	updates: CachedArtistStatus[],
	batchSize: number = 10
): CachedArtistStatus[][] {
	const batches: CachedArtistStatus[][] = [];

	for (let i = 0; i < updates.length; i += batchSize) {
		batches.push(updates.slice(i, i + batchSize));
	}

	return batches;
}

/**
 * Merge multiple status updates for the same artist
 */
export function mergeStatusUpdates(
	updates: CachedArtistStatus[]
): CachedArtistStatus[] {
	const merged = new Map<string, CachedArtistStatus>();

	for (const update of updates) {
		const key = generateCacheKey(update.artistId, update.eventId);
		const existing = merged.get(key);

		if (!existing) {
			merged.set(key, { ...update });
		} else {
			// Merge with conflict resolution
			const resolution = resolveStatusConflict(existing, update);
			merged.set(key, resolution.resolved);
		}
	}

	return Array.from(merged.values());
}

/**
 * Check if status update is significant enough to cache
 */
export function isSignificantUpdate(
	oldStatus: CachedArtistStatus,
	newStatus: Partial<CachedArtistStatus>
): boolean {
	// Always cache status changes
	if (
		newStatus.performance_status &&
		newStatus.performance_status !== oldStatus.performance_status
	) {
		return true;
	}

	// Cache order changes
	if (
		newStatus.performance_order !== undefined &&
		newStatus.performance_order !== oldStatus.performance_order
	) {
		return true;
	}

	// Cache date changes
	if (
		newStatus.performance_date &&
		newStatus.performance_date !== oldStatus.performance_date
	) {
		return true;
	}

	return false;
}

/**
 * Create cache snapshot for debugging
 */
export function createCacheSnapshot(cache: Map<string, any>): any {
	const snapshot: any = {
		timestamp: new Date().toISOString(),
		entries: {},
		stats: {
			totalEntries: cache.size,
			dirtyEntries: 0,
			expiredEntries: 0,
		},
	};

	const now = Date.now();

	for (const [key, entry] of cache.entries()) {
		snapshot.entries[key] = {
			...entry.data,
			expiresAt: entry.expiresAt,
			lastSyncAt: entry.lastSyncAt,
			isExpired: now > entry.expiresAt,
			isDirty: entry.data.dirty,
		};

		if (entry.data.dirty) {
			snapshot.stats.dirtyEntries++;
		}
		if (now > entry.expiresAt) {
			snapshot.stats.expiredEntries++;
		}
	}

	return snapshot;
}
