"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MediaErrorHandlerProps {
	fileName: string;
	fileType: "audio" | "video" | "image";
	error: string;
	onRetry?: () => void;
	onReupload?: () => void;
	className?: string;
}

export function MediaErrorHandler({
	fileName,
	fileType,
	error,
	onRetry,
	onReupload,
	className = "",
}: MediaErrorHandlerProps) {
	const [isRetrying, setIsRetrying] = useState(false);

	const handleRetry = async () => {
		if (!onRetry) return;

		setIsRetrying(true);
		try {
			await onRetry();
		} finally {
			setIsRetrying(false);
		}
	};

	const getErrorMessage = () => {
		if (error.includes("blob:")) {
			return `${
				fileType.charAt(0).toUpperCase() + fileType.slice(1)
			} file reference expired. The file needs to be re-uploaded.`;
		}
		if (error.includes("file path")) {
			return `${
				fileType.charAt(0).toUpperCase() + fileType.slice(1)
			} file is not properly stored. Please re-upload the file.`;
		}
		if (error.includes("format") || error.includes("supported")) {
			return `${
				fileType.charAt(0).toUpperCase() + fileType.slice(1)
			} format not supported. Please use a compatible format.`;
		}
		return error;
	};

	const getSupportedFormats = () => {
		switch (fileType) {
			case "audio":
				return "Supported formats: MP3, WAV, OGG, M4A, AAC";
			case "video":
				return "Supported formats: MP4, WebM, OGV, AVI, MOV";
			case "image":
				return "Supported formats: JPEG, PNG, GIF, WebP";
			default:
				return "";
		}
	};

	return (
		<div
			className={`p-4 border rounded-lg bg-red-50 border-red-200 ${className}`}
		>
			<Alert>
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>
					<div className="space-y-2">
						<p className="font-medium text-red-800">
							Error loading {fileName}
						</p>
						<p className="text-red-700 text-sm">
							{getErrorMessage()}
						</p>
						<p className="text-red-600 text-xs">
							{getSupportedFormats()}
						</p>
					</div>
				</AlertDescription>
			</Alert>

			<div className="flex gap-2 mt-3">
				{onRetry && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRetry}
						disabled={isRetrying}
						className="text-red-700 border-red-300 hover:bg-red-100"
					>
						<RefreshCw
							className={`h-3 w-3 mr-1 ${
								isRetrying ? "animate-spin" : ""
							}`}
						/>
						{isRetrying ? "Retrying..." : "Retry"}
					</Button>
				)}

				{onReupload && (
					<Button
						variant="outline"
						size="sm"
						onClick={onReupload}
						className="text-red-700 border-red-300 hover:bg-red-100"
					>
						<Upload className="h-3 w-3 mr-1" />
						Re-upload File
					</Button>
				)}
			</div>
		</div>
	);
}
