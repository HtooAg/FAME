"use client";

import React, { useState, useRef } from "react";
import ReactPlayer from "react-player";
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

interface EnhancedMediaPlayerProps {
	url: string;
	type: "audio" | "video";
	title?: string;
	className?: string;
	onError?: (error: string) => void;
}

export function EnhancedMediaPlayer({
	url,
	type,
	title,
	className = "",
	onError,
}: EnhancedMediaPlayerProps) {
	const [playing, setPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [played, setPlayed] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	// Use a permissive ref type because ReactPlayer's default export is a component value, not a type.
	// This avoids TS2749 (value used as a type) while keeping ref usage intact.
	const playerRef = useRef<any>(null);
	const { toast } = useToast();

	// Use an any-typed alias to avoid ReactPlayer prop type incompatibilities in our setup
	const ReactPlayerAny = ReactPlayer as unknown as React.ComponentType<any>;

	const handlePlay = () => {
		setPlaying(true);
		setError(null);
	};

	const handlePause = () => {
		setPlaying(false);
	};

	const handleError = (error: any) => {
		console.error("Media player error:", error);
		setPlaying(false);
		setLoading(false);

		let errorMessage = "Failed to load media file";

		if (error && error.message) {
			errorMessage = error.message;
		} else if (typeof error === "string") {
			errorMessage = error;
		}

		// Check for common error types
		if (
			errorMessage.includes("404") ||
			errorMessage.includes("not found")
		) {
			errorMessage = "Media file not found";
		} else if (
			errorMessage.includes("403") ||
			errorMessage.includes("access")
		) {
			errorMessage = "Access denied to media file";
		} else if (
			errorMessage.includes("network") ||
			errorMessage.includes("fetch")
		) {
			errorMessage = "Network error loading media";
		}

		setError(errorMessage);
		onError?.(errorMessage);

		toast({
			title: "Media Error",
			description: errorMessage,
			variant: "destructive",
		});
	};

	const handleProgress = (state: any) => {
		setPlayed(state.played);
	};

	const handleDuration = (duration: number) => {
		setDuration(duration);
	};

	const handleReady = () => {
		setLoading(false);
		setError(null);
	};

	const handleBuffer = () => {
		setLoading(true);
	};

	const handleBufferEnd = () => {
		setLoading(false);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const handleDownload = () => {
		if (url) {
			const link = document.createElement("a");
			link.href = url;
			link.download = title || "media-file";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	if (error) {
		return (
			<div className={`border rounded-lg p-4 ${className}`}>
				<div className="flex items-center gap-3">
					<AlertCircle className="h-5 w-5 text-destructive" />
					<div className="flex-1">
						<p className="text-sm font-medium text-destructive">
							Media Error
						</p>
						<p className="text-xs text-muted-foreground">{error}</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setError(null);
								setPlaying(false);
							}}
						>
							<RefreshCw className="h-3 w-3 mr-1" />
							Retry
						</Button>
						{url && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleDownload}
							>
								<Download className="h-3 w-3" />
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`border rounded-lg overflow-hidden ${className}`}>
			{title && (
				<div className="px-4 py-2 bg-muted/50 border-b">
					<div className="flex items-center justify-between">
						<h4 className="font-medium text-sm">{title}</h4>
						<Badge variant="secondary" className="text-xs">
							{type.toUpperCase()}
						</Badge>
					</div>
				</div>
			)}

			<div className="relative">
				<ReactPlayerAny
					ref={playerRef}
					url={url}
					playing={playing}
					controls={type === "video"}
					width="100%"
					height={type === "video" ? "200px" : "60px"}
					onPlay={handlePlay}
					onPause={handlePause}
					onError={handleError}
					onProgress={handleProgress}
					onDuration={handleDuration}
					onReady={handleReady}
					onBuffer={handleBuffer}
					onBufferEnd={handleBufferEnd}
				/>

				{loading && (
					<div className="absolute inset-0 bg-black/20 flex items-center justify-center">
						<RefreshCw className="h-6 w-6 animate-spin text-white" />
					</div>
				)}
			</div>

			{type === "audio" && (
				<div className="p-4 space-y-3">
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							size="sm"
							onClick={playing ? handlePause : handlePlay}
							disabled={loading}
						>
							{playing ? (
								<Pause className="h-4 w-4" />
							) : (
								<Play className="h-4 w-4" />
							)}
						</Button>

						<Volume2 className="h-4 w-4 text-muted-foreground" />

						<div className="flex-1">
							<div className="w-full bg-muted rounded-full h-2">
								<div
									className="bg-primary h-2 rounded-full transition-all duration-100"
									style={{ width: `${played * 100}%` }}
								/>
							</div>
						</div>

						<div className="text-xs text-muted-foreground">
							{formatTime(duration * played)} /{" "}
							{formatTime(duration)}
						</div>
					</div>

					<div className="flex justify-between items-center">
						<div className="flex gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleDownload}
							>
								<Download className="h-3 w-3 mr-1" />
								Download
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => window.open(url, "_blank")}
							>
								<ExternalLink className="h-3 w-3 mr-1" />
								Open
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
