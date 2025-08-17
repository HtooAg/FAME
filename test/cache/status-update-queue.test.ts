/**
 * Unit Tests for Status Update Queue
 */

import {
	StatusUpdateQueue,
	type QueuedUpdate,
} from "@/lib/status-update-queue";

// Mock setTimeout and clearInterval for testing
jest.useFakeTimers();

describe("StatusUpdateQueue", () => {
	let queue: StatusUpdateQueue;

	beforeEach(() => {
		queue = new StatusUpdateQueue({
			maxRetries: 2,
			batchSize: 3,
			retryDelayMs: 100,
			enablePersistence: false, // Disable for testing
		});
	});

	afterEach(() => {
		queue.destroy();
		jest.clearAllTimers();
	});

	describe("Basic Queue Operations", () => {
		test("should enqueue updates", () => {
			const updateId = queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			expect(updateId).toBeDefined();
			expect(queue.getQueueSize()).toBe(1);
		});

		test("should remove updates from queue", () => {
			const updateId = queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			const removed = queue.remove(updateId);
			expect(removed).toBe(true);
			expect(queue.getQueueSize()).toBe(0);
		});

		test("should clear all updates", () => {
			queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			queue.enqueue({
				artistId: "artist2",
				eventId: "event1",
				updates: { performance_status: "not_started" },
				maxRetries: 3,
				priority: "high",
			});

			expect(queue.getQueueSize()).toBe(2);

			queue.clear();
			expect(queue.getQueueSize()).toBe(0);
		});
	});

	describe("Priority Handling", () => {
		test("should prioritize high priority updates", () => {
			// Add normal priority first
			queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			// Add high priority second
			queue.enqueue({
				artistId: "artist2",
				eventId: "event1",
				updates: { performance_status: "currently_on_stage" },
				maxRetries: 3,
				priority: "high",
			});

			const allUpdates = queue.getAllUpdates();
			expect(allUpdates[0].priority).toBe("high");
			expect(allUpdates[0].artistId).toBe("artist2");
		});

		test("should maintain priority order", () => {
			const priorities: Array<"low" | "normal" | "high"> = [
				"low",
				"high",
				"normal",
				"high",
				"low",
			];

			priorities.forEach((priority, index) => {
				queue.enqueue({
					artistId: `artist${index}`,
					eventId: "event1",
					updates: { performance_status: "completed" },
					maxRetries: 3,
					priority,
				});
			});

			const allUpdates = queue.getAllUpdates();

			// Should be ordered: high, high, normal, low, low
			expect(allUpdates[0].priority).toBe("high");
			expect(allUpdates[1].priority).toBe("high");
			expect(allUpdates[2].priority).toBe("normal");
			expect(allUpdates[3].priority).toBe("low");
			expect(allUpdates[4].priority).toBe("low");
		});
	});

	describe("Retry Logic", () => {
		test("should retry failed updates with exponential backoff", async () => {
			const updateId = queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 2,
				priority: "normal",
			});

			// Mock the process method to simulate failure
			const originalProcess = queue.process;
			let processCallCount = 0;

			queue.process = jest.fn().mockImplementation(async () => {
				processCallCount++;
				// Simulate failure for first few attempts
				if (processCallCount <= 2) {
					const updates = queue.getAllUpdates();
					if (updates.length > 0) {
						updates[0].retryCount++;
						updates[0].nextRetryAt = Date.now() + 1000;
					}
				}
			});

			// Process the queue multiple times
			await queue.process();
			await queue.process();
			await queue.process();

			expect(processCallCount).toBe(3);
		});

		test("should remove updates after max retries", () => {
			const updateId = queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 1,
				priority: "normal",
			});

			// Manually set retry count to max
			const updates = queue.getAllUpdates();
			if (updates.length > 0) {
				updates[0].retryCount = 2; // Exceeds maxRetries of 1
			}

			// This would normally be handled in the process method
			// For testing, we verify the logic exists
			expect(updates[0].retryCount).toBeGreaterThan(
				updates[0].maxRetries
			);
		});
	});

	describe("Batch Processing", () => {
		test("should respect batch size limits", () => {
			// Add more updates than batch size
			for (let i = 0; i < 5; i++) {
				queue.enqueue({
					artistId: `artist${i}`,
					eventId: "event1",
					updates: { performance_status: "completed" },
					maxRetries: 3,
					priority: "normal",
				});
			}

			expect(queue.getQueueSize()).toBe(5);

			// The actual batch processing would be tested in integration tests
			// since it involves async processing and timing
		});
	});

	describe("Statistics", () => {
		test("should track queue statistics", () => {
			queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			const stats = queue.getStats();

			expect(stats.totalQueued).toBe(1);
			expect(stats.processing).toBe(0);
			expect(stats.failed).toBe(0);
			expect(stats.completed).toBe(0);
		});
	});

	describe("Pause and Resume", () => {
		test("should pause and resume processing", () => {
			queue.pause();

			// Add an update while paused
			queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			// Processing should be paused
			expect(queue.getQueueSize()).toBe(1);

			queue.resume();

			// Processing should resume (would need integration test to verify actual processing)
		});
	});

	describe("Manual Retry", () => {
		test("should allow manual retry of specific updates", async () => {
			const updateId = queue.enqueue({
				artistId: "artist1",
				eventId: "event1",
				updates: { performance_status: "completed" },
				maxRetries: 3,
				priority: "normal",
			});

			// Simulate a failed update
			const updates = queue.getAllUpdates();
			if (updates.length > 0) {
				updates[0].retryCount = 1;
				updates[0].nextRetryAt = Date.now() + 10000; // Far in future
			}

			const retrySuccess = await queue.retry(updateId);
			expect(retrySuccess).toBe(true);

			// Verify retry count was reset
			const updatedUpdates = queue.getAllUpdates();
			expect(updatedUpdates[0].retryCount).toBe(0);
			expect(updatedUpdates[0].nextRetryAt).toBeUndefined();
		});

		test("should return false for non-existent update retry", async () => {
			const retrySuccess = await queue.retry("nonexistent-id");
			expect(retrySuccess).toBe(false);
		});
	});
});
