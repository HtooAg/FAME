/**
 * Status Cache Manager Service
 *
 * Central coordinator for all artist status caching components.
 * Provides cache-first operations with fallback to storage and
 * automatic cache warming and background sync.
 */

import { CacheManager } from "./cache-manager";
import { StatusUpdateQueue } from "./status-update-queue";
import { WebSocketStatusSync } from "./websocket-status-sync";
import { GCSService } from "./google-cloud-storage";
import { conflictResolutionService } from "./conflict-resolution-service";
import { errorRecoveryService } from "./error-recovery-service";
import { performanceMonitor } from "./performance-monitor";
import type { CachedArtistStatus } from "./artist-status-cache";
import type { ConflictResolutionResult } from "./cache-utils";

export interface StatusCacheManagerOptions {
	enableWebSocket?: boolean;
	enableBackgroundSync?: boolean;
	syncIntervalMs?: number;
	warmupOnStart?: boolean;
	batchSize?: number;
}

export interface CacheManagerStats {
	cacheStats: any;
	queueStats: any;
	websocketStats: any;
	lastSyncTime?: string;
	syncErrors: number;
	totalOperations: number;
}

export class StatusCacheManager {
	private cacheManager: CacheManager;
	private updateQueue: StatusUpdateQueue;
	private websocketSync: WebSocketStatusSync;
	private options: Required<StatusCacheManagerOptions>;

	private syncInterval: NodeJS.Timeout | null = null;
	private isInitialized = false;
	private stats = {
		syncErrors: 0,
		totalOperations: 0,
		lastSyncTime: undefined as string | undefined,
	};

	constructor(options: StatusCacheManagerOptions = {}) {
		this.options = {
			enableWebSocket: true,
			enableBackgroundSync: true,
			syncIntervalMs: 30000, // 30 seconds
			warmupOnStart: true,
			batchSize: 10,
			...options,
		};

		this.cacheManager = new CacheManager();
		this.updateQueue = new StatusUpdateQueue({
			batchSize: this.options.batchSize,
		});
		this.websocketSync = new WebSocketStatusSync();

		this.setupEventHandlers();
	}

	/**
	 * Initialize the cache manager
	 */
	async initialize(eventId?: string): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			console.log("Initializing Status Cache Manager...");

			// Connect WebSocket if enabled
			if (this.options.enableWebSocket) {
				this.websocketSync.connect();
			}

			// Start background sync if enabled
			if (this.options.enableBackgroundSync) {
				this.startBackgroundSync();
			}

			// Warm up cache if enabled and eventId provided
			if (this.options.warmupOnStart && eventId) {
				await this.warmupCache(eventId);
			}

