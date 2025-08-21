import { LocalFileStorage } from "./local-storage";
import { getStorageConfig } from "./config";
import { StorageError } from "./errors";
import { logger } from "./logger";
import GCSService from "../google-cloud-storage";
import type { UserData } from "./storage-manager";

export interface SyncMetadata {
	lastSync: string;
	version: number;
	totalItems: number;
	conflictCount: number;
	syncDirection: "gcs-to-local" | "local-to-gcs" | "bidirectional";
}

export interface SyncConflict {
	itemId: string;
	itemType: "user" | "registration" | "counter";
	localVersion: any;
	gcsVersion: any;
	conflictReason: "timestamp" | "version" | "data-mismatch";
	resolvedVersion?: any;
	resolution?: "local-wins" | "gcs-wins" | "manual" | "merge";
}

export interface SyncResult {
	success: boolean;
	itemsSynced: number;
	conflicts: SyncConflict[];
	errors: string[];
	duration: number;
	metadata: SyncMetadata;
}

export class DataSyncService {
	private localStorage: LocalFileStorage;
	private config: ReturnType<typeof getStorageConfig>;
	private syncInProgress: boolean = false;

	constructor() {
		this.config = getStorageConfig();
		this.localStorage = new LocalFileStorage(this.config.local.dataPath);
	}

