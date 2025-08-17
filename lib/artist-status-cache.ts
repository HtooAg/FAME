/**
 * Artist Status Caching System
 *
 * Provides in-memory caching for artist status updates with TTL,
 * conflict resolution, and memory management.
 */

export interface CachedArtistStatus {
	artistId: string;
	eventId: string;
	performance_status: string;
	performance_order?: number;
	performance_date?: string;
	timestamp: string;
	version: number;
	dirty: boolean; // Indicates unsaved changes
}

export interface StatusCacheEntry {
	data: CachedArtistStatus;
	expiresAt: number;
	lastSyncAt: number;
}

export interface CacheStats {
	totalEntries: number;
	dirtyEntries: number;
	expiredEntries: number;
	hitRate: number;
	memoryUsage: number;
}

export class ArtistStatusCache {
	private cache = new Map<string, StatusCacheEntry>();
	private readonly TTL = 5 * 60 * 1000; // 5 minutes
	private readonly MAX_CACHE_SIZE = 1000;
	private hitCount = 0;
	private missCount = 0;
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Start automatic cleanup every 5 minutes
		this.startCleanupTimer();
	}

	/**
	 * Get cached artist status
	 */
	get(artistId: string): CachedArtistStatus | null {
		const entry = this.cache.get(artistId);

		if (!entry) {
			this.missCount++;
			return null;
		}

		// Check if entry has expired
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(artistId);
			this.missCount++;
			return null;
		}

		this.hitCount++;
		return entry.data;
	}

	/**
	 * Set cached artist status
	 */
	set(artistId: string, status: CachedArtistStatus): void {
		// Enforce cache size limit with LRU eviction
		if (
			this.cache.size >= this.MAX_CACHE_SIZE &&
			!this.cache.has(artistId)
		) {
			this.evictLRU();
		}

		const now = Date.now();
		const entry: StatusCacheEntry = {
			data: { ...status },
			expiresAt: now + this.TTL,
			lastSyncAt: status.dirty ? 0 : now, // 0 means never synced
		};

		this.cache.set(artistId, entry);
	}

	/**
	 * Mark an entry as dirty (needs sync)
	 */
	markDirty(artistId: string): void {
		const entry = this.cache.get(artistId);
		if (entry) {
			entry.data.dirty = true;
			entry.data.version++;
			entry.data.timestamp = new Date().toISOString();
			entry.lastSyncAt = 0; // Reset sync timestamp
		}
	}

	/**
	 * Mark an entry as clean (synced)
	 */
	markClean(artistId: string): void {
		const entry = this.cache.get(artistId);
		if (entry) {
			entry.data.dirty = false;
			entry.lastSyncAt = Date.now();
		}
	}

	/**
	 * Get all dirty entries that need syncing
	 */
	getDirtyEntries(): CachedArtistStatus[] {
		const dirtyEntries: CachedArtistStatus[] = [];

		for (const [artistId, entry] of this.cache.entries()) {
			// Skip expired entries
			if (Date.now() > entry.expiresAt) {
				continue;
			}

			if (entry.data.dirty) {
				dirtyEntries.push({ ...entry.data });
			}
		}

		return dirtyEntries;
	}

	/**
	 * Update existing cached status with new data
	 */
	update(artistId: string, updates: Partial<CachedArtistStatus>): boolean {
		const entry = this.cache.get(artistId);
		if (!entry) {
			return false;
		}

		// Check for conflicts using version numbers
		if (updates.version && updates.version < entry.data.version) {
			console.warn(
				`Version conflict for artist ${artistId}: incoming ${updates.version} < cached ${entry.data.version}`
			);
			return false;
		}

		// Apply updates
		Object.assign(entry.data, updates);
		entry.data.timestamp = new Date().toISOString();
		entry.data.version = Math.max(entry.data.version, updates.version || 0);

		// Extend TTL on update
		entry.expiresAt = Date.now() + this.TTL;

		return true;
	}

	/**
	 * Check if an entry exists and is not expired
	 */
	has(artistId: string): boolean {
		const entry = this.cache.get(artistId);
		if (!entry) {
			return false;
		}

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(artistId);
			return false;
		}

		return true;
	}

	/**
	 * Remove specific entry from cache
	 */
	delete(artistId: string): boolean {
		return this.cache.delete(artistId);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
		this.hitCount = 0;
		this.missCount = 0;
	}

	/**
	 * Remove expired entries from cache
	 */
	cleanup(): number {
		const now = Date.now();
		let removedCount = 0;

		for (const [artistId, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(artistId);
				removedCount++;
			}
		}

		return removedCount;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const now = Date.now();
		let dirtyCount = 0;
		let expiredCount = 0;

		for (const entry of this.cache.values()) {
			if (entry.data.dirty) {
				dirtyCount++;
			}
			if (now > entry.expiresAt) {
				expiredCount++;
			}
		}

		const totalRequests = this.hitCount + this.missCount;
		const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

		return {
			totalEntries: this.cache.size,
			dirtyEntries: dirtyCount,
			expiredEntries: expiredCount,
			hitRate: Math.round(hitRate * 100) / 100,
			memoryUsage: this.estimateMemoryUsage(),
		};
	}

	/**
	 * Get all cached entries (for debugging)
	 */
	getAllEntries(): Map<string, StatusCacheEntry> {
		return new Map(this.cache);
	}

	/**
	 * Destroy cache and cleanup resources
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.clear();
	}

	/**
	 * Start automatic cleanup timer
	 */
	private startCleanupTimer(): void {
		this.cleanupInterval = setInterval(() => {
			const removed = this.cleanup();
			if (removed > 0) {
				console.log(
					`Artist status cache: cleaned up ${removed} expired entries`
				);
			}
		}, 5 * 60 * 1000); // Every 5 minutes
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLRU(): void {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [artistId, entry] of this.cache.entries()) {
			if (entry.lastSyncAt < oldestTime) {
				oldestTime = entry.lastSyncAt;
				oldestKey = artistId;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			console.log(
				`Artist status cache: evicted LRU entry for artist ${oldestKey}`
			);
		}
	}

	/**
	 * Estimate memory usage in bytes
	 */
	private estimateMemoryUsage(): number {
		// Rough estimation: each entry ~200 bytes
		return this.cache.size * 200;
	}
}

// Singleton instance for global use
export const artistStatusCache = new ArtistStatusCache();

// Cleanup on process exit
if (typeof process !== "undefined") {
	process.on("exit", () => {
		artistStatusCache.destroy();
	});
}
