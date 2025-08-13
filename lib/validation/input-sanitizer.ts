import DOMPurify from "isomorphic-dompurify";

export class InputSanitizer {
	/**
	 * Sanitize text input to prevent XSS and clean up content
	 */
	static sanitizeText(
		input: string,
		options: {
			maxLength?: number;
			allowLineBreaks?: boolean;
			allowBasicFormatting?: boolean;
		} = {}
	): string {
		if (typeof input !== "string") return "";

		const {
			maxLength,
			allowLineBreaks = true,
			allowBasicFormatting = false,
		} = options;

		// Configure DOMPurify based on options
		const purifyConfig: any = {
			ALLOWED_TAGS: allowBasicFormatting
				? ["b", "i", "em", "strong"]
				: [],
			ALLOWED_ATTR: [],
			KEEP_CONTENT: true,
		};

		// Sanitize HTML and potential XSS
		let sanitized = DOMPurify.sanitize(input, purifyConfig);

		// Normalize whitespace
		sanitized = sanitized.replace(/\s+/g, " ").trim();

		// Handle line breaks
		if (allowLineBreaks) {
			sanitized = sanitized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
			// Limit consecutive line breaks
			sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
		} else {
			sanitized = sanitized.replace(/[\r\n]/g, " ");
		}

		// Apply length limit
		if (maxLength && sanitized.length > maxLength) {
			sanitized = sanitized.substring(0, maxLength).trim();
		}

		return sanitized;
	}

	/**
	 * Sanitize email address
	 */
	static sanitizeEmail(email: string): string {
		if (typeof email !== "string") return "";

		return email
			.toLowerCase()
			.trim()
			.replace(/[^\w@.-]/g, "") // Remove invalid characters
			.substring(0, 255); // Limit length
	}

	/**
	 * Sanitize phone number
	 */
	static sanitizePhone(phone: string): string {
		if (typeof phone !== "string") return "";

		// Keep only digits, spaces, hyphens, parentheses, and plus sign
		return phone
			.replace(/[^\d\s\-\(\)\+]/g, "")
			.trim()
			.substring(0, 20);
	}

	/**
	 * Sanitize URL
	 */
	static sanitizeUrl(url: string): string {
		if (typeof url !== "string") return "";

		const trimmed = url.trim();

		// Basic URL validation and sanitization
		try {
			const urlObj = new URL(trimmed);

			// Only allow http and https protocols
			if (!["http:", "https:"].includes(urlObj.protocol)) {
				return "";
			}

			return urlObj.toString();
		} catch {
			// If URL parsing fails, try adding protocol
			if (
				!trimmed.startsWith("http://") &&
				!trimmed.startsWith("https://")
			) {
				try {
					const urlObj = new URL("https://" + trimmed);
					return urlObj.toString();
				} catch {
					return "";
				}
			}
			return "";
		}
	}

	/**
	 * Sanitize filename for safe storage
	 */
	static sanitizeFilename(filename: string): string {
		if (typeof filename !== "string") return "";

		// Remove path traversal attempts
		let sanitized = filename.replace(/\.\./g, "").replace(/[\/\\]/g, "");

		// Remove potentially dangerous characters
		sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, "");

		// Replace spaces with underscores
		sanitized = sanitized.replace(/\s+/g, "_");

		// Ensure it doesn't start with a dot (hidden files)
		sanitized = sanitized.replace(/^\.+/, "");

		// Limit length while preserving extension
		if (sanitized.length > 255) {
			const lastDot = sanitized.lastIndexOf(".");
			if (lastDot > 0) {
				const ext = sanitized.substring(lastDot);
				const name = sanitized.substring(0, lastDot);
				sanitized = name.substring(0, 255 - ext.length) + ext;
			} else {
				sanitized = sanitized.substring(0, 255);
			}
		}