	/**
	 * Check if GCS is available for sync operations
	 */
	private async isGCSAvailable(): Promise<boolean> {
		try {
			await GCSService.fileExists("health-check.json");
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get the last sync metadata
	 */
	async getLastSyncMetadata(): Promise<SyncMetadata | null> {
		try {
			const metadata = await this.localStorage.readJSON(
				"sync/metadata.json"
			);
			return metadata;
		} catch {
			return null;
		}
	}

	/**
	 * Save sync metadata
	 */
	private async saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
		try {
			await this.localStorage.ensureDirectory("sync");
			await this.localStorage.saveJSON("sync/metadata.json", metadata);
		} catch (error) {
			logger.error(
				"Failed to save sync metadata",
				{ error: error instanceof Error ? error.message : "Unknown" },
				"sync-service",
				"save-metadata"
			);
		}
	}

	/**
	 * Perform bidirectional synchronization
	 */
	async syncData(): Promise<SyncResult> {
		if (this.syncInProgress) {
			throw new StorageError(
				"Sync already in progress",
				"manager",
				"sync"
			);
		}

		const startTime = Date.now();
		this.syncInProgress = true;

		try {
			logger.info(
				"Starting data synchronization",
				{},
				"sync-service",
				"sync"
			);

			const result: SyncResult = {
				success: false,
				itemsSynced: 0,
				conflicts: [],
				errors: [],
				duration: 0,
				metadata: {
					lastSync: new Date().toISOString(),
					version: 1,
					totalItems: 0,
					conflictCount: 0,
					syncDirection: "bidirectional",
				},
			};

			// Check if GCS is available
			if (!(await this.isGCSAvailable())) {
				result.errors.push("GCS is not available for synchronization");
				result.duration = Date.now() - startTime;
				return result;
			}

			// Sync users and registrations
			const userSyncResult = await this.syncUsers();
			result.itemsSynced += userSyncResult.itemsSynced;
			result.conflicts.push(...userSyncResult.conflicts);
			result.errors.push(...userSyncResult.errors);

			// Sync counters
			const counterSyncResult = await this.syncCounters();
			result.itemsSynced += counterSyncResult.itemsSynced;
			result.conflicts.push(...counterSyncResult.conflicts);
			result.errors.push(...counterSyncResult.errors);

			// Update metadata
			result.metadata.totalItems = result.itemsSynced;
			result.metadata.conflictCount = result.conflicts.length;
			result.success = result.errors.length === 0;
			result.duration = Date.now() - startTime;

			// Save sync metadata
			await this.saveSyncMetadata(result.metadata);

			logger.info(
				"Data synchronization completed",
				{
					success: result.success,
					itemsSynced: result.itemsSynced,
					conflicts: result.conflicts.length,
					errors: result.errors.length,
					duration: result.duration,
				},
				"sync-service",
				"sync"
			);

			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			logger.error(
				"Data synchronization failed",
				{ error: errorMessage },
				"sync-service",
				"sync"
			);

			return {
				success: false,
				itemsSynced: 0,
				conflicts: [],
				errors: [errorMessage],
				duration: Date.now() - startTime,
				metadata: {
					lastSync: new Date().toISOString(),
					version: 1,
					totalItems: 0,
					conflictCount: 0,
					syncDirection: "bidirectional",
				},
			};
		} finally {
			this.syncInProgress = false;
		}
	}

	/**
	 * Sync user data between GCS and local storage
	 */
	private async syncUsers(): Promise<Partial<SyncResult>> {
		const result: Partial<SyncResult> = {
			itemsSynced: 0,
			conflicts: [],
			errors: [],
		};

		try {
			// Get users from both sources
			const [gcsUsers, localUsers] = await Promise.all([
				this.getUsersFromGCS(),
				this.getUsersFromLocal(),
			]);

			// Create maps for easier comparison
			const gcsUserMap = new Map(gcsUsers.map((u) => [u.email, u]));
			const localUserMap = new Map(localUsers.map((u) => [u.email, u]));

			// Find all unique emails
			const allEmails = new Set([
				...gcsUserMap.keys(),
				...localUserMap.keys(),
			]);

			for (const email of allEmails) {
				const gcsUser = gcsUserMap.get(email);
				const localUser = localUserMap.get(email);

				if (gcsUser && localUser) {
					// Both exist - check for conflicts
					const conflict = this.detectUserConflict(
						gcsUser,
						localUser
					);
					if (conflict) {
						const resolved = this.resolveUserConflict(conflict);
						result.conflicts!.push(resolved);

						// Apply resolution
						if (
							resolved.resolution === "gcs-wins" &&
							resolved.resolvedVersion
						) {
							await this.saveUserToLocal(
								resolved.resolvedVersion
							);
							result.itemsSynced!++;
						} else if (
							resolved.resolution === "local-wins" &&
							resolved.resolvedVersion
						) {
							await this.saveUserToGCS(resolved.resolvedVersion);
							result.itemsSynced!++;
						}
					}
				} else if (gcsUser && !localUser) {
					// Only in GCS - copy to local
					await this.saveUserToLocal(gcsUser);
					result.itemsSynced!++;
				} else if (!gcsUser && localUser) {
					// Only in local - copy to GCS
					await this.saveUserToGCS(localUser);
					result.itemsSynced!++;
				}
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			result.errors!.push(`User sync failed: ${errorMessage}`);
		}

		return result;
	}

	/**
	 * Sync counter data between GCS and local storage
	 */
	private async syncCounters(): Promise<Partial<SyncResult>> {
		const result: Partial<SyncResult> = {
			itemsSynced: 0,
			conflicts: [],
			errors: [],
		};

		try {
			const counterPath = "counters/stage-manager.json";

			// Get counters from both sources
			const [gcsCounter, localCounter] = await Promise.all([
				GCSService.readJSON(counterPath).catch(() => null),
				this.localStorage.readJSON(counterPath).catch(() => null),
			]);

			if (gcsCounter && localCounter) {
				// Both exist - use the higher value
				const gcsValue = gcsCounter.currentId || 0;
				const localValue = localCounter.currentId || 0;

				if (gcsValue !== localValue) {
					const maxValue = Math.max(gcsValue, localValue);
					const syncedCounter = { currentId: maxValue };

					// Update both with the higher value
					await Promise.all([
						GCSService.saveJSON(syncedCounter, counterPath),
						this.localStorage.saveJSON(counterPath, syncedCounter),
					]);

					result.itemsSynced!++;
					logger.info(
						"Counter synchronized",
						{
							gcsValue,
							localValue,
							syncedValue: maxValue,
						},
						"sync-service",
						"sync-counters"
					);
				}
			} else if (gcsCounter && !localCounter) {
				// Only in GCS - copy to local
				await this.localStorage.saveJSON(counterPath, gcsCounter);
				result.itemsSynced!++;
			} else if (!gcsCounter && localCounter) {
				// Only in local - copy to GCS
				await GCSService.saveJSON(localCounter, counterPath);
				result.itemsSynced!++;
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			result.errors!.push(`Counter sync failed: ${errorMessage}`);
		}

		return result;
	}

	/**
	 * Detect conflicts between user data
	 */
	private detectUserConflict(
		gcsUser: UserData,
		localUser: UserData
	): SyncConflict | null {
		// Check if timestamps differ significantly (more than 1 minute)
		const gcsTime = new Date(gcsUser.updatedAt).getTime();
		const localTime = new Date(localUser.updatedAt).getTime();
		const timeDiff = Math.abs(gcsTime - localTime);

		if (timeDiff > 60000) {
			// 1 minute
			return {
				itemId: gcsUser.email,
				itemType: "user",
				localVersion: localUser,
				gcsVersion: gcsUser,
				conflictReason: "timestamp",
			};
		}

		// Check for data mismatches
		const fieldsToCheck = [
			"name",
			"accountStatus",
			"role",
			"subscriptionStatus",
		];
		for (const field of fieldsToCheck) {
			if ((gcsUser as any)[field] !== (localUser as any)[field]) {
				return {
					itemId: gcsUser.email,
					itemType: "user",
					localVersion: localUser,
					gcsVersion: gcsUser,
					conflictReason: "data-mismatch",
				};
			}
		}

		return null;
	}

	/**
	 * Resolve user conflicts using timestamp-based strategy
	 */
	private resolveUserConflict(conflict: SyncConflict): SyncConflict {
		const gcsTime = new Date(conflict.gcsVersion.updatedAt).getTime();
		const localTime = new Date(conflict.localVersion.updatedAt).getTime();

		if (gcsTime > localTime) {
			conflict.resolution = "gcs-wins";
			conflict.resolvedVersion = conflict.gcsVersion;
		} else {
			conflict.resolution = "local-wins";
			conflict.resolvedVersion = conflict.localVersion;
		}

		logger.info(
			"Conflict resolved",
			{
				itemId: conflict.itemId,
				resolution: conflict.resolution,
				gcsTime: new Date(gcsTime).toISOString(),
				localTime: new Date(localTime).toISOString(),
			},
			"sync-service",
			"resolve-conflict"
		);

		return conflict;
	}

	/**
	 * Helper methods for data access
	 */
	private async getUsersFromGCS(): Promise<UserData[]> {
		try {
			const users = (await GCSService.readJSON("users/index.json")) || [];
			const registrations = await this.getRegistrationsFromGCS();
			return [...users, ...registrations];
		} catch (error) {
			logger.error(
				"Failed to get users from GCS",
				{ error: error instanceof Error ? error.message : "Unknown" },
				"sync-service",
				"get-gcs-users"
			);
			return [];
		}
	}

	private async getUsersFromLocal(): Promise<UserData[]> {
		try {
			const users =
				(await this.localStorage.readJSON("users/index.json")) || [];
			const registrations = await this.getRegistrationsFromLocal();
			return [...users, ...registrations];
		} catch (error) {
			logger.error(
				"Failed to get users from local storage",
				{ error: error instanceof Error ? error.message : "Unknown" },
				"sync-service",
				"get-local-users"
			);
			return [];
		}
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
			logger.error(
				"Failed to get registrations from GCS",
				{ error: error instanceof Error ? error.message : "Unknown" },
				"sync-service",
				"get-gcs-registrations"
			);
			return [];
		}
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
			logger.error(
				"Failed to get registrations from local storage",
				{ error: error instanceof Error ? error.message : "Unknown" },
				"sync-service",
				"get-local-registrations"
			);
			return [];
		}
	}

	private async saveUserToGCS(user: UserData): Promise<void> {
		if (user.accountStatus === "pending") {
			const registrationPath = `registrations/stage-managers/${user.name}-${user.id}.json`;
			await GCSService.saveJSON(user, registrationPath);
		} else {
			const users = (await GCSService.readJSON("users/index.json")) || [];
			const existingIndex = users.findIndex(
				(u: UserData) => u.id === user.id
			);

			if (existingIndex >= 0) {
				users[existingIndex] = user;
			} else {
				users.push(user);
			}

			await GCSService.saveJSON(users, "users/index.json");
		}
	}

	private async saveUserToLocal(user: UserData): Promise<void> {
		if (user.accountStatus === "pending") {
			const registrationPath = `registrations/stage-managers/${user.name}-${user.id}.json`;
			await this.localStorage.saveJSON(registrationPath, user);
		} else {
			const users =
				(await this.localStorage.readJSON("users/index.json")) || [];
			const existingIndex = users.findIndex(
				(u: UserData) => u.id === user.id
			);

			if (existingIndex >= 0) {
				users[existingIndex] = user;
			} else {
				users.push(user);
			}

			await this.localStorage.saveJSON("users/index.json", users);
		}
	}

	/**
	 * Force sync from GCS to local (one-way)
	 */
	async syncFromGCSToLocal(): Promise<SyncResult> {
		const startTime = Date.now();

		try {
			logger.info(
				"Starting GCS to Local sync",
				{},
				"sync-service",
				"gcs-to-local"
			);

			const result: SyncResult = {
				success: false,
				itemsSynced: 0,
				conflicts: [],
				errors: [],
				duration: 0,
				metadata: {
					lastSync: new Date().toISOString(),
					version: 1,
					totalItems: 0,
					conflictCount: 0,
					syncDirection: "gcs-to-local",
				},
			};

			if (!(await this.isGCSAvailable())) {
				result.errors.push("GCS is not available");
				result.duration = Date.now() - startTime;
				return result;
			}

			// Get all users from GCS and overwrite local
			const gcsUsers = await this.getUsersFromGCS();

			for (const user of gcsUsers) {
				await this.saveUserToLocal(user);
				result.itemsSynced++;
			}

			// Sync counters
			const gcsCounter = await GCSService.readJSON(
				"counters/stage-manager.json"
			);
			if (gcsCounter) {
				await this.localStorage.saveJSON(
					"counters/stage-manager.json",
					gcsCounter
				);
				result.itemsSynced++;
			}

			result.success = true;
			result.metadata.totalItems = result.itemsSynced;
			result.duration = Date.now() - startTime;

			await this.saveSyncMetadata(result.metadata);

			logger.info(
				"GCS to Local sync completed",
				{
					itemsSynced: result.itemsSynced,
					duration: result.duration,
				},
				"sync-service",
				"gcs-to-local"
			);

			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			logger.error(
				"GCS to Local sync failed",
				{ error: errorMessage },
				"sync-service",
				"gcs-to-local"
			);

			return {
				success: false,
				itemsSynced: 0,
				conflicts: [],
				errors: [errorMessage],
				duration: Date.now() - startTime,
				metadata: {
					lastSync: new Date().toISOString(),
					version: 1,
					totalItems: 0,
					conflictCount: 0,
					syncDirection: "gcs-to-local",
				},
			};
		}
	}

	/**
	 * Force sync from local to GCS (one-way)
	 */
	async syncFromLocalToGCS(): Promise<SyncResult> {
		const startTime = Date.now();

		try {
			logger.info(
				"Starting Local to GCS sync",
				{},
				"sync-service",
				"local-to-gcs"
			);

			const result: SyncResult = {
				success: false,
				itemsSynced: 0,
				conflicts: [],
				errors: [],
				duration: 0,
				metadata: {
					lastSync: new Date().toISOString(),
					version: 1,
					totalItems: 0,
					conflictCount: 0,
					syncDirection: "local-to-gcs",
				},
			};

			if (!(await this.isGCSAvailable())) {
				result.errors.push("GCS is not available");
				result.duration = Date.now() - startTime;
				return result;
			}

			// Get all users from local and overwrite GCS
			const localUsers = await this.getUsersFromLocal();

			for (const user of localUsers) {
				await this.saveUserToGCS(user);
				result.itemsSynced++;
			}

			// Sync counters
			const localCounter = await this.localStorage.readJSON(
				"counters/stage-manager.json"
			);
			if (localCounter) {
				await GCSService.saveJSON(
					localCounter,
					"counters/stage-manager.json"
				);
				result.itemsSynced++;
			}

			result.success = true;
			result.metadata.totalItems = result.itemsSynced;
			result.duration = Date.now() - startTime;

			await this.saveSyncMetadata(result.metadata);

			logger.info(
				"Local to GCS sync completed",
				{
					itemsSynced: result.itemsSynced,
					duration: result.duration,
				},
				"sync-service",
				"local-to-gcs"
			);

			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			logger.error(
				"Local to GCS sync failed",
				{ error: errorMessage },
				"sync-service",
				"local-to-gcs"
			);

			return {
				success: false,
				itemsSynced: 0,
				conflicts: [],
				errors: [errorMessage],
				duration: Date.now() - startTime,
				metadata: {
					lastSync: new Date().toISOString(),
					version: 1,
					totalItems: 0,
					conflictCount: 0,
					syncDirection: "local-to-gcs",
				},
			};
		}
	}
}

// Export singleton instance
export const dataSyncService = new DataSyncService();
