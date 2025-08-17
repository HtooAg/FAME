import { Storage } from "@google-cloud/storage";
import type { ArtistProfile } from "@/lib/types/artist";
import type { CachedArtistStatus } from "./artist-status-cache";
import { ServiceIsolation } from "./service-isolation";
import { buildLogger } from "./build-logger";
import { buildErrorHandler } from "./build-error-handler";

// Performance Order Types
export interface TimingSettings {
	eventId: string;
	backstage_ready_time?: string;
	show_start_time?: string;
	updated_at: string;
	updated_by?: string;
}

export interface Cue {
	id: string;
	eventId: string;
	performanceDate: string;
	type:
		| "mc_break"
		| "video_break"
		| "cleaning_break"
		| "speech_break"
		| "opening"
		| "countdown"
		| "artist_ending"
		| "animation";
	title: string;
	duration?: number;
	performance_order: number;
	notes?: string;
	start_time?: string;
	end_time?: string;
	is_completed?: boolean;
	completed_at?: string;
	created_at: string;
	updated_at: string;
}

export interface ShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: any;
	cue?: Cue;
	performance_order: number;
	status?:
		| "not_started"
		| "next_on_deck"
		| "next_on_stage"
		| "currently_on_stage"
		| "completed";
}

export interface ShowOrderData {
	eventId: string;
	performanceDate: string;
	items: ShowOrderItem[];
	updated_at: string;
	updated_by?: string;
}

// Artist Status Caching Types
export interface StatusCacheMetadata {
	eventId: string;
	version: number;
	lastSync: string;
	totalStatuses: number;
	conflictCount: number;
}

export interface StatusUpdateLog {
	eventId: string;
	artistId: string;
	previousStatus?: string;
	newStatus: string;
	performance_order?: number;
	performance_date?: string;
	timestamp: string;
	userId: string;
	source: "ui" | "api" | "sync";
	version: number;
}

export interface ConflictResolutionLog {
	eventId: string;
	artistId: string;
	conflictTimestamp: string;
	localStatus: CachedArtistStatus;
	remoteStatus: CachedArtistStatus;
	resolvedStatus: CachedArtistStatus;
	strategy: "timestamp" | "version" | "manual";
	resolvedBy?: string;
}

// Initialize Google Cloud Storage
let storage: Storage | null = null;
let bucket: any = null;
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || "fame-data";

// Initialize Google Cloud Storage only at runtime
function initializeGCS() {
	if (!ServiceIsolation.isServiceEnabled("google-cloud-storage")) {
		buildLogger.serviceStatus(
			"google-cloud-storage",
			"disabled",
			"Service isolation active"
		);
		return false;
	}

	if (storage && bucket) {
		return true; // Already initialized
	}

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
			buildLogger.serviceStatus(
				"google-cloud-storage",
				"enabled",
				`Initialized with bucket: ${bucketName}`,
				{ bucketName }
			);
			return true;
		} else {
			console.error(
				"Google Cloud Storage not configured: Missing GOOGLE_CLOUD_PROJECT_ID"
			);
			return false;
		}
	} catch (error) {
		console.error("Failed to initialize Google Cloud Storage:", error);
		return false;
	}
}

export interface FileUploadResult {
	url: string;
	filename: string;
	size: number;
	contentType: string;
	gcsPath: string;
}

// Signed URL cache with TTL
interface CachedSignedUrl {
	url: string;
	expiresAt: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();

export class GCSService {
	/**
	 * Check if a URL is a blob URL that needs to be replaced
	 */
	static isBlobUrl(url: string): boolean {
		return (
			typeof url === "string" &&
			(url.startsWith("blob:") || url === "" || !url)
		);
	}

	/**
	 * Clear expired entries from the signed URL cache
	 */
	static clearExpiredCache(): void {
		const now = Date.now();
		for (const [key, cached] of signedUrlCache.entries()) {
			if (cached.expiresAt <= now) {
				signedUrlCache.delete(key);
			}
		}
	}

	/**
	 * Check if a file exists in Google Cloud Storage
	 */
	static async fileExists(path: string): Promise<boolean> {
		try {
			if (!initializeGCS() || !bucket) {
				console.log(
					`GCS not available, returning false for file exists check: ${path}`
				);
				return false;
			}
			const gcsFile = bucket.file(path);
			const [exists] = await gcsFile.exists();
			return exists;
		} catch (error) {
			console.error(`Error checking if file exists: ${path}`, error);
			return false;
		}
	}

