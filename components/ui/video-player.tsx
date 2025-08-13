"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	AlertCircle,
	RefreshCw,
	Play,
	Download,
	ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
	MediaErrorBoundary,
	useMediaErrorHandler,
} from "@/components/ui/media-error-boundary";

interface GalleryFile {
	name: string;
	type: "image" | "video";
	url: string;
	file_path?: string;
	size: number;
	uploadedAt?: string;
	contentType?: string;
}

interface VideoPlayerProps {
	file: GalleryFile;
	onError?: (error: string) => void;
	className?: string;
}

export function VideoPlayer({
	file,
	onError,
	className = "",
}: VideoPlayerProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [videoUrl, setVideoUrl] = useState(file.url);
	const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
	const [networkError, setNetworkError] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const { toast } = useToast();
	const { error, retryCount, handleError, retry, clearError } =
		useMediaErrorHandler("video");

	// Check if URL is a blob URL that needs refreshing
	const isBlobUrl = (url: string) => {
		return (
			typeof url === "string" &&
			(url.startsWith("blob:") || url === "" || !url)
		);
	};

	// Format file size
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	// Refresh the video URL if it's a blob URL
	const refreshVideoUrl = async () => {
		if (!file.file_path) {
			const errorMsg = "No file path available to refresh URL";
			handleError(errorMsg);
			onError?.(errorMsg);
			return null;
		}

		setIsLoading(true);
		try {
			const response = await fetch("/api/media/signed-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath: file.file_path }),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const { signedUrl } = await response.json();
			setVideoUrl(signedUrl);
			clearError();
			setHasAttemptedRefresh(true);
			return signedUrl;
		} catch (error: any) {
			const errorMsg = `Failed to refresh video URL: ${error.message}`;
			handleError(errorMsg);
			onError?.(errorMsg);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	const handleVideoError = async (
    event?: React.SyntheticEvent<HTMLVideoElement, Event>
) => {
		console.error("Video error occurred for:", file.name, event);

		// Determine error type
		let errorMessage = "Video file could not be loaded or played";

		if (event && videoRef.current) {
			const video = videoRef.current;
			switch (video.error?.code) {
				case MediaError.MEDIA_ERR_ABORTED:
					errorMessage = "Video playback was aborted";
					break;
				case MediaError.MEDIA_ERR_NETWORK:
					errorMessage = "Network error while loading video";
					setNetworkError(true);
					break;
				case MediaError.MEDIA_ERR_DECODE:
					errorMessage =
						"Video file is corrupted or in an unsupported format";
					break;
				case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
					errorMessage = "Video format not supported by your browser";
					break;
				default:
					errorMessage = "Unknown video playback error";
			}
		}

		// Only try to refresh once to avoid infinite loops
		if (
			isBlobUrl(file.url) &&
			file.file_path &&
			!hasAttemptedRefresh &&
			retryCount === 0
		) {
			console.log("Attempting to refresh video URL...");
			await refreshVideoUrl();
		} else {
			handleError(errorMessage);
			onError?.(errorMessage);
		}
	};

	const handleRetry = async () => {
		clearError();
		setNetworkError(false);
		setHasAttemptedRefresh(false);
		setIsLoading(true);

		try {
			if (isBlobUrl(videoUrl) || isBlobUrl(file.url)) {
				await refreshVideoUrl();
			} else {
				// Reset video source to trigger reload
				if (videoRef.current) {
					videoRef.current.load();
				}
			}
		} catch (err) {
			handleError("Failed to retry video loading");
		} finally {
			setIsLoading(false);
		}

		retry();
	};

	const handleDownload = () => {
		if (videoUrl && !isBlobUrl(videoUrl)) {
			const link = document.createElement("a");
			link.href = videoUrl;
			link.download = file.name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else {
			toast({
				title: "Download unavailable",
				description: "Video URL is not accessible for download",
				variant: "destructive",
			});
		}
	};

	// Auto-refresh blob URLs on component mount
	useEffect(() => {
		if (isBlobUrl(file.url) && file.file_path && !hasAttemptedRefresh) {
			refreshVideoUrl();
		}
	}, [file.url, file.file_path]);

	// Reset state when file changes
	useEffect(() => {
		clearError();
		setHasAttemptedRefresh(false);
		setVideoUrl(file.url);
	}, [file.url, file.name]);

	if (error) {
		return (
			<MediaErrorBoundary
				mediaType="video"
				fileName={file.name}
				fileUrl={videoUrl}
				onError={(err) => handleError(err.message)}
			>
				<div
					className={`aspect-video bg-muted rounded-lg flex flex-col items-center justify-center p-4 ${className}`}
				>
					<div className="text-center space-y-3">
						<AlertCircle className="h-8 w-8 text-destructive mx-auto" />
						<div>
							<p className="text-sm font-medium text-destructive mb-1">
								Failed to load video
							</p>
							<p className="text-xs text-muted-foreground mb-3">
								{error}
							</p>
							{networkError && (
								<p className="text-xs text-orange-600 mb-2">
									Network connectivity issue detected
								</p>
							)}
							<div className="flex gap-2 justify-center">
								<Button
									variant="outline"
									size="sm"
									onClick={handleRetry}
									disabled={isLoading}
									className="flex items-center gap-1"
								>
									<RefreshCw
										className={`h-3 w-3 ${
											isLoading ? "animate-spin" : ""
										}`}
									/>
									Retry {retryCount > 0 && `(${retryCount})`}
								</Button>
								{videoUrl && !isBlobUrl(videoUrl) && (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={handleDownload}
											className="flex items-center gap-1"
										>
											<Download className="h-3 w-3" />
											Download
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												window.open(videoUrl, "_blank")
											}
											className="flex items-center gap-1"
										>
											<ExternalLink className="h-3 w-3" />
											Open
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</MediaErrorBoundary>
		);
	}

	if (isLoading) {
		return (
			<div
				className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className}`}
			>
				<div className="text-center space-y-2">
					<RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
					<p className="text-sm text-muted-foreground">
						Loading video...
					</p>
				</div>
			</div>
		);
	}

	return (
		<MediaErrorBoundary
			mediaType="video"
			fileName={file.name}
			fileUrl={videoUrl}
			onError={(err) => handleError(err.message)}
		>
			<div className={`space-y-2 ${className}`}>
				<div className="relative group">
					<video
						ref={videoRef}
						src={videoUrl}
						controls
						className="w-full aspect-video rounded-lg bg-black"
						onError={handleVideoError}
						preload="metadata"
						controlsList="nodownload"
					>
						Your browser does not support the video element.
					</video>

					{/* Overlay with file info */}
					<div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
						{file.name}
					</div>

					{/* Download button overlay */}
					{videoUrl && !isBlobUrl(videoUrl) && (
						<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleDownload}
								className="bg-black/70 hover:bg-black/90 text-white border-none"
							>
								<Download className="h-3 w-3" />
							</Button>
						</div>
					)}

					{/* Error indicator overlay */}
					{error && (
						<div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
							<div className="text-center text-white p-4">
								<AlertCircle className="h-6 w-6 mx-auto mb-2" />
								<p className="text-sm">Video Error</p>
								{networkError && (
									<p className="text-xs text-orange-300">
										Network Issue
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* File metadata */}
				<div className="text-xs text-muted-foreground space-y-1">
					<p className="font-medium truncate">{file.name}</p>
					<div className="flex justify-between">
						<span>Size: {formatFileSize(file.size)}</span>
						{file.uploadedAt && (
							<span>
								Uploaded:{" "}
								{new Date(file.uploadedAt).toLocaleDateString()}
							</span>
						)}
					</div>
				</div>
			</div>
		</MediaErrorBoundary>
	);
}

interface ImageViewerProps {
	file: GalleryFile;
	onError?: (error: string) => void;
	className?: string;
}

export function ImageViewer({
	file,
	onError,
	className = "",
}: ImageViewerProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [imageUrl, setImageUrl] = useState(file.url);
	const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
	const [networkError, setNetworkError] = useState(false);
	const { toast } = useToast();
	const { error, retryCount, handleError, retry, clearError } =
		useMediaErrorHandler("image");

	// Check if URL is a blob URL that needs refreshing
	const isBlobUrl = (url: string) => {
		return (
			typeof url === "string" &&
			(url.startsWith("blob:") || url === "" || !url)
		);
	};

	// Format file size
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	// Refresh the image URL if it's a blob URL
	const refreshImageUrl = async () => {
		if (!file.file_path) {
			const errorMsg = "No file path available to refresh URL";
			handleError(errorMsg);
			onError?.(errorMsg);
			return null;
		}

		setIsLoading(true);
		try {
			const response = await fetch("/api/media/signed-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ filePath: file.file_path }),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const { signedUrl } = await response.json();
			setImageUrl(signedUrl);
			clearError();
			setHasAttemptedRefresh(true);
			return signedUrl;
		} catch (error: any) {
			const errorMsg = `Failed to refresh image URL: ${error.message}`;
			handleError(errorMsg);
			onError?.(errorMsg);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	const handleImageError = async (
    event?: React.SyntheticEvent<HTMLImageElement, Event>
) => {
		console.error("Image error occurred for:", file.name, event);

		let errorMessage = "Image file could not be loaded";

		// Check if it's a network error
		if (event && (event.target as HTMLImageElement)?.complete === false) {
			errorMessage = "Network error while loading image";
			setNetworkError(true);
		}

		// Only try to refresh once to avoid infinite loops
		if (
			isBlobUrl(file.url) &&
			file.file_path &&
			!hasAttemptedRefresh &&
			retryCount === 0
		) {
			console.log("Attempting to refresh image URL...");
			await refreshImageUrl();
		} else {
			handleError(errorMessage);
			onError?.(errorMessage);
		}
	};

	const handleRetry = async () => {
		clearError();
		setNetworkError(false);
		setHasAttemptedRefresh(false);
		setIsLoading(true);

		try {
			if (isBlobUrl(imageUrl) || isBlobUrl(file.url)) {
				await refreshImageUrl();
			}
		} catch (err) {
			handleError("Failed to retry image loading");
		} finally {
			setIsLoading(false);
		}

		retry();
	};

	const handleDownload = () => {
		if (imageUrl && !isBlobUrl(imageUrl)) {
			const link = document.createElement("a");
			link.href = imageUrl;
			link.download = file.name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else {
			toast({
				title: "Download unavailable",
				description: "Image URL is not accessible for download",
				variant: "destructive",
			});
		}
	};

	// Auto-refresh blob URLs on component mount
	useEffect(() => {
		if (isBlobUrl(file.url) && file.file_path && !hasAttemptedRefresh) {
			refreshImageUrl();
		}
	}, [file.url, file.file_path]);

	// Reset state when file changes
	useEffect(() => {
		clearError();
		setHasAttemptedRefresh(false);
		setImageUrl(file.url);
	}, [file.url, file.name]);

	if (error) {
		return (
			<div
				className={`aspect-square bg-muted rounded-lg flex flex-col items-center justify-center p-4 ${className}`}
			>
				<div className="text-center space-y-3">
					<AlertCircle className="h-6 w-6 text-destructive mx-auto" />
					<div>
						<p className="text-sm font-medium text-destructive mb-1">
							Failed to load image
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							{error}
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={handleRetry}
							disabled={isLoading}
							className="flex items-center gap-1"
						>
							<RefreshCw
								className={`h-3 w-3 ${
									isLoading ? "animate-spin" : ""
								}`}
							/>
							Retry
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div
				className={`aspect-square bg-muted rounded-lg flex items-center justify-center ${className}`}
			>
				<div className="text-center space-y-2">
					<RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
					<p className="text-sm text-muted-foreground">
						Loading image...
					</p>
				</div>
			</div>
		);
	}

	return (
		<MediaErrorBoundary
			mediaType="image"
			fileName={file.name}
			fileUrl={imageUrl}
			onError={(err) => handleError(err.message)}
		>
			<div className={`space-y-2 ${className}`}>
				<div className="relative group">
					<img
						src={imageUrl}
						alt={file.name}
						className="w-full aspect-square object-cover rounded-lg"
						onError={handleImageError}
					/>

					{/* Download button overlay */}
					{imageUrl && !isBlobUrl(imageUrl) && (
						<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleDownload}
								className="bg-black/70 hover:bg-black/90 text-white border-none"
							>
								<Download className="h-3 w-3" />
							</Button>
						</div>
					)}

					{/* Error indicator overlay */}
					{error && (
						<div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
							<div className="text-center text-white p-2">
								<AlertCircle className="h-4 w-4 mx-auto mb-1" />
								<p className="text-xs">Image Error</p>
								{networkError && (
									<p className="text-xs text-orange-300">
										Network Issue
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				{/* File metadata */}
				<div className="text-xs text-muted-foreground space-y-1">
					<p className="font-medium truncate">{file.name}</p>
					<div className="flex justify-between">
						<span>Size: {formatFileSize(file.size)}</span>
						{file.uploadedAt && (
							<span>
								Uploaded:{" "}
								{new Date(file.uploadedAt).toLocaleDateString()}
							</span>
						)}
					</div>
				</div>
			</div>
		</MediaErrorBoundary>
	);
}
