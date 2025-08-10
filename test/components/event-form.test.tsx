import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

// Simple event form component for testing
function EventForm({
	onSubmit,
	loading = false,
}: {
	onSubmit: (data: any) => void;
	loading?: boolean;
}) {
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);
		const data = {
			name: formData.get("name"),
			venueName: formData.get("venueName"),
			description: formData.get("description"),
			startDate: formData.get("startDate"),
			endDate: formData.get("endDate"),
		};
		onSubmit(data);
	};

	return (
		<form onSubmit={handleSubmit} data-testid="event-form">
			<div>
				<label htmlFor="name">Event Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					placeholder="Enter event name"
				/>
			</div>

			<div>
				<label htmlFor="venueName">Venue Name</label>
				<input
					id="venueName"
					name="venueName"
					type="text"
					required
					placeholder="Enter venue name"
				/>
			</div>

			<div>
				<label htmlFor="description">Description</label>
				<textarea
					id="description"
					name="description"
					required
					placeholder="Enter event description"
				/>
			</div>

			<div>
				<label htmlFor="startDate">Start Date</label>
				<input id="startDate" name="startDate" type="date" required />
			</div>

			<div>
				<label htmlFor="endDate">End Date</label>
				<input id="endDate" name="endDate" type="date" required />
			</div>

			<button type="submit" disabled={loading}>
				{loading ? "Creating..." : "Create Event"}
			</button>
		</form>
	);
}

describe("EventForm", () => {
	const user = userEvent.setup();
	let mockOnSubmit: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockOnSubmit = vi.fn();
	});

	it("renders all form fields", () => {
		render(<EventForm onSubmit={mockOnSubmit} />);

		expect(screen.getByLabelText("Event Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Venue Name")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
		expect(screen.getByLabelText("End Date")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create Event" })
		).toBeInTheDocument();
	});

	it("submits form with correct data", async () => {
		render(<EventForm onSubmit={mockOnSubmit} />);

		await user.type(screen.getByLabelText("Event Name"), "Test Event");
		await user.type(screen.getByLabelText("Venue Name"), "Test Venue");
		await user.type(
			screen.getByLabelText("Description"),
			"Test Description"
		);
		await user.type(screen.getByLabelText("Start Date"), "2024-12-01");
		await user.type(screen.getByLabelText("End Date"), "2024-12-03");

		await user.click(screen.getByRole("button", { name: "Create Event" }));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith({
				name: "Test Event",
				venueName: "Test Venue",
				description: "Test Description",
				startDate: "2024-12-01",
				endDate: "2024-12-03",
			});
		});
	});

	it("shows loading state when submitting", () => {
		render(<EventForm onSubmit={mockOnSubmit} loading={true} />);

		const submitButton = screen.getByRole("button");
		expect(submitButton).toHaveTextContent("Creating...");
		expect(submitButton).toBeDisabled();
	});

	it("requires all fields to be filled", async () => {
		render(<EventForm onSubmit={mockOnSubmit} />);

		// Try to submit without filling fields
		await user.click(screen.getByRole("button", { name: "Create Event" }));

		// Form should not submit (onSubmit should not be called)
		expect(mockOnSubmit).not.toHaveBeenCalled();
	});
});