	/**
	 * Upload a file to Google Cloud Storage with enhanced error handling
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

			// Generate initial signed URL with proper error handling
			const signedUrl = await this.getSignedUrl(gcsPath, 24 * 60 * 60);

			return {
				url: signedUrl,
				filename,
				size: file.length,
				contentType,
				gcsPath, // Store the path for future URL generation
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
			if (!initializeGCS() || !bucket) {
				console.log(`GCS not available, skipping JSON save: ${path}`);
				return;
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
			if (!initializeGCS() || !bucket) {
				console.log(
					`GCS not available, returning null for JSON read: ${path}`
				);
				return null;
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
	 * Get signed URL for file access with caching
	 */
	static async getSignedUrl(
		path: string,
		expiresIn: number = 3600
	): Promise<string> {
		try {
			if (!bucket) {
				throw new Error("Google Cloud Storage not initialized");
			}

			// Clean up expired cache entries periodically
			this.clearExpiredCache();

			// Check cache first (with 5-minute buffer before expiration)
			const cacheKey = `${path}:${expiresIn}`;
			const cached = signedUrlCache.get(cacheKey);
			const now = Date.now();

			if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
				console.log(`Using cached signed URL for GCS file: ${path}`);
				return cached.url;
			}

			// Generate new signed URL
			const gcsFile = bucket.file(path);
			const expirationTime = Date.now() + expiresIn * 1000;
			const [signedUrl] = await gcsFile.getSignedUrl({
				action: "read",
				expires: expirationTime,
			});

			// Cache the URL (expires 5 minutes before actual expiration for safety)
			signedUrlCache.set(cacheKey, {
				url: signedUrl,
				expiresAt: expirationTime - 5 * 60 * 1000,
			});

			console.log(
				`Generated and cached signed URL for GCS file: ${path}`
			);
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
	static async saveArtistData(artistData: ArtistProfile): Promise<void> {
		const artistId = artistData.id;
		const eventId = artistData.eventId;

		try {
			// Debug: Log what performance data is being saved
			console.log(
				`🔧 GCS saveArtistData for ${artistId} - Performance fields:`,
				{
					performance_order: (artistData as any).performance_order,
					performance_status: (artistData as any).performance_status,
					performance_date:
						artistData.performance_date ||
						artistData.performanceDate,
				}
			);

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
					updatedAt: artistData.updatedAt,
					status: artistData.status,
					statusHistory: artistData.statusHistory,
					eventId: artistData.eventId,
					eventName: artistData.eventName,
					// Performance assignment fields - support both formats
					performanceDate:
						artistData.performanceDate ||
						artistData.performance_date,
					performance_date:
						artistData.performance_date ||
						artistData.performanceDate,
					// Performance order and status fields
					performance_order:
						(artistData as any).performance_order !== undefined
							? (artistData as any).performance_order
							: null,
					performance_status:
						(artistData as any).performance_status || null,
					// Rehearsal scheduling fields
					rehearsal_date: (artistData as any).rehearsal_date || null,
					rehearsal_order:
						(artistData as any).rehearsal_order || null,
					rehearsal_completed:
						(artistData as any).rehearsal_completed || false,
					quality_rating: (artistData as any).quality_rating || null,
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
					statusHistory: artistData.statusHistory,
					registrationDate: artistData.createdAt,
					updatedAt: artistData.updatedAt,
					// Performance assignment fields - support both formats
					performanceDate:
						artistData.performanceDate ||
						artistData.performance_date,
					performance_date:
						artistData.performance_date ||
						artistData.performanceDate,
					// Performance order and status fields
					performance_order:
						(artistData as any).performance_order !== undefined
							? (artistData as any).performance_order
							: null,
					performance_status:
						(artistData as any).performance_status || null,
					// Rehearsal fields
					rehearsal_completed: (artistData as any)
						.rehearsal_completed,
					quality_rating: (artistData as any).quality_rating,
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
	static async getArtistData(artistId: string): Promise<any | null> {
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

			// Debug: Log what performance data is being loaded from profile.json
			console.log(
				`🔍 GCS getArtistData for ${artistId} - Profile data loaded:`,
				{
					performance_order: profile.performance_order,
					performance_status: profile.performance_status,
					performance_date:
						profile.performance_date || profile.performanceDate,
					rehearsal_completed: profile.rehearsal_completed,
				}
			);

			// Enrich media with fresh signed URLs
			const rawTracks = Array.isArray(music?.tracks) ? music.tracks : [];
			const musicTracks = await Promise.all(
				rawTracks.map(async (t: any) => {
					const track = { ...t };
					const isBlob = this.isBlobUrl(track.file_url);
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
							// Set to null so UI can handle the error
							track.file_url = null;
						}
					}
					return track;
				})
			);

			const rawFiles = Array.isArray(gallery?.files) ? gallery.files : [];
			const galleryFiles = await Promise.all(
				rawFiles.map(async (f: any) => {
					const file = { ...f };
					const isBlob = this.isBlobUrl(file.file_url);
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
							// Set to null so UI can handle the error
							file.file_url = null;
						}
					}
					return file;
				})
			);

