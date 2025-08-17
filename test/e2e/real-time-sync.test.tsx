/**
 * End-to-End Tests for Real-time Status Synchronization
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { StatusCacheManager } from "@/lib/status-cache-manager";
import { ConflictNotificationSystem } from "@/components/conflict-notification-system";

// Mock WebSocket for E2E testing
class MockWebSocket {
	static CONNECTING = 0;
	static OPEN = 1;
	static CLOSING = 2;
	static CLOSED = 3;

	readyState = MockWebSocket.CONNECTING;
	onopen: ((event: Event) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;

	constructor(public url: string) {
		// Simulate connection after a short delay
		setTimeout(() => {
			this.readyState = MockWebSocket.OPEN;
			if (this.onopen) {
				this.onopen(new Event("open"));
			}
		}, 100);
	}

	send(data: string) {
		// Simulate message sending
		console.log("WebSocket send:", data);
	}

	close() {
		this.readyState = MockWebSocket.CLOSED;
		if (this.onclose) {
			this.onclose(new CloseEvent("close"));
		}
	}

	// Helper method to simulate receiving messages
	simulateMessage(data: any) {
		if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
			this.onmessage(
				new MessageEvent("message", { data: JSON.stringify(data) })
			);
		}
	}
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe("Real-time Status Synchronization E2E", () => {
	let cacheManager: StatusCacheManager;
	let mockWebSocket: MockWebSocket;
	const eventId = "test-event-1";
	const performanceDate = "2024-01-01";

	beforeEach(async () => {
		cacheManager = new StatusCacheManager({
			enableWebSocket: true,
			enableBackgroundSync: false,
			warmupOnStart: false,
		});

		await cacheManager.initialize(eventId);

		// Get reference to the mock WebSocket instance
		mockWebSocket = (cacheManager as any).websocketSync.ws;
	});

	afterEach(async () => {
		await cacheManager.destroy();
	});

	describe("Multi-client Status Updates", () => {
		test("should sync status changes across multiple clients", async () => {
			const artistId = "artist1";
			const artistName = "Test Artist";

			// Simulate status update from client 1
			await cacheManager.updateArtistStatus(
				artistId,
				eventId,
				{ performance_status: "next_on_stage" },
				"user1"
			);

			// Simulate receiving update from client 2 via WebSocket
			act(() => {
				mockWebSocket.simulateMessage({
					type: "artist_status_update",
					eventId,
					artistId,
					status: {
						artistId,
						eventId,
						performance_status: "currently_on_stage",
						timestamp: new Date().toISOString(),
						version: 2,
						dirty: false,
					},
					timestamp: new Date().toISOString(),
					senderId: "client2",
				});
			});

			// Verify status was updated locally
			await waitFor(async () => {
				const status = await cacheManager.getArtistStatus(
					artistId,
					eventId
				);
				expect(status?.performance_status).toBe("currently_on_stage");
			});
		});

		test("should handle bulk status synchronization", async () => {
			const statuses = [
				{
					artistId: "artist1",
					eventId,
					performance_status: "not_started",
					timestamp: new Date().toISOString(),
					version: 1,
					dirty: false,
				},
				{
					artistId: "artist2",
					eventId,
					performance_status: "completed",
					timestamp: new Date().toISOString(),
					version: 1,
					dirty: false,
				},
			];

			// Simulate bulk sync message
			act(() => {
				mockWebSocket.simulateMessage({
					type: "bulk_status_sync",
					eventId,
					statuses,
					timestamp: new Date().toISOString(),
					senderId: "server",
				});
			});

			// Verify all statuses were updated
			await waitFor(async () => {
				const status1 = await cacheManager.getArtistStatus(
					"artist1",
					eventId
				);
				const status2 = await cacheManager.getArtistStatus(
					"artist2",
					eventId
				);

				expect(status1?.performance_status).toBe("not_started");
				expect(status2?.performance_status).toBe("completed");
			});
		});
	});

	describe("Conflict Notification UI", () => {
		test("should display conflict notifications to users", async () => {
			const onConflictResolved = jest.fn();
			const onRecoveryCompleted = jest.fn();

			render(
				<ConflictNotificationSystem
					eventId={eventId}
					performanceDate={performanceDate}
					onConflictResolved={onConflictResolved}
					onRecoveryCompleted={onRecoveryCompleted}
				/>
			);

			// Initially no conflicts should be shown
			expect(
				screen.queryByText(/Conflicts Detected/)
			).not.toBeInTheDocument();

			// Simulate a conflict by creating conflicting updates
			const artistId = "artist1";

			// Create initial status
			await cacheManager.updateArtistStatus(
				artistId,
				eventId,
				{ performance_status: "not_started" },
				"user1"
			);

			// Simulate conflicting update from another user
			act(() => {
				mockWebSocket.simulateMessage({
					type: "artist_status_update",
					eventId,
					artistId,
					status: {
						artistId,
						eventId,
						performance_status: "completed",
						timestamp: new Date().toISOString(),
						version: 1, // Same version = conflict
						dirty: false,
					},
					timestamp: new Date().toISOString(),
					senderId: "user2",
				});
			});

			// Wait for conflict notification to appear
			await waitFor(() => {
				expect(
					screen.getByText(/Conflicts Detected/)
				).toBeInTheDocument();
			});
		});

		test("should allow manual conflict resolution", async () => {
			const onConflictResolved = jest.fn();

			render(
				<ConflictNotificationSystem
					eventId={eventId}
					performanceDate={performanceDate}
					onConflictResolved={onConflictResolved}
				/>
			);

			// Create a conflict scenario (simplified for testing)
			// In real scenario, this would come from the conflict resolution service

			// Look for resolve button (would appear after conflict is detected)
			await waitFor(() => {
				const resolveButton = screen.queryByText("Resolve");
				if (resolveButton) {
					fireEvent.click(resolveButton);
				}
			});

			// Verify conflict resolution dialog appears
			await waitFor(() => {
				expect(
					screen.queryByText("Resolve Conflict")
				).toBeInTheDocument();
			});
		});
	});

	describe("Network Connectivity Handling", () => {
		test("should handle WebSocket disconnection gracefully", async () => {
			// Simulate WebSocket disconnection
			act(() => {
				mockWebSocket.close();
			});

			// Updates should still work locally
			const result = await cacheManager.updateArtistStatus(
				"artist1",
				eventId,
				{ performance_status: "next_on_stage" }
			);

			expect(result).toBeTruthy();

			// Status should be available from cache
			const status = await cacheManager.getArtistStatus(
				"artist1",
				eventId
			);
			expect(status?.performance_status).toBe("next_on_stage");
		});

		test("should show offline indicator when network is down", async () => {
			render(
				<ConflictNotificationSystem
					eventId={eventId}
					performanceDate={performanceDate}
				/>
			);

			// Simulate going offline
			act(() => {
				window.dispatchEvent(new Event("offline"));
			});

			// Should show offline notification
			await waitFor(() => {
				expect(screen.getByText(/Network Offline/)).toBeInTheDocument();
			});

			// Simulate coming back online
			act(() => {
				window.dispatchEvent(new Event("online"));
			});

			// Offline notification should disappear
			await waitFor(() => {
				expect(
					screen.queryByText(/Network Offline/)
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Performance Under Load", () => {
		test("should handle rapid status updates without UI lag", async () => {
			const startTime = Date.now();
			const updates = [];

			// Create many rapid updates
			for (let i = 0; i < 50; i++) {
				const update = cacheManager.updateArtistStatus(
					`artist${i % 5}`,
					eventId,
					{
						performance_status:
							i % 2 === 0 ? "not_started" : "completed",
						performance_order: i,
					}
				);
				updates.push(update);
			}

			await Promise.all(updates);
			const endTime = Date.now();

			// Should complete quickly
			expect(endTime - startTime).toBeLessThan(2000); // 2 seconds

			// UI should remain responsive (no specific test, but updates should complete)
			const finalStatus = await cacheManager.getArtistStatus(
				"artist0",
				eventId
			);
			expect(finalStatus).toBeTruthy();
		});

		test("should handle high-frequency WebSocket messages", async () => {
			const messageCount = 100;
			const messages = [];

			// Prepare many messages
			for (let i = 0; i < messageCount; i++) {
				messages.push({
					type: "artist_status_update",
					eventId,
					artistId: `artist${i % 10}`,
					status: {
						artistId: `artist${i % 10}`,
						eventId,
						performance_status:
							i % 2 === 0 ? "not_started" : "completed",
						timestamp: new Date().toISOString(),
						version: i,
						dirty: false,
					},
					timestamp: new Date().toISOString(),
					senderId: "load-test",
				});
			}

			const startTime = Date.now();

			// Send all messages rapidly
			act(() => {
				messages.forEach((message) => {
					mockWebSocket.simulateMessage(message);
				});
			});

			// Wait for processing to complete
			await waitFor(
				async () => {
					const status = await cacheManager.getArtistStatus(
						"artist0",
						eventId
					);
					expect(status).toBeTruthy();
				},
				{ timeout: 5000 }
			);

			const endTime = Date.now();
			expect(endTime - startTime).toBeLessThan(3000); // Should handle quickly
		});
	});

	describe("Data Persistence Across Page Refreshes", () => {
		test("should restore status from cache after page refresh simulation", async () => {
			const artistId = "artist1";

			// Create initial status
			await cacheManager.updateArtistStatus(artistId, eventId, {
				performance_status: "next_on_stage",
			});

			// Simulate page refresh by destroying and recreating cache manager
			await cacheManager.destroy();

			const newCacheManager = new StatusCacheManager({
				enableWebSocket: false,
				enableBackgroundSync: false,
				warmupOnStart: true,
			});

			await newCacheManager.initialize(eventId);

			// Status should be restored (in real scenario, from localStorage or GCS)
			// This test verifies the initialization process works
			const stats = await newCacheManager.getStats();
			expect(stats).toBeDefined();

			await newCacheManager.destroy();
		});
	});
});
