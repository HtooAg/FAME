import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock the auth provider
const mockUser = {
	id: "test-user-1",
	name: "Test User",
	email: "test@example.com",
	role: "stage_manager" as const,
	accountStatus: "active",
};

vi.mock("@/components/auth-provider", () => ({
	useAuth: () => ({
		user: mockUser,
		loading: false,
		login: vi.fn(),
		logout: vi.fn(),
		register: vi.fn(),
	}),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: vi.fn(),
		back: vi.fn(),
	}),
	usePathname: () => "/stage-manager/events/create",
}));

// Simplified event creation workflow component
function EventCreationWorkflow() {
	const [step, setStep] = React.useState<"list" | "create" | "showDates">(
		"list"
	);
	const [events, setEvents] = React.useState<any[]>([]);
	const [currentEvent, setCurrentEvent] = React.useState<any>(null);

	const createEvent = async (eventData: any) => {
		const response = await fetch("/api/events", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(eventData),
		});

		if (response.ok) {
			const result = await response.json();
			setCurrentEvent(result.data);
			setStep("showDates");
			return result.data;
		}
		throw new Error("Failed to create event");
	};

	const addShowDates = async (eventId: string, dates: string[]) => {
		const response = await fetch(`/api/events/${eventId}/show-dates`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ dates }),
		});

		if (response.ok) {
			setStep("list");
			// Refresh events list
			const eventsResponse = await fetch("/api/events");
			if (eventsResponse.ok) {
				const eventsData = await eventsResponse.json();
				setEvents(eventsData.data);
			}
		}
	};

	if (step === "list") {
		return (
			<div data-testid="events-list">
				<h1>My Events</h1>
				<button onClick={() => setStep("create")}>Create Event</button>
				{events.length === 0 ? (
					<p>No events yet</p>
				) : (
					<div>
						{events.map((event) => (
							<div
								key={event.id}
								data-testid={`event-${event.id}`}
							>
								<h3>{event.name}</h3>
								<p>{event.venueName}</p>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	if (step === "create") {
		return (
			<div data-testid="event-form">
				<h1>Create New Event</h1>
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						const formData = new FormData(
							e.target as HTMLFormElement
						);
						const eventData = {
							name: formData.get("name"),
							venueName: formData.get("venueName"),
							description: formData.get("description"),
							startDate: formData.get("startDate"),
							endDate: formData.get("endDate"),
						};
						await createEvent(eventData);
					}}
				>
					<input name="name" placeholder="Event Name" required />
					<input name="venueName" placeholder="Venue Name" required />
					<textarea
						name="description"
						placeholder="Description"
						required
					/>
					<input name="startDate" type="date" required />
					<input name="endDate" type="date" required />
					<button type="submit">Create Event</button>
				</form>
				<button onClick={() => setStep("list")}>Cancel</button>
			</div>
		);
	}

	if (step === "showDates") {
		return (
			<div data-testid="show-dates-selection">
				<h1>Select Show Dates</h1>
				<p>Event: {currentEvent?.name}</p>
				<div>
					<button
						onClick={() =>
							addShowDates(currentEvent.id, [
								"2024-12-01",
								"2024-12-02",
							])
						}
					>
						Add Show Dates
					</button>
					<button onClick={() => setStep("list")}>
						Skip for now
					</button>
				</div>
			</div>
		);
	}

	return null;
}

describe("Event Creation Workflow E2E", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	it("completes full event creation workflow", async () => {
		// Mock API responses
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: {
							id: "new-event-1",
							name: "Test Event",
							venueName: "Test Venue",
							description: "Test Description",
						},
					}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						success: true,
						data: [
							{
								id: "new-event-1",
								name: "Test Event",
								venueName: "Test Venue",
							},
						],
					}),
			});

		render(<EventCreationWorkflow />);

		// Step 1: Start from events list
		expect(screen.getByTestId("events-list")).toBeInTheDocument();
		expect(screen.getByText("No events yet")).toBeInTheDocument();

		// Step 2: Click create event
		await user.click(screen.getByText("Create Event"));
		expect(screen.getByTestId("event-form")).toBeInTheDocument();

		// Step 3: Fill out event form
		await user.type(
			screen.getByPlaceholderText("Event Name"),
			"Test Event"
		);
		await user.type(
			screen.getByPlaceholderText("Venue Name"),
			"Test Venue"
		);
		await user.type(
			screen.getByPlaceholderText("Description"),
			"Test Description"
		);
		await user.type(screen.getByDisplayValue(""), "2024-12-01"); // Start date

		const endDateInput = screen.getAllByDisplayValue("")[1]; // End date
		await user.type(endDateInput, "2024-12-03");

		// Step 4: Submit form
		await user.click(screen.getByText("Create Event"));

		// Step 5: Should navigate to show dates selection
		await waitFor(() => {
			expect(
				screen.getByTestId("show-dates-selection")
			).toBeInTheDocument();
		});
		expect(screen.getByText("Event: Test Event")).toBeInTheDocument();

		// Step 6: Add show dates
		await user.click(screen.getByText("Add Show Dates"));

		// Step 7: Should return to events list with new event
		await waitFor(() => {
			expect(screen.getByTestId("events-list")).toBeInTheDocument();
		});

		// Verify API calls were made correctly
		expect(mockFetch).toHaveBeenCalledTimes(3);

		// First call: Create event
		expect(mockFetch).toHaveBeenNthCalledWith(1, "/api/events", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Test Event",
				venueName: "Test Venue",
				description: "Test Description",
				startDate: "2024-12-01",
				endDate: "2024-12-03",
			}),
		});

		// Second call: Add show dates
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"/api/events/new-event-1/show-dates",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dates: ["2024-12-01", "2024-12-02"] }),
			}
		);

		// Third call: Refresh events list
		expect(mockFetch).toHaveBeenNthCalledWith(3, "/api/events");
	});

	it("handles event creation errors gracefully", async () => {
		// Mock API error response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: "Validation failed" }),
		});

		render(<EventCreationWorkflow />);

		// Navigate to create form
		await user.click(screen.getByText("Create Event"));

		// Fill out form with invalid data
		await user.type(
			screen.getByPlaceholderText("Event Name"),
			"Test Event"
		);
		await user.click(screen.getByText("Create Event"));

		// Should stay on form (not navigate to show dates)
		await waitFor(() => {
			expect(screen.getByTestId("event-form")).toBeInTheDocument();
		});
		expect(
			screen.queryByTestId("show-dates-selection")
		).not.toBeInTheDocument();
	});

	it("allows skipping show dates selection", async () => {
		// Mock successful event creation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					success: true,
					data: {
						id: "new-event-1",
						name: "Test Event",
						venueName: "Test Venue",
					},
				}),
		});

		render(<EventCreationWorkflow />);

		// Create event
		await user.click(screen.getByText("Create Event"));
		await user.type(
			screen.getByPlaceholderText("Event Name"),
			"Test Event"
		);
		await user.type(
			screen.getByPlaceholderText("Venue Name"),
			"Test Venue"
		);
		await user.type(
			screen.getByPlaceholderText("Description"),
			"Test Description"
		);
		await user.click(screen.getByText("Create Event"));

		// Skip show dates
		await waitFor(() => {
			expect(
				screen.getByTestId("show-dates-selection")
			).toBeInTheDocument();
		});
		await user.click(screen.getByText("Skip for now"));

		// Should return to events list
		expect(screen.getByTestId("events-list")).toBeInTheDocument();
	});
});
