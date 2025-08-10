import { Storage, GetFilesOptions } from "@google-cloud/storage";

const BUCKET_NAME = process.env.GCS_BUCKET || "fame-data";
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "fame-468308";

// Prefer explicit JSON credentials if provided.
// Option A: GOOGLE_CLOUD_CREDENTIALS contains the service account JSON string.
// Option B: GOOGLE_CLOUD_KEYFILE_PATH points to a key file path.
// Fallback: Application Default Credentials (ADC).
let storage: Storage;
const creds = process.env.GOOGLE_CLOUD_CREDENTIALS;
if (creds) {
	const json = JSON.parse(creds);
	storage = new Storage({
		projectId: PROJECT_ID,
		credentials: {
			client_email: json.client_email,
			private_key: json.private_key,
		},
	});
} else {
	storage = new Storage({
		projectId: PROJECT_ID,
		keyFilename: process.env.GOOGLE_CLOUD_KEYFILE_PATH || undefined,
	});
}

const bucket = storage.bucket(BUCKET_NAME);

export async function ensureBucketExists() {
	try {
		const [exists] = await bucket.exists();
		if (!exists) {
			throw new Error(
				`Bucket ${BUCKET_NAME} does not exist or credentials lack access.`
			);
		}

		// Verify write permissions by attempting to write a test file
		const testFile = bucket.file("_test_write_permission");
		await testFile.save("test");
		await testFile.delete();
	} catch (error) {
		console.error("GCS bucket access error:", error);
		const message =
			typeof error === "object" && error !== null && "message" in error
				? (error as any).message
				: String(error);
		throw new Error(`Failed to verify GCS bucket access: ${message}`);
	}
}

export async function readJsonFile<T = any>(
	filePath: string,
	defaultValue: T
): Promise<T> {
	await ensureBucketExists();
	const file = bucket.file(filePath);
	const [exists] = await file.exists();
	if (!exists) {
		return defaultValue;
	}
	const [data] = await file.download();
	try {
		return JSON.parse(data.toString());
	} catch {
		return defaultValue;
	}
}

export async function writeJsonFile(filePath: string, data: unknown) {
	await ensureBucketExists();
	const file = bucket.file(filePath);
	await file.save(JSON.stringify(data, null, 2), {
		metadata: { contentType: "application/json" },
	});
}

export async function listFiles(prefix: string, options?: GetFilesOptions) {
	await ensureBucketExists();
	const [files] = await bucket.getFiles({ prefix, ...(options || {}) });
	return files;
}

export async function readJsonDirectory<T = any>(prefix: string): Promise<T[]> {
	const files = await listFiles(prefix);
	const results: T[] = [];
	for (const f of files) {
		if (!f.name.endsWith(".json")) continue;
		const [data] = await f.download();
		try {
			results.push(JSON.parse(data.toString()));
		} catch {
			// skip invalid
		}
	}
	return results;
}

export async function upsertArrayFile(
	filePath: string,
	item: any,
	idKey = "id"
) {
	const arr = await readJsonFile<any[]>(filePath, []);
	const idx = arr.findIndex((x) => x[idKey] === item[idKey]);
	if (idx === -1) {
		arr.push(item);
	} else {
		arr[idx] = item;
	}
	await writeJsonFile(filePath, arr);
}

export const paths = {
	// Users
	usersIndex: "users/users.json",
	userByRole: (role: string, id: string) => `users/${role}/${id}.json`,

	// Counters
	stageManagerCounter: "counters/stage_manager.json",

	// Registrations
	registrationStageManagerDir: "registrations/stage_manager/",
	registrationStageManagerFile: (name: string, id: number) =>
		`registrations/stage_manager/${name
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "-")}-${id}.json`,

	// Notifications to admin
	adminNotificationDir: "notifications/admin/",
	adminNotificationFile: (id: string) => `notifications/admin/${id}.json`,

	// Events
	eventsIndex: "events/index.json",
	eventFile: (id: string) => `events/${id}/event.json`,
	eventsByStageManager: (stageManagerId: string) =>
		`events/by_stage_manager/${stageManagerId}.json`,

	// Show dates
	showDatesDir: (eventId: string) => `events/${eventId}/show_dates/`,
	showDateFile: (eventId: string, showDateId: string) =>
		`events/${eventId}/show_dates/${showDateId}.json`,

	// Artists per event
	artistsDir: (eventId: string) => `events/${eventId}/artists/`,
	artistFile: (eventId: string, artistId: string) =>
		`events/${eventId}/artists/${artistId}.json`,

	// Performance order
	performanceOrder: (eventId: string) =>
		`events/${eventId}/performance_order.json`,

	// Emergency codes
	emergencyActive: (eventId: string) =>
		`events/${eventId}/emergency/active.json`,
	emergencyLogDir: (eventId: string) => `events/${eventId}/emergency/log/`,
	emergencyLogFile: (eventId: string, id: string) =>
		`events/${eventId}/emergency/log/${id}.json`,
};
