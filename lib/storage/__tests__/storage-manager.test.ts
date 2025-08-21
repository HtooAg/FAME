import { StorageManager, UserData, StorageError } from "../storage-manager";
import { LocalFileStorage } from "../local-storage";
import GCSService from "../../google-cloud-storage";
import { tmpdir } from "os";
import path from "path";
import { promises as fs } from "fs";

// Mock GCS Service
jest.mock("../../google-cloud-storage", () => ({
	default: {
		fileExists: jest.fn(),
		saveJSON: jest.fn(),
		readJSON: jest.fn(),
		listFiles: jest.fn(),
	},
}));

const mockGCSService = GCSService as jest.Mocked<typeof GCSService>;

describe("StorageManager", () => {
	let storageManager: StorageManager;
	let testDir: string;

	const mockUserData: UserData = {
		id: "1",
		name: "Test User",
		email: "test@example.com",
		password: "hashedpassword",
		role: "stage_manager",
		accountStatus: "pending",
		subscriptionStatus: "trial",
		subscriptionEndDate: "",
		createdAt: "2023-01-01T00:00:00.000Z",
		updatedAt: "2023-01-01T00:00:00.000Z",
		metadata: {
			ipAddress: "127.0.0.1",
			userAgent: "test",
			storageSource: "local",
		},
	};

	beforeEach(async () => {
		// Create temporary directory for testing
		testDir = path.join(tmpdir(), `test-storage-manager-${Date.now()}`);

		// Mock environment variables
		process.env.LOCAL_DATA_PATH = testDir;
		process.env.GCS_ENABLED = "true";
		process.env.LOCAL_STORAGE_ENABLED = "true";

		// Reset mocks
		jest.clearAllMocks();

		// Create new storage manager instance
		storageManager = new StorageManager();
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("initialization", () => {
		it("should initialize successfully with both storages available", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);

			await expect(storageManager.initialize()).resolves.not.toThrow();

			const health = await storageManager.getHealthStatus();
			expect(health.local.available).toBe(true);
			expect(health.gcs.available).toBe(true);
			expect(health.fallbackActive).toBe(false);
		});

		it("should initialize with GCS unavailable and fallback active", async () => {
			mockGCSService.fileExists.mockRejectedValue(
				new Error("GCS unavailable")
			);

			await expect(storageManager.initialize()).resolves.not.toThrow();

			const health = await storageManager.getHealthStatus();
			expect(health.local.available).toBe(true);
			expect(health.gcs.available).toBe(false);
			expect(health.fallbackActive).toBe(true);
		});
	});

	describe("saveUser", () => {
		beforeEach(async () => {
			await storageManager.initialize();
		});

		it("should save user to both GCS and local when both available", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.saveJSON.mockResolvedValue();
			mockGCSService.readJSON.mockResolvedValue([]);

			await storageManager.saveUser(mockUserData);

			expect(mockGCSService.saveJSON).toHaveBeenCalled();

			// Check local storage
			const localStorage = new LocalFileStorage(testDir);
			const savedData = await localStorage.readJSON(
				`registrations/stage-managers/${mockUserData.name}-${mockUserData.id}.json`
			);
			expect(savedData).toBeTruthy();
			expect(savedData.email).toBe(mockUserData.email);
		});

		it("should save user to local only when GCS unavailable", async () => {
			mockGCSService.fileExists.mockRejectedValue(
				new Error("GCS unavailable")
			);

			await storageManager.saveUser(mockUserData);

			expect(mockGCSService.saveJSON).not.toHaveBeenCalled();

			// Check local storage
			const localStorage = new LocalFileStorage(testDir);
			const savedData = await localStorage.readJSON(
				`registrations/stage-managers/${mockUserData.name}-${mockUserData.id}.json`
			);
			expect(savedData).toBeTruthy();
			expect(savedData.email).toBe(mockUserData.email);
			expect(savedData.metadata.storageSource).toBe("local");
		});

		it("should throw error when both storages fail", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.saveJSON.mockRejectedValue(
				new Error("GCS save failed")
			);

			// Make local storage fail by using invalid path
			process.env.LOCAL_DATA_PATH =
				"/invalid/path/that/cannot/be/created";
			const failingStorageManager = new StorageManager();
			await failingStorageManager.initialize().catch(() => {}); // Ignore init error

			await expect(
				failingStorageManager.saveUser(mockUserData)
			).rejects.toThrow(StorageError);
		});
	});

	describe("getUser", () => {
		beforeEach(async () => {
			await storageManager.initialize();
		});

		it("should get user from GCS when available", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.readJSON.mockResolvedValue([mockUserData]);
			mockGCSService.listFiles.mockResolvedValue([]);

			const user = await storageManager.getUser(mockUserData.email);

			expect(user).toBeTruthy();
			expect(user?.email).toBe(mockUserData.email);
			expect(mockGCSService.readJSON).toHaveBeenCalledWith(
				"users/index.json"
			);
		});

		it("should get user from local when GCS unavailable", async () => {
			mockGCSService.fileExists.mockRejectedValue(
				new Error("GCS unavailable")
			);

			// Save user to local storage first
			const localStorage = new LocalFileStorage(testDir);
			await localStorage.saveJSON(
				`registrations/stage-managers/${mockUserData.name}-${mockUserData.id}.json`,
				mockUserData
			);

			const user = await storageManager.getUser(mockUserData.email);

			expect(user).toBeTruthy();
			expect(user?.email).toBe(mockUserData.email);
		});

		it("should return null when user not found in any storage", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.readJSON.mockResolvedValue([]);
			mockGCSService.listFiles.mockResolvedValue([]);

			const user = await storageManager.getUser(
				"nonexistent@example.com"
			);

			expect(user).toBeNull();
		});
	});

	describe("getNextId", () => {
		beforeEach(async () => {
			await storageManager.initialize();
		});

		it("should generate sequential IDs", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.readJSON.mockResolvedValue({ currentId: 5 });
			mockGCSService.saveJSON.mockResolvedValue();

			const nextId = await storageManager.getNextId();

			expect(nextId).toBe(6);
			expect(mockGCSService.saveJSON).toHaveBeenCalledWith(
				{ currentId: 6 },
				"counters/stage-manager.json"
			);
		});

		it("should start from 1 when no counter exists", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.readJSON.mockResolvedValue(null);
			mockGCSService.saveJSON.mockResolvedValue();

			const nextId = await storageManager.getNextId();

			expect(nextId).toBe(1);
		});
	});

	describe("health status", () => {
		it("should report correct health status", async () => {
			mockGCSService.fileExists.mockResolvedValue(true);
			await storageManager.initialize();

			const health = await storageManager.getHealthStatus();

			expect(health.gcs.available).toBe(true);
			expect(health.local.available).toBe(true);
			expect(health.fallbackActive).toBe(false);
			expect(health.local.path).toBe(testDir);
		});

		it("should report fallback active when GCS unavailable", async () => {
			mockGCSService.fileExists.mockRejectedValue(
				new Error("GCS unavailable")
			);
			await storageManager.initialize();

			const health = await storageManager.getHealthStatus();

			expect(health.gcs.available).toBe(false);
			expect(health.local.available).toBe(true);
			expect(health.fallbackActive).toBe(true);
		});
	});
});
