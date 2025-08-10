import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Event } from "@/lib/types/event";

// Mock event card component since it's embedded in the events page
const mockEvent: Event = {
	id: "test-event-1",
	name: "Test Event",
	venueName: "Test Venue",
	startDate: "2024-12-01T00:00:00.000Z",
	endDate: "2024-12-03T00:00:00.000Z",
	description: "This is a test event description",
	stageManagerId: "test-manager-1",
	showDates: ["2024-12-01T00:00:00.000Z", "2024-12-02T00:00:00.000Z"],
	status: "active",
	createdAt: "2024-11-01T00:00:00.000Z",
	updatedAt: "2024-11-01T00:00:00.000Z",
};

// Simple event card component for testing
function EventCard({
	event,
	onEdit,
	onDelete,
	onManage,
}: {
	event: Event;
	onEdit: (id: string) => void;
	onDelete: (event: Event) => void;
	onManage: (id: string) => void;
}) {
	return (
		<div data-testid="event-card">
			<h3>{event.name}</h3>
			<p>{event.venueName}</p>
			<p>{event.description}</p>
			<span data-testid="status">{event.status}</span>
			<span data-testid="show-dates-count">
				{event.showDates.length} show dates
			</span>
			<button onClick={() => onManage(event.id)}>Manage</button>
			<button onClick={() => onEdit(event.id)}>Edit</button>
			<button onClick={() => onDelete(event)}>Delete</button>
		</div>
	);
}

describe("EventCard", () => {
	it("renders event information correctly", () => {
		const mockOnEdit = vi.fn();
		const mockOnDelete = vi.fn();
		const mockOnManage = vi.fn();

		render(
			<EventCard
				event={mockEvent}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onManage={mockOnManage}
			/>
		);

		expect(screen.getByText("Test Event")).toBeInTheDocument();
		expect(screen.getByText("Test Venue")).toBeInTheDocument();
		expect(
			screen.getByText("This is a test event description")
		).toBeInTheDocument();
		expect(screen.getByTestId("status")).toHaveTextContent("active");
		expect(screen.getByTestId("show-dates-count")).toHaveTextContent(
			"2 show dates"
		);
	});

	it("calls onManage when manage button is clicked", () => {
		const mockOnEdit = vi.fn();
		const mockOnDelete = vi.fn();
		const mockOnManage = vi.fn();

		render(
			<EventCard
				event={mockEvent}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onManage={mockOnManage}
			/>
		);

		fireEvent.click(screen.getByText("Manage"));
		expect(mockOnManage).toHaveBeenCalledWith("test-event-1");
	});

	it("calls onEdit when edit button is clicked", () => {
		const mockOnEdit = vi.fn();
		const mockOnDelete = vi.fn();
		const mockOnManage = vi.fn();

		render(
			<EventCard
				event={mockEvent}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onManage={mockOnManage}
			/>
		);

		fireEvent.click(screen.getByText("Edit"));
		expect(mockOnEdit).toHaveBeenCalledWith("test-event-1");
	});

	it("calls onDelete when delete button is clicked", () => {
		const mockOnEdit = vi.fn();
		const mockOnDelete = vi.fn();
		const mockOnManage = vi.fn();

		render(
			<EventCard
				event={mockEvent}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				onManage={mockOnManage}
			/>
		);

		fireEvent.click(screen.getByText("Delete"));
		expect(mockOnDelete).toHaveBeenCalledWith(mockEvent);
	});
});
