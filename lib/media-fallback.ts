/**
 * Media Fallback Utilities
 * Handles cases where media files don't have proper GCS paths
 */

export interface MediaFile {
	name: string;
	url?: string;
	file_path?: string;
	file_url?: string;
	contentType?: string;
	size?: number;
}

export class MediaFallback {
	/**
	 * Check if a URL is a blob URL that will expire
	 */
	static isBlobUrl(url?: string): boolean {
		return !!(url && url.startsWith("blob:"));
	}

	/**
	 * Check if a media file has a valid GCS path
	 */
	static hasValidPath(file: MediaFile): boolean {
		return !!(file.file_path && file.file_path.length > 0);
	}

	/**
	 * Get the best available URL for a media file
	 */
	static getBestUrl(file: MediaFile): string | null {
		// Prefer file_url over url
		const url = file.file_url || file.url;

		// If it's a blob URL and we don't have a path, it's unusable
		if (this.isBlobUrl(url) && !this.hasValidPath(file)) {
			return null;
		}

		return url || null;
	}

	/**
	 * Get error message for media file issues
	 */
	static getErrorMessage(
		file: MediaFile,
		fileType: "audio" | "video" | "image"
	): string {
		const url = file.file_url || file.url;

		if (this.isBlobUrl(url)) {
			if (!this.hasValidPath(file)) {
				return `${
					fileType.charAt(0).toUpperCase() + fileType.slice(1)
				} file is not properly stored in cloud storage. Please re-upload the file.`;
			} else {
				return `${
					fileType.charAt(0).toUpperCase() + fileType.slice(1)
				} file reference expired. Attempting to refresh...`;
			}
		}

		if (!url) {
			return `No ${fileType} file URL available. Please re-upload the file.`;
		}

		return `Failed to load ${fileType} file. Please check the file format and try again.`;
	}

	/**
	 * Check if a file can be recovered (has a valid path for URL refresh)
	 */
	static canRecover(file: MediaFile): boolean {
		return this.hasValidPath(file);
	}

	/**
	 * Get supported formats for a media type
	 */
	static getSupportedFormats(
		fileType: "audio" | "video" | "image"
	): string[] {
		switch (fileType) {
			case "audio":
				return ["MP3", "WAV", "OGG", "M4A", "AAC"];
			case "video":
				return ["MP4", "WebM", "OGV", "AVI", "MOV"];
			case "image":
				return ["JPEG", "PNG", "GIF", "WebP"];
			default:
				return [];
		}
	}

	/**
	 * Get format recommendation message
	 */
	static getFormatRecommendation(
		fileType: "audio" | "video" | "image"
	): string {
		const formats = this.getSupportedFormats(fileType);
		return `Supported ${fileType} formats: ${formats.join(", ")}`;
	}
}
