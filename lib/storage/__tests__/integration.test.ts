/**
 * Integration tests for the authentication system with storage fallback
 */

import { storageManager, UserData } from "../storage-manager";
import { LocalFileStorage } from "../local-storage";
import { tmpdir } from "os";
import path from "path";
import { promises as fs } from "fs";
import bcrypt from "bcryptjs";

// Mock GCS Service
jest.mock("../../google-cloud-storage", () => ({
	default: {
		fileExists: jest.fn(),
		saveJSON: jest.fn(),
		readJSON: jest.fn(),
		listFiles: jest.fn(),
	},
}));

describe("Authentication System Integration", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create temporary directory for testing
		testDir = path.join(tmpdir(), `test-auth-integration-${Date.now()}`);

		// Mock environment variables
		process.env.LOCAL_DATA_PATH = testDir;
		process.env.GCS_ENABLED = "false"; // Disable GCS for integration tests
		process.env.LOCAL_STORAGE_ENABLED = "true";

		// Reset mocks
		jest.clearAllMocks();
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("User Registration and Login Flow", () => {
		it("should complete full registration and login cycle", async () => {
			// Initialize storage manager
			const manager =
				new (require("../storage-manager").StorageManager)();
			await manager.initialize();

			// Test user data
			const userData: UserData = {
				id: "1",
				name: "Test User",
				email: "test@example.com",
				password: await bcrypt.hash("testpassword", 10),
				role: "stage_manager",
				accountStatus: "pending",
				subscriptionStatus: "trial",
				subscriptionEndDate: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				metadata: {
					ipAddress: "127.0.0.1",
					userAgent: "test",
					storageSource: "local",
				},
			};

			// Step 1: Register user
			await manager.saveUser(userData);

			// Step 2: Verify user can be retrieved
			const retrievedUser = await manager.getUser(userData.email);
			expect(retrievedUser).toBeTruthy();
			expect(retrievedUser?.email).toBe(userData.email);
			expect(retrievedUser?.accountStatus).toBe("pending");

			// Step 3: Verify password can be validated
			const isValidPassword = await bcrypt.compare(
				"testpassword",
				retrievedUser!.password
			);
			expect(isValidPassword).toBe(true);

			// Step 4: Test invalid password
			const isInvalidPassword = await bcrypt.compare(
				"wrongpassword",
				retrievedUser!.password
			);
			expect(isInvalidPassword).toBe(false);

			// Step 5: Update user status to approved
			const approvedUser = {
				...retrievedUser!,
				accountStatus: "approved" as const,
				updatedAt: new Date().toISOString(),
			};
			await manager.saveUser(approvedUser);

			// Step 6: Verify updated status
			const updatedUser = await manager.getUser(userData.email);
			expect(updatedUser?.accountStatus).toBe("approved");
		});

		it("should handle duplicate email registration", async () => {
			const manager =
				new (require("../storage-manager").StorageManager)();
			await manager.initialize();

			const userData: UserData = {
				id: "1",
				name: "Test User",
				email: "duplicate@example.com",
				password: await bcrypt.hash("password", 10),
				role: "stage_manager",
				accountStatus: "pending",
				subscriptionStatus: "trial",
				subscriptionEndDate: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				metadata: {
					ipAddress: "127.0.0.1",
					userAgent: "test",
					storageSource: "local",
				},
			};

			// Register first user
			await manager.saveUser(userData);

			// Try to register second user with same email
			const duplicateUser = {
				...userData,
				id: "2",
				name: "Duplicate User",
			};
			await manager.saveUser(duplicateUser);

			// Should be able to find the user (last one wins in this implementation)
			const foundUser = await manager.getUser(userData.email);
			expect(foundUser).toBeTruthy();
		});

		it("should generate sequential IDs", async () => {
			const manager =
				new (require("../storage-manager").StorageManager)();
			await manager.initialize();

			const id1 = await manager.getNextId();
			const id2 = await manager.getNextId();
			const id3 = await manager.getNextId();

			expect(id2).toBe(id1 + 1);
			expect(id3).toBe(id2 + 1);
		});

		it("should report correct health status", async () => {
			const manager =
				new (require("../storage-manager").StorageManager)();
			await manager.initialize();

			const health = await manager.getHealthStatus();

			expect(health.local.available).toBe(true);
			expect(health.gcs.available).toBe(false); // Disabled in test
			expect(health.fallbackActive).toBe(true); // Should be using local fallback
			expect(health.local.path).toBe(testDir);
		});
	});

	describe("Storage Resilience", () => {
		it("should work when only local storage is available", async () => {
			const manager =
				new (require("../storage-manager").StorageManager)();
			await manager.initialize();

			const userData: UserData = {
				id: "1",
				name: "Local User",
				email: "local@example.com",
				password: await bcrypt.hash("password", 10),
				role: "stage_manager",
				accountStatus: "pending",
				subscriptionStatus: "trial",
				subscriptionEndDate: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				metadata: {
					ipAddress: "127.0.0.1",
					userAgent: "test",
					storageSource: "local",
				},
			};

			// Should work with only local storage
			await expect(manager.saveUser(userData)).resolves.not.toThrow();

			const retrievedUser = await manager.getUser(userData.email);
			expect(retrievedUser).toBeTruthy();
			expect(retrievedUser?.metadata.storageSource).toBe("local");
		});

		it("should handle storage initialization errors gracefully", async () => {
			// Use invalid path to cause initialization error
			process.env.LOCAL_DATA_PATH =
				"/invalid/path/that/cannot/be/created";

			const manager =
				new (require("../storage-manager").StorageManager)();

			// Should throw error during initialization
			await expect(manager.initialize()).rejects.toThrow();
		});
	});
});
