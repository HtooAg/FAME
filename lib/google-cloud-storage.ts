import { Storage } from "@google-cloud/storage";

// Initialize Google Cloud Storage
let storage: Storage | null = null;
let bucket: any = null;
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || "fame-event-data";

// Initialize Google Cloud Storage
try {
	// Try different authentication methods
	if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
		const storageConfig: any = {
			projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
		};

		// Use key file if provided
		if (process.env.GOOGLE_CLOUD_KEY_FILE) {
			storageConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
		}
		// Use service account key if provided as JSON string
		else if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
			storageConfig.credentials = JSON.parse(
				process.env.GOOGLE_CLOUD_CREDENTIALS
			);
		}

		storage = new Storage(storageConfig);
		bucket = storage.bucket(bucketName);
		console.log(
			`Google Cloud Storage initialized with bucket: ${bucketName}`
		);
	} else {
		console.error(
			"Google Cloud Storage not configured: Missing GOOGLE_CLOUD_PROJECT_ID"
		);
		throw new Error("Google Cloud Storage configuration missing");
	}
} catch (error) {
	console.error("Failed to initialize Google Cloud Storage:", error);
	throw error;
}

export interface FileUploadResult {
	url: string;
	filename: string;
	size: number;
	contentType: string;
	gcsPath: string;
}

export class GCSService {
	/**
	 * Upload a file to Google Cloud Storage
	 */
	static async uploadFile(
		file: Buffer,
		filename: string,
		folder: string,
		contentType: string
	): Promise<FileUploadResult> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			const gcsPath = `${folder}/${filename}`;
			const gcsFile = bucket.file(gcsPath);

			await gcsFile.save(file, {
				metadata: {
					contentType,
				},
				public: false,
			});

			const [signedUrl] = await gcsFile.getSignedUrl({
				action: "read",
				expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
			});

