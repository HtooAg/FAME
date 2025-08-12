// Google Cloud Storage utility functions
// Note: This is a simplified implementation for demonstration
// In production, you would use the actual Google Cloud Storage SDK

import GCSService from "./google-cloud-storage";

export interface FileUploadResult {
	url: string;
	filename: string;
	size: number;
	contentType: string;
}

// File paths configuration
export const paths = {
	usersIndex: "users/index.json",
	registrationStageManagerDir: "registrations/stage-managers",
	registrationArtistDir: "registrations/artists",
	eventsIndex: "events/index.json",
	stageManagersIndex: "stage-managers/index.json",
	superAdminsIndex: "super-admins/index.json",
	globalArtistsIndex: "artists/index.json",
	stageManagerCounter: "counters/stage-manager.json",
	userByRole: (role: string, id: string) => `users/${role}/${id}.json`,
	registrationStageManagerFile: (name: string, id: number) =>
		`registrations/stage-managers/${name}-${id}.json`,
	registrationArtistFile: (name: string, id: string) =>
		`registrations/artists/${name}-${id}.json`,
	eventFile: (eventId: string) => `events/${eventId}.json`,
	artistFile: (artistId: string) => `artists/${artistId}.json`,
	artistsIndex: (eventId: string) => `events/${eventId}/artists/index.json`,
	stageManagerFile: (stageManagerId: string) =>
		`stage-managers/${stageManagerId}.json`,
};

export class GCSManager {
	private bucketName: string;

	constructor(bucketName: string = "artist-event-storage") {
		this.bucketName = bucketName;
	}

	/**
	 * Upload a file to Google Cloud Storage
	 */
	async uploadFile(
		file: File,
		folder: string,
		artistId: string
	): Promise<FileUploadResult> {
		try {
			// Generate unique filename
			const timestamp = Date.now();
			const randomId = Math.random().toString(36).substring(2, 9);
			const extension = file.name.split(".").pop();
			const filename = `${timestamp}_${randomId}.${extension}`;

			// Convert File to Buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Upload to Google Cloud Storage
			const result = await GCSService.uploadFile(
				buffer,
				filename,
				`${folder}/${artistId}`,
				file.type
			);

			return {
				url: result.url,
				filename: result.filename,
				size: file.size,
				contentType: file.type,
			};
		} catch (error) {
			console.error(
				"Error uploading file to Google Cloud Storage:",
				error
			);
			throw new Error("Failed to upload file to Google Cloud Storage");
		}
	}

	/**
	 * Upload multiple files
	 */
	async uploadFiles(
		files: File[],
		folder: string,
		artistId: string
	): Promise<FileUploadResult[]> {
		const uploadPromises = files.map((file) =>
			this.uploadFile(file, folder, artistId)
		);
		return Promise.all(uploadPromises);
	}

	/**
	 * Delete a file from Google Cloud Storage
	 */
	async deleteFile(filename: string): Promise<void> {
		try {
			await GCSService.deleteFile(filename);
		} catch (error) {
			console.error(
				"Error deleting file from Google Cloud Storage:",
				error
			);
			throw new Error("Failed to delete file from Google Cloud Storage");
		}
	}

	/**
	 * Get a signed URL for file access
	 */
	async getSignedUrl(
		filename: string,
		expiresIn: number = 3600
	): Promise<string> {
		try {
			return await GCSService.getSignedUrl(filename, expiresIn);
		} catch (error) {
			console.error(
				"Error generating signed URL from Google Cloud Storage:",
				error
			);
			throw new Error(
				"Failed to generate signed URL from Google Cloud Storage"
			);
		}
	}
}

// Export a default instance
export const gcsManager = new GCSManager();

/**
 * Read JSON file from Google Cloud Storage
 */
// Overloads ensure non-nullable return when a non-null default is provided
export async function readJsonFile<T>(path: string): Promise<T | null>;
export async function readJsonFile<T>(path: string, defaultValue: T): Promise<T>;
export async function readJsonFile<T>(
	path: string,
	defaultValue: T | null = null
): Promise<T | null> {
	try {
		const data = await GCSService.readJSON(path);
		return data !== null ? (data as T) : (defaultValue as T | null);
	} catch (error) {
		console.error(
			"Error reading JSON file from Google Cloud Storage:",
			error
		);
		return defaultValue as T | null;
	}
}

/**
 * Write JSON file to Google Cloud Storage
 */
export async function writeJsonFile(path: string, data: any): Promise<void> {
	try {
		await GCSService.saveJSON(data, path);
	} catch (error) {
		console.error(
			"Error writing JSON file to Google Cloud Storage:",
			error
		);
		throw new Error("Failed to write JSON file to Google Cloud Storage");
	}
}

/**
 * Read all JSON files from a directory in Google Cloud Storage
 */
