import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock date utilities
vi.mock("date-fns", () => ({
	format: vi.fn((date, formatStr) => {
		if (typeof date === "string") {
			return new Date(date).toLocaleDateString();
		}
		return date.toLocaleDateString();
	}),
	addDays: vi.fn((date, days) => {
		const newDate = new Date(date);
		newDate.setDate(newDate.getDate() + days);
		return newDate;
	}),
	eachDayOfInterval: vi.fn(({ start, end }) => {
		const days = [];
		const current = new Date(start);
		const endDate = new Date(end);

		while (current <= endDate) {
			days.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}
		return days;
	}),
}));

// Simple show date selection component for testing
function ShowDateSelection({
	eventName,
	startDate,
	endDate,
	onSave,
	onSkip,
}: {
	eventName: string;
	startDate: string;
	endDate: string;
	onSave: (dates: string[]) => void;
	onSkip: () => void;
}) {
	const [selectedDates, setSelectedDates] = React.useState<string[]>([]);
	const [availableDates] = React.useState(() => {
		// Generate available dates between start and end
		const dates = [];
		const start = new Date(startDate);
		const end = new Date(endDate);
		const current = new Date(start);

		while (current <= end) {
			dates.push(current.toISOString().split("T")[0]);
			current.setDate(current.getDate() + 1);
		}
		return dates;
	});

	const toggleDate = (date: string) => {
		setSelectedDates((prev) =>
			prev.includes(date)
				? prev.filter((d) => d !== date)
				: [...prev, date]
		);
	};

	return (
		<div data-testid="show-date-selection">
			<h1>Select Show Dates</h1>
			<p>Choose which dates from {eventName} event will have shows</p>
			<p>
				Event Runs from {startDate} to {endDate}
			</p>

			<div data-testid="available-dates">
				<h3>Available Dates For Shows</h3>
				{availableDates.map((date) => (
					<label key={date}>
						<input
							type="checkbox"
							checked={selectedDates.includes(date)}
							onChange={() => toggleDate(date)}
							data-testid={`date-${date}`}
						/>
						{date}
					</label>
				))}
			</div>

			<div data-testid="selected-dates">
				<h3>Selected Show Dates</h3>
				{selectedDates.length === 0 ? (
					<p>No dates selected</p>
				) : (
					<ul>
						{selectedDates.map((date) => (
							<li key={date} data-testid={`selected-${date}`}>
								{date}
							</li>
						))}
					</ul>
				)}
			</div>

			<div>
				<button
					onClick={() => onSave(selectedDates)}
					disabled={selectedDates.length === 0}
					data-testid="save-button"
				>
					Save Show Dates ({selectedDates.length})
				</button>
				<button onClick={onSkip} data-testid="skip-button">
					Skip for now
				</button>
			</div>
		</div>
	);
}

describe("ShowDateSelection", () => {
	const user = userEvent.setup();
	let mockOnSave: ReturnType<typeof vi.fn>;
	let mockOnSkip: ReturnType<typeof vi.fn>;

	const defaultProps = {
		eventName: "Test Event",
		startDate: "2024-12-01",
		endDate: "2024-12-03",
		onSave: vi.fn(),
		onSkip: vi.fn(),
	};

	beforeEach(() => {
		mockOnSave = vi.fn();
		mockOnSkip = vi.fn();
	});

	it("renders event information correctly", () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		expect(screen.getByText("Select Show Dates")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Choose which dates from Test Event event will have shows"
			)
		).toBeInTheDocument();
		expect(
			screen.getByText("Event Runs from 2024-12-01 to 2024-12-03")
		).toBeInTheDocument();
	});

	it("displays available dates as checkboxes", () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		// Should show dates from Dec 1 to Dec 3
		expect(screen.getByTestId("date-2024-12-01")).toBeInTheDocument();
		expect(screen.getByTestId("date-2024-12-02")).toBeInTheDocument();
		expect(screen.getByTestId("date-2024-12-03")).toBeInTheDocument();
	});

	it("allows selecting and deselecting dates", async () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		const date1Checkbox = screen.getByTestId("date-2024-12-01");
		const date2Checkbox = screen.getByTestId("date-2024-12-02");

		// Initially no dates selected
		expect(screen.getByText("No dates selected")).toBeInTheDocument();

		// Select first date
		await user.click(date1Checkbox);
		expect(screen.getByTestId("selected-2024-12-01")).toBeInTheDocument();
		expect(screen.queryByText("No dates selected")).not.toBeInTheDocument();

		// Select second date
		await user.click(date2Checkbox);
		expect(screen.getByTestId("selected-2024-12-01")).toBeInTheDocument();
		expect(screen.getByTestId("selected-2024-12-02")).toBeInTheDocument();

		// Deselect first date
		await user.click(date1Checkbox);
		expect(
			screen.queryByTestId("selected-2024-12-01")
		).not.toBeInTheDocument();
		expect(screen.getByTestId("selected-2024-12-02")).toBeInTheDocument();
	});

	it("updates save button with selected count", async () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		const saveButton = screen.getByTestId("save-button");

		// Initially disabled with 0 count
		expect(saveButton).toBeDisabled();
		expect(saveButton).toHaveTextContent("Save Show Dates (0)");

		// Select one date
		await user.click(screen.getByTestId("date-2024-12-01"));
		expect(saveButton).not.toBeDisabled();
		expect(saveButton).toHaveTextContent("Save Show Dates (1)");

		// Select another date
		await user.click(screen.getByTestId("date-2024-12-02"));
		expect(saveButton).toHaveTextContent("Save Show Dates (2)");
	});

	it("calls onSave with selected dates", async () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		// Select some dates
		await user.click(screen.getByTestId("date-2024-12-01"));
		await user.click(screen.getByTestId("date-2024-12-03"));

		// Click save
		await user.click(screen.getByTestId("save-button"));

		expect(mockOnSave).toHaveBeenCalledWith(["2024-12-01", "2024-12-03"]);
	});

	it("calls onSkip when skip button is clicked", async () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		await user.click(screen.getByTestId("skip-button"));
		expect(mockOnSkip).toHaveBeenCalled();
	});

	it("handles single day events correctly", () => {
		render(
			<ShowDateSelection
				{...defaultProps}
				startDate="2024-12-01"
				endDate="2024-12-01"
				onSave={mockOnSave}
				onSkip={mockOnSkip}
			/>
		);

		// Should only show one date option
		expect(screen.getByTestId("date-2024-12-01")).toBeInTheDocument();
		expect(screen.queryByTestId("date-2024-12-02")).not.toBeInTheDocument();
	});
});
