export interface IntegrityCheckResult {
	isValid: boolean;
	issues: IntegrityIssue[];
	warnings: IntegrityWarning[];
	score: number; // 0-100 integrity score
}

export interface IntegrityIssue {
	field: string;
	type:
		| "missing_required"
		| "invalid_format"
		| "inconsistent_data"
		| "security_risk"
		| "business_rule_violation";
	message: string;
	severity: "critical" | "high" | "medium" | "low";
}

export interface IntegrityWarning {
	field: string;
	message: string;
	suggestion: string;
}

export class DataIntegrityChecker {
	/**
	 * Comprehensive data integrity check for artist profiles
	 */
	static checkArtistProfileIntegrity(data: any): IntegrityCheckResult {
		const issues: IntegrityIssue[] = [];
		const warnings: IntegrityWarning[] = [];

		// Required field checks
		this.checkRequiredFields(data, issues);

		// Data consistency checks
		this.checkDataConsistency(data, issues, warnings);

		// Business rule validation
		this.checkBusinessRules(data, issues, warnings);

		// Security checks
		this.checkSecurityIntegrity(data, issues);

		// Performance and media integrity
		this.checkMediaIntegrity(data, issues, warnings);

		// Calculate integrity score
		const score = this.calculateIntegrityScore(issues, warnings);

		return {
			isValid:
				issues.filter(
					(i) => i.severity === "critical" || i.severity === "high"
				).length === 0,
			issues,
			warnings,
			score,
		};
	}

	/**
	 * Check required fields
	 */
	private static checkRequiredFields(
		data: any,
		issues: IntegrityIssue[]
	): void {
		const requiredFields = [
			{ field: "artistName", message: "Artist name is required" },
			{ field: "email", message: "Email address is required" },
			{
				field: "performanceDuration",
				message: "Performance duration is required",
			},
			{
				field: "costumeColor",
				message: "Costume color selection is required",
			},
			{
				field: "lightColorSingle",
				message: "Primary light color is required",
			},
		];

		requiredFields.forEach(({ field, message }) => {
			if (
				!data[field] ||
				(typeof data[field] === "string" && data[field].trim() === "")
			) {
				issues.push({
					field,
					type: "missing_required",
					message,
					severity: "critical",
				});
			}
		});
	}

	/**
	 * Check data consistency
	 */
	private static checkDataConsistency(
		data: any,
		issues: IntegrityIssue[],
		warnings: IntegrityWarning[]
	): void {
		// Custom color consistency
		if (data.costumeColor === "custom" && !data.customCostumeColor) {
			issues.push({
				field: "customCostumeColor",
				type: "inconsistent_data",
				message:
					"Custom costume color description is required when costume color is set to custom",
				severity: "high",
			});
		}

		// Stage position consistency
		if (
			(data.stagePositionStart === "custom" ||
				data.stagePositionEnd === "custom") &&
			!data.customStagePosition
		) {
			issues.push({
				field: "customStagePosition",
				type: "inconsistent_data",
				message:
					"Custom stage position description is required when position is set to custom",
				severity: "high",
			});
		}

		// Email format consistency
		if (data.email && typeof data.email === "string") {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(data.email)) {
				issues.push({
					field: "email",
					type: "invalid_format",
					message: "Email format is invalid",
					severity: "high",
				});
			}
		}

		// Phone format consistency
		if (data.phone && typeof data.phone === "string") {
			const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{0,20}$/;
			if (!phoneRegex.test(data.phone)) {
				warnings.push({
					field: "phone",
					message: "Phone number format may be invalid",
					suggestion: "Use international format with country code",
				});
			}
		}

