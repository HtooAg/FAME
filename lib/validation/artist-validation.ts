import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import {
	artistProfileSchema,
	musicTrackSchema,
	galleryFileSchema,
	fileUploadSchema,
	batchArtistSchema,
	type ArtistProfile,
	type MusicTrack,
	type GalleryFile,
} from "@/lib/schemas/artist";

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	sanitizedData?: any;
}

export interface ArtistValidationRules {
	artistName: { required: true; minLength: 1; maxLength: 100 };
	realName: { required: false; maxLength: 100 };
	email: { required: true; pattern: "email" };
	phone: { required: false; pattern: "phone" };
	style: { required: false; maxLength: 50 };
	performanceType: {
		required: false;
		enum: ["solo", "duo", "trio", "group", "band", "other"];
	};
	performanceDuration: { required: true; min: 1; max: 60 };
	biography: { required: false; maxLength: 2000 };
	costumeColor: {
		required: true;
		enum: [
			"black",
			"white",
			"red",
			"blue",
			"green",
			"yellow",
			"purple",
			"pink",
			"orange",
			"gold",
			"silver",
			"multicolor",
			"custom"
		];
	};
	customCostumeColor: { required: false; maxLength: 100 };
	lightColorSingle: {
		required: true;
		enum: [
			"red",
			"blue",
			"green",
			"amber",
			"magenta",
			"cyan",
			"purple",
			"yellow",
			"white",
			"warm-white",
			"cold-blue",
			"uv",
			"rose",
			"orange",
			"pink",
			"teal",
			"lavender",
			"gold",
			"turquoise",
			"trust"
		];
	};
	lightColorTwo: {
		required: false;
		enum: [
			"none",
			"red",
			"blue",
			"green",
			"amber",
			"magenta",
			"cyan",
			"purple",
			"yellow",
			"white",
			"warm-white",
			"cold-blue",
			"uv",
			"rose",
			"orange",
			"pink",
			"teal",
			"lavender",
			"gold",
			"turquoise",
			"trust"
		];
	};
	lightColorThree: {
		required: false;
		enum: [
			"none",
			"red",
			"blue",
			"green",
			"amber",
			"magenta",
			"cyan",
			"purple",
			"yellow",
			"white",
			"warm-white",
			"cold-blue",
			"uv",
			"rose",
			"orange",
			"pink",
			"teal",
			"lavender",
			"gold",
			"turquoise",
			"trust"
		];
	};
	lightRequests: { required: false; maxLength: 500 };
	stagePositionStart: {
		required: false;
		enum: [
			"upstage-left",
			"upstage-center",
			"upstage-right",
			"center-left",
			"center-stage",
			"center-right",
			"downstage-left",
			"downstage-center",
			"downstage-right",
			"custom"
		];
	};
	stagePositionEnd: {
		required: false;
		enum: [
			"upstage-left",
			"upstage-center",
			"upstage-right",
			"center-left",
			"center-stage",
			"center-right",
			"downstage-left",
			"downstage-center",
			"downstage-right",
			"custom"
		];
	};
	customStagePosition: { required: false; maxLength: 200 };
	equipment: { required: false; maxLength: 500 };
	specialRequirements: { required: false; maxLength: 500 };
	mcNotes: { required: false; maxLength: 1000 };
	stageManagerNotes: { required: false; maxLength: 1000 };
	notes: { required: false; maxLength: 1000 };
}

