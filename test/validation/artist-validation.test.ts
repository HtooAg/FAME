import { describe, it, expect, beforeEach } from "vitest";
import { ArtistValidator } from "@/lib/validation/artist-validation";
import { InputSanitizer } from "@/lib/validation/input-sanitizer";
import { DataIntegrityChecker } from "@/lib/validation/data-integrity";

describe("ArtistValidator", () => {
	let validArtistData: any;

	beforeEach(() => {
		validArtistData = {
			artistName: "Test Artist",
			email: "test@example.com",
			performanceDuration: 10,
			costumeColor: "black",
			lightColorSingle: "red",
			biography: "A talented performer",
			eventId: "event123",
		};
	});

	describe("validateArtistDataWithSchema", () => {
		it("should validate correct artist data", () => {
			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.sanitizedData).toBeDefined();
		});

		it("should reject missing required fields", () => {
			delete validArtistData.artistName;

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(false);
			expect(
				result.errors.some((error) => error.includes("artistName"))
			).toBe(true);
		});

		it("should reject invalid email format", () => {
			validArtistData.email = "invalid-email";

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(false);
			expect(result.errors.some((error) => error.includes("email"))).toBe(
				true
			);
		});

		it("should reject performance duration outside valid range", () => {
			validArtistData.performanceDuration = 70; // Too long

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(false);
			expect(
				result.errors.some((error) =>
					error.includes("performanceDuration")
				)
			).toBe(true);
		});

		it("should handle custom costume color validation", () => {
			validArtistData.costumeColor = "custom";
			// Missing customCostumeColor should fail

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(false);
			expect(
				result.errors.some((error) => error.includes("custom"))
			).toBe(true);
		});

		it("should validate music tracks", () => {
			validArtistData.musicTracks = [
				{
					song_title: "Test Song",
					duration: 180,
					is_main_track: true,
					notes: "Great song",
					tempo: "Medium",
					file_url: "https://example.com/test-song.mp3",
					file_path: "artists/123/music/test-song.mp3",
				},
			];

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			if (!result.isValid) {
				console.log("Validation errors:", result.errors);
			}

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.musicTracks).toHaveLength(1);
		});
	});

	describe("validateFileUploadEnhanced", () => {
		it("should validate correct audio file", () => {
			// Create a file with sufficient size (> 1024 bytes)
			const audioContent = new Array(2000).fill("a").join("");
			const mockFile = new File([audioContent], "test.mp3", {
				type: "audio/mpeg",
			});

			const result = ArtistValidator.validateFileUploadEnhanced(
				mockFile,
				"audio"
			);

			if (!result.isValid) {
				console.log("File validation errors:", result.errors);
			}

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject oversized files", () => {
			// Create a mock file that's too large
			const largeContent = new Array(30 * 1024 * 1024).fill("a").join(""); // 30MB
			const mockFile = new File([largeContent], "large.mp3", {
				type: "audio/mpeg",
			});

			const result = ArtistValidator.validateFileUploadEnhanced(
				mockFile,
				"audio"
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.some((error) => error.includes("size"))).toBe(
				true
			);
		});

		it("should reject invalid file types", () => {
			const mockFile = new File(["content"], "test.exe", {
				type: "application/x-executable",
			});

			const result = ArtistValidator.validateFileUploadEnhanced(
				mockFile,
				"audio"
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.some((error) => error.includes("type"))).toBe(
				true
			);
		});

		it("should reject dangerous file names", () => {
			const mockFile = new File(["content"], "test<script>.mp3", {
				type: "audio/mpeg",
			});

			const result = ArtistValidator.validateFileUploadEnhanced(
				mockFile,
				"audio"
			);

			expect(result.isValid).toBe(false);
			expect(
				result.errors.some((error) => error.includes("characters"))
			).toBe(true);
		});
	});

	describe("security validation", () => {
		it("should detect SQL injection attempts", () => {
			validArtistData.biography = "'; DROP TABLE users; --";

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(false);
			expect(
				result.errors.some((error) => error.includes("malicious"))
			).toBe(true);
		});

		it("should detect XSS attempts", () => {
			// Use biography field which allows more characters
			validArtistData.biography = '<script>alert("xss")</script>';

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			if (!result.isValid) {
				console.log("XSS validation errors:", result.errors);
			}

			expect(result.isValid).toBe(false);
			expect(
				result.errors.some(
					(error) =>
						error.includes("script") || error.includes("dangerous")
				)
			).toBe(true);
		});

		it("should validate social media URLs for security", () => {
			validArtistData.socialMedia = {
				website: 'javascript:alert("xss")',
			};

			const result =
				ArtistValidator.validateArtistDataWithSchema(validArtistData);

			expect(result.isValid).toBe(false);
		});
	});

	describe("batch validation", () => {
		it("should validate multiple artists", () => {
			const artists = [
				{ ...validArtistData, email: "artist1@example.com" },
				{
					...validArtistData,
					email: "artist2@example.com",
					artistName: "Artist 2",
				},
			];

			const result = ArtistValidator.validateBatchArtistData(artists);

			expect(result.validArtists).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect duplicate emails in batch", () => {
			const artists = [
				{ ...validArtistData },
				{ ...validArtistData, artistName: "Artist 2" }, // Same email
			];

			const result = ArtistValidator.validateBatchArtistData(artists);

			expect(
				result.warnings?.some((warning) =>
					warning.includes("Duplicate email")
				)
			).toBe(true);
		});
	});
});

