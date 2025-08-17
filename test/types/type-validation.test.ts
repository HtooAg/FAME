/**
 * Type validation tests to ensure TypeScript compilation works correctly
 */

import { describe, it, expect } from "vitest";
import type {
	ApiResponse,
	EventPageParams,
	ArtistPageParams,
	ServiceResult,
	ArtistProfile,
	Event,
	User,
} from "@/lib/types";

describe("Type Validation Tests", () => {
	it("should validate API response types", () => {
		const successResponse: ApiResponse<string> = {
			success: true,
			data: "test data",
		};

		const errorResponse: ApiResponse = {
			success: false,
			error: {
				code: "TEST_ERROR",
				message: "Test error message",
			},
		};

		expect(successResponse.success).toBe(true);
		expect(errorResponse.success).toBe(false);
	});

	it("should validate page params types", () => {
		const eventParams: EventPageParams = {
			eventId: "test-event-id",
		};

		const artistParams: ArtistPageParams = {
			artistId: "test-artist-id",
		};

		expect(eventParams.eventId).toBe("test-event-id");
		expect(artistParams.artistId).toBe("test-artist-id");
	});

	it("should validate service result types", () => {
		const successResult: ServiceResult<ArtistProfile> = {
			success: true,
			data: {
				id: "test-id",
				artistName: "Test Artist",
				realName: "Real Name",
				email: "test@example.com",
				phone: "123-456-7890",
				style: "Rock",
				performanceType: "Live",
				performanceDuration: 30,
				biography: "Test bio",
				eventId: "event-id",
				eventName: "Test Event",
				status: "pending",
				createdAt: "2023-01-01T00:00:00Z",
				costumeColor: "black",
				lightColorSingle: "red",
				lightColorTwo: "blue",
				lightColorThree: "green",
				lightRequests: "None",
				stagePositionStart: "center",
				stagePositionEnd: "center",
				musicTracks: [],
				galleryFiles: [],
				socialMedia: {},
				mcNotes: "",
				stageManagerNotes: "",
			},
		};

		const errorResult: ServiceResult = {
			success: false,
			error: "Test error",
		};

		expect(successResult.success).toBe(true);
		expect(errorResult.success).toBe(false);
	});

	it("should validate Event type", () => {
		const event: Event = {
			id: "event-id",
			name: "Test Event",
			venueName: "Test Venue",
			startDate: "2023-01-01T00:00:00Z",
			endDate: "2023-01-02T00:00:00Z",
			description: "Test description",
			stageManagerId: "manager-id",
			showDates: ["2023-01-01T19:00:00Z"],
			status: "draft",
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
		};

		expect(event.id).toBe("event-id");
		expect(event.status).toBe("draft");
	});

	it("should validate User type", () => {
		const user: User = {
			id: "user-id",
			email: "user@example.com",
			name: "Test User",
			role: "stage_manager",
			accountStatus: "active",
			createdAt: "2023-01-01T00:00:00Z",
		};

		expect(user.role).toBe("stage_manager");
		expect(user.accountStatus).toBe("active");
	});

	it("should validate type unions work correctly", () => {
		const statuses: ArtistProfile["status"][] = [
			"pending",
			"approved",
			"active",
			"inactive",
			"rejected",
			"withdrawn",
		];

		statuses.forEach((status) => {
			expect(typeof status).toBe("string");
		});
	});

	it("should validate optional properties", () => {
		const minimalArtist: Partial<ArtistProfile> = {
			id: "test-id",
			artistName: "Test Artist",
			email: "test@example.com",
		};

		expect(minimalArtist.id).toBe("test-id");
		expect(minimalArtist.performanceDate).toBeUndefined();
	});
});