		return sanitized.trim();
	}

	/**
	 * Sanitize numeric input
	 */
	static sanitizeNumber(
		input: any,
		options: {
			min?: number;
			max?: number;
			integer?: boolean;
		} = {}
	): number | null {
		const { min, max, integer = false } = options;

		let num: number;

		if (typeof input === "number") {
			num = input;
		} else if (typeof input === "string") {
			num = parseFloat(input);
		} else {
			return null;
		}

		// Check if it's a valid number
		if (isNaN(num) || !isFinite(num)) {
			return null;
		}

		// Apply integer constraint
		if (integer) {
			num = Math.round(num);
		}

		// Apply min/max constraints
		if (typeof min === "number" && num < min) {
			num = min;
		}
		if (typeof max === "number" && num > max) {
			num = max;
		}

		return num;
	}

	/**
	 * Sanitize boolean input
	 */
	static sanitizeBoolean(input: any): boolean {
		if (typeof input === "boolean") {
			return input;
		}

		if (typeof input === "string") {
			const lower = input.toLowerCase().trim();
			return ["true", "1", "yes", "on"].includes(lower);
		}

		if (typeof input === "number") {
			return input !== 0;
		}

		return false;
	}

	/**
	 * Sanitize array input
	 */
	static sanitizeArray(
		input: any,
		itemSanitizer?: (item: any) => any
	): any[] {
		if (!Array.isArray(input)) {
			return [];
		}

		if (itemSanitizer) {
			return input
				.map(itemSanitizer)
				.filter((item) => item !== null && item !== undefined);
		}

		return input.filter((item) => item !== null && item !== undefined);
	}

	/**
	 * Sanitize object by applying sanitizers to specific fields
	 */
	static sanitizeObject(
		input: any,
		fieldSanitizers: Record<string, (value: any) => any>
	): any {
		if (!input || typeof input !== "object" || Array.isArray(input)) {
			return {};
		}

		const sanitized: any = {};

		for (const [field, sanitizer] of Object.entries(fieldSanitizers)) {
			if (input.hasOwnProperty(field)) {
				const sanitizedValue = sanitizer(input[field]);
				if (sanitizedValue !== null && sanitizedValue !== undefined) {
					sanitized[field] = sanitizedValue;
				}
			}
		}

		return sanitized;
	}

	/**
	 * Remove potentially dangerous content patterns
	 */
	static removeDangerousPatterns(text: string): string {
		if (typeof text !== "string") return "";

		// Remove SQL injection patterns
		const sqlPatterns = [
			/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
			/(--|\/\*|\*\/)/g,
			/(\bOR\b|\bAND\b)\s*(\d+\s*=\s*\d+|\w+\s*=\s*\w+)/gi,
		];

		let cleaned = text;
		sqlPatterns.forEach((pattern) => {
			cleaned = cleaned.replace(pattern, "");
		});

		// Remove script tags and event handlers
		const xssPatterns = [
			/<script[^>]*>.*?<\/script>/gi,
			/<iframe[^>]*>.*?<\/iframe>/gi,
			/javascript:/gi,
			/on\w+\s*=/gi,
			/<object[^>]*>.*?<\/object>/gi,
			/<embed[^>]*>/gi,
		];

		xssPatterns.forEach((pattern) => {
			cleaned = cleaned.replace(pattern, "");
		});

		return cleaned;
	}

	/**
	 * Comprehensive sanitization for artist profile data
	 */
	static sanitizeArtistProfile(data: any): any {
		return this.sanitizeObject(data, {
			artistName: (value) => this.sanitizeText(value, { maxLength: 100 }),
			realName: (value) => this.sanitizeText(value, { maxLength: 100 }),
			email: (value) => this.sanitizeEmail(value),
			phone: (value) => this.sanitizePhone(value),
			style: (value) => this.sanitizeText(value, { maxLength: 50 }),
			performanceType: (value) =>
				this.sanitizeText(value, { maxLength: 20 }),
			performanceDuration: (value) =>
				this.sanitizeNumber(value, { min: 1, max: 60, integer: true }),
			biography: (value) =>
				this.sanitizeText(value, {
					maxLength: 2000,
					allowLineBreaks: true,
				}),
			costumeColor: (value) =>
				this.sanitizeText(value, { maxLength: 20 }),
			customCostumeColor: (value) =>
				this.sanitizeText(value, { maxLength: 100 }),
			lightColorSingle: (value) =>
				this.sanitizeText(value, { maxLength: 20 }),
			lightColorTwo: (value) =>
				this.sanitizeText(value, { maxLength: 20 }),
			lightColorThree: (value) =>
				this.sanitizeText(value, { maxLength: 20 }),
			lightRequests: (value) =>
				this.sanitizeText(value, {
					maxLength: 500,
					allowLineBreaks: true,
				}),
			stagePositionStart: (value) =>
				this.sanitizeText(value, { maxLength: 30 }),
			stagePositionEnd: (value) =>
				this.sanitizeText(value, { maxLength: 30 }),
			customStagePosition: (value) =>
				this.sanitizeText(value, { maxLength: 200 }),
			equipment: (value) =>
				this.sanitizeText(value, {
					maxLength: 500,
					allowLineBreaks: true,
				}),
			specialRequirements: (value) =>
				this.sanitizeText(value, {
					maxLength: 500,
					allowLineBreaks: true,
				}),
			mcNotes: (value) =>
				this.sanitizeText(value, {
					maxLength: 1000,
					allowLineBreaks: true,
				}),
			stageManagerNotes: (value) =>
				this.sanitizeText(value, {
					maxLength: 1000,
					allowLineBreaks: true,
				}),
			notes: (value) =>
				this.sanitizeText(value, {
					maxLength: 1000,
					allowLineBreaks: true,
				}),
			socialMedia: (value) =>
				this.sanitizeObject(value, {
					instagram: (url) => this.sanitizeUrl(url),
					facebook: (url) => this.sanitizeUrl(url),
					youtube: (url) => this.sanitizeUrl(url),
					tiktok: (url) => this.sanitizeUrl(url),
					website: (url) => this.sanitizeUrl(url),
				}),
			musicTracks: (value) =>
				this.sanitizeArray(value, (track) =>
					this.sanitizeObject(track, {
						song_title: (title) =>
							this.sanitizeText(title, { maxLength: 200 }),
						duration: (dur) =>
							this.sanitizeNumber(dur, { min: 0, max: 3600 }),
						notes: (notes) =>
							this.sanitizeText(notes, { maxLength: 500 }),
						is_main_track: (main) => this.sanitizeBoolean(main),
						tempo: (tempo) =>
							this.sanitizeText(tempo, { maxLength: 50 }),
					})
				),
			galleryFiles: (value) =>
				this.sanitizeArray(value, (file) =>
					this.sanitizeObject(file, {
						name: (name) => this.sanitizeFilename(name),
						type: (type) =>
							["image", "video"].includes(type) ? type : null,
						size: (size) => this.sanitizeNumber(size, { min: 0 }),
					})
				),
		});
	}
}
