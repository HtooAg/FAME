import { DataSyncService, SyncResult } from "../sync-service";
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

describe("DataSyncService", () => {
	let syncService: DataSyncService;
	let testDir: string;

	const mockUser1 = {
		id: "1",
		name: "User One",
		email: "user1@example.com",
		password: "hashedpassword1",
		role: "stage_manager" as const,
		accountStatus: "approved" as const,
		subscriptionStatus: "active",
		subscriptionEndDate: "",
		createdAt: "2023-01-01T00:00:00.000Z",
		updatedAt: "2023-01-01T12:00:00.000Z",
		metadata: {
			ipAddress: "127.0.0.1",
			userAgent: "test",
			storageSource: "gcs" as const,
		},
	};

	const mockUser2 = {
		id: "2",
		name: "User Two",
		email: "user2@example.com",
		password: "hashedpassword2",
		role: "stage_manager" as const,
		accountStatus: "pending" as const,
		subscriptionStatus: "trial",
		subscriptionEndDate: "",
		createdAt: "2023-01-02T00:00:00.000Z",
		updatedAt: "2023-01-02T12:00:00.000Z",
		metadata: {
			ipAddress: "127.0.0.1",
			userAgent: "test",
			storageSource: "local" as const,
		},
	};

	beforeEach(async () => {
		// Create temporary directory for testing
		testDir = path.join(tmpdir(), `test-sync-service-${Date.now()}`);

		// Mock environment variables
		process.env.LOCAL_DATA_PATH = testDir;
		process.env.GCS_ENABLED = "true";
		process.env.LOCAL_STORAGE_ENABLED = "true";

		// Reset mocks
		jest.clearAllMocks();

		// Create new sync service instance
		syncService = new DataSyncService();
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("syncData", () => {
		it("should sync users from GCS to local when GCS has more data", async () => {
			// Mock GCS availability
			mockGCSService.fileExists.mockResolvedValue(true);

			// Mock GCS having users
			mockGCSService.readJSON.mockImplementation((path: string) => {
				if (path === "users/index.json") {
					return Promise.resolve([mockUser1]);
				}
				return Promise.resolve(null);
			});

			mockGCSService.listFiles.mockResolvedValue([]);
			mockGCSService.saveJSON.mockResolvedValue();

			const result = await syncService.syncData();

			expect(result.success).toBe(true);
			expect(result.itemsSynced).toBeGreaterThan(0);
			expect(result.errors).toHaveLength(0);

			// Verify user was saved to local storage
			const localStorage = new LocalFileStorage(testDir);
			const localUsers = await localStorage.readJSON("users/index.json");
			expect(localUsers).toContainEqual(mockUser1);
		});

		it("should sync users from local to GCS when local has more data", async () => {
			// Mock GCS availability
			mockGCSService.fileExists.mockResolvedValue(true);

			// Mock GCS being empty
			mockGCSService.readJSON.mockResolvedValue(null);
			mockGCSService.listFiles.mockResolvedValue([]);
			mockGCSService.saveJSON.mockResolvedValue();

			// Add user to local storage
			const localStorage = new LocalFileStorage(testDir);
			await localStorage.ensureDirectory("users");
			await localStorage.saveJSON("users/index.json", [mockUser2]);

			const result = await syncService.syncData();

			expect(result.success).toBe(true);
			expect(result.itemsSynced).toBeGreaterThan(0);
			expect(mockGCSService.saveJSON).toHaveBeenCalledWith(
				[mockUser2],
				"users/index.json"
			);
		});

		it("should detect and resolve conflicts based on timestamps", async () => {
			// Mock GCS availability
			mockGCSService.fileExists.mockResolvedValue(true);

			// Create conflicting versions of the same user
			const gcsUser = {
				...mockUser1,
				name: "GCS Version",
				updatedAt: "2023-01-01T14:00:00.000Z", // Later timestamp
			};

			const localUser = {
				...mockUser1,
				name: "Local Version",
				updatedAt: "2023-01-01T12:00:00.000Z", // Earlier timestamp
			};

			// Mock GCS having the newer version
			mockGCSService.readJSON.mockImplementation((path: string) => {
				if (path === "users/index.json") {
					return Promise.resolve([gcsUser]);
				}
				return Promise.resolve(null);
			});

			mockGCSService.listFiles.mockResolvedValue([]);
			mockGCSService.saveJSON.mockResolvedValue();

			// Add older version to local storage
			const localStorage = new LocalFileStorage(testDir);
			await localStorage.ensureDirectory("users");
			await localStorage.saveJSON("users/index.json", [localUser]);

			const result = await syncService.syncData();

			expect(result.success).toBe(true);
			expect(result.conflicts).toHaveLength(1);
			expect(result.conflicts[0].resolution).toBe("gcs-wins");
			expect(result.conflicts[0].resolvedVersion.name).toBe(
				"GCS Version"
			);
		});

		it("should sync counters and use the higher value", async () => {
			// Mock GCS availability
			mockGCSService.fileExists.mockResolvedValue(true);

			// Mock GCS having lower counter
			mockGCSService.readJSON.mockImplementation((path: string) => {
				if (path === "counters/stage-manager.json") {
					return Promise.resolve({ currentId: 5 });
				}
				return Promise.resolve(null);
			});

			mockGCSService.listFiles.mockResolvedValue([]);
			mockGCSService.saveJSON.mockResolvedValue();

			// Add higher counter to local storage
			const localStorage = new LocalFileStorage(testDir);
			await localStorage.ensureDirectory("counters");
			await localStorage.saveJSON("counters/stage-manager.json", {
				currentId: 10,
			});

			const result = await syncService.syncData();

			expect(result.success).toBe(true);
			expect(mockGCSService.saveJSON).toHaveBeenCalledWith(
				{ currentId: 10 },
				"counters/stage-manager.json"
			);
		});

		it("should handle GCS unavailability gracefully", async () => {
			// Mock GCS being unavailable
			mockGCSService.fileExists.mockRejectedValue(
				new Error("GCS unavailable")
			);

			const result = await syncService.syncData();

			expect(result.success).toBe(false);
			expect(result.errors).toContain(
				"GCS is not available for synchronization"
			);
			expect(result.itemsSynced).toBe(0);
		});
	});

	describe("syncFromGCSToLocal", () => {
		it("should copy all data from GCS to local", async () => {
			// Mock GCS availability and data
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.readJSON.mockImplementation((path: string) => {
				if (path === "users/index.json") {
					return Promise.resolve([mockUser1]);
				}
				if (path === "counters/stage-manager.json") {
					return Promise.resolve({ currentId: 15 });
				}
				return Promise.resolve(null);
			});
			mockGCSService.listFiles.mockResolvedValue([]);

			const result = await syncService.syncFromGCSToLocal();

			expect(result.success).toBe(true);
			expect(result.metadata.syncDirection).toBe("gcs-to-local");
			expect(result.itemsSynced).toBeGreaterThan(0);

			// Verify data was copied to local
			const localStorage = new LocalFileStorage(testDir);
			const localUsers = await localStorage.readJSON("users/index.json");
			const localCounter = await localStorage.readJSON(
				"counters/stage-manager.json"
			);

			expect(localUsers).toContainEqual(mockUser1);
			expect(localCounter).toEqual({ currentId: 15 });
		});
	});

	describe("syncFromLocalToGCS", () => {
		it("should copy all data from local to GCS", async () => {
			// Mock GCS availability
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.saveJSON.mockResolvedValue();

			// Add data to local storage
			const localStorage = new LocalFileStorage(testDir);
			await localStorage.ensureDirectory("users");
			await localStorage.ensureDirectory("counters");
			await localStorage.saveJSON("users/index.json", [mockUser2]);
			await localStorage.saveJSON("counters/stage-manager.json", {
				currentId: 20,
			});

			const result = await syncService.syncFromLocalToGCS();

			expect(result.success).toBe(true);
			expect(result.metadata.syncDirection).toBe("local-to-gcs");
			expect(result.itemsSynced).toBeGreaterThan(0);

			// Verify data was copied to GCS
			expect(mockGCSService.saveJSON).toHaveBeenCalledWith(
				[mockUser2],
				"users/index.json"
			);
			expect(mockGCSService.saveJSON).toHaveBeenCalledWith(
				{ currentId: 20 },
				"counters/stage-manager.json"
			);
		});
	});

	describe("getLastSyncMetadata", () => {
		it("should return null when no sync has been performed", async () => {
			const metadata = await syncService.getLastSyncMetadata();
			expect(metadata).toBeNull();
		});

		it("should return metadata after a sync", async () => {
			// Mock GCS availability but no data
			mockGCSService.fileExists.mockResolvedValue(true);
			mockGCSService.readJSON.mockResolvedValue(null);
			mockGCSService.listFiles.mockResolvedValue([]);

			await syncService.syncData();

			const metadata = await syncService.getLastSyncMetadata();
			expect(metadata).toBeTruthy();
			expect(metadata?.syncDirection).toBe("bidirectional");
			expect(metadata?.lastSync).toBeTruthy();
		});
	});
});
