import { z } from "zod";

// Base validation schemas
export const artistNameSchema = z
	.string()
	.min(1, "Artist name is required")
	.max(100, "Artist name must be less than 100 characters")
	.regex(/^[a-zA-Z0-9\s\-_'.&]+$/, "Artist name contains invalid characters");

export const emailSchema = z
	.string()
	.email("Invalid email format")
	.max(255, "Email must be less than 255 characters");

export const phoneSchema = z
	.string()
	.optional()
	.refine(
		(val) => !val || /^[\+]?[1-9][\d\s\-\(\)]{0,20}$/.test(val),
		"Invalid phone number format"
	);

export const urlSchema = z
	.string()
	.optional()
	.refine((val) => !val || /^https?:\/\/.+/.test(val), "Invalid URL format");

export const textFieldSchema = (maxLength: number, fieldName: string) =>
	z
		.string()
		.optional()
		.refine(
			(val) => !val || val.length <= maxLength,
			`${fieldName} must be less than ${maxLength} characters`
		);

// Enum schemas
export const costumeColorSchema = z.enum([
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
	"custom",
]);

export const lightColorSchema = z.enum([
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
	"trust",
]);

export const stagePositionSchema = z.enum([
	"upstage-left",
	"upstage-center",
	"upstage-right",
	"center-left",
	"center-stage",
	"center-right",
	"downstage-left",
	"downstage-center",
	"downstage-right",
	"custom",
]);

export const performanceTypeSchema = z.enum([
	"solo",
	"duo",
	"trio",
	"group",
	"band",
	"other",
]);

export const artistStatusSchema = z.enum([
	"pending",
	"approved",
	"active",
	"inactive",
	"rejected",
	"withdrawn",
]);

// Status history schema for tracking status changes
export const statusHistoryEntrySchema = z.object({
	id: z.string(),
	previousStatus: artistStatusSchema.nullable(),
	newStatus: artistStatusSchema,
	changedBy: z.string(), // User ID who made the change
	changedByName: z.string(), // Display name of user who made the change
	reason: z.string().optional(), // Optional reason for status change
	timestamp: z.string(), // ISO timestamp
	metadata: z.record(z.any()).optional(), // Additional metadata
});

export const statusHistorySchema = z.array(statusHistoryEntrySchema);

// Social media schema
export const socialMediaSchema = z.object({
	instagram: urlSchema,
	facebook: urlSchema,
	youtube: urlSchema,
	tiktok: urlSchema,
	website: urlSchema,
});

// Music track schema
export const musicTrackSchema = z.object({
	song_title: z
		.string()
		.min(1, "Song title is required")
		.max(200, "Song title must be less than 200 characters"),
	duration: z
		.number()
		.min(0, "Duration must be positive")
		.max(3600, "Duration cannot exceed 1 hour"),
	notes: textFieldSchema(500, "Track notes"),
	is_main_track: z.boolean(),
	tempo: textFieldSchema(50, "Tempo"),
	file_url: z.string().optional(),
	file_path: z.string().optional(),
	uploadedAt: z.string().optional(),
	fileSize: z.number().optional(),
	contentType: z.string().optional(),
});

// Gallery file schema
export const galleryFileSchema = z.object({
	name: z
		.string()
		.min(1, "File name is required")
		.max(255, "File name must be less than 255 characters"),
	type: z.enum(["image", "video"]),
	url: z.string().optional(),
	file_path: z.string().optional(),
	size: z.number().min(0, "File size must be positive"),
	uploadedAt: z.string().optional(),
	contentType: z.string().optional(),
	thumbnail: z.string().optional(),
});

// Base artist profile object schema (without refinements)
const baseArtistProfileSchema = z.object({
	id: z.string().optional(),
	artistName: artistNameSchema,
	realName: textFieldSchema(100, "Real name"),
	email: emailSchema,
	phone: phoneSchema,
	style: textFieldSchema(50, "Performance style"),
	performanceType: performanceTypeSchema.optional(),
	performanceDuration: z
		.number()
		.min(1, "Performance duration must be at least 1 minute")
		.max(60, "Performance duration cannot exceed 60 minutes"),
	biography: textFieldSchema(2000, "Biography"),
	eventId: z.string().min(1, "Event ID is required"),
	eventName: z.string().optional(),
	status: artistStatusSchema.optional(),
	statusHistory: statusHistorySchema.optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
	lastLogin: z.string().optional(),

	// Technical requirements
	costumeColor: costumeColorSchema,
	customCostumeColor: textFieldSchema(100, "Custom costume color"),
	lightColorSingle: lightColorSchema,
	lightColorTwo: lightColorSchema.optional(),
	lightColorThree: lightColorSchema.optional(),
	lightRequests: textFieldSchema(500, "Light requests"),
	stagePositionStart: stagePositionSchema.optional(),
	stagePositionEnd: stagePositionSchema.optional(),
	customStagePosition: textFieldSchema(200, "Custom stage position"),
	equipment: textFieldSchema(500, "Equipment"),
	specialRequirements: textFieldSchema(500, "Special requirements"),

	// Media files
	musicTracks: z.array(musicTrackSchema).optional(),
	galleryFiles: z.array(galleryFileSchema).optional(),

	// Social media and links
	socialMedia: socialMediaSchema.optional(),
	showLink: urlSchema,

	// Notes and communication
	mcNotes: textFieldSchema(1000, "MC notes"),
	stageManagerNotes: textFieldSchema(1000, "Stage manager notes"),
	notes: textFieldSchema(1000, "Notes"),
	performanceDate: z.string().optional(),
});

// Main artist profile schema with refinements
export const artistProfileSchema = baseArtistProfileSchema
	.refine(
		(data) => {
			// Custom costume color required when costume color is custom
			if (data.costumeColor === "custom" && !data.customCostumeColor) {
				return false;
			}
			return true;
		},
		{
			message:
				"Custom costume color is required when costume color is set to custom",
			path: ["customCostumeColor"],
		}
	)
	.refine(
		(data) => {
			// Custom stage position required when position is custom
			if (
				(data.stagePositionStart === "custom" ||
					data.stagePositionEnd === "custom") &&
				!data.customStagePosition
			) {
				return false;
			}
			return true;
		},
		{
			message:
				"Custom stage position is required when position is set to custom",
			path: ["customStagePosition"],
		}
	)
	.refine(
		(data) => {
			// At least one main track if music tracks exist
			if (data.musicTracks && data.musicTracks.length > 0) {
				const mainTracks = data.musicTracks.filter(
					(track) => track.is_main_track
				);
				return mainTracks.length === 1;
			}
			return true;
		},
		{
			message: "Exactly one track must be marked as the main track",
			path: ["musicTracks"],
		}
	);

// File upload validation schema
export const fileUploadSchema = z.object({
	file: z.instanceof(File),
	type: z.enum(["audio", "video", "image"]),
	maxSize: z.number().optional(),
});

// Batch artist validation schema
export const batchArtistSchema = z.array(artistProfileSchema);

// API request schemas (using base schema to avoid ZodEffects issues)
export const createArtistRequestSchema = baseArtistProfileSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	lastLogin: true,
});

