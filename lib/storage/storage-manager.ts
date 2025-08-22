import { LocalFileStorage, LocalStorageError } from "./local-storage";
import { getStorageConfig } from "./config";
import { StorageError, GCSError } from "./errors";
import { logger, logStorageOperation, logFallback } from "./logger";
import { dataSyncService } from "./sync-service";
import GCSService from "../google-cloud-storage";

export interface UserData {
	id: string;
	name: string;
	email: string;
	password: string; // hashed
	role: "super_admin" | "stage_manager" | "artist";
	accountStatus: "pending" | "approved" | "suspended" | "rejected";
	subscriptionStatus: string;
	subscriptionEndDate: string;
	eventId?: string;
	eventName?: string;
	createdAt: string;
	updatedAt: string;
	metadata: {
		ipAddress: string;
		userAgent: string;
		lastLogin?: string;
		storageSource: "gcs" | "local" | "synced";
	};
}

// StorageError is now imported from ./errors

export class StorageManager {
	private localStorage: LocalFileStorage;
	private config: ReturnType<typeof getStorageConfig>;
	private gcsAvailable: boolean = false;
	private lastGCSCheck: number = 0;
	private readonly GCS_CHECK_INTERVAL = 30000; // 30 seconds

	constructor() {
		this.config = getStorageConfig();
		this.localStorage = new LocalFileStorage(this.config.local.dataPath);
	}

	/**
	 * Initialize the storage manager
	 */
	async initialize(): Promise<void> {
		try {
			// Ensure local storage directories exist
			await this.localStorage.ensureDirectory("users");
			await this.localStorage.ensureDirectory(
				"registrations/stage-managers"
			);
			await this.localStorage.ensureDirectory("registrations/artists");
			await this.localStorage.ensureDirectory("counters");
			await this.localStorage.ensureDirectory("notifications/admin");

			// Check GCS availability
			await this.checkGCSAvailability();

			console.log("StorageManager initialized successfully");
			console.log(
				`Local storage: ${
					this.config.local.enabled ? "enabled" : "disabled"
				}`
			);
			console.log(
				`GCS storage: ${
					this.gcsAvailable ? "available" : "unavailable"
				}`
			);
		} catch (error) {
			console.error("Failed to initialize StorageManager:", error);
			throw new StorageError(
				`Storage initialization failed: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				"manager"
			);
		}
	}

	/**
	 * Check if GCS is available with caching
	 */
	async isGCSAvailable(): Promise<boolean> {
		const now = Date.now();

		// Use cached result if recent
		if (now - this.lastGCSCheck < this.GCS_CHECK_INTERVAL) {
			return this.gcsAvailable;
		}

		await this.checkGCSAvailability();
		return this.gcsAvailable;
	}

	/**
	 * Perform actual GCS availability check
	 */
	private async checkGCSAvailability(): Promise<void> {
		if (!this.config.gcs.enabled) {
			this.gcsAvailable = false;
			this.lastGCSCheck = Date.now();
			return;
		}

		try {
			// Try a simple operation with timeout
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() => reject(new Error("GCS timeout")),
					this.config.gcs.timeout
				);
			});

			const checkPromise = GCSService.fileExists("health-check.json");

			await Promise.race([checkPromise, timeoutPromise]);

			const wasUnavailable = !this.gcsAvailable;
			this.gcsAvailable = true;

			if (wasUnavailable) {
				logger.info(
					"GCS is now available",
					{ timeout: this.config.gcs.timeout },
					"storage-manager",
					"gcs-check"
				);
			} else {
				logger.debug(
					"GCS availability confirmed",
					{ timeout: this.config.gcs.timeout },
					"storage-manager",
					"gcs-check"
				);
			}
		} catch (error) {
			const wasAvailable = this.gcsAvailable;
			this.gcsAvailable = false;

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			if (wasAvailable) {
				logger.warn(
					`GCS became unavailable: ${errorMessage}`,
					{ timeout: this.config.gcs.timeout },
					"storage-manager",
					"gcs-check"
				);
				logFallback("GCS", "Local Storage", errorMessage);
			} else {
				logger.debug(
					`GCS still unavailable: ${errorMessage}`,
					{ timeout: this.config.gcs.timeout },
					"storage-manager",
					"gcs-check"
				);
			}
		}

		this.lastGCSCheck = Date.now();
	}

	/**
	 * Save user data - GCS ONLY
	 */
	async saveUser(userData: UserData): Promise<void> {
		const userWithSource = {
			...userData,
			updatedAt: new Date().toISOString(),
			metadata: {
				...userData.metadata,
				storageSource: "gcs" as "gcs" | "local" | "synced",
			},
		};

		// Check if GCS is available - REQUIRED
		if (!(await this.isGCSAvailable())) {
			throw new StorageError(
				"Google Cloud Storage is not available. Cannot save user data.",
				"manager"
			);
		}

		try {
			// For registrations, use the registration path
			if (userData.accountStatus === "pending") {
				const registrationPath = `registrations/stage-managers/${userData.name}-${userData.id}.json`;
				await GCSService.saveJSON(userWithSource, registrationPath);
			} else {
				// For approved users, save to users index
				const users = await this.getUsers();
				const existingIndex = users.findIndex(
					(u) => u.id === userData.id
				);

				if (existingIndex >= 0) {
					users[existingIndex] = userWithSource;
				} else {
					users.push(userWithSource);
				}

				await GCSService.saveJSON(users, "users/index.json");
			}

			console.log(`User ${userData.email} saved to GCS`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "GCS save failed";
			console.error(`Failed to save user to GCS: ${errorMessage}`);
			throw new StorageError(
				`Failed to save user data to Google Cloud Storage: ${errorMessage}`,
				"manager"
			);
		}
	}

	/**
	 * Get user by email - GCS ONLY
	 */
	async getUser(email: string): Promise<UserData | null> {
		// Check if GCS is available - REQUIRED
		if (!(await this.isGCSAvailable())) {
			throw new StorageError(
				"Google Cloud Storage is not available. Cannot retrieve user data.",
				"manager"
			);
		}

		try {
			const user = await this.getUserFromGCS(email);
			if (user) {
				console.log(`User ${email} found in GCS`);
				return user;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to get user from GCS: ${errorMessage}`);
			throw new StorageError(
				`Failed to retrieve user from Google Cloud Storage: ${errorMessage}`,
				"manager"
			);
		}

		console.log(`User ${email} not found in GCS`);
		return null;
	}

