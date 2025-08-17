/**
 * Status Update Queue System
 *
 * Handles batching and retry logic for failed artist status updates
 * with exponential backoff and queue persistence.
 */

import type { CachedArtistStatus } from "./artist-status-cache";

export interface QueuedUpdate {
	id: string;
	artistId: string;
	eventId: string;
	updates: Partial<CachedArtistStatus>;
	timestamp: string;
	retryCount: number;
	maxRetries: number;
	priority: "low" | "normal" | "high";
	nextRetryAt?: number;
}

export interface QueueStats {
	totalQueued: number;
	processing: number;
	failed: number;
	completed: number;
	averageRetries: number;
}

export interface QueueOptions {
	maxRetries?: number;
	batchSize?: number;
	retryDelayMs?: number;
	maxRetryDelayMs?: number;
	enablePersistence?: boolean;
}

export class StatusUpdateQueue {
	private queue: QueuedUpdate[] = [];
	private processing = false;
	private processingInterval: NodeJS.Timeout | null = null;
	private stats: QueueStats = {
		totalQueued: 0,
		processing: 0,
		failed: 0,
		completed: 0,
		averageRetries: 0,
	};

	private options: Required<QueueOptions>;

	constructor(options: QueueOptions = {}) {
		this.options = {
			maxRetries: 3,
			batchSize: 10,
			retryDelayMs: 1000,
			maxRetryDelayMs: 30000,
			enablePersistence: true,
			...options,
		};

		// Start processing queue
		this.startProcessing();

		// Load persisted queue on startup
		if (this.options.enablePersistence) {
			this.loadPersistedQueue();
		}
	}

	/**
	 * Add update to queue
	 */
	enqueue(
		update: Omit<QueuedUpdate, "id" | "timestamp" | "retryCount">
	): string {
		const queuedUpdate: QueuedUpdate = {
			...update,
			id: this.generateUpdateId(),
			timestamp: new Date().toISOString(),
			retryCount: 0,
			maxRetries: update.maxRetries || this.options.maxRetries,
		};

		// Insert based on priority
		this.insertByPriority(queuedUpdate);

		this.stats.totalQueued++;

		// Persist queue if enabled
		if (this.options.enablePersistence) {
			this.persistQueue();
		}

		console.log(
			`Queued status update for artist ${update.artistId}: ${queuedUpdate.id}`
		);
		return queuedUpdate.id;
	}

	/**
	 * Process queued updates
	 */
	async process(): Promise<void> {
		if (this.processing || this.queue.length === 0) {
			return;
		}

		this.processing = true;
		this.stats.processing++;

		try {
			// Get batch of updates to process
			const batch = this.getBatch();

			if (batch.length === 0) {
				return;
			}

			console.log(`Processing batch of ${batch.length} status updates`);

			// Process batch
			const results = await this.processBatch(batch);

			// Handle results
			for (let i = 0; i < batch.length; i++) {
				const update = batch[i];
				const success = results[i];

				if (success) {
					this.removeFromQueue(update.id);
					this.stats.completed++;
				} else {
					await this.handleFailedUpdate(update);
				}
			}

			// Persist updated queue
			if (this.options.enablePersistence) {
				this.persistQueue();
			}
		} catch (error) {
			console.error("Error processing status update queue:", error);
		} finally {
			this.processing = false;
			this.stats.processing--;
		}
	}

	/**
	 * Retry specific update
	 */
	async retry(updateId: string): Promise<boolean> {
		const update = this.queue.find((u) => u.id === updateId);
		if (!update) {
			return false;
		}

		// Reset retry count and timestamp
		update.retryCount = 0;
		update.timestamp = new Date().toISOString();
		delete update.nextRetryAt;

		// Move to front of queue
		this.queue = this.queue.filter((u) => u.id !== updateId);
		this.insertByPriority(update);

		console.log(`Manually retrying update: ${updateId}`);
		return true;
	}

	/**
	 * Remove update from queue
	 */
	remove(updateId: string): boolean {
		const initialLength = this.queue.length;
		this.queue = this.queue.filter((u) => u.id !== updateId);

		const removed = this.queue.length < initialLength;
		if (removed && this.options.enablePersistence) {
			this.persistQueue();
		}

		return removed;
	}

	/**
	 * Get queue size
	 */
	getQueueSize(): number {
		return this.queue.length;
	}

	/**
	 * Get queue statistics
	 */
	getStats(): QueueStats {
		return { ...this.stats };
	}

	/**
	 * Get all queued updates (for debugging)
	 */
	getAllUpdates(): QueuedUpdate[] {
		return [...this.queue];
	}

	/**
	 * Clear all queued updates
	 */
	clear(): void {
		this.queue = [];
		this.stats = {
			totalQueued: 0,
			processing: 0,
			failed: 0,
			completed: 0,
			averageRetries: 0,
		};

		if (this.options.enablePersistence) {
			this.persistQueue();
		}
	}