describe("InputSanitizer", () => {
	describe("sanitizeText", () => {
		it("should remove HTML tags", () => {
			const input = '<script>alert("xss")</script>Hello World';
			const result = InputSanitizer.sanitizeText(input);

			expect(result).toBe("Hello World");
			expect(result).not.toContain("<script>");
		});

		it("should normalize whitespace", () => {
			const input = "  Hello    World  \n\n  ";
			const result = InputSanitizer.sanitizeText(input);

			expect(result).toBe("Hello World");
		});

		it("should respect max length", () => {
			const input = "A very long string that exceeds the limit";
			const result = InputSanitizer.sanitizeText(input, {
				maxLength: 10,
			});

			expect(result.length).toBeLessThanOrEqual(10);
		});
	});

	describe("sanitizeEmail", () => {
		it("should normalize email format", () => {
			const input = "  TEST@EXAMPLE.COM  ";
			const result = InputSanitizer.sanitizeEmail(input);

			expect(result).toBe("test@example.com");
		});

		it("should remove invalid characters", () => {
			const input = "test<>@example.com";
			const result = InputSanitizer.sanitizeEmail(input);

			expect(result).toBe("test@example.com");
		});
	});

	describe("sanitizeFilename", () => {
		it("should remove dangerous characters", () => {
			const input = "test<>file.mp3";
			const result = InputSanitizer.sanitizeFilename(input);

			expect(result).toBe("testfile.mp3");
		});

		it("should replace spaces with underscores", () => {
			const input = "test file.mp3";
			const result = InputSanitizer.sanitizeFilename(input);

			expect(result).toBe("test_file.mp3");
		});

		it("should prevent path traversal", () => {
			const input = "../../../etc/passwd";
			const result = InputSanitizer.sanitizeFilename(input);

			expect(result).not.toContain("../");
		});
	});
});

describe("DataIntegrityChecker", () => {
	let validArtistData: any;

	beforeEach(() => {
		validArtistData = {
			artistName: "Test Artist",
			email: "test@example.com",
			performanceDuration: 10,
			costumeColor: "black",
			lightColorSingle: "red",
			eventId: "event123",
		};
	});

	describe("checkArtistProfileIntegrity", () => {
		it("should pass integrity check for valid data", () => {
			const result =
				DataIntegrityChecker.checkArtistProfileIntegrity(
					validArtistData
				);

			expect(result.isValid).toBe(true);
			expect(result.score).toBeGreaterThan(80);
		});

		it("should detect missing required fields", () => {
			delete validArtistData.artistName;

			const result =
				DataIntegrityChecker.checkArtistProfileIntegrity(
					validArtistData
				);

			expect(result.isValid).toBe(false);
			expect(
				result.issues.some(
					(issue) =>
						issue.field === "artistName" &&
						issue.severity === "critical"
				)
			).toBe(true);
		});

		it("should detect inconsistent custom color data", () => {
			validArtistData.costumeColor = "custom";
			// Missing customCostumeColor

			const result =
				DataIntegrityChecker.checkArtistProfileIntegrity(
					validArtistData
				);

			expect(result.isValid).toBe(false);
			expect(
				result.issues.some(
					(issue) => issue.field === "customCostumeColor"
				)
			).toBe(true);
		});

		it("should detect security risks", () => {
			validArtistData.biography = '<script>alert("xss")</script>';

			const result =
				DataIntegrityChecker.checkArtistProfileIntegrity(
					validArtistData
				);

			expect(result.isValid).toBe(false);
			expect(
				result.issues.some((issue) => issue.type === "security_risk")
			).toBe(true);
		});

		it("should provide warnings for business rule violations", () => {
			validArtistData.musicTracks = [
				{ song_title: "Song 1", is_main_track: true, duration: 180 },
				{ song_title: "Song 2", is_main_track: true, duration: 200 }, // Two main tracks
			];

			const result =
				DataIntegrityChecker.checkArtistProfileIntegrity(
					validArtistData
				);

			expect(
				result.issues.some(
					(issue) => issue.type === "business_rule_violation"
				)
			).toBe(true);
		});
	});

	describe("checkBatchIntegrity", () => {
		it("should detect duplicate emails across profiles", () => {
			const profiles = [
				{ ...validArtistData, artistName: "Artist 1" },
				{ ...validArtistData, artistName: "Artist 2" }, // Same email
			];

			const result = DataIntegrityChecker.checkBatchIntegrity(profiles);

			expect(result.duplicateEmails).toContain("test@example.com");
		});

		it("should detect performance date conflicts", () => {
			const profiles = [
				{
					...validArtistData,
					performanceDate: "2024-01-15",
					performanceDuration: 300,
				},
				{
					...validArtistData,
					email: "other@example.com",
					performanceDate: "2024-01-15",
					performanceDuration: 300,
				},
			];

			const result = DataIntegrityChecker.checkBatchIntegrity(profiles);

			expect(result.conflictingPerformanceDates).toHaveLength(1);
		});
	});
});
