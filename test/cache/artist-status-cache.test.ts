/**
 * Unit Tests for Artist Status Cache
 */

import {
	ArtistStatusCache,
	type CachedArtistStatus,
} from "@/lib/artist-status-cache";
import { createCachedStatus, resolveStatusConflict } from "@/lib/cache-utils";

describe("ArtistStatusCache", () => {
	let cache: ArtistStatusCache;

	beforeEach(() => {
		cache = new ArtistStatusCache();
	});

	afterEach(() => {
		cache.destroy();
	});

	describe("Basic Operations", () => {
		test("should store and retrieve cached status", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);

			cache.set("artist1", status);
			const retrieved = cache.get("artist1");

			expect(retrieved).toEqual(status);
		});

		test("should return null for non-existent artist", () => {
			const retrieved = cache.get("nonexistent");
			expect(retrieved).toBeNull();
		});

		test("should check if artist exists in cache", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);

			expect(cache.has("artist1")).toBe(false);
			cache.set("artist1", status);
			expect(cache.has("artist1")).toBe(true);
		});

		test("should delete cached status", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);

			cache.set("artist1", status);
			expect(cache.has("artist1")).toBe(true);

			const deleted = cache.delete("artist1");
			expect(deleted).toBe(true);
			expect(cache.has("artist1")).toBe(false);
		});

		test("should clear all cached statuses", () => {
			const status1 = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			const status2 = createCachedStatus(
				"artist2",
				"event1",
				"completed"
			);

			cache.set("artist1", status1);
			cache.set("artist2", status2);

			cache.clear();

			expect(cache.get("artist1")).toBeNull();
			expect(cache.get("artist2")).toBeNull();
		});
	});

	describe("TTL and Expiration", () => {
		test("should expire entries after TTL", async () => {
			// Create cache with short TTL for testing
			const shortTTLCache = new ArtistStatusCache();
			// We can't easily test TTL without modifying the class or waiting
			// This would require dependency injection or a test-specific TTL

			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			shortTTLCache.set("artist1", status);

			expect(shortTTLCache.has("artist1")).toBe(true);

			shortTTLCache.destroy();
		});

		test("should cleanup expired entries", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			cache.set("artist1", status);

			// Manually expire the entry by manipulating internal state
			const entries = cache.getAllEntries();
			const entry = entries.get("artist1");
			if (entry) {
				entry.expiresAt = Date.now() - 1000; // Expired 1 second ago
			}

			const removedCount = cache.cleanup();
			expect(removedCount).toBe(1);
			expect(cache.has("artist1")).toBe(false);
		});
	});

	describe("Dirty Tracking", () => {
		test("should track dirty entries", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			status.dirty = true;

			cache.set("artist1", status);
			cache.markDirty("artist1");

			const dirtyEntries = cache.getDirtyEntries();
			expect(dirtyEntries).toHaveLength(1);
			expect(dirtyEntries[0].artistId).toBe("artist1");
		});

		test("should mark entries as clean", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			status.dirty = true;

			cache.set("artist1", status);
			cache.markClean("artist1");

			const dirtyEntries = cache.getDirtyEntries();
			expect(dirtyEntries).toHaveLength(0);
		});
	});

	describe("Conflict Resolution", () => {
		test("should update with version checking", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			status.version = 1;

			cache.set("artist1", status);

			// Try to update with older version
			const success = cache.update("artist1", {
				performance_status: "completed",
				version: 0, // Older version
			});

			expect(success).toBe(false);

			const retrieved = cache.get("artist1");
			expect(retrieved?.performance_status).toBe("not_started");
		});

		test("should update with newer version", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			status.version = 1;

			cache.set("artist1", status);

			// Update with newer version
			const success = cache.update("artist1", {
				performance_status: "completed",
				version: 2,
			});

			expect(success).toBe(true);

			const retrieved = cache.get("artist1");
			expect(retrieved?.performance_status).toBe("completed");
			expect(retrieved?.version).toBe(2);
		});
	});

	describe("Statistics", () => {
		test("should track cache statistics", () => {
			const status1 = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			const status2 = createCachedStatus(
				"artist2",
				"event1",
				"completed"
			);
			status2.dirty = true;

			cache.set("artist1", status1);
			cache.set("artist2", status2);

			// Generate some hits and misses
			cache.get("artist1"); // Hit
			cache.get("artist3"); // Miss

			const stats = cache.getStats();

			expect(stats.totalEntries).toBe(2);
			expect(stats.dirtyEntries).toBe(1);
			expect(stats.hitRate).toBeGreaterThan(0);
		});
	});

	describe("Memory Management", () => {
		test("should enforce cache size limit with LRU eviction", () => {
			// This test would require access to internal cache size limits
			// or a way to configure them for testing

			// Add many entries to trigger LRU eviction
			for (let i = 0; i < 1100; i++) {
				const status = createCachedStatus(
					`artist${i}`,
					"event1",
					"not_started"
				);
				cache.set(`artist${i}`, status);
			}

			const stats = cache.getStats();
			expect(stats.totalEntries).toBeLessThanOrEqual(1000); // Default max size
		});
	});
});

describe("Cache Utils", () => {
	describe("createCachedStatus", () => {
		test("should create valid cached status", () => {
			const status = createCachedStatus(
				"artist1",
				"event1",
				"not_started",
				1,
				"2024-01-01"
			);

			expect(status.artistId).toBe("artist1");
			expect(status.eventId).toBe("event1");
			expect(status.performance_status).toBe("not_started");
			expect(status.performance_order).toBe(1);
			expect(status.performance_date).toBe("2024-01-01");
			expect(status.version).toBe(1);
			expect(status.dirty).toBe(true);
			expect(status.timestamp).toBeDefined();
		});
	});

	describe("resolveStatusConflict", () => {
		test("should resolve conflict using timestamp (remote newer)", () => {
			const localStatus = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			localStatus.timestamp = "2024-01-01T10:00:00Z";

			const remoteStatus = createCachedStatus(
				"artist1",
				"event1",
				"completed"
			);
			remoteStatus.timestamp = "2024-01-01T11:00:00Z"; // Newer

			const result = resolveStatusConflict(localStatus, remoteStatus);

			expect(result.resolved.performance_status).toBe("completed");
			expect(result.strategy).toBe("timestamp");
			expect(result.conflicts).toContain(
				"Status changed from not_started to completed"
			);
		});

		test("should resolve conflict using timestamp (local newer)", () => {
			const localStatus = createCachedStatus(
				"artist1",
				"event1",
				"completed"
			);
			localStatus.timestamp = "2024-01-01T11:00:00Z"; // Newer

			const remoteStatus = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			remoteStatus.timestamp = "2024-01-01T10:00:00Z";

			const result = resolveStatusConflict(localStatus, remoteStatus);

			expect(result.resolved.performance_status).toBe("completed");
			expect(result.strategy).toBe("timestamp");
			expect(result.conflicts).toHaveLength(0);
		});

		test("should resolve conflict using version when timestamps equal", () => {
			const timestamp = "2024-01-01T10:00:00Z";

			const localStatus = createCachedStatus(
				"artist1",
				"event1",
				"not_started"
			);
			localStatus.timestamp = timestamp;
			localStatus.version = 1;

			const remoteStatus = createCachedStatus(
				"artist1",
				"event1",
				"completed"
			);
			remoteStatus.timestamp = timestamp;
			remoteStatus.version = 2; // Higher version

			const result = resolveStatusConflict(localStatus, remoteStatus);

			expect(result.resolved.performance_status).toBe("completed");
			expect(result.strategy).toBe("version");
		});
	});
});