export async function readJsonDirectory<T>(dirPath: string): Promise<T[]> {
	try {
		const files = await GCSService.listFiles(dirPath);
		const jsonFiles = files.filter((file) => file.endsWith(".json"));

		const results: T[] = [];
		for (const file of jsonFiles) {
			const data = await GCSService.readJSON(file);
			if (data !== null) {
				results.push(data as T);
			}
		}

		return results;
	} catch (error) {
		console.error(
			"Error reading JSON directory from Google Cloud Storage:",
			error
		);
		return [];
	}
}

/**
 * Upsert (insert or update) an item in an array file
 */
export async function upsertArrayFile<T extends { id: string }>(
	path: string,
	item: T,
	matchField: keyof T = "id" as keyof T
): Promise<void> {
	try {
		const existingData = await readJsonFile<T[]>(path, []);
		const array = existingData || [];

		const existingIndex = array.findIndex(
			(existing) => existing[matchField] === item[matchField]
		);

		if (existingIndex >= 0) {
			// Update existing item
			array[existingIndex] = { ...array[existingIndex], ...item };
		} else {
			// Add new item
			array.push(item);
		}

		await writeJsonFile(path, array);
	} catch (error) {
		console.error("Error upserting array file:", error);
		throw new Error("Failed to upsert array file");
	}
}

/**
 * Delete an item from an array file
 */
export async function deleteFromArrayFile<T extends { id: string }>(
	path: string,
	itemId: string,
	matchField: keyof T = "id" as keyof T
): Promise<void> {
	try {
		const existingData = await readJsonFile<T[]>(path, []);
		const array = existingData || [];

		const filteredArray = array.filter(
			(item) => item[matchField] !== itemId
		);

		await writeJsonFile(path, filteredArray);
	} catch (error) {
		console.error("Error deleting from array file:", error);
		throw new Error("Failed to delete from array file");
	}
}

// Helper function to organize artist data in GCS-like structure
export function createArtistDataStructure(artistData: any) {
	const artistId = artistData.id;
	const eventId = artistData.eventId;

	return {
		// Main artist data
		profile: {
			path: `artists/${artistId}/profile.json`,
			data: {
				id: artistData.id,
				artistName: artistData.artistName,
				realName: artistData.realName,
				email: artistData.email,
				phone: artistData.phone,
				style: artistData.style,
				performanceType: artistData.performanceType,
				performanceDuration: artistData.performanceDuration,
				biography: artistData.biography,
				createdAt: artistData.createdAt,
				status: artistData.status,
			},
		},
		// Technical specifications
		technical: {
			path: `artists/${artistId}/technical.json`,
			data: {
				costumeColor: artistData.costumeColor,
				customCostumeColor: artistData.customCostumeColor,
				lightColorSingle: artistData.lightColorSingle,
				lightColorTwo: artistData.lightColorTwo,
				lightColorThree: artistData.lightColorThree,
				lightRequests: artistData.lightRequests,
				stagePositionStart: artistData.stagePositionStart,
				stagePositionEnd: artistData.stagePositionEnd,
				customStagePosition: artistData.customStagePosition,
			},
		},
		// Social media and links
		social: {
			path: `artists/${artistId}/social.json`,
			data: {
				socialMedia: artistData.socialMedia,
				showLink: artistData.showLink,
			},
		},
		// Notes and communications
		notes: {
			path: `artists/${artistId}/notes.json`,
			data: {
				mcNotes: artistData.mcNotes,
				stageManagerNotes: artistData.stageManagerNotes,
				specialRequirements: artistData.specialRequirements,
			},
		},
		// Music tracks metadata
		music: {
			path: `artists/${artistId}/music.json`,
			data: {
				tracks:
					artistData.musicTracks?.map((track: any) => ({
						song_title: track.song_title,
						duration: track.duration,
						notes: track.notes,
						is_main_track: track.is_main_track,
						tempo: track.tempo,
						file_path: `artists/${artistId}/music/${track.song_title.replace(
							/[^a-zA-Z0-9]/g,
							"_"
						)}.mp3`,
					})) || [],
			},
		},
		// Gallery metadata
		gallery: {
			path: `artists/${artistId}/gallery.json`,
			data: {
				files:
					artistData.galleryFiles?.map(
						(file: any, index: number) => ({
							name: file.name,
							type: file.type,
							file_path: `artists/${artistId}/gallery/${index}_${file.name}`,
						})
					) || [],
			},
		},
		// Event association
		event: {
			path: `events/${eventId}/artists/${artistId}.json`,
			data: {
				artistId: artistData.id,
				artistName: artistData.artistName,
				eventId: artistData.eventId,
				eventName: artistData.eventName,
				status: artistData.status,
				registrationDate: artistData.createdAt,
			},
		},
	};
}
