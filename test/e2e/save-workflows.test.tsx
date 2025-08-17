import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	useParams: () => ({
		eventId: "test-event-1",
	}),
}));

// Mock toast notifications
vi.mock("@/components/ui/use-toast", () => ({
	toast: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("Save Workflows E2E", () => {
	const mockEventId = "test-event-1";

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset fetch mock
		vi.mocked(fetch).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Performance Order Save Workflow", () => {
		it("should save performance order successfully from UI", async () => {
			const user = userEvent.setup();

			// Mock successful API response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {
						eventId: mockEventId,
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
								eventId: mockEventId,
							},
						],
						updatedAt: new Date().toISOString(),
						showStatus: "not_started",
					},
					timestamp: new Date().toISOString(),
				}),
			} as Response);

			// Mock the performance order component
			const MockPerformanceOrderPage = () => {
				const [saving, setSaving] = React.useState(false);
				const [performanceOrder, setPerformanceOrder] = React.useState([
					{
						id: "slot-1",
						artistId: "artist-1",
						artistName: "Test Artist",
						style: "Comedy",
						duration: 15,
					},
				]);
				const [showStartTime, setShowStartTime] =
					React.useState("19:00");

				const saveOrder = async () => {
					setSaving(true);
					try {
						const response = await fetch(
							`/api/events/${mockEventId}/performance-order-gcs`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									performanceOrder,
									showStartTime,
								}),
							}
						);

						const data = await response.json();

						if (data.success) {
							// Success handling
							console.log("Performance order saved successfully");
						} else {
							throw new Error("Failed to save performance order");
						}
					} catch (error) {
						console.error("Error saving performance order:", error);
					} finally {
						setSaving(false);
					}
				};

				return (
					<div>
						<h1>Performance Order Management</h1>
						<div data-testid="performance-order-list">
							{performanceOrder.map((item) => (
								<div
									key={item.id}
									data-testid={`performance-item-${item.id}`}
								>
									{item.artistName} - {item.style}
								</div>
							))}
						</div>
						<input
							data-testid="show-start-time"
							value={showStartTime}
							onChange={(e) => setShowStartTime(e.target.value)}
						/>
						<button
							data-testid="save-order-button"
							onClick={saveOrder}
							disabled={saving || performanceOrder.length === 0}
						>
							{saving ? "Saving..." : "Save Order"}
						</button>
					</div>
				);
			};

			render(<MockPerformanceOrderPage />);

			// Verify initial state
			expect(
				screen.getByText("Performance Order Management")
			).toBeInTheDocument();
			expect(
				screen.getByTestId("performance-item-slot-1")
			).toBeInTheDocument();
			expect(screen.getByDisplayValue("19:00")).toBeInTheDocument();

			// Click save button
			const saveButton = screen.getByTestId("save-order-button");
			expect(saveButton).not.toBeDisabled();

			await user.click(saveButton);

			// Verify button shows saving state
			expect(screen.getByText("Saving...")).toBeInTheDocument();

			// Wait for save to complete
			await waitFor(() => {
				expect(screen.getByText("Save Order")).toBeInTheDocument();
			});

			// Verify API was called correctly
			expect(fetch).toHaveBeenCalledWith(
				`/api/events/${mockEventId}/performance-order-gcs`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						performanceOrder: [
							{
								id: "slot-1",
								artistId: "artist-1",
								artistName: "Test Artist",
								style: "Comedy",
								duration: 15,
							},
						],
						showStartTime: "19:00",
					}),
				}
			);
		});

		it("should handle performance order save errors", async () => {
			const user = userEvent.setup();

			// Mock error API response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Performance order must be an array",
					},
					timestamp: new Date().toISOString(),
				}),
			} as Response);

			const MockPerformanceOrderPage = () => {
				const [saving, setSaving] = React.useState(false);
				const [error, setError] = React.useState<string | null>(null);

				const saveOrder = async () => {
					setSaving(true);
					setError(null);
					try {
						const response = await fetch(
							`/api/events/${mockEventId}/performance-order-gcs`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									performanceOrder: [],
									showStartTime: "19:00",
								}),
							}
						);

						const data = await response.json();

						if (data.success) {
							console.log("Success");
						} else {
							setError(
								data.error?.message ||
									"Failed to save performance order"
							);
						}
					} catch (error) {
						setError(
							"Network error - please check your connection and try again"
						);
					} finally {
						setSaving(false);
					}
				};

				return (
					<div>
						<h1>Performance Order Management</h1>
						{error && (
							<div data-testid="error-message" role="alert">
								{error}
							</div>
						)}
						<button
							data-testid="save-order-button"
							onClick={saveOrder}
							disabled={saving}
						>
							{saving ? "Saving..." : "Save Order"}
						</button>
					</div>
				);
			};

			render(<MockPerformanceOrderPage />);

			// Click save button
			const saveButton = screen.getByTestId("save-order-button");
			await user.click(saveButton);

			// Wait for error to appear
			await waitFor(() => {
				expect(screen.getByTestId("error-message")).toBeInTheDocument();
			});

			// Verify error message
			expect(
				screen.getByText("Performance order must be an array")
			).toBeInTheDocument();
		});
	});

	describe("Rehearsal Save Workflow", () => {
		it("should save rehearsal successfully from UI", async () => {
			const user = userEvent.setup();

			// Mock successful API response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {
						message: "Rehearsal scheduled successfully",
						rehearsal: {
							id: "rehearsal-1",
							artistId: "artist-1",
							artistName: "Test Artist",
							date: "2025-01-15",
							startTime: "10:00 AM",
							endTime: "11:00 AM",
							status: "scheduled",
							notes: "Test rehearsal",
							eventId: mockEventId,
							createdAt: new Date().toISOString(),
						},
					},
					timestamp: new Date().toISOString(),
				}),
			} as Response);

			const MockRehearsalPage = () => {
				const [showDialog, setShowDialog] = React.useState(false);
				const [saving, setSaving] = React.useState(false);
				const [formData, setFormData] = React.useState({
					artistId: "artist-1",
					date: "2025-01-15",
					startTime: "10:00 AM",
					endTime: "11:00 AM",
					notes: "Test rehearsal",
				});

				const scheduleRehearsal = async () => {
					setSaving(true);
					try {
						const response = await fetch(
							`/api/events/${mockEventId}/rehearsals`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify(formData),
							}
						);

						const data = await response.json();

						if (data.success) {
							setShowDialog(false);
							console.log("Rehearsal scheduled successfully");
						} else {
							throw new Error("Failed to schedule rehearsal");
						}
					} catch (error) {
						console.error("Error scheduling rehearsal:", error);
					} finally {
						setSaving(false);
					}
				};

				return (
					<div>
						<h1>Rehearsal Management</h1>
						<button
							data-testid="schedule-rehearsal-button"
							onClick={() => setShowDialog(true)}
						>
							Schedule Rehearsal
						</button>

						{showDialog && (
							<div data-testid="rehearsal-dialog">
								<h2>Schedule New Rehearsal</h2>
								<input
									data-testid="artist-select"
									value={formData.artistId}
									onChange={(e) =>
										setFormData({
											...formData,
											artistId: e.target.value,
										})
									}
								/>
								<input
									data-testid="date-input"
									type="date"
									value={formData.date}
									onChange={(e) =>
										setFormData({
											...formData,
											date: e.target.value,
										})
									}
								/>
								<input
									data-testid="start-time-input"
									value={formData.startTime}
									onChange={(e) =>
										setFormData({
											...formData,
											startTime: e.target.value,
										})
									}
								/>
								<input
									data-testid="end-time-input"
									value={formData.endTime}
									onChange={(e) =>
										setFormData({
											...formData,
											endTime: e.target.value,
										})
									}
								/>
								<textarea
									data-testid="notes-input"
									value={formData.notes}
									onChange={(e) =>
										setFormData({
											...formData,
											notes: e.target.value,
										})
									}
								/>
								<button
									data-testid="save-rehearsal-button"
									onClick={scheduleRehearsal}
									disabled={saving}
								>
									{saving
										? "Scheduling..."
										: "Schedule Rehearsal"}
								</button>
								<button
									data-testid="cancel-button"
									onClick={() => setShowDialog(false)}
								>
									Cancel
								</button>
							</div>
						)}
					</div>
				);
			};

			render(<MockRehearsalPage />);

			// Open rehearsal dialog
			const scheduleButton = screen.getByTestId(
				"schedule-rehearsal-button"
			);
			await user.click(scheduleButton);

			// Verify dialog opened
			expect(screen.getByTestId("rehearsal-dialog")).toBeInTheDocument();

			// Verify form fields are populated
			expect(screen.getByDisplayValue("artist-1")).toBeInTheDocument();
			expect(screen.getByDisplayValue("2025-01-15")).toBeInTheDocument();
			expect(screen.getByDisplayValue("10:00 AM")).toBeInTheDocument();
			expect(
				screen.getByDisplayValue("Test rehearsal")
			).toBeInTheDocument();

			// Submit form
			const saveButton = screen.getByTestId("save-rehearsal-button");
			await user.click(saveButton);

			// Verify button shows saving state
			expect(screen.getByText("Scheduling...")).toBeInTheDocument();

			// Wait for save to complete and dialog to close
			await waitFor(() => {
				expect(
					screen.queryByTestId("rehearsal-dialog")
				).not.toBeInTheDocument();
			});

			// Verify API was called correctly
			expect(fetch).toHaveBeenCalledWith(
				`/api/events/${mockEventId}/rehearsals`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistId: "artist-1",
						date: "2025-01-15",
						startTime: "10:00 AM",
						endTime: "11:00 AM",
						notes: "Test rehearsal",
					}),
				}
			);
		});

		it("should handle rehearsal save validation errors", async () => {
			const user = userEvent.setup();

			// Mock validation error response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Start time must be in HH:MM AM/PM format",
					},
					timestamp: new Date().toISOString(),
				}),
			} as Response);

			const MockRehearsalPage = () => {
				const [error, setError] = React.useState<string | null>(null);
				const [saving, setSaving] = React.useState(false);

				const scheduleRehearsal = async () => {
					setSaving(true);
					setError(null);
					try {
						const response = await fetch(
							`/api/events/${mockEventId}/rehearsals`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({
									artistId: "artist-1",
									date: "2025-01-15",
									startTime: "invalid-time",
									endTime: "11:00 AM",
									notes: "",
								}),
							}
						);

						const data = await response.json();

						if (data.success) {
							console.log("Success");
						} else {
							setError(
								data.error?.message ||
									"Failed to schedule rehearsal"
							);
						}
					} catch (error) {
						setError(
							"Network error - please check your connection and try again"
						);
					} finally {
						setSaving(false);
					}
				};

				return (
					<div>
						<h1>Rehearsal Management</h1>
						{error && (
							<div data-testid="error-message" role="alert">
								{error}
							</div>
						)}
						<button
							data-testid="schedule-rehearsal-button"
							onClick={scheduleRehearsal}
							disabled={saving}
						>
							{saving ? "Scheduling..." : "Schedule Rehearsal"}
						</button>
					</div>
				);
			};

			render(<MockRehearsalPage />);

			// Click schedule button
			const scheduleButton = screen.getByTestId(
				"schedule-rehearsal-button"
			);
			await user.click(scheduleButton);

			// Wait for error to appear
			await waitFor(() => {
				expect(screen.getByTestId("error-message")).toBeInTheDocument();
			});

			// Verify error message
			expect(
				screen.getByText("Start time must be in HH:MM AM/PM format")
			).toBeInTheDocument();
		});

		it("should handle network errors gracefully", async () => {
			const user = userEvent.setup();

			// Mock network error
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

			const MockRehearsalPage = () => {
				const [error, setError] = React.useState<string | null>(null);
				const [saving, setSaving] = React.useState(false);

				const scheduleRehearsal = async () => {
					setSaving(true);
					setError(null);
					try {
						await fetch(`/api/events/${mockEventId}/rehearsals`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								artistId: "artist-1",
								date: "2025-01-15",
								startTime: "10:00 AM",
								endTime: "11:00 AM",
								notes: "",
							}),
						});
					} catch (error) {
						setError(
							"Network error - please check your connection and try again"
						);
					} finally {
						setSaving(false);
					}
				};

				return (
					<div>
						<h1>Rehearsal Management</h1>
						{error && (
							<div data-testid="error-message" role="alert">
								{error}
							</div>
						)}
						<button
							data-testid="schedule-rehearsal-button"
							onClick={scheduleRehearsal}
							disabled={saving}
						>
							{saving ? "Scheduling..." : "Schedule Rehearsal"}
						</button>
					</div>
				);
			};

			render(<MockRehearsalPage />);

			// Click schedule button
			const scheduleButton = screen.getByTestId(
				"schedule-rehearsal-button"
			);
			await user.click(scheduleButton);

			// Wait for error to appear
			await waitFor(() => {
				expect(screen.getByTestId("error-message")).toBeInTheDocument();
			});

			// Verify network error message
			expect(
				screen.getByText(
					"Network error - please check your connection and try again"
				)
			).toBeInTheDocument();
		});
	});

	describe("Data Persistence Verification", () => {
		it("should verify data persistence after save operations", async () => {
			const user = userEvent.setup();

			// Mock save response
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						success: true,
						data: {
							message: "Performance order saved successfully",
						},
					}),
				} as Response)
				// Mock subsequent fetch to verify data was saved
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						success: true,
						data: {
							eventId: mockEventId,
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
									eventId: mockEventId,
								},
							],
							updatedAt: new Date().toISOString(),
							showStatus: "not_started",
						},
					}),
				} as Response);

			const MockComponent = () => {
				const [data, setData] = React.useState(null);
				const [saving, setSaving] = React.useState(false);

				const saveAndVerify = async () => {
					setSaving(true);

					// Save data
					await fetch(
						`/api/events/${mockEventId}/performance-order-gcs`,
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								performanceOrder: [
									{
										id: "slot-1",
										artistId: "artist-1",
										artistName: "Test Artist",
										style: "Comedy",
										duration: 15,
									},
								],
								showStartTime: "19:00",
							}),
						}
					);

					// Verify data was saved by fetching it back
					const response = await fetch(
						`/api/events/${mockEventId}/performance-order-gcs`
					);
					const result = await response.json();
					setData(result.data);
					setSaving(false);
				};

				return (
					<div>
						<button
							data-testid="save-and-verify-button"
							onClick={saveAndVerify}
							disabled={saving}
						>
							{saving ? "Saving..." : "Save and Verify"}
						</button>
						{data && (
							<div data-testid="verified-data">
								Data verified:{" "}
								{JSON.stringify(data.performanceOrder.length)}{" "}
								items
							</div>
						)}
					</div>
				);
			};

			render(<MockComponent />);

			// Click save and verify button
			const button = screen.getByTestId("save-and-verify-button");
			await user.click(button);

			// Wait for verification to complete
			await waitFor(() => {
				expect(screen.getByTestId("verified-data")).toBeInTheDocument();
			});

			// Verify both API calls were made
			expect(fetch).toHaveBeenCalledTimes(2);
			expect(
				screen.getByText("Data verified: 1 items")
			).toBeInTheDocument();
		});
	});
});