			this.isInitialized = true;
			console.log("Status Cache Manager initialized successfully");
		} catch (error) {
			console.error("Failed to initialize Status Cache Manager:", error);
			throw error;
		}
	}

	/**
	 * Get artist status with cache-first approach
	 */
	async getArtistStatus(
		artistId: string,
		eventId: string
	): Promise<CachedArtistStatus | null> {
		this.stats.totalOperations++;
		performanceMonitor.startTimer("get_artist_status", {
			artistId,
			eventId,
		});

		try {
			// Try cache first
			let cachedStatus = await this.cacheManager.getArtistStatus(
				artistId
			);

			if (cachedStatus) {
				console.log(`Cache hit for artist: ${artistId}`);
				performanceMonitor.incrementCounter("cache_hits");
				performanceMonitor.endTimer("get_artist_status", "cache");
				return cachedStatus;
			}

			// Cache miss - fetch from storage
			console.log(
				`Cache miss for artist: ${artistId}, fetching from storage`
			);
			performanceMonitor.incrementCounter("cache_misses");
			performanceMonitor.startTimer("storage_fetch", { artistId });

			const storageStatus =
				await GCSService.getArtistStatusWithConflictResolution(
					artistId,
					eventId
				);

			performanceMonitor.endTimer("storage_fetch", "storage");

			if (storageStatus) {
				// Cache the fetched status
				await this.cacheManager.setArtistStatus(storageStatus);
				performanceMonitor.endTimer("get_artist_status", "cache");
				return storageStatus;
			}

			performanceMonitor.endTimer("get_artist_status", "cache");
			return null;
		} catch (error) {
			console.error(`Error getting artist status: ${artistId}`, error);
			performanceMonitor.incrementCounter("get_artist_status_errors");
			performanceMonitor.endTimer("get_artist_status", "cache");
			return null;
		}
	}

	/**
	 * Update artist status with optimistic updates
	 */
	async updateArtistStatus(
		artistId: string,
		eventId: string,
		updates: Partial<CachedArtistStatus>,
		userId?: string
	): Promise<ConflictResolutionResult | null> {
		this.stats.totalOperations++;

		try {
			// Get current status for conflict detection
			const currentStatus = await this.cacheManager.getArtistStatus(
				artistId
			);

			// Update cache immediately (optimistic update)
			const resolution = await this.cacheManager.updateArtistStatus(
				artistId,
				updates
			);

			if (!resolution) {
				return null;
			}

			// Check for conflicts if there were any
			if (resolution.conflicts.length > 0 && currentStatus) {
				// Create a mock remote status for conflict handling
				const remoteStatus: CachedArtistStatus = {
					...currentStatus,
					...updates,
					timestamp: new Date().toISOString(),
					version: currentStatus.version + 1,
				};

				// Handle the conflict
				await conflictResolutionService.handleStatusConflict(
					eventId,
					artistId,
					`Artist ${artistId}`, // Would need artist name from somewhere
					currentStatus,
					remoteStatus,
					resolution
				);
			}

			// Queue for background sync to storage
			this.updateQueue.enqueue({
				artistId,
				eventId,
				updates: {
					...updates,
					timestamp: new Date().toISOString(),
					version: resolution.resolved.version,
				},
				maxRetries: 3,
				priority: this.getUpdatePriority(updates.performance_status),
			});

			// Broadcast via WebSocket if connected
			if (this.websocketSync.isConnected()) {
				this.websocketSync.sendStatusUpdate(resolution.resolved);
			}

			console.log(`Status updated for artist: ${artistId}`);
			return resolution;
		} catch (error) {
			console.error(`Error updating artist status: ${artistId}`, error);

			// Attempt error recovery if it's a known error type
			if (error instanceof Error) {
				if (error.message.includes("cache corruption")) {
					await errorRecoveryService.autoRecover(
						"cache_corruption",
						eventId,
						""
					);
				} else if (error.message.includes("network")) {
					await errorRecoveryService.autoRecover(
						"network_failure",
						eventId,
						""
					);
				} else if (error.message.includes("sync")) {
					await errorRecoveryService.autoRecover(
						"sync_failure",
						eventId,
						""
					);
				}
			}

			return null;
		}
	}

	/**
	 * Batch update multiple artist statuses
	 */
	async batchUpdateStatuses(
		updates: Array<{
			artistId: string;
			eventId: string;
			updates: Partial<CachedArtistStatus>;
		}>,
		userId?: string
	): Promise<ConflictResolutionResult[]> {
		this.stats.totalOperations += updates.length;

		try {
			// Update cache for all statuses
			const cacheUpdates = updates.map(
				({ artistId, updates: statusUpdates }) => ({
					artistId,
					updates: statusUpdates,
				})
			);

			const resolutions = await this.cacheManager.batchUpdateStatuses(
				cacheUpdates
			);

			// Queue all updates for background sync
			for (const update of updates) {
				this.updateQueue.enqueue({
					artistId: update.artistId,
					eventId: update.eventId,
					updates: {
						...update.updates,
						timestamp: new Date().toISOString(),
					},
					maxRetries: 3,
					priority: this.getUpdatePriority(
						update.updates.performance_status
					),
				});
			}

			// Broadcast successful updates via WebSocket
			if (this.websocketSync.isConnected()) {
				for (const resolution of resolutions) {
					this.websocketSync.sendStatusUpdate(resolution.resolved);
				}
			}

			console.log(`Batch updated ${updates.length} artist statuses`);
			return resolutions;
		} catch (error) {
			console.error("Error batch updating artist statuses:", error);
			return [];
		}
	}

	/**
	 * Sync dirty cache entries to storage
	 */
	async syncToStorage(
		eventId: string,
		performanceDate: string
	): Promise<boolean> {
		try {
			const dirtyEntries = await this.cacheManager.getDirtyEntries();

			if (dirtyEntries.length === 0) {
				return true;
			}

			console.log(
				`Syncing ${dirtyEntries.length} dirty entries to storage`
			);

			// Batch save to GCS
			await GCSService.batchSaveStatuses(
				eventId,
				performanceDate,
				dirtyEntries
			);

			// Mark entries as clean
			for (const entry of dirtyEntries) {
				await this.cacheManager.markClean(entry.artistId);
			}

			this.stats.lastSyncTime = new Date().toISOString();
			console.log("Successfully synced dirty entries to storage");
			return true;
		} catch (error) {
			console.error("Error syncing to storage:", error);
			this.stats.syncErrors++;
			return false;
		}
	}

	/**
	 * Warm up cache with data from storage
	 */
	async warmupCache(
		eventId: string,
		performanceDate?: string
	): Promise<void> {
		try {
			console.log(`Warming up cache for event: ${eventId}`);

			if (!performanceDate) {
				// Use today's date as default
				performanceDate = new Date().toISOString().split("T")[0];
			}

			// Load current statuses from storage
			const statuses = await GCSService.getCurrentStatuses(
				eventId,
				performanceDate
			);

			// Populate cache
			for (const status of statuses) {
				await this.cacheManager.setArtistStatus(status);
			}

			console.log(`Cache warmed up with ${statuses.length} statuses`);
		} catch (error) {
			console.error("Error warming up cache:", error);
		}
	}

	/**
	 * Force full sync from storage (overwrite cache)
	 */
	async fullSyncFromStorage(
		eventId: string,
		performanceDate: string
	): Promise<void> {
		try {
			console.log("Performing full sync from storage...");

			// Clear current cache
			await this.cacheManager.clearCache();

			// Reload from storage
			await this.warmupCache(eventId, performanceDate);

			console.log("Full sync from storage completed");
		} catch (error) {
			console.error("Error during full sync from storage:", error);
		}
	}

	/**
	 * Get comprehensive statistics
	 */
	async getStats(): Promise<CacheManagerStats> {
		try {
			const [cacheStats, queueStats, websocketStats] = await Promise.all([
				this.cacheManager.getCacheStats(),
				this.updateQueue.getStats(),
				Promise.resolve(this.websocketSync.getStats()),
			]);

			return {
				cacheStats,
				queueStats,
				websocketStats,
				...this.stats,
			};
		} catch (error) {
			console.error("Error getting stats:", error);
			return {
				cacheStats: {},
				queueStats: {},
				websocketStats: {},
				syncErrors: this.stats.syncErrors,
				totalOperations: this.stats.totalOperations,
				lastSyncTime: this.stats.lastSyncTime,
			};
		}
	}

	/**
	 * Cleanup and destroy resources
	 */
	async destroy(): Promise<void> {
		try {
			console.log("Destroying Status Cache Manager...");

			// Stop background sync
			if (this.syncInterval) {
				clearInterval(this.syncInterval);
				this.syncInterval = null;
			}

			// Disconnect WebSocket
			this.websocketSync.disconnect();

			// Destroy components
			await this.cacheManager.destroy();
			this.updateQueue.destroy();

			this.isInitialized = false;
			console.log("Status Cache Manager destroyed");
		} catch (error) {
			console.error("Error destroying Status Cache Manager:", error);
		}
	}

	/**
	 * Setup event handlers for WebSocket and other components
	 */
	private setupEventHandlers(): void {
		// Handle incoming status updates from WebSocket
		this.websocketSync.onStatusUpdate(
			async (status: CachedArtistStatus) => {
				try {
					// Update local cache with remote status
					await this.cacheManager.updateArtistStatus(
						status.artistId,
						status
					);
					console.log(
						`Received remote status update for artist: ${status.artistId}`
					);
				} catch (error) {
					console.error(
						"Error handling remote status update:",
						error
					);
				}
			}
		);

		// Handle bulk sync requests
		this.websocketSync.onBulkSync(
			async (statuses: CachedArtistStatus[]) => {
				try {
					for (const status of statuses) {
						await this.cacheManager.setArtistStatus(status);
					}
					console.log(
						`Received bulk sync with ${statuses.length} statuses`
					);
				} catch (error) {
					console.error("Error handling bulk sync:", error);
				}
			}
		);

		// Handle WebSocket connection events
		this.websocketSync.on("connected", () => {
			console.log("WebSocket connected - requesting bulk sync");
			// Request bulk sync when reconnected
			// Note: eventId would need to be passed or stored
		});

		this.websocketSync.on("disconnected", () => {
			console.log("WebSocket disconnected");
		});

		// Handle fallback polling requests
		this.websocketSync.on("fallback_poll_request", () => {
			console.log("WebSocket fallback polling triggered");
			// Could trigger a manual sync here
		});
	}

	/**
	 * Start background sync process
	 */
	private startBackgroundSync(): void {
		this.syncInterval = setInterval(async () => {
			try {
				// Process update queue
				await this.updateQueue.process();
			} catch (error) {
				console.error("Error in background sync:", error);
				this.stats.syncErrors++;
			}
		}, this.options.syncIntervalMs);

		console.log(
			`Background sync started with ${this.options.syncIntervalMs}ms interval`
		);
	}

	/**
	 * Determine update priority based on status
	 */
	private getUpdatePriority(status?: string): "low" | "normal" | "high" {
		if (!status) return "normal";

		switch (status) {
			case "currently_on_stage":
				return "high";
			case "next_on_stage":
			case "next_on_deck":
				return "high";
			case "completed":
				return "normal";
			default:
				return "low";
		}
	}
}

// Export singleton instance
export const statusCacheManager = new StatusCacheManager();
