import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/events/route";

// Mock the GCS module
vi.mock("@/lib/gcs", () => ({
	readJsonFile: vi.fn(),
	writeJsonFile: vi.fn(),
	paths: {
		eventsByStageManager: vi.fn(
			(id: string) => `events/stage-manager-${id}.json`
		),
		eventFile: vi.fn((id: string) => `events/${id}.json`),
	},
}));

// Mock JWT
vi.mock("jsonwebtoken", () => ({
	default: {
		verify: vi.fn(),
		sign: vi.fn(),
	},
}));

// Mock UUID
vi.mock("uuid", () => ({
	v4: vi.fn(() => "test-uuid-123"),
}));

describe("/api/events", () => {
	let readJsonFile: any;
	let writeJsonFile: any;
	let jwt: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import mocked modules
		const gcsModule = await import("@/lib/gcs");
		const jwtModule = await import("jsonwebtoken");

		readJsonFile = gcsModule.readJsonFile;
		writeJsonFile = gcsModule.writeJsonFile;
		jwt = jwtModule.default;

		// Mock JWT verification to return a valid user
		vi.mocked(jwt.verify).mockReturnValue({
			userId: "test-user-1",
			role: "stage_manager",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("GET /api/events", () => {
		it("returns events for authenticated stage manager", async () => {
			const mockEvents = [
				{
					id: "event-1",
					name: "Test Event 1",
					venueName: "Test Venue 1",
					stageManagerId: "test-user-1",
				},
				{
					id: "event-2",
					name: "Test Event 2",
					venueName: "Test Venue 2",
					stageManagerId: "test-user-1",
				},
			];

			vi.mocked(readJsonFile).mockResolvedValue(mockEvents);

			const request = new NextRequest(
				"http://localhost:3000/api/events",
				{
					headers: {
						"x-stage-manager-id": "test-user-1",
						cookie: "auth-token=valid-token",
					},
				}
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data).toEqual(mockEvents);
			expect(readJsonFile).toHaveBeenCalledWith(
				"events/stage-manager-test-user-1.json",
				[]
			);
		});

		it("returns 401 for unauthenticated requests", async () => {
			const request = new NextRequest(
				"http://localhost:3000/api/events",
				{
					headers: {
						"x-stage-manager-id": "test-user-1",
						// No auth token
					},
				}
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("handles GCS read errors gracefully", async () => {
			vi.mocked(readJsonFile).mockRejectedValue(new Error("GCS Error"));

			const request = new NextRequest(
				"http://localhost:3000/api/events",
				{
					headers: {
						"x-stage-manager-id": "test-user-1",
						cookie: "auth-token=valid-token",
					},
				}
			);

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Failed to fetch events");
		});
	});

	describe("POST /api/events", () => {
		it("creates a new event successfully", async () => {
			const eventData = {
				name: "New Test Event",
				venueName: "New Test Venue",
				startDate: "2024-12-01T00:00:00.000Z",
				endDate: "2024-12-03T00:00:00.000Z",
				description: "Test event description",
			};

			vi.mocked(readJsonFile).mockResolvedValue([]);
			vi.mocked(writeJsonFile).mockResolvedValue(undefined);

			const request = new NextRequest(
				"http://localhost:3000/api/events",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-stage-manager-id": "test-user-1",
						cookie: "auth-token=valid-token",
					},
					body: JSON.stringify(eventData),
				}
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(201);
			expect(data.success).toBe(true);
			expect(data.data).toMatchObject({
				id: "test-uuid-123",
				name: eventData.name,
				venueName: eventData.venueName,
				stageManagerId: "test-user-1",
				status: "draft",
			});
		});

		it("validates required fields", async () => {
			const invalidEventData = {
				name: "", // Empty name should fail validation
				venueName: "Test Venue",
				// Missing other required fields
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-stage-manager-id": "test-user-1",
						cookie: "auth-token=valid-token",
					},
					body: JSON.stringify(invalidEventData),
				}
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("Invalid event data");
		});

		it("returns 401 for unauthenticated requests", async () => {
			const eventData = {
				name: "Test Event",
				venueName: "Test Venue",
				startDate: "2024-12-01T00:00:00.000Z",
				endDate: "2024-12-03T00:00:00.000Z",
				description: "Test description",
			};

			const request = new NextRequest(
				"http://localhost:3000/api/events",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-stage-manager-id": "test-user-1",
						// No auth token
					},
					body: JSON.stringify(eventData),
				}
			);

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});
	});
});
