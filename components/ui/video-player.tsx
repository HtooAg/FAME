"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
// Removed ReactPlayer to fix video playback issues
import { AlertCircle, RefreshCw, Download, ExternalLink } from "lucide-react";
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
	allowPlayback?: boolean; // If false, only show download option
}

export function VideoPlayer({
	file,
	onError,
	className = "",
	allowPlayback = true,
}: VideoPlayerProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [videoUrl, setVideoUrl] = useState(file.url);
	const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
	const [networkError, setNetworkError] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Check if URL is a blob URL that needs refreshing
	const isBlobUrl = (url: string) => {
		return (
			typeof url === "string" &&
			(url.startsWith("blob:") || url === "" || !url)
		);
	};

	// Debug: Log the file properties
	console.log("VideoPlayer initialized with:", {
		fileName: file.name,
		fileUrl: file.url,
		filePath: file.file_path,
		isBlob: isBlobUrl(file.url),
	});

	const { toast } = useToast();
	const { error, retryCount, handleError, retry, clearError } =
		useMediaErrorHandler("video");

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
			const errorMsg =
				"Video file is not properly stored in cloud storage. Please re-upload the file.";
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
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `HTTP ${response.status}`);
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
		setIsLoading(false);

		// Determine error type
		let errorMessage = "Video file could not be loaded or played";

		// HTML5 video error handling
		if (videoRef.current?.error) {
			const error = videoRef.current.error;
			switch (error.code) {
				case error.MEDIA_ERR_ABORTED:
					errorMessage = "Video playback was aborted";
					break;
				case error.MEDIA_ERR_NETWORK:
					errorMessage = "Network error while loading video";
					setNetworkError(true);
					break;
				case error.MEDIA_ERR_DECODE:
					errorMessage = "Video file format not supported";
					break;
				case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					errorMessage = "Video source not supported";
					break;
				default:
					errorMessage = "Unknown video error occurred";
			}
		}

		// Check if it's a blob URL error
		if (file.url && file.url.startsWith("blob:")) {
			if (!file.file_path) {
				errorMessage =
					"Video file is not properly stored in cloud storage. Please re-upload the file.";
			} else {
				errorMessage =
					"Video file reference expired. Attempting to refresh...";
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
			}
			// Video element will automatically reload with the new URL
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

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
			}
		};
	}, []);

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
						
						<div>
							
							
							{networkError && (
								<p className="text-xs text-orange-600 mb-2">
									Network connectivity issue detected
								</p>
							)}
							<div className="flex gap-2 justify-center">
								
								{videoUrl && !isBlobUrl(videoUrl) && (
									<>
										
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

	const finalVideoSrc =
		videoUrl && !isBlobUrl(videoUrl) ? videoUrl : undefined;

	// Debug: Log the final video src
	console.log("VideoPlayer - Final video src:", finalVideoSrc);
	console.log(
		"VideoPlayer - Video element will receive src:",
		finalVideoSrc ? "YES" : "NO"
	);
	console.log("VideoPlayer - Playback allowed:", allowPlayback);

	// If playback is not allowed, show download-only interface
	if (!allowPlayback) {
		return (
			<div className={`space-y-2 ${className}`}>
				<div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted-foreground/20">
					<div className="text-center space-y-3">
						<div className="h-12 w-12 bg-muted-foreground/10 rounded-lg flex items-center justify-center mx-auto">
							<svg
								className="h-6 w-6 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">
								Video Preview Restricted
							</p>
							<p className="text-xs text-muted-foreground mb-3">
								Video playback is only available on artist
								registration and dashboard pages
							</p>
						</div>
						{videoUrl && !isBlobUrl(videoUrl) && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleDownload}
								className="flex items-center gap-2"
							>
								<Download className="h-4 w-4" />
								Download Video
							</Button>
						)}
					</div>
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
						src={finalVideoSrc}
						controls
						className="w-full aspect-video rounded-lg bg-black"
						onError={handleVideoError}
						onLoadStart={() => {
							console.log(
								"VideoPlayer - Video element started loading"
							);
							setIsLoading(true);

							// Set a timeout to prevent infinite loading
							if (loadingTimeoutRef.current) {
								clearTimeout(loadingTimeoutRef.current);
							}
							loadingTimeoutRef.current = setTimeout(() => {
								console.log(
									"VideoPlayer - Loading timeout reached after 10 seconds"
								);
								setIsLoading(false);
								handleError("Video loading timed out");
							}, 10000); // 10 second timeout
						}}
						onCanPlay={() => {
							console.log(
								"VideoPlayer - Video can play, loading complete"
							);
							if (loadingTimeoutRef.current) {
								clearTimeout(loadingTimeoutRef.current);
							}
							setIsLoading(false);
							clearError();
						}}
						preload="metadata"
					>
						Your browser does not support the video tag.
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
	allowViewing?: boolean; // If false, only show download option
}

export function ImageViewer({
	file,
	onError,
	className = "",
	allowViewing = true,
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
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `HTTP ${response.status}`);
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

	// If viewing is not allowed, show download-only interface
	if (!allowViewing) {
		return (
			<div className={`space-y-2 ${className}`}>
				<div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted-foreground/20">
					<div className="text-center space-y-3">
						<div className="h-12 w-12 bg-muted-foreground/10 rounded-lg flex items-center justify-center mx-auto">
							<svg
								className="h-6 w-6 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-1">
								Image Preview Restricted
							</p>
							<p className="text-xs text-muted-foreground mb-3">
								Image viewing is only available on artist
								registration and dashboard pages
							</p>
						</div>
						{imageUrl && !isBlobUrl(imageUrl) && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleDownload}
								className="flex items-center gap-2"
							>
								<Download className="h-4 w-4" />
								Download Image
							</Button>
						)}
					</div>
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