			const mergedData = {
				...profile,
				...technical,
				...social,
				...notes,
				musicTracks,
				galleryFiles,
			};

			// Debug: Log what performance data is being returned after merge
			console.log(
				`🔍 GCS getArtistData for ${artistId} - Final merged data:`,
				{
					performance_order: mergedData.performance_order,
					performance_status: mergedData.performance_status,
					performance_date:
						mergedData.performance_date ||
						mergedData.performanceDate,
					rehearsal_completed: mergedData.rehearsal_completed,
				}
			);

			return mergedData;
		} catch (error) {
			console.error("Error getting artist data:", error);
			return null;
		}
	}

	/**
	 * Batch fetch multiple artists efficiently
	 */
	static async batchGetArtistData(artistIds: string[]): Promise<any[]> {
		try {
			// Batch all file reads for all artists
			const allFileReads = artistIds.flatMap((artistId) => [
				this.readJSON(`artists/${artistId}/profile.json`),
				this.readJSON(`artists/${artistId}/technical.json`),
				this.readJSON(`artists/${artistId}/social.json`),
				this.readJSON(`artists/${artistId}/notes.json`),
				this.readJSON(`artists/${artistId}/music.json`),
				this.readJSON(`artists/${artistId}/gallery.json`),
			]);

			// Execute all reads in parallel
			const allResults = await Promise.all(allFileReads);

			// Process results for each artist
			const artists = await Promise.all(
				artistIds.map(async (artistId, index) => {
					const baseIndex = index * 6;
					const [profile, technical, social, notes, music, gallery] =
						allResults.slice(baseIndex, baseIndex + 6);

					if (!profile) {
						return null;
					}

					// Process media files with lazy loading approach
					const rawTracks = Array.isArray(music?.tracks)
						? music.tracks
						: [];
					const rawFiles = Array.isArray(gallery?.files)
						? gallery.files
						: [];

					// Only generate signed URLs for media that will be immediately visible
					// For performance, we'll defer URL generation for gallery files
					const musicTracks = await Promise.all(
						rawTracks.slice(0, 3).map(async (t: any) => {
							// Only first 3 tracks
							const track = { ...t };
							if (
								this.isBlobUrl(track.file_url) &&
								track.file_path
							) {
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
									track.file_url = null;
								}
							}
							return track;
						})
					);

					// Add remaining tracks without URLs (lazy loading)
					const remainingTracks = rawTracks
						.slice(3)
						.map((t: any) => ({
							...t,
							file_url: t.file_path ? null : t.file_url, // Mark for lazy loading
							needsUrl: !!t.file_path,
						}));

					// For gallery, only process first few images for preview
					const galleryFiles = rawFiles.slice(0, 6).map((f: any) => ({
						...f,
						url: f.file_path ? null : f.url, // Mark for lazy loading
						needsUrl: !!f.file_path,
					}));

					return {
						...profile,
						...technical,
						...social,
						...notes,
						musicTracks: [...musicTracks, ...remainingTracks],
						galleryFiles,
						totalMusicTracks: rawTracks.length,
						totalGalleryFiles: rawFiles.length,
					};
				})
			);

			return artists.filter((artist) => artist !== null);
		} catch (error) {
			console.error("Error batch getting artist data:", error);
			return [];
		}
	}

	/**
	 * Lazy load media URLs for a specific artist
	 */
	static async loadArtistMediaUrls(
		artistId: string,
		mediaType: "music" | "gallery",
		startIndex: number = 0,
		count: number = 10
	): Promise<any[]> {
		try {
			const mediaData =
				mediaType === "music"
					? await this.readJSON(`artists/${artistId}/music.json`)
					: await this.readJSON(`artists/${artistId}/gallery.json`);

			const items =
				mediaType === "music"
					? Array.isArray(mediaData?.tracks)
						? mediaData.tracks
						: []
					: Array.isArray(mediaData?.files)
					? mediaData.files
					: [];

			const selectedItems = items.slice(startIndex, startIndex + count);

			// Generate signed URLs for the requested items
			const itemsWithUrls = await Promise.all(
				selectedItems.map(async (item: any) => {
					const urlField = mediaType === "music" ? "file_url" : "url";
					const pathField =
						mediaType === "music" ? "file_path" : "file_path";

					if (this.isBlobUrl(item[urlField]) && item[pathField]) {
						try {
							item[urlField] = await this.getSignedUrl(
								item[pathField],
								24 * 60 * 60
							);
						} catch (e) {
							console.error(
								`Failed to sign ${mediaType} path:`,
								item[pathField],
								e
							);
							item[urlField] = null;
						}
					}
					return item;
				})
			);

			return itemsWithUrls;
		} catch (error) {
			console.error(
				`Error loading ${mediaType} URLs for artist ${artistId}:`,
				error
			);
			return [];
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

	// ===== PERFORMANCE ORDER MANAGEMENT FUNCTIONS =====

	/**
	 * Save timing settings for an event
	 */
	static async saveTimingSettings(
		eventId: string,
		settings: Partial<TimingSettings>
	): Promise<void> {
		try {
			const timingData = {
				eventId,
				...settings,
				updated_at: settings.updated_at || new Date().toISOString(),
			};

			await this.saveJSON(
				timingData,
				`events/${eventId}/timing-settings/settings.json`
			);

			console.log(`Timing settings saved for event: ${eventId}`);
		} catch (error) {
			console.error("Error saving timing settings:", error);
			throw new Error("Failed to save timing settings to GCS");
		}
	}

	/**
	 * Get timing settings for an event
	 */
	static async getTimingSettings(eventId: string): Promise<any | null> {
		try {
			const settings = await this.readJSON(
				`events/${eventId}/timing-settings/settings.json`
			);
			console.log(`Timing settings retrieved for event: ${eventId}`);
			return settings;
		} catch (error) {
			console.error("Error getting timing settings:", error);
			return null;
		}
	}

	/**
	 * Save a cue for a specific performance date
	 */
	static async saveCue(
		eventId: string,
		performanceDate: string,
		cue: Partial<Cue> & {
			id: string;
			type: string;
			title: string;
			performance_order: number;
		}
	): Promise<void> {
		try {
			const cueData = {
				...cue,
				eventId,
				performanceDate,
				created_at: cue.created_at || new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			await this.saveJSON(
				cueData,
				`events/${eventId}/cues/${performanceDate}/${cue.id}.json`
			);

			console.log(
				`Cue saved: ${cue.id} for event: ${eventId}, date: ${performanceDate}`
			);
		} catch (error) {
			console.error("Error saving cue:", error);
			throw new Error("Failed to save cue to GCS");
		}
	}

	/**
	 * Get all cues for a specific performance date
	 */
	static async getCues(
		eventId: string,
		performanceDate: string
	): Promise<any[]> {
		try {
			const prefix = `events/${eventId}/cues/${performanceDate}/`;
			const fileNames = await this.listFiles(prefix);

			const cues = await Promise.all(
				fileNames.map(async (fileName) => {
					return await this.readJSON(fileName);
				})
			);

			const validCues = cues.filter((cue) => cue !== null);
			console.log(
				`Retrieved ${validCues.length} cues for event: ${eventId}, date: ${performanceDate}`
			);
			return validCues;
		} catch (error) {
			console.error("Error getting cues:", error);
			return [];
		}
	}

	/**
	 * Delete a cue
	 */
	static async deleteCue(
		eventId: string,
		performanceDate: string,
		cueId: string
	): Promise<void> {
		try {
			const path = `events/${eventId}/cues/${performanceDate}/${cueId}.json`;
			await this.deleteFile(path);
			console.log(
				`Cue deleted: ${cueId} for event: ${eventId}, date: ${performanceDate}`
			);
		} catch (error) {
			console.error("Error deleting cue:", error);
			throw new Error("Failed to delete cue from GCS");
		}
	}

	/**
	 * Save show order for a specific performance date
	 */
	static async saveShowOrder(
		eventId: string,
		performanceDate: string,
		showOrderItems: ShowOrderItem[]
	): Promise<void> {
		try {
			const showOrderData = {
				eventId,
				performanceDate,
				items: showOrderItems,
				updated_at: new Date().toISOString(),
			};

			await this.saveJSON(
				showOrderData,
				`events/${eventId}/performance-orders/${performanceDate}/show-order.json`
			);

			console.log(
				`Show order saved for event: ${eventId}, date: ${performanceDate}`
			);
		} catch (error) {
			console.error("Error saving show order:", error);
			throw new Error("Failed to save show order to GCS");
		}
	}

	/**
	 * Get show order for a specific performance date
	 */
	static async getShowOrder(
		eventId: string,
		performanceDate: string
	): Promise<any | null> {
		try {
			const showOrder = await this.readJSON(
				`events/${eventId}/performance-orders/${performanceDate}/show-order.json`
			);
			console.log(
				`Show order retrieved for event: ${eventId}, date: ${performanceDate}`
			);
			return showOrder;
		} catch (error) {
			console.error("Error getting show order:", error);
			return null;
		}
	}

	/**
	 * Update artist performance status
	 */
	static async updateArtistPerformanceStatus(
		artistId: string,
		eventId: string,
		updates: {
			performance_status?: string;
			performance_order?: number;
			performance_date?: string;
		}
	): Promise<void> {
		try {
			// Get current artist data
			const currentData = await this.getArtistData(artistId);
			if (!currentData) {
				throw new Error(`Artist not found: ${artistId}`);
			}

			// Update the profile with new performance data
			const updatedProfile = {
				...currentData,
				...updates,
				// Ensure both field formats are updated
				performanceDate:
					updates.performance_date || currentData.performanceDate,
				performance_date:
					updates.performance_date || currentData.performance_date,
				updatedAt: new Date().toISOString(),
			};

			// Save updated profile
			await this.saveJSON(
				{
					id: updatedProfile.id,
					artistName: updatedProfile.artistName,
					realName: updatedProfile.realName,
					email: updatedProfile.email,
					phone: updatedProfile.phone,
					style: updatedProfile.style,
					performanceType: updatedProfile.performanceType,
					performanceDuration: updatedProfile.performanceDuration,
					biography: updatedProfile.biography,
					createdAt: updatedProfile.createdAt,
					updatedAt: updatedProfile.updatedAt,
					status: updatedProfile.status,
					statusHistory: updatedProfile.statusHistory,
					eventId: updatedProfile.eventId,
					eventName: updatedProfile.eventName,
					performanceDate:
						updates.performance_date ||
						updatedProfile.performanceDate,
					performance_date:
						updates.performance_date ||
						updatedProfile.performance_date,
					rehearsal_date: updatedProfile.rehearsal_date,
					rehearsal_order: updatedProfile.rehearsal_order,
					rehearsal_completed: updatedProfile.rehearsal_completed,
					quality_rating: updatedProfile.quality_rating,
					performance_status:
						updates.performance_status ||
						updatedProfile.performance_status,
					performance_order:
						updates.performance_order !== undefined
							? updates.performance_order
							: updatedProfile.performance_order,
				},
				`artists/${artistId}/profile.json`
			);

			// Also update the event association
			await this.saveJSON(
				{
					artistId: updatedProfile.id,
					artistName: updatedProfile.artistName,
					eventId: updatedProfile.eventId,
					eventName: updatedProfile.eventName,
					status: updatedProfile.status,
					statusHistory: updatedProfile.statusHistory,
					registrationDate: updatedProfile.createdAt,
					updatedAt: updatedProfile.updatedAt,
					performanceDate:
						updates.performance_date ||
						updatedProfile.performanceDate,
					performance_date:
						updates.performance_date ||
						updatedProfile.performance_date,
					performance_status:
						updates.performance_status ||
						updatedProfile.performance_status,
					performance_order:
						updates.performance_order !== undefined
							? updates.performance_order
							: updatedProfile.performance_order,
				},
				`events/${eventId}/artists/${artistId}.json`
			);

			console.log(`Artist performance status updated: ${artistId}`);
		} catch (error) {
			console.error("Error updating artist performance status:", error);
			throw new Error(
				"Failed to update artist performance status in GCS"
			);
		}
	}

	// ===== ARTIST STATUS CACHING FUNCTIONS =====

	/**
	 * Save cache metadata for an event
	 */
	static async saveCacheMetadata(
		eventId: string,
		metadata: StatusCacheMetadata
	): Promise<void> {
		try {
			await this.saveJSON(
				metadata,
				`events/${eventId}/artist-statuses/cache-metadata.json`
			);
			console.log(`Cache metadata saved for event: ${eventId}`);
		} catch (error) {
			console.error("Error saving cache metadata:", error);
			throw new Error("Failed to save cache metadata to GCS");
		}
	}

	/**
	 * Get cache metadata for an event
	 */
	static async getCacheMetadata(
		eventId: string
	): Promise<StatusCacheMetadata | null> {
		try {
			const metadata = await this.readJSON(
				`events/${eventId}/artist-statuses/cache-metadata.json`
			);
			return metadata;
		} catch (error) {
			console.error("Error getting cache metadata:", error);
			return null;
		}
	}

	/**
	 * Save current artist statuses for a performance date
	 */
	static async saveCurrentStatuses(
		eventId: string,
		performanceDate: string,
		statuses: CachedArtistStatus[]
	): Promise<void> {
		try {
			const statusData = {
				eventId,
				performanceDate,
				statuses,
				updated_at: new Date().toISOString(),
				version: Date.now(),
			};

			await this.saveJSON(
				statusData,
				`events/${eventId}/artist-statuses/${performanceDate}/current-statuses.json`
			);

			console.log(
				`Current statuses saved for event: ${eventId}, date: ${performanceDate}`
			);
		} catch (error) {
			console.error("Error saving current statuses:", error);
			throw new Error("Failed to save current statuses to GCS");
		}
	}

	/**
	 * Get current artist statuses for a performance date
	 */
	static async getCurrentStatuses(
		eventId: string,
		performanceDate: string
	): Promise<CachedArtistStatus[]> {
		try {
			const statusData = await this.readJSON(
				`events/${eventId}/artist-statuses/${performanceDate}/current-statuses.json`
			);

			if (!statusData || !Array.isArray(statusData.statuses)) {
				return [];
			}

			console.log(
				`Retrieved ${statusData.statuses.length} current statuses for event: ${eventId}, date: ${performanceDate}`
			);
			return statusData.statuses;
		} catch (error) {
			console.error("Error getting current statuses:", error);
			return [];
		}
	}

	/**
	 * Log status update for audit trail
	 */
	static async logStatusUpdate(
		eventId: string,
		performanceDate: string,
		updateLog: StatusUpdateLog
	): Promise<void> {
		try {
			// Get existing log
			const logPath = `events/${eventId}/artist-statuses/${performanceDate}/status-log.json`;
			const existingLog = (await this.readJSON(logPath)) || {
				updates: [],
			};

			// Add new update
			existingLog.updates.push(updateLog);
			existingLog.updated_at = new Date().toISOString();

			// Keep only last 1000 updates to prevent file from growing too large
			if (existingLog.updates.length > 1000) {
				existingLog.updates = existingLog.updates.slice(-1000);
			}

			await this.saveJSON(existingLog, logPath);
			console.log(
				`Status update logged for artist: ${updateLog.artistId}`
			);
		} catch (error) {
			console.error("Error logging status update:", error);
			// Don't throw error for logging failures
		}
	}

	/**
	 * Get status update log for a performance date
	 */
	static async getStatusUpdateLog(
		eventId: string,
		performanceDate: string,
		limit?: number
	): Promise<StatusUpdateLog[]> {
		try {
			const logData = await this.readJSON(
				`events/${eventId}/artist-statuses/${performanceDate}/status-log.json`
			);

			if (!logData || !Array.isArray(logData.updates)) {
				return [];
			}

			const updates = logData.updates;
			return limit ? updates.slice(-limit) : updates;
		} catch (error) {
			console.error("Error getting status update log:", error);
			return [];
		}
	}

	/**
	 * Log conflict resolution for debugging
	 */
	static async logConflictResolution(
		eventId: string,
		conflictLog: ConflictResolutionLog
	): Promise<void> {
		try {
			const timestamp = conflictLog.conflictTimestamp.replace(
				/[:.]/g,
				"-"
			);
			const logPath = `events/${eventId}/artist-statuses/conflict-resolution/${timestamp}-conflicts.json`;

			await this.saveJSON(conflictLog, logPath);
			console.log(
				`Conflict resolution logged for artist: ${conflictLog.artistId}`
			);
		} catch (error) {
			console.error("Error logging conflict resolution:", error);
			// Don't throw error for logging failures
		}
	}

	/**
	 * Batch save multiple artist statuses efficiently
	 */
	static async batchSaveStatuses(
		eventId: string,
		performanceDate: string,
		statuses: CachedArtistStatus[],
		userId?: string
	): Promise<void> {
		try {
			// Save current statuses
			await this.saveCurrentStatuses(eventId, performanceDate, statuses);

			// Log each status update
			const updatePromises = statuses.map((status) => {
				const updateLog: StatusUpdateLog = {
					eventId,
					artistId: status.artistId,
					newStatus: status.performance_status,
					performance_order: status.performance_order,
					performance_date: status.performance_date,
					timestamp: status.timestamp,
					userId: userId || "system",
					source: "api",
					version: status.version,
				};

				return this.logStatusUpdate(
					eventId,
					performanceDate,
					updateLog
				);
			});

			await Promise.all(updatePromises);

			// Update cache metadata
			const metadata: StatusCacheMetadata = {
				eventId,
				version: Date.now(),
				lastSync: new Date().toISOString(),
				totalStatuses: statuses.length,
				conflictCount: 0,
			};

			await this.saveCacheMetadata(eventId, metadata);

			console.log(
				`Batch saved ${statuses.length} statuses for event: ${eventId}`
			);
		} catch (error) {
			console.error("Error batch saving statuses:", error);
			throw new Error("Failed to batch save statuses to GCS");
		}
	}

	/**
	 * Get artist status with timestamp-based conflict resolution
	 */
	static async getArtistStatusWithConflictResolution(
		artistId: string,
		eventId: string,
		localStatus?: CachedArtistStatus
	): Promise<CachedArtistStatus | null> {
		try {
			// Get current artist data
			const artistData = await this.getArtistData(artistId);
			if (!artistData) {
				return null;
			}

			// Convert to cached status format
			const remoteStatus: CachedArtistStatus = {
				artistId,
				eventId,
				performance_status:
					artistData.performance_status || "not_started",
				performance_order: artistData.performance_order,
				performance_date:
					artistData.performance_date || artistData.performanceDate,
				timestamp: artistData.updatedAt || new Date().toISOString(),
				version: 1,
				dirty: false,
			};

			// If no local status, return remote
			if (!localStatus) {
				return remoteStatus;
			}

			// Resolve conflicts using timestamps
			const localTime = new Date(localStatus.timestamp).getTime();
			const remoteTime = new Date(remoteStatus.timestamp).getTime();

			if (remoteTime > localTime) {
				// Remote is newer
				return remoteStatus;
			} else if (localTime > remoteTime) {
				// Local is newer
				return localStatus;
			} else {
				// Same timestamp, use version numbers
				if (remoteStatus.version > localStatus.version) {
					return remoteStatus;
				} else {
					return localStatus;
				}
			}
		} catch (error) {
			console.error(
				"Error getting artist status with conflict resolution:",
				error
			);
			return localStatus || null;
		}
	}

	/**
	 * Cleanup old status logs and conflict resolution files
	 */
	static async cleanupOldStatusData(
		eventId: string,
		daysToKeep: number = 30
	): Promise<void> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
			const cutoffTimestamp = cutoffDate.toISOString();

			// List all files in the artist-statuses directory
			const prefix = `events/${eventId}/artist-statuses/`;
			const files = await this.listFiles(prefix);

			const deletePromises = files
				.filter((fileName) => {
					// Extract timestamp from filename if possible
					const timestampMatch =
						fileName.match(/(\d{4}-\d{2}-\d{2})/);
					if (timestampMatch) {
						return (
							timestampMatch[1] < cutoffTimestamp.substring(0, 10)
						);
					}
					return false;
				})
				.map((fileName) => this.deleteFile(fileName));

			await Promise.all(deletePromises);
			console.log(
				`Cleaned up ${deletePromises.length} old status files for event: ${eventId}`
			);
		} catch (error) {
			console.error("Error cleaning up old status data:", error);
			// Don't throw error for cleanup failures
		}
	}
}

export default GCSService;
