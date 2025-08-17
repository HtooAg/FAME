import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
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

describe("VideoPlayer", () => {
	const mockVideoFile = {
		name: "test-video.mp4",
		type: "video" as const,
		url: "https://example.com/test-video.mp4",
		file_path: "artists/123/videos/test-video.mp4",
		size: 1024 * 1024, // 1MB
		uploadedAt: "2023-01-01T00:00:00Z",
		contentType: "video/mp4",
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(fetch as jest.Mock).mockClear();
	});

	it("renders video element with correct src", () => {
		render(<VideoPlayer file={mockVideoFile} />);

		const videoElement = screen.getByRole("application"); // video elements have application role
		expect(videoElement).toBeInTheDocument();
		expect(videoElement).toHaveAttribute("src", mockVideoFile.url);
	});

	it("displays file metadata", () => {
		render(<VideoPlayer file={mockVideoFile} />);

		expect(screen.getByText("test-video.mp4")).toBeInTheDocument();
		expect(screen.getByText("Size: 1 MB")).toBeInTheDocument();
		expect(screen.getByText("Uploaded: 1/1/2023")).toBeInTheDocument();
	});

	it("handles blob URL refresh", async () => {
		const blobVideoFile = {
			...mockVideoFile,
			url: "blob:http://localhost:3000/123-456",
		};

		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				signedUrl: "https://storage.googleapis.com/signed-url",
			}),
		});

		render(<VideoPlayer file={blobVideoFile} />);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/media/signed-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath: mockVideoFile.file_path }),
			});
		});
	});

	it("shows loading state", () => {
		render(<VideoPlayer file={mockVideoFile} />);

		// Trigger loading state by simulating loadstart event
		const videoElement = screen.getByRole("application");
		fireEvent.loadStart(videoElement);

		expect(screen.getByText("Loading video...")).toBeInTheDocument();
	});
});

describe("ImageViewer", () => {
	const mockImageFile = {
		name: "test-image.jpg",
		type: "image" as const,
		url: "https://example.com/test-image.jpg",
		file_path: "artists/123/images/test-image.jpg",
		size: 512 * 1024, // 512KB
		uploadedAt: "2023-01-01T00:00:00Z",
		contentType: "image/jpeg",
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(fetch as jest.Mock).mockClear();
	});

	it("renders image with correct src", () => {
		render(<ImageViewer file={mockImageFile} />);

		const imageElement = screen.getByRole("img");
		expect(imageElement).toBeInTheDocument();
		expect(imageElement).toHaveAttribute("src", mockImageFile.url);
		expect(imageElement).toHaveAttribute("alt", mockImageFile.name);
	});

	it("displays file metadata", () => {
		render(<ImageViewer file={mockImageFile} />);

		expect(screen.getByText("test-image.jpg")).toBeInTheDocument();
		expect(screen.getByText("Size: 512 KB")).toBeInTheDocument();
		expect(screen.getByText("Uploaded: 1/1/2023")).toBeInTheDocument();
	});

	it("handles blob URL refresh", async () => {
		const blobImageFile = {
			...mockImageFile,
			url: "blob:http://localhost:3000/123-456",
		};

		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				signedUrl: "https://storage.googleapis.com/signed-url",
			}),
		});

		render(<ImageViewer file={blobImageFile} />);

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith("/api/media/signed-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath: mockImageFile.file_path }),
			});
		});
	});
});
