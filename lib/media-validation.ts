/**
 * Media validation utilities for file upload and playback
 */

export interface MediaValidationResult {
	isValid: boolean;
	error?: string;
	suggestions?: string[];
}

export interface MediaFileInfo {
	name: string;
	size: number;
	type: string;
	lastModified?: number;
}

// Supported file types
export const SUPPORTED_MEDIA_TYPES = {
	audio: {
		mimeTypes: [
			"audio/mpeg",
			"audio/mp3",
			"audio/wav",
			"audio/ogg",
			"audio/mp4",
			"audio/aac",
			"audio/flac",
			"audio/webm",
			"audio/x-m4a",
			"audio/m4a",
		],
		extensions: [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm", ".flac"],
		maxSize: 10 * 1024 * 1024, // 10MB
	},
	video: {
		mimeTypes: [
			"video/mp4",
			"video/webm",
			"video/ogg",
			"video/avi",
			"video/mov",
			"video/quicktime",
			"video/x-msvideo",
			"video/3gpp",
			"video/x-flv",
		],
		extensions: [".mp4", ".webm", ".ogg", ".avi", ".mov", ".3gp", ".flv"],
		maxSize: 50 * 1024 * 1024, // 50MB
	},
	image: {
		mimeTypes: [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
		],
		extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
		maxSize: 5 * 1024 * 1024, // 5MB
	},
};

/**
 * Validate a media file for upload
 */
export function validateMediaFile(
	file: MediaFileInfo,
	mediaType: "audio" | "video" | "image"
): MediaValidationResult {
	const config = SUPPORTED_MEDIA_TYPES[mediaType];
	const suggestions: string[] = [];

	// Check file size
	if (file.size > config.maxSize) {
		const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
		const fileSizeMB = Math.round(file.size / (1024 * 1024));
		return {
			isValid: false,
			error: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit for ${mediaType} files`,
			suggestions: [
				`Compress the ${mediaType} file to reduce its size`,
				`Use a ${mediaType} editing tool to reduce quality/resolution`,
				"Contact support if you need to upload larger files",
			],
		};
	}

	// Check MIME type
	if (!config.mimeTypes.includes(file.type)) {
		return {
			isValid: false,
			error: `Unsupported ${mediaType} format: ${file.type}`,
			suggestions: [
				`Supported ${mediaType} formats: ${config.extensions.join(
					", "
				)}`,
				`Convert your file to one of the supported formats`,
				"Use a file converter tool or media editing software",
			],
		};
	}

	// Check file extension
	const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
	if (!config.extensions.includes(fileExtension)) {
		suggestions.push(
			`File extension ${fileExtension} may not be fully supported`,
			`Recommended extensions: ${config.extensions.join(", ")}`
		);
	}

	// Check for empty files
	if (file.size === 0) {
		return {
			isValid: false,
			error: "File appears to be empty or corrupted",
			suggestions: [
				"Check that the file is not corrupted",
				"Try uploading a different file",
				"Re-export the file from your editing software",
			],
		};
	}

	// Check for very small files (might be corrupted)
	const minSize = mediaType === "image" ? 1024 : 10240; // 1KB for images, 10KB for audio/video
	if (file.size < minSize) {
		suggestions.push(
			"File is very small and might be corrupted",
			"Verify the file plays correctly before uploading"
		);
	}

	return {
		isValid: true,
		suggestions: suggestions.length > 0 ? suggestions : undefined,
	};
}

/**
 * Get user-friendly error message for media playback errors
 */
export function getMediaPlaybackError(
	error: Error | string,
	mediaType: "audio" | "video" | "image"
): { message: string; suggestions: string[] } {
	const errorMessage = typeof error === "string" ? error : error.message;
	const suggestions: string[] = [];

	// Network errors
	if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
		return {
			message: `Network error loading ${mediaType}. Please check your internet connection.`,
			suggestions: [
				"Check your internet connection",
				"Try refreshing the page",
				"Contact support if the problem persists",
			],
		};
	}

	// File not found errors
	if (errorMessage.includes("404") || errorMessage.includes("not found")) {
		return {
			message: `${
				mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
			} file not found.`,
			suggestions: [
				"The file may have been moved or deleted",
				"Contact the artist or event organizer",
				"Try refreshing to reload the file list",
			],
		};
	}

	// Access denied errors
	if (
		errorMessage.includes("403") ||
		errorMessage.includes("access denied")
	) {
		return {
			message: `Access denied to ${mediaType} file.`,
			suggestions: [
				"The file may have restricted permissions",
				"Contact the event organizer for assistance",
				"Try refreshing to get a new access link",
			],
		};
	}

	// Format/codec errors
	if (
		errorMessage.includes("format") ||
		errorMessage.includes("codec") ||
		errorMessage.includes("MEDIA_ERR_SRC_NOT_SUPPORTED")
	) {
		return {
			message: `Unsupported ${mediaType} format for your browser.`,
			suggestions: [
				`Try opening the ${mediaType} in a different browser`,
				"Download the file to play in a local media player",
				"Update your browser to the latest version",
			],
		};
	}

	// Expired URL errors
	if (
		errorMessage.includes("expired") ||
		errorMessage.includes("signature")
	) {
		return {
			message: `${
				mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
			} access link has expired.`,
			suggestions: [
				"Refresh the page to get a new access link",
				"The file access link expires for security reasons",
			],
		};
	}

	// Blob URL errors
	if (
		errorMessage.includes("blob:") ||
		errorMessage.includes("not properly stored")
	) {
		return {
			message: `${
				mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
			} file is not properly stored in cloud storage.`,
			suggestions: [
				"The file may need to be re-uploaded",
				"Contact the artist to re-upload the file",
				"Try refreshing to reload the file",
			],
		};
	}

	// Generic error
	return {
		message: `Failed to load ${mediaType}: ${errorMessage}`,
		suggestions: [
			"Try refreshing the page",
			"Clear your browser cache",
			"Contact support if the issue continues",
		],
	};
}

/**
 * Check if a URL is a blob URL that needs refreshing
 */
export function isBlobUrl(url: string): boolean {
	return (
		typeof url === "string" &&
		(url.startsWith("blob:") || url === "" || !url)
	);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get media type from file extension or MIME type
 */
export function getMediaType(
	fileName: string,
	mimeType?: string
): "audio" | "video" | "image" | "unknown" {
	const extension = "." + fileName.split(".").pop()?.toLowerCase();

	if (mimeType) {
		if (mimeType.startsWith("audio/")) return "audio";
		if (mimeType.startsWith("video/")) return "video";
		if (mimeType.startsWith("image/")) return "image";
	}

	if (SUPPORTED_MEDIA_TYPES.audio.extensions.includes(extension))
		return "audio";
	if (SUPPORTED_MEDIA_TYPES.video.extensions.includes(extension))
		return "video";
	if (SUPPORTED_MEDIA_TYPES.image.extensions.includes(extension))
		return "image";

	return "unknown";
}

/**
 * Detect network connectivity issues
 */
export function detectNetworkIssue(error: Error | string): boolean {
	const errorMessage = typeof error === "string" ? error : error.message;
	return (
		errorMessage.includes("network") ||
		errorMessage.includes("fetch") ||
		errorMessage.includes("timeout") ||
		errorMessage.includes("connection") ||
		errorMessage.includes("offline")
	);
}