		// Performance duration vs track duration consistency
		if (
			data.musicTracks &&
			Array.isArray(data.musicTracks) &&
			data.performanceDuration
		) {
			const totalTrackDuration = data.musicTracks.reduce(
				(sum: number, track: any) => sum + (track.duration || 0),
				0
			);
			const performanceDurationSeconds = data.performanceDuration * 60;

			if (totalTrackDuration > performanceDurationSeconds * 1.5) {
				warnings.push({
					field: "musicTracks",
					message:
						"Total music duration significantly exceeds performance duration",
					suggestion:
						"Consider reducing track count or adjusting performance duration",
				});
			}
		}
	}

	/**
	 * Check business rules
	 */
	private static checkBusinessRules(
		data: any,
		issues: IntegrityIssue[],
		warnings: IntegrityWarning[]
	): void {
		// Music track business rules
		if (data.musicTracks && Array.isArray(data.musicTracks)) {
			const mainTracks = data.musicTracks.filter(
				(track: any) => track.is_main_track
			);

			if (data.musicTracks.length > 0) {
				if (mainTracks.length === 0) {
					issues.push({
						field: "musicTracks",
						type: "business_rule_violation",
						message:
							"At least one track must be marked as the main track",
						severity: "medium",
					});
				} else if (mainTracks.length > 1) {
					issues.push({
						field: "musicTracks",
						type: "business_rule_violation",
						message:
							"Only one track can be marked as the main track",
						severity: "medium",
					});
				}
			}

			// Check for duplicate track titles
			const trackTitles = data.musicTracks
				.map((track: any) => track.song_title?.toLowerCase())
				.filter(Boolean);
			const duplicates = trackTitles.filter(
				(title: string, index: number) =>
					trackTitles.indexOf(title) !== index
			);

			if (duplicates.length > 0) {
				warnings.push({
					field: "musicTracks",
					message: "Duplicate song titles found",
					suggestion: "Use unique titles for each track",
				});
			}
		}

		// Performance type vs duration rules
		if (data.performanceType && data.performanceDuration) {
			const typeRules = {
				solo: { min: 2, max: 15, recommended: 8 },
				duo: { min: 3, max: 20, recommended: 10 },
				trio: { min: 4, max: 25, recommended: 12 },
				group: { min: 5, max: 30, recommended: 15 },
				band: { min: 8, max: 45, recommended: 20 },
			};

			const rules =
				typeRules[data.performanceType as keyof typeof typeRules];
			if (rules) {
				if (data.performanceDuration < rules.min) {
					warnings.push({
						field: "performanceDuration",
						message: `${data.performanceType} performances typically last at least ${rules.min} minutes`,
						suggestion: `Consider extending to ${rules.recommended} minutes`,
					});
				} else if (data.performanceDuration > rules.max) {
					warnings.push({
						field: "performanceDuration",
						message: `${data.performanceType} performances typically don't exceed ${rules.max} minutes`,
						suggestion: `Consider reducing to ${rules.recommended} minutes`,
					});
				}
			}
		}

		// Social media consistency
		if (data.socialMedia) {
			const platforms = Object.keys(data.socialMedia).filter(
				(key) => data.socialMedia[key]
			);
			if (platforms.length === 0 && data.performanceType !== "solo") {
				warnings.push({
					field: "socialMedia",
					message: "No social media links provided",
					suggestion:
						"Adding social media links can help with promotion",
				});
			}
		}
	}

	/**
	 * Check security integrity
	 */
	private static checkSecurityIntegrity(
		data: any,
		issues: IntegrityIssue[]
	): void {
		// SQL injection patterns
		const sqlPatterns = [
			/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
			/(--|\/\*|\*\/|;)/,
			/(\bOR\b|\bAND\b).*(\b=\b|\bLIKE\b)/i,
		];

		// XSS patterns
		const xssPatterns = [
			/<script[^>]*>.*?<\/script>/gi,
			/<iframe[^>]*>.*?<\/iframe>/gi,
			/javascript:/gi,
			/on\w+\s*=/gi,
		];

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

		textFields.forEach((field) => {
			if (data[field] && typeof data[field] === "string") {
				const text = data[field];

				// Check for SQL injection
				if (sqlPatterns.some((pattern) => pattern.test(text))) {
					issues.push({
						field,
						type: "security_risk",
						message:
							"Content contains potentially malicious SQL patterns",
						severity: "critical",
					});
				}

				// Check for XSS
				if (xssPatterns.some((pattern) => pattern.test(text))) {
					issues.push({
						field,
						type: "security_risk",
						message:
							"Content contains potentially dangerous script content",
						severity: "critical",
					});
				}
			}
		});

		// Check social media URLs for security
		if (data.socialMedia) {
			Object.entries(data.socialMedia).forEach(([platform, url]) => {
				if (url && typeof url === "string") {
					try {
						const urlObj = new URL(url);

						// Check for dangerous protocols
						if (!["http:", "https:"].includes(urlObj.protocol)) {
							issues.push({
								field: `socialMedia.${platform}`,
								type: "security_risk",
								message:
									"URL uses potentially dangerous protocol",
								severity: "high",
							});
						}

						// Check for localhost/private IPs in production
						if (process.env.NODE_ENV === "production") {
							const hostname = urlObj.hostname.toLowerCase();
							if (
								hostname === "localhost" ||
								hostname.startsWith("127.") ||
								hostname.startsWith("192.168.") ||
								hostname.startsWith("10.")
							) {
								issues.push({
									field: `socialMedia.${platform}`,
									type: "security_risk",
									message:
										"URL points to local/private network",
									severity: "medium",
								});
							}
						}
					} catch {
						issues.push({
							field: `socialMedia.${platform}`,
							type: "invalid_format",
							message: "Invalid URL format",
							severity: "medium",
						});
					}
				}
			});
		}
	}

	/**
	 * Check media integrity
	 */
	private static checkMediaIntegrity(
		data: any,
		issues: IntegrityIssue[],
		warnings: IntegrityWarning[]
	): void {
		// Music tracks integrity
		if (data.musicTracks && Array.isArray(data.musicTracks)) {
			data.musicTracks.forEach((track: any, index: number) => {
				if (
					track.song_title &&
					(!track.file_url || track.file_url === "")
				) {
					warnings.push({
						field: `musicTracks[${index}]`,
						message: "Music track is missing audio file",
						suggestion: "Upload an audio file for this track",
					});
				}

				if (track.duration && track.duration > 600) {
					// 10 minutes
					warnings.push({
						field: `musicTracks[${index}]`,
						message: "Track duration is unusually long",
						suggestion:
							"Consider if this track duration is appropriate",
					});
				}

				if (track.file_url && track.file_url.startsWith("blob:")) {
					issues.push({
						field: `musicTracks[${index}]`,
						type: "invalid_format",
						message:
							"Track has temporary blob URL instead of permanent storage URL",
						severity: "high",
					});
				}
			});
		}

		// Gallery files integrity
		if (data.galleryFiles && Array.isArray(data.galleryFiles)) {
			const totalSize = data.galleryFiles.reduce(
				(sum: number, file: any) => sum + (file.size || 0),
				0
			);

			if (totalSize > 200 * 1024 * 1024) {
				// 200MB
				warnings.push({
					field: "galleryFiles",
					message: "Total gallery file size is very large",
					suggestion:
						"Consider compressing images or reducing file count",
				});
			}

			data.galleryFiles.forEach((file: any, index: number) => {
				if (file.url && file.url.startsWith("blob:")) {
					issues.push({
						field: `galleryFiles[${index}]`,
						type: "invalid_format",
						message:
							"File has temporary blob URL instead of permanent storage URL",
						severity: "high",
					});
				}

				if (file.size && file.size > 50 * 1024 * 1024) {
					// 50MB
					warnings.push({
						field: `galleryFiles[${index}]`,
						message: "File size is very large",
						suggestion: "Consider compressing the file",
					});
				}
			});
		}
	}

	/**
	 * Calculate integrity score based on issues and warnings
	 */
	private static calculateIntegrityScore(
		issues: IntegrityIssue[],
		warnings: IntegrityWarning[]
	): number {
		let score = 100;

		// Deduct points for issues based on severity
		issues.forEach((issue) => {
			switch (issue.severity) {
				case "critical":
					score -= 25;
					break;
				case "high":
					score -= 15;
					break;
				case "medium":
					score -= 8;
					break;
				case "low":
					score -= 3;
					break;
			}
		});

		// Deduct points for warnings
		score -= warnings.length * 2;

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Check cross-profile integrity for batch operations
	 */
	static checkBatchIntegrity(profiles: any[]): {
		duplicateEmails: string[];
		duplicateArtistNames: string[];
		duplicatePhones: string[];
		conflictingPerformanceDates: any[];
	} {
		const duplicateEmails: string[] = [];
		const duplicateArtistNames: string[] = [];
		const duplicatePhones: string[] = [];
		const conflictingPerformanceDates: any[] = [];

		// Check for duplicates
		const emails = profiles
			.map((p) => p.email?.toLowerCase())
			.filter(Boolean);
		const artistNames = profiles
			.map((p) => p.artistName?.toLowerCase())
			.filter(Boolean);
		const phones = profiles
			.map((p) => p.phone?.replace(/[\s\-\(\)]/g, ""))
			.filter(Boolean);

		// Find duplicates
		emails.forEach((email, index) => {
			if (
				emails.indexOf(email) !== index &&
				!duplicateEmails.includes(email)
			) {
				duplicateEmails.push(email);
			}
		});

		artistNames.forEach((name, index) => {
			if (
				artistNames.indexOf(name) !== index &&
				!duplicateArtistNames.includes(name)
			) {
				duplicateArtistNames.push(name);
			}
		});

		phones.forEach((phone, index) => {
			if (
				phones.indexOf(phone) !== index &&
				!duplicatePhones.includes(phone)
			) {
				duplicatePhones.push(phone);
			}
		});

		// Check for performance date conflicts
		const dateGroups = new Map<string, any[]>();
		profiles.forEach((profile) => {
			if (profile.performanceDate) {
				const date = profile.performanceDate;
				if (!dateGroups.has(date)) {
					dateGroups.set(date, []);
				}
				dateGroups.get(date)!.push(profile);
			}
		});

		dateGroups.forEach((profilesOnDate, date) => {
			if (profilesOnDate.length > 1) {
				const totalDuration = profilesOnDate.reduce(
					(sum, p) => sum + (p.performanceDuration || 0),
					0
				);

				// Assuming 8-hour performance day with setup time
				if (totalDuration > 480) {
					// 8 hours in minutes
					conflictingPerformanceDates.push({
						date,
						profiles: profilesOnDate,
						totalDuration,
						issue: "Total performance time exceeds available time slot",
					});
				}
			}
		});

		return {
			duplicateEmails,
			duplicateArtistNames,
			duplicatePhones,
			conflictingPerformanceDates,
		};
	}
}