export const updateArtistRequestSchema = baseArtistProfileSchema
	.partial()
	.extend({
		id: z.string().min(1, "Artist ID is required"),
	});

export const assignPerformanceDateSchema = z.object({
	artistId: z.string().min(1, "Artist ID is required"),
	performanceDate: z.string().nullable(),
});

// Status update schema
export const updateArtistStatusSchema = z.object({
	artistId: z.string().min(1, "Artist ID is required"),
	newStatus: artistStatusSchema,
	reason: z.string().optional(),
	changedBy: z.string().min(1, "Changed by user ID is required"),
	changedByName: z.string().min(1, "Changed by user name is required"),
});

// Status transition validation
export const statusTransitionSchema = z
	.object({
		from: artistStatusSchema.nullable(),
		to: artistStatusSchema,
	})
	.refine(
		(data) => {
			// Define valid status transitions
			const validTransitions: Record<string, string[]> = {
				null: ["pending"], // Initial status
				pending: ["approved", "rejected", "withdrawn"],
				approved: ["active", "inactive", "withdrawn"],
				active: ["inactive", "withdrawn"],
				inactive: ["active", "withdrawn"],
				rejected: ["pending"], // Can reapply
				withdrawn: ["pending"], // Can reapply
			};

			const fromStatus = data.from || "null";
			const allowedTransitions = validTransitions[fromStatus] || [];

			return allowedTransitions.includes(data.to);
		},
		{
			message: "Invalid status transition",
			path: ["to"],
		}
	);

// Type exports
export type ArtistProfile = z.infer<typeof artistProfileSchema>;
export type MusicTrack = z.infer<typeof musicTrackSchema>;
export type GalleryFile = z.infer<typeof galleryFileSchema>;
export type SocialMedia = z.infer<typeof socialMediaSchema>;
export type CreateArtistRequest = z.infer<typeof createArtistRequestSchema>;
export type UpdateArtistRequest = z.infer<typeof updateArtistRequestSchema>;
export type AssignPerformanceDateRequest = z.infer<
	typeof assignPerformanceDateSchema
>;
export type StatusHistoryEntry = z.infer<typeof statusHistoryEntrySchema>;
export type UpdateArtistStatusRequest = z.infer<
	typeof updateArtistStatusSchema
>;
export type StatusTransition = z.infer<typeof statusTransitionSchema>;
