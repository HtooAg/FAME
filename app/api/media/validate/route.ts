import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_AUDIO_FORMATS = [
	"audio/mpeg", // MP3
	"audio/wav", // WAV
	"audio/ogg", // OGG
	"audio/mp4", // M4A
	"audio/aac", // AAC
];

const SUPPORTED_VIDEO_FORMATS = [
	"video/mp4", // MP4
	"video/webm", // WebM
	"video/ogg", // OGV
	"video/avi", // AVI
	"video/mov", // MOV
	"video/quicktime", // MOV
];

const SUPPORTED_IMAGE_FORMATS = [
	"image/jpeg", // JPEG
	"image/jpg", // JPG
	"image/png", // PNG
	"image/gif", // GIF
	"image/webp", // WebP
];

export async function POST(request: NextRequest) {
	try {
		const { fileName, contentType, fileSize } = await request.json();

		if (!fileName || !contentType) {
			return NextResponse.json(
				{
					success: false,
					error: "File name and content type are required",
				},
				{ status: 400 }
			);
		}

		const validation = {
			isValid: false,
			fileType: "",
			supportedFormats: [] as string[],
			errors: [] as string[],
			warnings: [] as string[],
		};

		// Determine file type
		if (SUPPORTED_AUDIO_FORMATS.includes(contentType)) {
			validation.fileType = "audio";
			validation.supportedFormats = SUPPORTED_AUDIO_FORMATS;
			validation.isValid = true;

			// Audio-specific validations
			if (fileSize && fileSize > 50 * 1024 * 1024) {
				// 50MB
				validation.warnings.push(
					"Audio file is larger than 50MB. Consider compressing for better performance."
				);
			}
		} else if (SUPPORTED_VIDEO_FORMATS.includes(contentType)) {
			validation.fileType = "video";
			validation.supportedFormats = SUPPORTED_VIDEO_FORMATS;
			validation.isValid = true;

			// Video-specific validations
			if (fileSize && fileSize > 200 * 1024 * 1024) {
				// 200MB
				validation.warnings.push(
					"Video file is larger than 200MB. Consider compressing for better performance."
				);
			}
		} else if (SUPPORTED_IMAGE_FORMATS.includes(contentType)) {
			validation.fileType = "image";
			validation.supportedFormats = SUPPORTED_IMAGE_FORMATS;
			validation.isValid = true;

			// Image-specific validations
			if (fileSize && fileSize > 10 * 1024 * 1024) {
				// 10MB
				validation.warnings.push(
					"Image file is larger than 10MB. Consider compressing for better performance."
				);
			}
		} else {
			validation.errors.push(`Unsupported file format: ${contentType}`);

			// Suggest alternatives based on file extension
			const extension = fileName.split(".").pop()?.toLowerCase();
			if (["mp3", "wav", "ogg", "m4a", "aac"].includes(extension || "")) {
				validation.errors.push(
					"For audio files, please use: MP3, WAV, OGG, M4A, or AAC format."
				);
			} else if (
				["mp4", "webm", "ogv", "avi", "mov"].includes(extension || "")
			) {
				validation.errors.push(
					"For video files, please use: MP4, WebM, OGV, AVI, or MOV format."
				);
			} else if (
				["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")
			) {
				validation.errors.push(
					"For image files, please use: JPEG, PNG, GIF, or WebP format."
				);
			}
		}

		// Browser compatibility checks
		if (validation.isValid) {
			if (validation.fileType === "audio") {
				if (
					!["audio/mpeg", "audio/wav", "audio/ogg"].includes(
						contentType
					)
				) {
					validation.warnings.push(
						"This audio format may not be supported in all browsers. MP3, WAV, or OGG are recommended."
					);
				}
			} else if (validation.fileType === "video") {
				if (!["video/mp4", "video/webm"].includes(contentType)) {
					validation.warnings.push(
						"This video format may not be supported in all browsers. MP4 or WebM are recommended."
					);
				}
			}
		}

		return NextResponse.json({
			success: true,
			validation,
		});
	} catch (error: any) {
		console.error("Error validating media file:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to validate media file",
			},
			{ status: 500 }
		);
	}
}