export class ArtistValidator {
	private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	private static readonly PHONE_REGEX = /^[\+]?[1-9][\d\s\-\(\)]{0,20}$/;
	private static readonly URL_REGEX = /^https?:\/\/.+/;
	private static readonly SAFE_FILENAME_REGEX = /^[a-zA-Z0-9\-_\.\s]+$/;
	private static readonly SQL_INJECTION_PATTERNS = [
		/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
		/(--|\/\*|\*\/|;|'|"|`)/,
		/(\bOR\b|\bAND\b).*(\b=\b|\bLIKE\b)/i,
	];
	private static readonly XSS_PATTERNS = [
		/<script[^>]*>.*?<\/script>/gi,
		/<iframe[^>]*>.*?<\/iframe>/gi,
		/javascript:/gi,
		/on\w+\s*=/gi,
		/<object[^>]*>.*?<\/object>/gi,
		/<embed[^>]*>/gi,
	];

	// File type mappings for security
	private static readonly ALLOWED_MIME_TYPES = {
		audio: [
			"audio/mpeg",
			"audio/mp3",
			"audio/wav",
			"audio/ogg",
			"audio/m4a",
			"audio/aac",
			"audio/flac",
		],
		video: [
			"video/mp4",
			"video/webm",
			"video/ogg",
			"video/quicktime",
			"video/x-msvideo", // .avi
		],
		image: [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
		],
	};

	private static readonly MAX_FILE_SIZES = {
		audio: 25 * 1024 * 1024, // 25MB
		video: 100 * 1024 * 1024, // 100MB
		image: 15 * 1024 * 1024, // 15MB
	};

	/**
	 * Enhanced validation using Zod schemas with additional security checks
	 */
	static validateArtistDataWithSchema(data: any): ValidationResult {
		try {
			// First run through Zod validation
			const result = artistProfileSchema.safeParse(data);

			if (!result.success) {
				return {
					isValid: false,
					errors: result.error.errors.map(
						(err) => `${err.path.join(".")}: ${err.message}`
					),
				};
			}

			// Additional security validation
			const securityCheck = this.performSecurityValidation(result.data);
			if (!securityCheck.isValid) {
				return securityCheck;
			}

			// Sanitize the validated data
			const sanitizedData = this.sanitizeArtistData(result.data);

			// Perform data integrity checks
			const integrityCheck = this.checkDataIntegrity(sanitizedData);
			if (!integrityCheck.isValid) {
				return {
					isValid: false,
					errors: integrityCheck.issues,
				};
			}

			return {
				isValid: true,
				errors: [],
				sanitizedData,
			};
		} catch (error) {
			return {
				isValid: false,
				errors: [
					`Validation error: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				],
			};
		}
	}

	/**
	 * Legacy validation method (kept for backward compatibility)
	 */
	static validateArtistData(data: any): ValidationResult {
		const errors: string[] = [];
		const sanitizedData: any = {};

		// Required field validation
		if (
			!data.artistName ||
			typeof data.artistName !== "string" ||
			data.artistName.trim().length === 0
		) {
			errors.push("Artist name is required");
		} else if (data.artistName.length > 100) {
			errors.push("Artist name must be less than 100 characters");
		} else {
			sanitizedData.artistName = this.sanitizeText(data.artistName);
		}

		if (
			!data.email ||
			typeof data.email !== "string" ||
			!this.EMAIL_REGEX.test(data.email)
		) {
			errors.push("Valid email address is required");
		} else {
			sanitizedData.email = data.email.toLowerCase().trim();
		}

		if (!data.costumeColor || typeof data.costumeColor !== "string") {
			errors.push("Costume color is required");
		} else {
			sanitizedData.costumeColor = data.costumeColor;
		}

		if (
			!data.lightColorSingle ||
			typeof data.lightColorSingle !== "string"
		) {
			errors.push("Primary light color is required");
		} else {
			sanitizedData.lightColorSingle = data.lightColorSingle;
		}

		if (
			typeof data.performanceDuration !== "number" ||
			data.performanceDuration < 1 ||
			data.performanceDuration > 60
		) {
			errors.push(
				"Performance duration must be between 1 and 60 minutes"
			);
		} else {
			sanitizedData.performanceDuration = data.performanceDuration;
		}

		// Optional field validation
		if (data.realName) {
			if (
				typeof data.realName !== "string" ||
				data.realName.length > 100
			) {
				errors.push("Real name must be less than 100 characters");
			} else {
				sanitizedData.realName = this.sanitizeText(data.realName);
			}
		}

		if (data.phone) {
			if (
				typeof data.phone !== "string" ||
				!this.PHONE_REGEX.test(data.phone.replace(/[\s\-\(\)]/g, ""))
			) {
				errors.push("Invalid phone number format");
			} else {
				sanitizedData.phone = data.phone.trim();
			}
		}

		if (data.style) {
			if (typeof data.style !== "string" || data.style.length > 50) {
				errors.push(
					"Performance style must be less than 50 characters"
				);
			} else {
				sanitizedData.style = this.sanitizeText(data.style);
			}
		}

		if (data.biography) {
			if (
				typeof data.biography !== "string" ||
				data.biography.length > 2000
			) {
				errors.push("Biography must be less than 2000 characters");
			} else {
				sanitizedData.biography = this.sanitizeText(data.biography);
			}
		}

		// Validate social media links
		if (data.socialMedia) {
			sanitizedData.socialMedia = {};
			const socialFields = [
				"instagram",
				"facebook",
				"youtube",
				"tiktok",
				"website",
			];

			for (const field of socialFields) {
				if (data.socialMedia[field]) {
					if (
						typeof data.socialMedia[field] !== "string" ||
						!this.URL_REGEX.test(data.socialMedia[field])
					) {
						errors.push(`Invalid ${field} URL format`);
					} else {
						sanitizedData.socialMedia[field] =
							data.socialMedia[field].trim();
					}
				}
			}
		}

		// Validate notes fields
		const noteFields = ["mcNotes", "stageManagerNotes", "notes"];
		for (const field of noteFields) {
			if (data[field]) {
				if (
					typeof data[field] !== "string" ||
					data[field].length > 1000
				) {
					errors.push(`${field} must be less than 1000 characters`);
				} else {
					sanitizedData[field] = this.sanitizeText(data[field]);
				}
			}
		}

		// Validate technical fields
		if (data.lightRequests) {
			if (
				typeof data.lightRequests !== "string" ||
				data.lightRequests.length > 500
			) {
				errors.push("Light requests must be less than 500 characters");
			} else {
				sanitizedData.lightRequests = this.sanitizeText(
					data.lightRequests
				);
			}
		}

		if (data.equipment) {
			if (
				typeof data.equipment !== "string" ||
				data.equipment.length > 500
			) {
				errors.push(
					"Equipment description must be less than 500 characters"
				);
			} else {
				sanitizedData.equipment = this.sanitizeText(data.equipment);
			}
		}

		// Copy other validated fields
		const otherFields = [
			"performanceType",
			"customCostumeColor",
			"lightColorTwo",
			"lightColorThree",
			"stagePositionStart",
			"stagePositionEnd",
			"customStagePosition",
			"specialRequirements",
			"showLink",
		];

		for (const field of otherFields) {
			if (data[field] !== undefined) {
				if (typeof data[field] === "string") {
					sanitizedData[field] = this.sanitizeText(data[field]);
				} else {
					sanitizedData[field] = data[field];
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			sanitizedData: errors.length === 0 ? sanitizedData : undefined,
		};
	}

	/**
	 * Perform security validation to prevent malicious content
	 */
	private static performSecurityValidation(data: any): ValidationResult {
		const errors: string[] = [];

		// Check for SQL injection patterns in text fields
		const textFields = [
			"artistName",
			"realName",
			"biography",
			"style",
			"lightRequests",
			"mcNotes",
			"stageManagerNotes",
			"notes",
			"customCostumeColor",
			"customStagePosition",
			"equipment",
			"specialRequirements",
		];

		for (const field of textFields) {
			if (data[field] && typeof data[field] === "string") {
				if (this.containsSQLInjection(data[field])) {
					errors.push(
						`${field} contains potentially malicious content`
					);
				}
				if (this.containsXSSPatterns(data[field])) {
					errors.push(
						`${field} contains potentially dangerous script content`
					);
				}
			}
		}

		// Validate social media URLs for security
		if (data.socialMedia) {
			for (const [platform, url] of Object.entries(data.socialMedia)) {
				if (url && typeof url === "string") {
					if (!this.isSecureUrl(url)) {
						errors.push(
							`${platform} URL appears to be malicious or insecure`
						);
					}
				}
			}
		}

		// Check music track data for security issues
		if (data.musicTracks && Array.isArray(data.musicTracks)) {
			data.musicTracks.forEach((track: any, index: number) => {
				if (
					track.song_title &&
					this.containsSQLInjection(track.song_title)
				) {
					errors.push(
						`Music track ${
							index + 1
						} title contains malicious content`
					);
				}
				if (track.notes && this.containsXSSPatterns(track.notes)) {
					errors.push(
						`Music track ${
							index + 1
						} notes contain dangerous content`
					);
				}
			});
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Check for SQL injection patterns
	 */
	private static containsSQLInjection(text: string): boolean {
		return this.SQL_INJECTION_PATTERNS.some((pattern) =>
			pattern.test(text)
		);
	}

	/**
	 * Check for XSS patterns
	 */
	private static containsXSSPatterns(text: string): boolean {
		return this.XSS_PATTERNS.some((pattern) => pattern.test(text));
	}

	/**
	 * Validate URL security
	 */
	private static isSecureUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);

			// Block dangerous protocols
			if (!["http:", "https:"].includes(urlObj.protocol)) {
				return false;
			}

			// Block localhost and private IPs in production
			if (process.env.NODE_ENV === "production") {
				const hostname = urlObj.hostname.toLowerCase();
				if (
					hostname === "localhost" ||
					hostname.startsWith("127.") ||
					hostname.startsWith("192.168.") ||
					hostname.startsWith("10.") ||
					hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
				) {
					return false;
				}
			}

			// Block suspicious domains
			const suspiciousDomains = [
				"bit.ly",
				"tinyurl.com",
				"goo.gl",
				"t.co",
				"ow.ly",
				"short.link",
				"tiny.cc",
			];

			if (
				suspiciousDomains.some((domain) =>
					urlObj.hostname.includes(domain)
				)
			) {
				return false;
			}

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Comprehensive data sanitization
	 */
	private static sanitizeArtistData(data: any): any {
		const sanitized = { ...data };

		// Sanitize text fields
		const textFields = [
			"artistName",
			"realName",
			"biography",
			"style",
			"lightRequests",
			"mcNotes",
			"stageManagerNotes",
			"notes",
			"customCostumeColor",
			"customStagePosition",
			"equipment",
			"specialRequirements",
		];

		for (const field of textFields) {
			if (sanitized[field] && typeof sanitized[field] === "string") {
				sanitized[field] = this.sanitizeText(sanitized[field]);
			}
		}

		// Sanitize email
		if (sanitized.email) {
			sanitized.email = sanitized.email.toLowerCase().trim();
		}

		// Sanitize phone
		if (sanitized.phone) {
			sanitized.phone = sanitized.phone
				.replace(/[^\d\+\-\(\)\s]/g, "")
				.trim();
		}

		// Sanitize social media URLs
		if (sanitized.socialMedia) {
			for (const [platform, url] of Object.entries(
				sanitized.socialMedia
			)) {
				if (url && typeof url === "string") {
					sanitized.socialMedia[platform] = url.trim();
				}
			}
		}

		// Sanitize music tracks
		if (sanitized.musicTracks && Array.isArray(sanitized.musicTracks)) {
			sanitized.musicTracks = sanitized.musicTracks.map((track: any) => ({
				...track,
				song_title: track.song_title
					? this.sanitizeText(track.song_title)
					: "",
				notes: track.notes ? this.sanitizeText(track.notes) : "",
				tempo: track.tempo ? this.sanitizeText(track.tempo) : "",
			}));
		}

		// Sanitize gallery files
		if (sanitized.galleryFiles && Array.isArray(sanitized.galleryFiles)) {
			sanitized.galleryFiles = sanitized.galleryFiles.map(
				(file: any) => ({
					...file,
					name: file.name ? this.sanitizeFileName(file.name) : "",
				})
			);
		}

		return sanitized;
	}

	/**
	 * Sanitize file names for security
	 */
	private static sanitizeFileName(filename: string): string {
		// Remove path traversal attempts
		let sanitized = filename.replace(/\.\./g, "").replace(/[\/\\]/g, "");

		// Remove potentially dangerous characters
		sanitized = sanitized.replace(/[<>:"|?*]/g, "");

		// Limit length
		if (sanitized.length > 255) {
			const ext = sanitized.substring(sanitized.lastIndexOf("."));
			sanitized = sanitized.substring(0, 255 - ext.length) + ext;
		}

		return sanitized.trim();
	}

	/**
	 * Enhanced file upload validation with security checks
	 */
	static validateFileUploadEnhanced(
		file: any,
		type: "audio" | "video" | "image"
	): ValidationResult {
		const errors: string[] = [];

		// Basic file validation - check for file-like properties instead of instanceof File
		if (!file || !this.isFileObject(file)) {
			errors.push("Invalid file object");
			return { isValid: false, errors };
		}

		// File size validation
		if (file.size > this.MAX_FILE_SIZES[type]) {
			errors.push(
				`File size exceeds ${
					this.MAX_FILE_SIZES[type] / (1024 * 1024)
				}MB limit`
			);
		}

		// File type validation
		if (!this.ALLOWED_MIME_TYPES[type].includes(file.type)) {
			errors.push(
				`File type ${file.type} is not supported for ${type} files`
			);
		}

		// File name security validation
		if (!this.SAFE_FILENAME_REGEX.test(file.name)) {
			errors.push(
				"File name contains invalid or potentially dangerous characters"
			);
		}

		// Check for double extensions (e.g., file.jpg.exe)
		const nameParts = file.name.split(".");
		if (nameParts.length > 2) {
			const suspiciousExtensions = [
				"exe",
				"bat",
				"cmd",
				"scr",
				"js",
				"php",
				"asp",
				"jsp",
			];
			for (let i = 0; i < nameParts.length - 1; i++) {
				if (suspiciousExtensions.includes(nameParts[i].toLowerCase())) {
					errors.push(
						"File name contains potentially dangerous extension"
					);
					break;
				}
			}
		}

		// File name length validation
		if (file.name.length > 255) {
			errors.push("File name is too long (max 255 characters)");
		}

		// Empty file check
		if (file.size === 0) {
			errors.push("File is empty");
		}

		// Minimum file size check (to prevent tiny malicious files)
		const minSizes = { audio: 1024, video: 1024, image: 100 }; // bytes
		if (file.size < minSizes[type]) {
			errors.push(`File is too small to be a valid ${type} file`);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validate music track data with enhanced security
	 */
	static validateMusicTrackEnhanced(track: any): ValidationResult {
		try {
			const result = musicTrackSchema.safeParse(track);

			if (!result.success) {
				return {
					isValid: false,
					errors: result.error.errors.map(
						(err) => `${err.path.join(".")}: ${err.message}`
					),
				};
			}

			// Additional security checks
			const securityErrors: string[] = [];

			if (
				track.song_title &&
				this.containsSQLInjection(track.song_title)
			) {
				securityErrors.push(
					"Song title contains potentially malicious content"
				);
			}

			if (track.notes && this.containsXSSPatterns(track.notes)) {
				securityErrors.push(
					"Track notes contain potentially dangerous content"
				);
			}

			if (securityErrors.length > 0) {
				return {
					isValid: false,
					errors: securityErrors,
				};
			}

			// Sanitize the data
			const sanitizedTrack = {
				...result.data,
				song_title: this.sanitizeText(result.data.song_title),
				notes: result.data.notes
					? this.sanitizeText(result.data.notes)
					: undefined,
				tempo: result.data.tempo
					? this.sanitizeText(result.data.tempo)
					: undefined,
			};

			return {
				isValid: true,
				errors: [],
				sanitizedData: sanitizedTrack,
			};
		} catch (error) {
			return {
				isValid: false,
				errors: [
					`Track validation error: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				],
			};
		}
	}

	/**
	 * Validate music track data
	 */
	static validateMusicTrack(track: any): ValidationResult {
		const errors: string[] = [];
		const sanitizedTrack: any = {};

		if (
			!track.song_title ||
			typeof track.song_title !== "string" ||
			track.song_title.trim().length === 0
		) {
			errors.push("Song title is required");
		} else if (track.song_title.length > 200) {
			errors.push("Song title must be less than 200 characters");
		} else {
			sanitizedTrack.song_title = this.sanitizeText(track.song_title);
		}

		if (
			typeof track.duration !== "number" ||
			track.duration < 0 ||
			track.duration > 3600
		) {
			errors.push("Duration must be between 0 and 3600 seconds");
		} else {
			sanitizedTrack.duration = track.duration;
		}

		if (track.notes) {
			if (typeof track.notes !== "string" || track.notes.length > 500) {
				errors.push("Track notes must be less than 500 characters");
			} else {
				sanitizedTrack.notes = this.sanitizeText(track.notes);
			}
		}

		if (track.tempo) {
			if (typeof track.tempo !== "string" || track.tempo.length > 50) {
				errors.push("Tempo must be less than 50 characters");
			} else {
				sanitizedTrack.tempo = this.sanitizeText(track.tempo);
			}
		}

		// Copy other fields
		sanitizedTrack.is_main_track = Boolean(track.is_main_track);
		sanitizedTrack.file_url = track.file_url;
		sanitizedTrack.file_path = track.file_path;

		return {
			isValid: errors.length === 0,
			errors,
			sanitizedData: errors.length === 0 ? sanitizedTrack : undefined,
		};
	}

	/**
	 * Validate file upload (legacy method for backward compatibility)
	 */
	static validateFileUpload(
		file: any,
		type: "audio" | "video" | "image"
	): ValidationResult {
		// Use the enhanced validation method
		return this.validateFileUploadEnhanced(file, type);
	}

	/**
	 * Sanitize text input to prevent XSS and clean up content
	 */
	private static sanitizeText(text: string): string {
		if (typeof text !== "string") return "";

		// Remove HTML tags and sanitize
		const sanitized = DOMPurify.sanitize(text, {
			ALLOWED_TAGS: [],
			ALLOWED_ATTR: [],
		});

		// Trim whitespace and normalize line breaks
		return sanitized.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	}

	/**
	 * Enhanced validation and sanitization using new methods
	 */
	static validateAndSanitizeProfile(data: any): ValidationResult {
		// Use the enhanced validation method
		return this.validateArtistDataWithSchema(data);
	}

	/**
	 * Legacy method for backward compatibility
	 */
	static validateAndSanitizeProfileLegacy(data: any): ValidationResult {
		const profileValidation = this.validateArtistData(data);

		if (!profileValidation.isValid) {
			return profileValidation;
		}

		// Validate music tracks if present
		if (data.musicTracks && Array.isArray(data.musicTracks)) {
			const trackErrors: string[] = [];
			const sanitizedTracks: any[] = [];

			for (let i = 0; i < data.musicTracks.length; i++) {
				const trackValidation = this.validateMusicTrack(
					data.musicTracks[i]
				);
				if (!trackValidation.isValid) {
					trackErrors.push(
						`Track ${i + 1}: ${trackValidation.errors.join(", ")}`
					);
				} else if (trackValidation.sanitizedData) {
					sanitizedTracks.push(trackValidation.sanitizedData);
				}
			}

			if (trackErrors.length > 0) {
				return {
					isValid: false,
					errors: [...profileValidation.errors, ...trackErrors],
				};
			}

			profileValidation.sanitizedData!.musicTracks = sanitizedTracks;
		}

		// Validate gallery files metadata if present
		if (data.galleryFiles && Array.isArray(data.galleryFiles)) {
			const sanitizedFiles = data.galleryFiles.map((file: any) => ({
				...file,
				name: this.sanitizeText(file.name || ""),
			}));
			profileValidation.sanitizedData!.galleryFiles = sanitizedFiles;
		}

		return profileValidation;
	}

	/**
	 * Enhanced data integrity check for artist profile
	 */
	static checkDataIntegrity(data: any): {
		isValid: boolean;
		issues: string[];
	} {
		const issues: string[] = [];

		// Check for required relationships
		if (data.costumeColor === "custom" && !data.customCostumeColor) {
			issues.push(
				"Custom costume color description is required when costume color is set to custom"
			);
		}

		if (
			(data.stagePositionStart === "custom" ||
				data.stagePositionEnd === "custom") &&
			!data.customStagePosition
		) {
			issues.push(
				"Custom stage position description is required when position is set to custom"
			);
		}

		// Check music track consistency
		if (data.musicTracks && Array.isArray(data.musicTracks)) {
			const mainTracks = data.musicTracks.filter(
				(track: any) => track.is_main_track
			);
			if (data.musicTracks.length > 0) {
				if (mainTracks.length === 0) {
					issues.push(
						"At least one track should be marked as the main track"
					);
				} else if (mainTracks.length > 1) {
					issues.push(
						"Only one track can be marked as the main track"
					);
				}
			}

			// Check for tracks without files
			const tracksWithoutFiles = data.musicTracks.filter(
				(track: any) =>
					track.song_title &&
					(!track.file_url || track.file_url === "")
			);
			if (tracksWithoutFiles.length > 0) {
				issues.push(
					`${tracksWithoutFiles.length} music track(s) are missing audio files`
				);
			}

			// Check for duplicate track titles
			const trackTitles = data.musicTracks
				.map((track: any) => track.song_title?.toLowerCase())
				.filter(Boolean);
			const duplicateTitles = trackTitles.filter(
				(title: string, index: number) =>
					trackTitles.indexOf(title) !== index
			);
			if (duplicateTitles.length > 0) {
				issues.push("Duplicate song titles found in music tracks");
			}

			// Check track duration consistency
			data.musicTracks.forEach((track: any, index: number) => {
				if (
					track.duration &&
					track.duration > data.performanceDuration * 60
				) {
					issues.push(
						`Track ${index + 1} duration (${Math.round(
							track.duration / 60
						)}min) exceeds performance duration (${
							data.performanceDuration
						}min)`
					);
				}
			});
		}

		// Check social media URL validity and security
		if (data.socialMedia) {
			const socialFields = [
				"instagram",
				"facebook",
				"youtube",
				"tiktok",
				"website",
			];
			for (const field of socialFields) {
				if (data.socialMedia[field]) {
					if (!this.URL_REGEX.test(data.socialMedia[field])) {
						issues.push(`Invalid ${field} URL format`);
					} else if (!this.isSecureUrl(data.socialMedia[field])) {
						issues.push(
							`${field} URL appears to be insecure or malicious`
						);
					}
				}
			}
		}

		// Check for suspicious content patterns
		const textFields = [
			"biography",
			"mcNotes",
			"stageManagerNotes",
			"notes",
			"lightRequests",
			"equipment",
			"specialRequirements",
		];
		for (const field of textFields) {
			if (data[field] && typeof data[field] === "string") {
				if (this.containsSuspiciousContent(data[field])) {
					issues.push(
						`${field} contains potentially suspicious content`
					);
				}
				if (this.containsSQLInjection(data[field])) {
					issues.push(
						`${field} contains potentially malicious SQL patterns`
					);
				}
				if (this.containsXSSPatterns(data[field])) {
					issues.push(
						`${field} contains potentially dangerous script content`
					);
				}
			}
		}

		// Check email domain validity
		if (data.email) {
			const emailDomain = data.email.split("@")[1]?.toLowerCase();
			if (emailDomain) {
				// Check for suspicious email domains
				const suspiciousDomains = [
					"tempmail.org",
					"10minutemail.com",
					"guerrillamail.com",
					"mailinator.com",
					"throwaway.email",
					"temp-mail.org",
				];
				if (suspiciousDomains.includes(emailDomain)) {
					issues.push(
						"Email appears to be from a temporary email service"
					);
				}
			}
		}

		// Check performance duration logic
		if (data.performanceDuration) {
			if (
				data.performanceType === "solo" &&
				data.performanceDuration > 15
			) {
				issues.push(
					"Solo performances typically should not exceed 15 minutes"
				);
			}
			if (
				data.performanceType === "group" &&
				data.performanceDuration < 5
			) {
				issues.push(
					"Group performances typically should be at least 5 minutes"
				);
			}
		}

		// Check gallery file consistency
		if (data.galleryFiles && Array.isArray(data.galleryFiles)) {
			const totalFileSize = data.galleryFiles.reduce(
				(sum: number, file: any) => sum + (file.size || 0),
				0
			);
			const maxTotalSize = 200 * 1024 * 1024; // 200MB total
			if (totalFileSize > maxTotalSize) {
				issues.push(
					`Total gallery file size (${Math.round(
						totalFileSize / (1024 * 1024)
					)}MB) exceeds limit (200MB)`
				);
			}

			// Check for duplicate file names
			const fileNames = data.galleryFiles
				.map((file: any) => file.name?.toLowerCase())
				.filter(Boolean);
			const duplicateNames = fileNames.filter(
				(name: string, index: number) =>
					fileNames.indexOf(name) !== index
			);
			if (duplicateNames.length > 0) {
				issues.push("Duplicate file names found in gallery");
			}
		}

		return {
			isValid: issues.length === 0,
			issues,
		};
	}

	/**
	 * Enhanced suspicious content detection
	 */
	private static containsSuspiciousContent(text: string): boolean {
		const suspiciousPatterns = [
			// Spam keywords
			/\b(viagra|cialis|casino|lottery|winner|congratulations|free\s+money|get\s+rich|make\s+money\s+fast)\b/i,
			/\b(click\s+here|act\s+now|limited\s+time|urgent|hurry|don't\s+miss|exclusive\s+offer)\b/i,

			// Multiple URLs (potential spam)
			/(http[s]?:\/\/[^\s]+){3,}/i,

			// Excessive repeated characters
			/(.)\1{10,}/,

			// Excessive capitalization
			/[A-Z]{20,}/,

			// Phone number patterns that might be spam
			/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*){2,}/,

			// Email harvesting patterns
			/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*){3,}/,

			// Cryptocurrency/investment spam
			/\b(bitcoin|crypto|investment|trading|forex|binary\s+options|profit\s+guaranteed)\b/i,

			// Adult content indicators
			/\b(xxx|adult|escort|massage|dating|hookup|sexy|nude)\b/i,

			// Excessive punctuation
			/[!?]{5,}/,

			// Common spam phrases
			/\b(work\s+from\s+home|earn\s+\$|make\s+\$|guaranteed\s+income|no\s+experience\s+required)\b/i,
		];

		// Check for excessive emoji usage (potential spam)
		const emojiCount = (
			text.match(
				/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu
			) || []
		).length;
		if (emojiCount > 10) {
			return true;
		}

		// Check for excessive special characters
		const specialCharCount = (
			text.match(/[!@#$%^&*()_+=\[\]{}|;':",./<>?]/g) || []
		).length;
		if (specialCharCount > text.length * 0.3) {
			return true;
		}

		return suspiciousPatterns.some((pattern) => pattern.test(text));
	}

	/**
	 * Enhanced batch validation with cross-validation checks
	 */
	static validateBatchArtistData(artistsData: any[]): {
		validArtists: any[];
		errors: { index: number; errors: string[] }[];
		warnings: string[];
	} {
		const validArtists: any[] = [];
		const errors: { index: number; errors: string[] }[] = [];
		const warnings: string[] = [];

		// Individual validation
		artistsData.forEach((artistData, index) => {
			const validation = this.validateAndSanitizeProfile(artistData);
			if (validation.isValid && validation.sanitizedData) {
				validArtists.push(validation.sanitizedData);
			} else {
				errors.push({
					index,
					errors: validation.errors,
				});
			}
		});

		// Cross-validation checks
		if (validArtists.length > 1) {
			// Check for duplicate emails
			const emails = validArtists
				.map((artist) => artist.email?.toLowerCase())
				.filter(Boolean);
			const duplicateEmails = emails.filter(
				(email, index) => emails.indexOf(email) !== index
			);
			if (duplicateEmails.length > 0) {
				warnings.push(
					`Duplicate email addresses found: ${[
						...new Set(duplicateEmails),
					].join(", ")}`
				);
			}

			// Check for duplicate artist names
			const artistNames = validArtists
				.map((artist) => artist.artistName?.toLowerCase())
				.filter(Boolean);
			const duplicateNames = artistNames.filter(
				(name, index) => artistNames.indexOf(name) !== index
			);
			if (duplicateNames.length > 0) {
				warnings.push(
					`Duplicate artist names found: ${[
						...new Set(duplicateNames),
					].join(", ")}`
				);
			}

			// Check for similar phone numbers
			const phones = validArtists
				.map((artist) => artist.phone?.replace(/[\s\-\(\)]/g, ""))
				.filter(Boolean);
			const duplicatePhones = phones.filter(
				(phone, index) => phones.indexOf(phone) !== index
			);
			if (duplicatePhones.length > 0) {
				warnings.push(`Duplicate phone numbers found`);
			}
		}

		return { validArtists, errors, warnings };
	}

	/**
	 * Validate artist assignment data
	 */
	static validateArtistAssignment(data: any): ValidationResult {
		const errors: string[] = [];

		if (!data.artistId || typeof data.artistId !== "string") {
			errors.push("Artist ID is required");
		}

		if (data.performanceDate !== null) {
			if (typeof data.performanceDate !== "string") {
				errors.push("Performance date must be a string or null");
			} else {
				const date = new Date(data.performanceDate);
				if (isNaN(date.getTime())) {
					errors.push("Invalid performance date format");
				} else if (date < new Date()) {
					errors.push("Performance date cannot be in the past");
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			sanitizedData:
				errors.length === 0
					? {
							artistId: data.artistId,
							performanceDate: data.performanceDate,
					  }
					: undefined,
		};
	}

	/**
	 * Validate API request data with rate limiting considerations
	 */
	static validateApiRequest(
		data: any,
		requestType: "create" | "update" | "assign"
	): ValidationResult {
		const errors: string[] = [];

		// Common validations
		if (!data || typeof data !== "object") {
			errors.push("Request data must be an object");
			return { isValid: false, errors };
		}

		// Request-specific validation
		switch (requestType) {
			case "create":
				return this.validateArtistDataWithSchema(data);

			case "update":
				if (!data.id) {
					errors.push("Artist ID is required for updates");
				}
				// Validate only provided fields for partial updates
				const updateValidation =
					this.validateArtistDataWithSchema(data);
				return updateValidation;

			case "assign":
				return this.validateArtistAssignment(data);

			default:
				errors.push("Invalid request type");
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Comprehensive profile completeness check
	 */
	static checkProfileCompleteness(data: any): {
		completeness: number;
		missingFields: string[];
		recommendations: string[];
	} {
		const requiredFields = [
			"artistName",
			"email",
			"performanceDuration",
			"costumeColor",
			"lightColorSingle",
		];

		const recommendedFields = [
			"realName",
			"phone",
			"biography",
			"style",
			"performanceType",
			"lightRequests",
			"stagePositionStart",
			"stagePositionEnd",
		];

		const optionalFields = [
			"socialMedia",
			"musicTracks",
			"galleryFiles",
			"mcNotes",
		];

		const missingFields: string[] = [];
		const recommendations: string[] = [];

		// Check required fields
		let requiredScore = 0;
		requiredFields.forEach((field) => {
			if (data[field] && data[field] !== "") {
				requiredScore++;
			} else {
				missingFields.push(field);
			}
		});

		// Check recommended fields
		let recommendedScore = 0;
		recommendedFields.forEach((field) => {
			if (data[field] && data[field] !== "") {
				recommendedScore++;
			} else {
				recommendations.push(
					`Consider adding ${field} for a more complete profile`
				);
			}
		});

		// Check optional fields
		let optionalScore = 0;
		optionalFields.forEach((field) => {
			if (
				field === "socialMedia" &&
				data[field] &&
				Object.keys(data[field]).length > 0
			) {
				optionalScore++;
			} else if (
				field === "musicTracks" &&
				data[field] &&
				data[field].length > 0
			) {
				optionalScore++;
			} else if (
				field === "galleryFiles" &&
				data[field] &&
				data[field].length > 0
			) {
				optionalScore++;
			} else if (data[field] && data[field] !== "") {
				optionalScore++;
			}
		});

		// Calculate completeness percentage
		const totalFields =
			requiredFields.length +
			recommendedFields.length +
			optionalFields.length;
		const completedFields =
			requiredScore + recommendedScore + optionalScore;
		const completeness = Math.round((completedFields / totalFields) * 100);

		return {
			completeness,
			missingFields,
			recommendations,
		};
	}

	/**
	 * Check if object is file-like (works in both browser and Node.js environments)
	 */
	private static isFileObject(obj: any): boolean {
		if (!obj) return false;

		// In browser environment, check instanceof File
		if (typeof File !== "undefined" && obj instanceof File) {
			return true;
		}

		// In Node.js environment, check for file-like properties
		return (
			typeof obj === "object" &&
			typeof obj.name === "string" &&
			typeof obj.type === "string" &&
			(typeof obj.size === "number" || obj.size === undefined)
		);
	}
}
