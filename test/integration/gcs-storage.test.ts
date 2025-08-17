import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readJsonFile, writeJsonFile } from "@/lib/gcs";
import { GCSService } from "@/lib/google-cloud-storage";

// Mock Google Cloud Storage for integration tests
vi.mock("@google-cloud/storage", () => ({
	Storage: vi.fn().mockImplementation(() => ({
		bucket: vi.fn().mockReturnValue({
			file: vi.fn().mockReturnValue({
				save: vi.fn(),
				download: vi.fn(),
				exists: vi.fn(),
				delete: vi.fn(),
			}),
		}),
	})),
}));

describe("GCS Storage Integration", () => {
	const testEventId = "test-event-integration";
	const testPerformanceOrderPath = `events/${testEventId}/performance-order.json`;
	const testRehearsalsPath = `events/${testEventId}/rehearsals.json`;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		// Clean up test files
		try {
			await GCSService.deleteFile(testPerformanceOrderPath);
			await GCSService.deleteFile(testRehearsalsPath);
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("Performance Order Storage", () => {
		it("should read and write performance order data", async () => {
			const testPerformanceOrder = {
				eventId: testEventId,
				showStartTime: "19:00",
				performanceOrder: [
					{
						id: "slot-1",
						artistId: "artist-1",
						artistName: "Test Artist",
						style: "Comedy",
						duration: 15,
						order: 1,
						startTime: "19:00",
						endTime: "19:15",
						eventId: testEventId,
					},
				],
				updatedAt: new Date().toISOString(),
				showStatus: "not_started" as const,
			};

			// Mock the GCS file operations
			const mockFile = {
				save: vi.fn().mockResolvedValue(undefined),
				download: vi
					.fn()
					.mockResolvedValue([JSON.stringify(testPerformanceOrder)]),
				exists: vi.fn().mockResolvedValue([true]),
				delete: vi.fn().mockResolvedValue(undefined),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			// Mock the storage instance
			vi.mocked(GCSService as any).storage = mockStorage;

			// Write performance order data
			await writeJsonFile(testPerformanceOrderPath, testPerformanceOrder);

			// Verify save was called
			expect(mockFile.save).toHaveBeenCalledWith(
				JSON.stringify(testPerformanceOrder, null, 2),
				{
					metadata: {
						contentType: "application/json",
					},
				}
			);

			// Read performance order data
			const result = await readJsonFile(testPerformanceOrderPath);

			// Verify download was called
			expect(mockFile.download).toHaveBeenCalled();
			expect(result).toEqual(testPerformanceOrder);
		});

		it("should handle performance order read errors", async () => {
			const mockFile = {
				exists: vi.fn().mockResolvedValue([false]),
				download: vi
					.fn()
					.mockRejectedValue(new Error("File not found")),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Should return null for non-existent file
			const result = await readJsonFile(testPerformanceOrderPath);
			expect(result).toBeNull();
		});

		it("should handle performance order write errors", async () => {
			const testData = { test: "data" };

			const mockFile = {
				save: vi.fn().mockRejectedValue(new Error("Storage error")),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Should throw error on write failure
			await expect(
				writeJsonFile(testPerformanceOrderPath, testData)
			).rejects.toThrow();
		});
	});

	describe("Rehearsal Storage", () => {
		it("should read and write rehearsal data", async () => {
			const testRehearsals = [
				{
					id: "rehearsal-1",
					artistId: "artist-1",
					artistName: "Test Artist",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					status: "scheduled",
					notes: "Test rehearsal",
					eventId: testEventId,
					createdAt: new Date().toISOString(),
				},
			];

			const mockFile = {
				save: vi.fn().mockResolvedValue(undefined),
				download: vi
					.fn()
					.mockResolvedValue([JSON.stringify(testRehearsals)]),
				exists: vi.fn().mockResolvedValue([true]),
				delete: vi.fn().mockResolvedValue(undefined),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Write rehearsal data
			await writeJsonFile(testRehearsalsPath, testRehearsals);

			// Verify save was called
			expect(mockFile.save).toHaveBeenCalledWith(
				JSON.stringify(testRehearsals, null, 2),
				{
					metadata: {
						contentType: "application/json",
					},
				}
			);

			// Read rehearsal data
			const result = await readJsonFile(testRehearsalsPath);

			// Verify download was called
			expect(mockFile.download).toHaveBeenCalled();
			expect(result).toEqual(testRehearsals);
		});

		it("should handle empty rehearsal arrays", async () => {
			const emptyRehearsals: any[] = [];

			const mockFile = {
				save: vi.fn().mockResolvedValue(undefined),
				download: vi
					.fn()
					.mockResolvedValue([JSON.stringify(emptyRehearsals)]),
				exists: vi.fn().mockResolvedValue([true]),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Write empty array
			await writeJsonFile(testRehearsalsPath, emptyRehearsals);

			// Read empty array
			const result = await readJsonFile(testRehearsalsPath, []);

			expect(result).toEqual([]);
		});

		it("should handle rehearsal data corruption", async () => {
			const mockFile = {
				download: vi.fn().mockResolvedValue(["invalid json data"]),
				exists: vi.fn().mockResolvedValue([true]),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Should handle JSON parse errors gracefully
			const result = await readJsonFile(testRehearsalsPath, []);
			expect(result).toEqual([]);
		});
	});

	describe("GCS Connection Handling", () => {
		it("should handle GCS connection failures", async () => {
			const mockFile = {
				save: vi.fn().mockRejectedValue(new Error("Connection failed")),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			const testData = { test: "data" };

			// Should propagate connection errors
			await expect(
				writeJsonFile(testPerformanceOrderPath, testData)
			).rejects.toThrow("Connection failed");
		});

		it("should handle GCS authentication failures", async () => {
			const mockFile = {
				save: vi
					.fn()
					.mockRejectedValue(new Error("Authentication failed")),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			const testData = { test: "data" };

			// Should propagate authentication errors
			await expect(
				writeJsonFile(testPerformanceOrderPath, testData)
			).rejects.toThrow("Authentication failed");
		});

		it("should handle bucket access errors", async () => {
			const mockStorage = {
				bucket: vi.fn().mockImplementation(() => {
					throw new Error("Bucket access denied");
				}),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			const testData = { test: "data" };

			// Should handle bucket access errors
			await expect(
				writeJsonFile(testPerformanceOrderPath, testData)
			).rejects.toThrow();
		});
	});

	describe("Data Consistency", () => {
		it("should maintain data consistency across multiple operations", async () => {
			const initialData = [
				{
					id: "rehearsal-1",
					artistId: "artist-1",
					artistName: "Artist 1",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					status: "scheduled",
					notes: "First rehearsal",
					eventId: testEventId,
					createdAt: new Date().toISOString(),
				},
			];

			const updatedData = [
				...initialData,
				{
					id: "rehearsal-2",
					artistId: "artist-2",
					artistName: "Artist 2",
					date: "2025-01-15",
					startTime: "2:00 PM",
					endTime: "3:00 PM",
					status: "scheduled",
					notes: "Second rehearsal",
					eventId: testEventId,
					createdAt: new Date().toISOString(),
				},
			];

			let storedData = initialData;

			const mockFile = {
				save: vi.fn().mockImplementation((data) => {
					storedData = JSON.parse(data);
					return Promise.resolve();
				}),
				download: vi.fn().mockImplementation(() => {
					return Promise.resolve([JSON.stringify(storedData)]);
				}),
				exists: vi.fn().mockResolvedValue([true]),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Write initial data
			await writeJsonFile(testRehearsalsPath, initialData);

			// Read and verify initial data
			let result = await readJsonFile(testRehearsalsPath);
			expect(result).toEqual(initialData);

			// Write updated data
			await writeJsonFile(testRehearsalsPath, updatedData);

			// Read and verify updated data
			result = await readJsonFile(testRehearsalsPath);
			expect(result).toEqual(updatedData);
			expect(result).toHaveLength(2);
		});

		it("should handle concurrent read/write operations", async () => {
			const testData1 = { id: "data-1", value: "first" };
			const testData2 = { id: "data-2", value: "second" };

			let writeCount = 0;
			const mockFile = {
				save: vi.fn().mockImplementation(() => {
					writeCount++;
					return Promise.resolve();
				}),
				download: vi
					.fn()
					.mockResolvedValue([JSON.stringify(testData1)]),
				exists: vi.fn().mockResolvedValue([true]),
			};

			const mockBucket = {
				file: vi.fn().mockReturnValue(mockFile),
			};

			const mockStorage = {
				bucket: vi.fn().mockReturnValue(mockBucket),
			};

			vi.mocked(GCSService as any).storage = mockStorage;

			// Perform concurrent operations
			await Promise.all([
				writeJsonFile(`${testEventId}/data1.json`, testData1),
				writeJsonFile(`${testEventId}/data2.json`, testData2),
				readJsonFile(`${testEventId}/data1.json`),
			]);

			// Verify operations completed
			expect(writeCount).toBe(2);
			expect(mockFile.download).toHaveBeenCalled();
		});
	});
});
