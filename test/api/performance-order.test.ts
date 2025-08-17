import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
	GET,
	POST,
	PATCH,
} from "@/app/api/events/[eventId]/performance-order-gcs/route";

// Mock the GCS module
vi.mock("@/lib/gcs", () => ({
	readJsonFile: vi.fn(),
	writeJsonFile: vi.fn(),
}));

// Mock the GCSService
vi.mock("@/lib/google-cloud-storage", () => ({
	GCSService: {
		getArtistData: vi.fn(),
	},
}));

// Mock the websocket broadcast
vi.mock("@/app/api/websocket/route", () => ({
	broadcastPerformanceOrderUpdate: vi.fn(),
}));

describe("Performance Order API", () => {
	let readJsonFile: any;
	let writeJsonFile: any;
	let getArtistData: any;

	beforeEach(() => {
		vi.clearAllMocks();
		const gcsModule = vi.mocked(await import("@/lib/gcs"));
		const gcsServiceModule = vi.mocked(
			await import("@/lib/google-cloud-storage")
		);

		readJsonFile = gcsModule.readJsonFile;
		writeJsonFile = gcsModule.writeJsonFile;
		getArtistData = gcsServiceModule.GCSService.getArtistData;
	});

	describe("GET /api/events/[eventId]/performance-order-gcs", () => {
		it("should return performance order successfully", async () => {
			const mockPerformanceOrder = {
				eventId: "test-event-1",
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
						eventId: "test-event-1",
					},
				],
				updatedAt: "2025-01-01T00:00:00.000Z",
				showStatus: "not_started",
			};

			vi.mocked(readJsonFile).mockResolvedValue(mockPerformanceOrder);
			vi.mocked(getArtistData).mockResolvedValue({
				artistName: "Test Artist",
				style: "Comedy",
			});

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs"
			);

			const response = await GET(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.eventId).toBe("test-event-1");
			expect(data.data.performanceOrder).toHaveLength(1);
		});

		it("should handle missing eventId", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/events//performance-order-gcs"
			);

			const response = await GET(request, {
				params: { eventId: "" },
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("MISSING_PARAMETERS");
		});

		it("should create default performance order when none exists", async () => {
			vi.mocked(readJsonFile).mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs"
			);

			const response = await GET(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.eventId).toBe("test-event-1");
			expect(data.data.performanceOrder).toEqual([]);
			expect(data.data.showStartTime).toBe("19:00");
		});
	});

	describe("POST /api/events/[eventId]/performance-order-gcs", () => {
		it("should save performance order successfully", async () => {
			const mockRequestBody = {
				performanceOrder: [
					{
						id: "slot-1",
						artistId: "artist-1",
						artistName: "Test Artist",
						style: "Comedy",
						duration: 15,
						startTime: "19:00",
						endTime: "19:15",
					},
				],
				showStartTime: "19:00",
			};

			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs",
				{
					method: "POST",
					body: JSON.stringify(mockRequestBody),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await POST(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.eventId).toBe("test-event-1");
			expect(writeJsonFile).toHaveBeenCalledWith(
				"events/test-event-1/performance-order.json",
				expect.objectContaining({
					eventId: "test-event-1",
					showStartTime: "19:00",
					performanceOrder: expect.arrayContaining([
						expect.objectContaining({
							eventId: "test-event-1",
							order: 1,
						}),
					]),
				})
			);
		});

		it("should handle missing eventId", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/events//performance-order-gcs",
				{
					method: "POST",
					body: JSON.stringify({}),
				}
			);

			const response = await POST(request, {
				params: { eventId: "" },
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("MISSING_PARAMETERS");
		});

		it("should validate performance order array", async () => {
			const mockRequestBody = {
				performanceOrder: "invalid-array",
				showStartTime: "19:00",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs",
				{
					method: "POST",
					body: JSON.stringify(mockRequestBody),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await POST(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("VALIDATION_ERROR");
			expect(data.error.message).toBe(
				"Performance order must be an array"
			);
		});

		it("should validate show start time format", async () => {
			const mockRequestBody = {
				performanceOrder: [],
				showStartTime: "invalid-time",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs",
				{
					method: "POST",
					body: JSON.stringify(mockRequestBody),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await POST(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("VALIDATION_ERROR");
			expect(data.error.message).toBe(
				"Show start time must be in HH:MM format"
			);
		});

		it("should handle storage errors", async () => {
			const mockRequestBody = {
				performanceOrder: [],
				showStartTime: "19:00",
			};

			vi.mocked(writeJsonFile).mockRejectedValue(
				new Error("Storage error")
			);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs",
				{
					method: "POST",
					body: JSON.stringify(mockRequestBody),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await POST(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(500);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("INTERNAL_ERROR");
		});
	});

	describe("PATCH /api/events/[eventId]/performance-order-gcs", () => {
		it("should update performance order successfully", async () => {
			const existingData = {
				eventId: "test-event-1",
				showStartTime: "19:00",
				performanceOrder: [],
				updatedAt: "2025-01-01T00:00:00.000Z",
				showStatus: "not_started",
			};

			const updateData = {
				showStatus: "started",
				currentPerformanceId: "slot-1",
			};

			vi.mocked(readJsonFile).mockResolvedValue(existingData);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs",
				{
					method: "PATCH",
					body: JSON.stringify(updateData),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await PATCH(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.showStatus).toBe("started");
			expect(data.data.currentPerformanceId).toBe("slot-1");
			expect(writeJsonFile).toHaveBeenCalled();
		});

		it("should handle missing eventId", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/events//performance-order-gcs",
				{
					method: "PATCH",
					body: JSON.stringify({}),
				}
			);

			const response = await PATCH(request, {
				params: { eventId: "" },
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("MISSING_PARAMETERS");
		});

		it("should create default data when none exists", async () => {
			vi.mocked(readJsonFile).mockResolvedValue(null);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const updateData = {
				showStatus: "started",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/performance-order-gcs",
				{
					method: "PATCH",
					body: JSON.stringify(updateData),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await PATCH(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.eventId).toBe("test-event-1");
			expect(data.data.showStatus).toBe("started");
		});
	});
});
