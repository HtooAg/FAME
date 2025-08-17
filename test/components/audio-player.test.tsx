import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AudioPlayer } from "@/components/ui/audio-player";
import { useToast } from "@/hooks/use-toast";

// Mock the toast hook
jest.mock("@/hooks/use-toast", () => ({
	useToast: jest.fn(() => ({
		toast: jest.fn(),
	})),
}));

// Mock the media error boundary
jest.mock("@/components/ui/media-error-boundary", () => ({
	MediaErrorBoundary: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	useMediaErrorHandler: () => ({
		error: null,
		retryCount: 0,
		handleError: jest.fn(),
		retry: jest.fn(),
		clearError: jest.fn(),
	}),
}));

// Mock fetch for signed URL API
global.fetch = jest.fn();

describe("AudioPlayer", () => {
	const mockTrack = {
		song_title: "Test Song",
		duration: 180, // 3 minutes
		notes: "Test notes",
		is_main_track: true,
		tempo: "medium",
		file_url: "https://example.com/test-song.mp3",
		file_path: "artists/123/music/test-song.mp3",
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(fetch as jest.Mock).mockClear();
	});

	it("renders track information correctly", () => {
		render(<AudioPlayer track={mockTrack} />);

		expect(screen.getByText("Test Song")).toBeInTheDocument();
		expect(screen.getByText("Main Track")).toBeInTheDocument();
		expect(screen.getByText(/Duration: 3:00/)).toBeInTheDocument();
		expect(screen.getByText(/Tempo: medium/)).toBeInTheDocument();
		expect(screen.getByText(/DJ Notes: Test notes/)).toBeInTheDocument();
	});

	it("shows play button initially", () => {
		render(<AudioPlayer track={mockTrack} />);

		const playButton = screen.getByRole("button");
		expect(playButton).toBeInTheDocument();
		// The play button should contain a Play icon (we can't easily test the icon, but we can test the button exists)
	});

	it("handles blob URL refresh", async () => {
		const blobTrack = {
			...mockTrack,
			file_url: "blob:http://localhost:3000/123-456",
		};

		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				signedUrl: "https://storage.googleapis.com/signed-url",
			}),
		});

		render(<AudioPlayer track={blobTrack} />);

		const playButton = screen.getByRole("button");
		fireEvent.click(playButton);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/media/signed-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath: mockTrack.file_path }),
			});
		});
	});

	it("handles error when file_path is missing", () => {
		const trackWithoutPath = {
			...mockTrack,
			file_url: "blob:http://localhost:3000/123-456",
			file_path: undefined,
		};

		const onError = jest.fn();
		render(<AudioPlayer track={trackWithoutPath} onError={onError} />);

		const playButton = screen.getByRole("button");
		fireEvent.click(playButton);

		// Should call onError with appropriate message
		expect(onError).toHaveBeenCalledWith(
			expect.stringContaining("not properly stored in cloud storage")
		);
	});

	it("formats duration correctly", () => {
		const trackWithDifferentDuration = {
			...mockTrack,
			duration: 125, // 2:05
		};

		render(<AudioPlayer track={trackWithDifferentDuration} />);

		expect(screen.getByText(/Duration: 2:05/)).toBeInTheDocument();
	});

	it("handles zero duration", () => {
		const trackWithZeroDuration = {
			...mockTrack,
			duration: 0,
		};

		render(<AudioPlayer track={trackWithZeroDuration} />);

		expect(screen.getByText(/Duration: 0:00/)).toBeInTheDocument();
	});
});
