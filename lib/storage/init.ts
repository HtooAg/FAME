import { LocalFileStorage } from "./local-storage";
import { getStorageConfig } from "./config";

/**
 * Initialize local storage directories and ensure proper setup
 */
export async function initializeLocalStorage(): Promise<LocalFileStorage> {
	const config = getStorageConfig();
	const storage = new LocalFileStorage(config.local.dataPath);

	try {
		// Ensure base directories exist
		await storage.ensureDirectory("users");
		await storage.ensureDirectory("registrations/stage-managers");
		await storage.ensureDirectory("registrations/artists");
		await storage.ensureDirectory("events");
		await storage.ensureDirectory("counters");
		await storage.ensureDirectory("notifications/admin");
		await storage.ensureDirectory("backups");

		console.log("Local storage initialized successfully");
		console.log(`Data path: ${storage.getFullPath("")}`);

		return storage;
	} catch (error) {
		console.error("Failed to initialize local storage:", error);
		throw error;
	}
}

/**
 * Get storage health information
 */
export async function getStorageHealth(): Promise<{
	local: { available: boolean; path: string; error?: string };
	gcs: { available: boolean; error?: string };
}> {
	const config = getStorageConfig();
	const storage = new LocalFileStorage(config.local.dataPath);

	// Check local storage
	let localHealth: { available: boolean; path: string; error?: string };
	try {
		const stats = await storage.getStats();
		localHealth = {
			available: stats.exists && stats.writable,
			path: stats.basePath,
		};
	} catch (error) {
		localHealth = {
			available: false,
			path: config.local.dataPath,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}

	// Check GCS availability (simplified check)
	let gcsHealth: { available: boolean; error?: string };
	try {
		// Import GCS service dynamically to avoid initialization issues
		const { default: GCSService } = await import("../google-cloud-storage");
		const isAvailable = await GCSService.fileExists("health-check.json");
		gcsHealth = { available: true }; // If no error thrown, consider it available
	} catch (error) {
		gcsHealth = {
			available: false,
			error: error instanceof Error ? error.message : "GCS unavailable",
		};
	}

	return { local: localHealth, gcs: gcsHealth };
}