	/**
	 * Get user by ID - GCS ONLY
	 */
	async getUserById(id: string): Promise<UserData | null> {
		// Check if GCS is available - REQUIRED
		if (!(await this.isGCSAvailable())) {
			throw new StorageError(
				"Google Cloud Storage is not available. Cannot retrieve user data.",
				"manager"
			);
		}

		try {
			const user = await this.getUserByIdFromGCS(id);
			if (user) {
				console.log(`User ID ${id} found in GCS`);
				return user;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to get user by ID from GCS: ${errorMessage}`);
			throw new StorageError(
				`Failed to retrieve user from Google Cloud Storage: ${errorMessage}`,
				"manager"
			);
		}

		console.log(`User ID ${id} not found in GCS`);
		return null;
	}

	/**
	 * Get all users - GCS ONLY
	 */
	async getUsers(): Promise<UserData[]> {
		// Check if GCS is available - REQUIRED
		if (!(await this.isGCSAvailable())) {
			throw new StorageError(
				"Google Cloud Storage is not available. Cannot retrieve users.",
				"manager"
			);
		}

		try {
			const users = await this.getUsersFromGCS();
			console.log(`Found ${users.length} users in GCS`);
			return users;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to get users from GCS: ${errorMessage}`);
			throw new StorageError(
				`Failed to retrieve users from Google Cloud Storage: ${errorMessage}`,
				"manager"
			);
		}
	}

	/**
	 * Get next ID for new users - GCS ONLY
	 */
	async getNextId(): Promise<number> {
		// Check if GCS is available - REQUIRED
		if (!(await this.isGCSAvailable())) {
			throw new StorageError(
				"Google Cloud Storage is not available. Cannot generate user ID.",
				"manager"
			);
		}

		const counterPath = "counters/stage-manager.json";
		let counter = { currentId: 0 };

		// Try to get counter from GCS
		try {
			const gcsCounter = await GCSService.readJSON(counterPath);
			if (gcsCounter) counter = gcsCounter;
		} catch (error) {
			console.error(
				`Failed to read counter from GCS: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}

		const nextId = counter.currentId + 1;
		const newCounter = { currentId: nextId };

		// Save updated counter to GCS
		try {
			await GCSService.saveJSON(newCounter, counterPath);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to save counter to GCS: ${errorMessage}`);
			throw new StorageError(
				`Failed to save counter to Google Cloud Storage: ${errorMessage}`,
				"manager"
			);
		}

		return nextId;
	}