	/**
	 * Pause queue processing
	 */
	pause(): void {
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = null;
		}
	}

	/**
	 * Resume queue processing
	 */
	resume(): void {
		if (!this.processingInterval) {
			this.startProcessing();
		}
	}

	/**
	 * Destroy queue and cleanup resources
	 */
	destroy(): void {
		this.pause();
		this.clear();
	}

	/**
	 * Start automatic queue processing
	 */
	private startProcessing(): void {
		this.processingInterval = setInterval(async () => {
			await this.process();
		}, 2000); // Process every 2 seconds
	}

	/**
	 * Get batch of updates ready for processing
	 */
	private getBatch(): QueuedUpdate[] {
		const now = Date.now();
		const readyUpdates = this.queue.filter((update) => {
			// Skip if waiting for retry delay
			if (update.nextRetryAt && now < update.nextRetryAt) {
				return false;
			}
			return true;
		});

		return readyUpdates.slice(0, this.options.batchSize);
	}

	/**
	 * Process a batch of updates
	 */
	private async processBatch(batch: QueuedUpdate[]): Promise<boolean[]> {
		const results: boolean[] = [];

		for (const update of batch) {
			try {
				// Simulate API call to update artist status
				const success = await this.executeUpdate(update);
				results.push(success);
			} catch (error) {
				console.error(`Failed to execute update ${update.id}:`, error);
				results.push(false);
			}
		}

		return results;
	}

	/**
	 * Execute individual update (to be implemented with actual API calls)
	 */
	private async executeUpdate(update: QueuedUpdate): Promise<boolean> {
		try {
			console.log(
				`Executing update ${update.id} for artist ${update.artistId}`
			);

			// Import GCSService dynamically to avoid circular dependencies
			const { GCSService } = await import("./google-cloud-storage");

			// Get current artist data
			const currentArtistData = await GCSService.getArtistData(
				update.artistId
			);

			if (!currentArtistData) {
				console.error(`Artist ${update.artistId} not found in GCS`);
				return false;
			}

			// Merge the updates with current data
			const updatedArtistData = {
				...currentArtistData,
				...update.updates,
				updatedAt: new Date().toISOString(),
			};

			// Save updated data to GCS
			await GCSService.saveArtistData(updatedArtistData);

			console.log(
				`Successfully updated artist ${update.artistId} in GCS`
			);
			return true;
		} catch (error) {
			console.error(`Failed to execute update ${update.id}:`, error);
			return false;
		}
	}

	/**
	 * Handle failed update with retry logic
	 */
	private async handleFailedUpdate(update: QueuedUpdate): Promise<void> {
		update.retryCount++;

		if (update.retryCount >= update.maxRetries) {
			// Max retries reached, remove from queue
			this.removeFromQueue(update.id);
			this.stats.failed++;
			console.error(
				`Update ${update.id} failed permanently after ${update.retryCount} retries`
			);
			return;
		}

		// Calculate exponential backoff delay
		const baseDelay = this.options.retryDelayMs;
		const exponentialDelay = baseDelay * Math.pow(2, update.retryCount - 1);
		const jitteredDelay = exponentialDelay + Math.random() * 1000; // Add jitter
		const finalDelay = Math.min(
			jitteredDelay,
			this.options.maxRetryDelayMs
		);

		update.nextRetryAt = Date.now() + finalDelay;

		console.log(
			`Update ${update.id} will retry in ${Math.round(
				finalDelay
			)}ms (attempt ${update.retryCount}/${update.maxRetries})`
		);
	}

	/**
	 * Insert update into queue based on priority
	 */
	private insertByPriority(update: QueuedUpdate): void {
		const priorityOrder = { high: 0, normal: 1, low: 2 };
		const updatePriority = priorityOrder[update.priority];

		let insertIndex = this.queue.length;

		for (let i = 0; i < this.queue.length; i++) {
			const queuedPriority = priorityOrder[this.queue[i].priority];
			if (updatePriority < queuedPriority) {
				insertIndex = i;
				break;
			}
		}

		this.queue.splice(insertIndex, 0, update);
	}

	/**
	 * Remove update from queue by ID
	 */
	private removeFromQueue(updateId: string): boolean {
		const initialLength = this.queue.length;
		this.queue = this.queue.filter((u) => u.id !== updateId);
		return this.queue.length < initialLength;
	}

	/**
	 * Generate unique update ID
	 */
	private generateUpdateId(): string {
		return `update_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
	}

	/**
	 * Persist queue to localStorage (browser) or file (Node.js)
	 */
	private persistQueue(): void {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				// Browser environment
				localStorage.setItem(
					"artist_status_queue",
					JSON.stringify(this.queue)
				);
			} else {
				// Node.js environment - would need file system operations
				console.log(
					"Queue persistence not implemented for Node.js environment"
				);
			}
		} catch (error) {
			console.error("Failed to persist queue:", error);
		}
	}

	/**
	 * Load persisted queue from storage
	 */
	private loadPersistedQueue(): void {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				// Browser environment
				const persistedQueue = localStorage.getItem(
					"artist_status_queue"
				);
				if (persistedQueue) {
					const parsed = JSON.parse(persistedQueue);
					if (Array.isArray(parsed)) {
						this.queue = parsed;
						console.log(
							`Loaded ${this.queue.length} persisted updates from storage`
						);
					}
				}
			}
		} catch (error) {
			console.error("Failed to load persisted queue:", error);
		}
	}
}

// Export singleton instance
export const statusUpdateQueue = new StatusUpdateQueue();