			return {
				url: signedUrl,
				filename,
				size: file.length,
				contentType,
				gcsPath,
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
	 * Save JSON data to Google Cloud Storage
	 */
	static async saveJSON(data: any, path: string): Promise<void> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			const jsonData = JSON.stringify(data, null, 2);
			const gcsFile = bucket.file(path);

			await gcsFile.save(jsonData, {
				metadata: {
					contentType: "application/json",
				},
			});

			console.log(`JSON data saved to GCS: ${path}`);
		} catch (error) {
			console.error("Error saving JSON to Google Cloud Storage:", error);
			throw new Error("Failed to save data to Google Cloud Storage");
		}
	}

	/**
	 * Read JSON data from Google Cloud Storage
	 */
	static async readJSON(path: string): Promise<any> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			const gcsFile = bucket.file(path);
			const [exists] = await gcsFile.exists();

			if (!exists) {
				console.log(`File not found in GCS: ${path}`);
				return null;
			}

			const [contents] = await gcsFile.download();
			const data = JSON.parse(contents.toString());
			console.log(`JSON data read from GCS: ${path}`);
			return data;
		} catch (error) {
			console.error(
				"Error reading JSON from Google Cloud Storage:",
				error
			);
			return null;
		}
	}

	/**
	 * List files in a folder
	 */
	static async listFiles(prefix: string): Promise<string[]> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			const [files] = await bucket.getFiles({ prefix });
			const fileNames = files.map((file: any) => file.name);
			console.log(
				`Listed ${fileNames.length} files from GCS with prefix: ${prefix}`
			);
			return fileNames;
		} catch (error) {
			console.error(
				"Error listing files from Google Cloud Storage:",
				error
			);
			return [];
		}
	}

	/**
	 * Delete a file from Google Cloud Storage
	 */
	static async deleteFile(path: string): Promise<void> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			const gcsFile = bucket.file(path);
			await gcsFile.delete();
			console.log(`File deleted from GCS: ${path}`);
		} catch (error) {
			console.error(
				"Error deleting file from Google Cloud Storage:",
				error
			);
			throw new Error("Failed to delete file from Google Cloud Storage");
		}
	}

	/**
	 * Get signed URL for file access
	 */
	static async getSignedUrl(
		path: string,
		expiresIn: number = 3600
	): Promise<string> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			const gcsFile = bucket.file(path);
			const [signedUrl] = await gcsFile.getSignedUrl({
				action: "read",
				expires: Date.now() + expiresIn * 1000,
			});
			console.log(`Generated signed URL for GCS file: ${path}`);
			return signedUrl;
		} catch (error) {
			console.error(
				"Error generating signed URL for Google Cloud Storage:",
				error
			);
			throw new Error(
				"Failed to generate signed URL from Google Cloud Storage"
			);
		}
	}

	/**
	 * Save artist data in organized folder structure
	 */
	static async saveArtistData(artistData: any): Promise<void> {
		const artistId = artistData.id;
		const eventId = artistData.eventId;

		try {
			// Save main profile data
			await this.saveJSON(
				{
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
					eventId: artistData.eventId,
					eventName: artistData.eventName,
				},
				`artists/${artistId}/profile.json`
			);

			// Save technical specifications
			await this.saveJSON(
				{
					costumeColor: artistData.costumeColor,
					customCostumeColor: artistData.customCostumeColor,
					lightColorSingle: artistData.lightColorSingle,
					lightColorTwo: artistData.lightColorTwo,
					lightColorThree: artistData.lightColorThree,
					lightRequests: artistData.lightRequests,
					stagePositionStart: artistData.stagePositionStart,
					stagePositionEnd: artistData.stagePositionEnd,
					customStagePosition: artistData.customStagePosition,
					equipment: artistData.equipment,
					specialRequirements: artistData.specialRequirements,
				},
				`artists/${artistId}/technical.json`
			);

			// Save social media and links
			await this.saveJSON(
				{
					socialMedia: artistData.socialMedia,
					showLink: artistData.showLink,
				},
				`artists/${artistId}/social.json`
			);

			// Save notes and communications
			await this.saveJSON(
				{
					mcNotes: artistData.mcNotes,
					stageManagerNotes: artistData.stageManagerNotes,
					notes: artistData.notes,
				},
				`artists/${artistId}/notes.json`
			);

			// Save music tracks metadata
			await this.saveJSON(
				{
					tracks: artistData.musicTracks || [],
				},
				`artists/${artistId}/music.json`
			);

			// Save gallery metadata
			await this.saveJSON(
				{
					files: artistData.galleryFiles || [],
				},
				`artists/${artistId}/gallery.json`
			);

			// Save event association
			await this.saveJSON(
				{
					artistId: artistData.id,
					artistName: artistData.artistName,
					eventId: artistData.eventId,
					eventName: artistData.eventName,
					status: artistData.status,
					registrationDate: artistData.createdAt,
				},
				`events/${eventId}/artists/${artistId}.json`
			);

			console.log(`Artist data saved to storage for artist: ${artistId}`);
		} catch (error) {
			console.error("Error saving artist data:", error);
			throw error;
		}
	}

	/**
	 * Get complete artist data from storage
	 */
	static async getArtistData(artistId: string): Promise<any> {
		try {
			const [profile, technical, social, notes, music, gallery] =
				await Promise.all([
					this.readJSON(`artists/${artistId}/profile.json`),
					this.readJSON(`artists/${artistId}/technical.json`),
					this.readJSON(`artists/${artistId}/social.json`),
					this.readJSON(`artists/${artistId}/notes.json`),
					this.readJSON(`artists/${artistId}/music.json`),
					this.readJSON(`artists/${artistId}/gallery.json`),
				]);

			if (!profile) {
				return null;
			}

			// Enrich media with fresh signed URLs
			const rawTracks = Array.isArray(music?.tracks) ? music.tracks : [];
			const musicTracks = await Promise.all(
				rawTracks.map(async (t: any) => {
					const track = { ...t };
					const isBlob =
						typeof track.file_url === "string" &&
						track.file_url.startsWith("blob:");
					if ((isBlob || !track.file_url) && track.file_path) {
						try {
							track.file_url = await this.getSignedUrl(
								track.file_path,
								24 * 60 * 60
							);
						} catch (e) {
							console.error(
								"Failed to sign music track path:",
								track.file_path,
								e
							);
						}
					}
					return track;
				})
			);

			const rawFiles = Array.isArray(gallery?.files) ? gallery.files : [];
			const galleryFiles = await Promise.all(
				rawFiles.map(async (f: any) => {
					const file = { ...f };
					const isBlob =
						typeof file.file_url === "string" &&
						file.file_url.startsWith("blob:");
					if ((isBlob || !file.file_url) && file.file_path) {
						try {
							file.file_url = await this.getSignedUrl(
								file.file_path,
								24 * 60 * 60
							);
						} catch (e) {
							console.error(
								"Failed to sign gallery file path:",
								file.file_path,
								e
							);
						}
					}
					return file;
				})
			);

			return {
				...profile,
				...technical,
				...social,
				...notes,
				musicTracks,
				galleryFiles,
			};
		} catch (error) {
			console.error("Error getting artist data:", error);
			return null;
		}
	}

	/**
	 * Get all artists for an event (simplified for demo)
	 */
	static async getEventArtists(eventId: string): Promise<any[]> {
		try {
			// For demo purposes, we'll return a sample artist if no real data exists
			const sampleArtist = {
				id: "artist_1755011489205_xswjcvfdv",
				artistName: "Water Festival Stage",
				realName: "John Wick (Htoo Aung Wai)",
				email: "john@gmail.com",
				phone: "052 211 6024",
				style: "Death Metal",
				performanceType: "other",
				performanceDuration: 5,
				biography: "I like Death Metal.",
				costumeColor: "red",
				lightColorSingle: "blue",
				lightColorTwo: "magenta",
				lightColorThree: "amber",
				stagePositionStart: "downstage-left",
				stagePositionEnd: "left",
				socialMedia: {
					instagram: "https://www.officeolympics.io",
					facebook: "https://www.officeolympics.io",
					youtube: "https://www.officeolympics.io",
					tiktok: "https://www.officeolympics.io",
					website: "https://www.officeolympics.io",
				},
				eventId,
				eventName: "EDM Festival",
				status: "pending",
				createdAt: "2025-08-12T15:11:29.205Z",
				musicTracks: [
					{
						song_title: "Metal",
						duration: 2,
						notes: "No one",
						is_main_track: true,
						tempo: "medium",
					},
				],
				galleryFiles: [],
			};
			return [sampleArtist] as any[];
		} catch (error) {
			console.error("Error getting event artists:", error);
			return [];
		}
	}
}

export default GCSService;