	// Private helper methods for GCS operations
	private async getUserFromGCS(email: string): Promise<UserData | null> {
		// Check users index first
		const users = (await GCSService.readJSON("users/index.json")) || [];
		let user = users.find((u: any) => u.email === email);

		if (!user) {
			// Check registrations
			const registrations = await this.getRegistrationsFromGCS();
			user = registrations.find((r: any) => r.email === email);
		}

		return user || null;
	}

	private async getUserByIdFromGCS(id: string): Promise<UserData | null> {
		// Check users index first
		const users = (await GCSService.readJSON("users/index.json")) || [];
		let user = users.find((u: any) => u.id === id);

		if (!user) {
			// Check registrations
			const registrations = await this.getRegistrationsFromGCS();
			user = registrations.find((r: any) => r.id === id);
		}

		return user || null;
	}

	private async getUsersFromGCS(): Promise<UserData[]> {
		const users = (await GCSService.readJSON("users/index.json")) || [];
		const registrations = await this.getRegistrationsFromGCS();
		return [...users, ...registrations];
	}

	private async getRegistrationsFromGCS(): Promise<UserData[]> {
		try {
			const files = await GCSService.listFiles(
				"registrations/stage-managers/"
			);
			const registrations: UserData[] = [];

			for (const file of files) {
				if (file.endsWith(".json")) {
					const data = await GCSService.readJSON(file);
					if (data) registrations.push(data);
				}
			}

			return registrations;
		} catch (error) {
			console.error("Failed to get registrations from GCS:", error);
			return [];
		}
	}

	// Private helper methods for local operations
	private async getUserFromLocal(email: string): Promise<UserData | null> {
		// Check users index first
		const users = await this.getUsersFromLocal();
		return users.find((u) => u.email === email) || null;
	}

	private async getUserByIdFromLocal(id: string): Promise<UserData | null> {
		// Check users index first
		const users = await this.getUsersFromLocal();
		return users.find((u) => u.id === id) || null;
	}

	private async getUsersFromLocal(): Promise<UserData[]> {
		const users =
			(await this.localStorage.readJSON("users/index.json")) || [];
		const registrations = await this.getRegistrationsFromLocal();
		return [...users, ...registrations];
	}

	private async getRegistrationsFromLocal(): Promise<UserData[]> {
		try {
			const files = await this.localStorage.listFiles(
				"registrations/stage-managers"
			);
			const registrations: UserData[] = [];

			for (const file of files) {
				if (file.endsWith(".json")) {
					const data = await this.localStorage.readJSON(file);
					if (data) registrations.push(data);
				}
			}

			return registrations;
		} catch (error) {
			console.error(
				"Failed to get registrations from local storage:",
				error
			);
			return [];
		}
	}

	/**
	 * Get storage health status
	 */
	async getHealthStatus(): Promise<{
		gcs: { available: boolean; lastCheck: Date };
		local: { available: boolean; path: string };
		fallbackActive: boolean;
		lastSync?: any;
	}> {
		const gcsAvailable = await this.isGCSAvailable();
		const localStats = await this.localStorage.getStats();
		const lastSync = await dataSyncService.getLastSyncMetadata();

		return {
			gcs: {
				available: gcsAvailable,
				lastCheck: new Date(this.lastGCSCheck),
			},
			local: {
				available: localStats.exists && localStats.writable,
				path: localStats.basePath,
			},
			fallbackActive: !gcsAvailable && this.config.local.enabled,
			lastSync,
		};
	}

	/**
	 * Trigger data synchronization
	 */
	async syncData(): Promise<any> {
		try {
			logger.info("Manual sync triggered", {}, "storage-manager", "sync");
			const result = await dataSyncService.syncData();

			logger.info(
				"Manual sync completed",
				{
					success: result.success,
					itemsSynced: result.itemsSynced,
					conflicts: result.conflicts.length,
					errors: result.errors.length,
				},
				"storage-manager",
				"sync"
			);

			return result;
		} catch (error) {
			logger.error(
				"Manual sync failed",
				{
					error:
						error instanceof Error
							? error.message
							: "Unknown error",
				},
				"storage-manager",
				"sync"
			);
			throw error;
		}
	}
}

// Export singleton instance
export const storageManager = new StorageManager();
