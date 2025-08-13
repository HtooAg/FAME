"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Play,
	Pause,
	Volume2,
	AlertCircle,
	RefreshCw,
	Download,
	ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
	MediaErrorBoundary,
	useMediaErrorHandler,
} from "@/components/ui/media-error-boundary";

interface MusicTrack {
	song_title: string;
	duration: number;
	notes: string;
	is_main_track: boolean;
	tempo: string;
	file_url: string;
	file_path?: string;
}

interface AudioPlayerProps {
	track: MusicTrack;
	onError?: (error: string) => void;
	className?: string;
}

export function AudioPlayer({
	track,
	onError,
	className = "",
}: AudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [networkError, setNetworkError] = useState(false);
	const audioRef = useRef<HTMLAudioElement>(null);
	const { toast } = useToast();
	const { error, retryCount, handleError, retry, clearError } =
		useMediaErrorHandler("audio");

	// Helper function to format duration
	const formatDuration = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Check if URL is a blob URL that needs refreshing
	const isBlobUrl = (url: string) => {
		return (
			typeof url === "string" &&
			(url.startsWith("blob:") || url === "" || !url)
		);
	};

	// Refresh the audio URL if it's a blob URL
	const refreshAudioUrl = async () => {
		if (!track.file_path) {
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
				body: JSON.stringify({ filePath: track.file_path }),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const { signedUrl } = await response.json();
			return signedUrl;
		} catch (error: any) {
			const errorMsg = `Failed to refresh audio URL: ${error.message}`;
			handleError(errorMsg);
			onError?.(errorMsg);
			return null;
		} finally {
			setIsLoading(false);
		}
	};

	const handlePlay = async () => {
		if (!audioRef.current) return;

		// Check if we need to refresh the URL
		if (isBlobUrl(track.file_url)) {
			const newUrl = await refreshAudioUrl();
			if (!newUrl) return;

			audioRef.current.src = newUrl;
		}

		try {
			clearError();
			await audioRef.current.play();
			setIsPlaying(true);
		} catch (error: any) {
			const errorMsg = `Failed to play audio: ${error.message}`;
			handleError(errorMsg);
			onError?.(errorMsg);
			setIsPlaying(false);
		}
	};

	const handlePause = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			setIsPlaying(false);
		}
	};

	const handleAudioError = async (event?: Event) => {
		console.error("Audio error occurred", event);
		setIsPlaying(false);
		setIsLoading(false);

		// Determine error type
		let errorMessage = "Audio file could not be played";

		if (event && audioRef.current) {
			const audio = audioRef.current;
			switch (audio.error?.code) {
				case MediaError.MEDIA_ERR_ABORTED:
					errorMessage = "Audio playback was aborted";
					break;
				case MediaError.MEDIA_ERR_NETWORK:
					errorMessage = "Network error while loading audio";
					setNetworkError(true);
					break;
				case MediaError.MEDIA_ERR_DECODE:
					errorMessage =
						"Audio file is corrupted or in an unsupported format";
					break;
				case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
					errorMessage = "Audio format not supported by your browser";
					break;
				default:
					errorMessage = "Unknown audio playback error";
			}
		}

		// Try to refresh the URL if it's a blob URL and this is the first error
		if (isBlobUrl(track.file_url) && track.file_path && retryCount === 0) {
			setIsLoading(true);
			const newUrl = await refreshAudioUrl();
			if (newUrl && audioRef.current) {
				audioRef.current.src = newUrl;
				setIsLoading(false);
				return; // Don't set error, let user try again
			}
			setIsLoading(false);
		}

		handleError(errorMessage);
		onError?.(errorMessage);
	};

	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
		}
	};

	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	};

	const handleEnded = () => {
		setIsPlaying(false);
		setCurrentTime(0);
	};

	// Adapter to satisfy React's event handler typing (expects ReactEventHandler returning void)
	const onAudioElementError: React.ReactEventHandler<HTMLAudioElement> = (e) => {
		// Bridge SyntheticEvent to our async handler using nativeEvent
		void handleAudioError(e.nativeEvent as Event);
	};

	const handleRetry = async () => {
		clearError();
		setNetworkError(false);
		setIsLoading(true);

		try {
			if (isBlobUrl(track.file_url) && track.file_path) {
				const newUrl = await refreshAudioUrl();
				if (newUrl && audioRef.current) {
					audioRef.current.src = newUrl;
				}
			} else if (audioRef.current) {
				// Force reload the audio element
				audioRef.current.load();
			}
		} catch (err) {
			handleError("Failed to retry audio loading");
		} finally {
			setIsLoading(false);
		}

		retry();
	};

	const handleDownload = () => {
		if (track.file_url && !isBlobUrl(track.file_url)) {
			const link = document.createElement("a");
			link.href = track.file_url;
			link.download = track.song_title || "audio-track";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} else {
			toast({
				title: "Download unavailable",
				description: "Audio file is not accessible for download",
				variant: "destructive",
			});
		}
	};

	useEffect(() => {
		// Reset state when track changes
		setIsPlaying(false);
		clearError();
		setCurrentTime(0);
		setDuration(0);
	}, [track.file_url, track.song_title]);

	return (
		<MediaErrorBoundary
			mediaType="audio"
			fileName={track.song_title}
			fileUrl={track.file_url}
			onError={(err) => handleError(err.message)}
		>
			<div className={`border rounded-lg p-4 space-y-3 ${className}`}>
				<div className="flex items-center justify-between">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<h4 className="font-medium truncate">
								{track.song_title}
							</h4>
							{track.is_main_track && (
								<Badge variant="secondary" className="text-xs">
									Main Track
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground">
							Duration: {formatDuration(track.duration)} • Tempo:{" "}
							{track.tempo}
						</p>
						{track.notes && (
							<p className="text-xs text-muted-foreground mt-1">
								DJ Notes: {track.notes}
							</p>
						)}
					</div>

					<div className="flex items-center gap-2 ml-4">
						{error ? (
							<div className="flex items-center gap-2">
								<AlertCircle className="h-4 w-4 text-destructive" />
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
								{track.file_url &&
									!isBlobUrl(track.file_url) && (
										<Button
											variant="outline"
											size="sm"
											onClick={handleDownload}
											className="flex items-center gap-1"
										>
											<Download className="h-3 w-3" />
										</Button>
									)}
							</div>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={isPlaying ? handlePause : handlePlay}
								disabled={isLoading || !track.file_url}
								className="flex items-center gap-1"
							>
								{isLoading ? (
									<RefreshCw className="h-4 w-4 animate-spin" />
								) : isPlaying ? (
									<Pause className="h-4 w-4" />
								) : (
									<Play className="h-4 w-4" />
								)}
							</Button>
						)}

						{!error && track.file_url && (
							<Volume2 className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				</div>

				{error && (
					<div className="bg-destructive/10 border border-destructive/20 rounded p-2">
						<div className="flex items-center justify-between">
							<p className="text-sm text-destructive">{error}</p>
							{networkError && (
								<span className="text-xs text-muted-foreground">
									Network issue detected
								</span>
							)}
						</div>
					</div>
				)}

				{/* Progress bar */}
				{!error && duration > 0 && (
					<div className="space-y-1">
						<div className="w-full bg-muted rounded-full h-1">
							<div
								className="bg-primary h-1 rounded-full transition-all duration-100"
								style={{
									width: `${(currentTime / duration) * 100}%`,
								}}
							></div>
						</div>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>{formatDuration(currentTime)}</span>
							<span>{formatDuration(duration)}</span>
						</div>
					</div>
				)}

				{/* Hidden audio element */}
				<audio
					ref={audioRef}
					src={
						!isBlobUrl(track.file_url) ? track.file_url : undefined
					}
					onError={onAudioElementError}
					onTimeUpdate={handleTimeUpdate}
					onLoadedMetadata={handleLoadedMetadata}
					onEnded={handleEnded}
					preload="metadata"
				/>
			</div>
		</MediaErrorBoundary>
	);
}
