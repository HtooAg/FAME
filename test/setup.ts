import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js image component
vi.mock("next/image", () => ({
	default: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
	motion: {
		div: vi.fn(),
		h1: vi.fn(),
		p: vi.fn(),
		button: vi.fn(),
	},
	AnimatePresence: vi.fn(),
}));

// Mock environment variables
process.env.JWT_SECRET = "test-secret";
process.env.GOOGLE_CLOUD_PROJECT_ID = "test-project";
process.env.GCS_BUCKET = "test-bucket";

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});
