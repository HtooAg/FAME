import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
	GET,
	POST,
	PATCH,
	DELETE,
} from "@/app/api/events/[eventId]/rehearsals/route";

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

describe("Rehearsals API", () => {
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

	describe("GET /api/events/[eventId]/rehearsals", () => {
		it("should return rehearsals successfully", async () => {
			const mockRehearsals = [
				{
					id: "rehearsal-1",
					artistId: "artist-1",
					artistName: "Test Artist",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					status: "scheduled",
					notes: "Test rehearsal",
					eventId: "test-event-1",
					createdAt: "2025-01-01T00:00:00.000Z",
				},
			];

			vi.mocked(readJsonFile).mockResolvedValue(mockRehearsals);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals"
			);

			const response = await GET(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data).toHaveLength(1);
			expect(data.data[0].id).toBe("rehearsal-1");
		});

		it("should handle missing eventId", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/events//rehearsals"
			);

			const response = await GET(request, {
				params: { eventId: "" },
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("MISSING_PARAMETERS");
		});

		it("should return empty array when no rehearsals exist", async () => {
			vi.mocked(readJsonFile).mockResolvedValue([]);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals"
			);

			const response = await GET(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data).toEqual([]);
		});
	});

	describe("POST /api/events/[eventId]/rehearsals", () => {
		it("should create rehearsal successfully", async () => {
			const mockArtistData = {
				artistName: "Test Artist",
				artist_name: "Test Artist",
			};

			const mockRequestBody = {
				artistId: "artist-1",
				date: "2025-01-15",
				startTime: "10:00 AM",
				endTime: "11:00 AM",
				notes: "Test rehearsal",
			};

			vi.mocked(getArtistData).mockResolvedValue(mockArtistData);
			vi.mocked(readJsonFile).mockResolvedValue([]);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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
			expect(data.data.message).toBe("Rehearsal scheduled successfully");
			expect(data.data.rehearsal.artistName).toBe("Test Artist");
			expect(writeJsonFile).toHaveBeenCalled();
		});

		it("should handle missing eventId", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/events//rehearsals",
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

		it("should validate required artistId", async () => {
			const mockRequestBody = {
				date: "2025-01-15",
				startTime: "10:00 AM",
				endTime: "11:00 AM",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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
			expect(data.error.message).toBe("Artist ID is required");
		});

		it("should validate required date", async () => {
			const mockRequestBody = {
				artistId: "artist-1",
				startTime: "10:00 AM",
				endTime: "11:00 AM",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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
			expect(data.error.message).toBe("Date is required");
		});

		it("should validate time format", async () => {
			const mockRequestBody = {
				artistId: "artist-1",
				date: "2025-01-15",
				startTime: "invalid-time",
				endTime: "11:00 AM",
			};

			vi.mocked(getArtistData).mockResolvedValue({
				artistName: "Test Artist",
			});

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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
				"Start time must be in HH:MM AM/PM format"
			);
		});

		it("should handle artist not found", async () => {
			const mockRequestBody = {
				artistId: "nonexistent-artist",
				date: "2025-01-15",
				startTime: "10:00 AM",
				endTime: "11:00 AM",
			};

			vi.mocked(getArtistData).mockResolvedValue(null);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("NOT_FOUND");
			expect(data.error.message).toBe("Artist not found");
		});
	});

	describe("PATCH /api/events/[eventId]/rehearsals", () => {
		it("should update rehearsal successfully", async () => {
			const existingRehearsals = [
				{
					id: "rehearsal-1",
					artistId: "artist-1",
					artistName: "Test Artist",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					status: "scheduled",
					notes: "Original notes",
					eventId: "test-event-1",
					createdAt: "2025-01-01T00:00:00.000Z",
				},
			];

			const updateData = {
				rehearsalId: "rehearsal-1",
				status: "completed",
				notes: "Updated notes",
			};

			vi.mocked(readJsonFile).mockResolvedValue(existingRehearsals);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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
			expect(data.message).toBe("Rehearsal updated successfully");
			expect(writeJsonFile).toHaveBeenCalled();
		});

		it("should handle rehearsal not found", async () => {
			vi.mocked(readJsonFile).mockResolvedValue([]);

			const updateData = {
				rehearsalId: "nonexistent-rehearsal",
				status: "completed",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
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

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("NOT_FOUND");
		});
	});

	describe("DELETE /api/events/[eventId]/rehearsals", () => {
		it("should delete rehearsal successfully", async () => {
			const existingRehearsals = [
				{
					id: "rehearsal-1",
					artistId: "artist-1",
					artistName: "Test Artist",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					status: "scheduled",
					notes: "Test rehearsal",
					eventId: "test-event-1",
					createdAt: "2025-01-01T00:00:00.000Z",
				},
				{
					id: "rehearsal-2",
					artistId: "artist-2",
					artistName: "Another Artist",
					date: "2025-01-16",
					startTime: "2:00 PM",
					endTime: "3:00 PM",
					status: "scheduled",
					notes: "Another rehearsal",
					eventId: "test-event-1",
					createdAt: "2025-01-01T00:00:00.000Z",
				},
			];

			const deleteData = {
				rehearsalId: "rehearsal-1",
			};

			vi.mocked(readJsonFile).mockResolvedValue(existingRehearsals);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
				{
					method: "DELETE",
					body: JSON.stringify(deleteData),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await DELETE(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.message).toBe("Rehearsal deleted successfully");

			// Verify that writeJsonFile was called with the filtered array
			expect(writeJsonFile).toHaveBeenCalledWith(
				"events/test-event-1/rehearsals.json",
				expect.arrayContaining([
					expect.objectContaining({ id: "rehearsal-2" }),
				])
			);
		});

		it("should handle rehearsal not found for deletion", async () => {
			const existingRehearsals = [
				{
					id: "rehearsal-1",
					artistId: "artist-1",
					artistName: "Test Artist",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					status: "scheduled",
					notes: "Test rehearsal",
					eventId: "test-event-1",
					createdAt: "2025-01-01T00:00:00.000Z",
				},
			];

			const deleteData = {
				rehearsalId: "nonexistent-rehearsal",
			};

			vi.mocked(readJsonFile).mockResolvedValue(existingRehearsals);

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
				{
					method: "DELETE",
					body: JSON.stringify(deleteData),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await DELETE(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe("Rehearsal not found");
		});

		it("should handle empty rehearsals list", async () => {
			vi.mocked(readJsonFile).mockResolvedValue([]);

			const deleteData = {
				rehearsalId: "rehearsal-1",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
				{
					method: "DELETE",
					body: JSON.stringify(deleteData),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const response = await DELETE(request, {
				params: { eventId: "test-event-1" },
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("NOT_FOUND");
		});
	});

	describe("Concurrent operations", () => {
		it("should handle concurrent save operations", async () => {
			const mockArtistData = {
				artistName: "Test Artist",
			};

			const mockRequestBody1 = {
				artistId: "artist-1",
				date: "2025-01-15",
				startTime: "10:00 AM",
				endTime: "11:00 AM",
				notes: "First rehearsal",
			};

			const mockRequestBody2 = {
				artistId: "artist-2",
				date: "2025-01-15",
				startTime: "2:00 PM",
				endTime: "3:00 PM",
				notes: "Second rehearsal",
			};

			vi.mocked(getArtistData).mockResolvedValue(mockArtistData);
			vi.mocked(readJsonFile).mockResolvedValue([]);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request1 = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
				{
					method: "POST",
					body: JSON.stringify(mockRequestBody1),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			const request2 = new NextRequest(
				"http://localhost:3000/api/events/test-event-1/rehearsals",
				{
					method: "POST",
					body: JSON.stringify(mockRequestBody2),
					headers: {
						"Content-Type": "application/json",
					},
				}
			);

			// Execute both requests concurrently
			const [response1, response2] = await Promise.all([
				POST(request1, { params: { eventId: "test-event-1" } }),
				POST(request2, { params: { eventId: "test-event-1" } }),
			]);

			expect(response1.status).toBe(200);
			expect(response2.status).toBe(200);

			const data1 = await response1.json();
			const data2 = await response2.json();

			expect(data1.success).toBe(true);
			expect(data2.success).toBe(true);
			expect(writeJsonFile).toHaveBeenCalledTimes(2);
		});
	});
});
