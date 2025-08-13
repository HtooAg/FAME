"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Download, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MediaErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: any) => void;
	mediaType?: "audio" | "video" | "image";
	fileName?: string;
	fileUrl?: string;
}

interface MediaErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: any;
	retryCount: number;
}

export class MediaErrorBoundary extends Component<
	MediaErrorBoundaryProps,
	MediaErrorBoundaryState
> {
	constructor(props: MediaErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: 0,
		};
	}

	static getDerivedStateFromError(
		error: Error
	): Partial<MediaErrorBoundaryState> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: any) {
		this.setState({
			error,
			errorInfo,
		});

		// Call the onError callback if provided
		this.props.onError?.(error, errorInfo);

		// Log error for debugging
		console.error(
			"Media Error Boundary caught an error:",
			error,
			errorInfo
		);
	}

	handleRetry = () => {
		this.setState((prevState) => ({
			hasError: false,
			error: null,
			errorInfo: null,
			retryCount: prevState.retryCount + 1,
		}));
	};

	handleDownload = () => {
		if (this.props.fileUrl) {
			const link = document.createElement("a");
			link.href = this.props.fileUrl;
			link.download = this.props.fileName || "media-file";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	};

	handleOpenInNewTab = () => {
		if (this.props.fileUrl) {
			window.open(this.props.fileUrl, "_blank");
		}
	};

	getErrorMessage = (): string => {
		const { error } = this.state;
		const { mediaType } = this.props;

		if (!error) return "Unknown error occurred";

		// Network-related errors
		if (
			error.message.includes("network") ||
			error.message.includes("fetch")
		) {
			return `Network error loading ${
				mediaType || "media"
			} file. Please check your connection.`;
		}

		// CORS errors
		if (
			error.message.includes("CORS") ||
			error.message.includes("cross-origin")
		) {
			return `Access denied for ${
				mediaType || "media"
			} file. The file may have restricted permissions.`;
		}

		// File not found errors
		if (
			error.message.includes("404") ||
			error.message.includes("not found")
		) {
			return `${
				mediaType || "Media"
			} file not found. It may have been moved or deleted.`;
		}

		// Format/codec errors
		if (
			error.message.includes("format") ||
			error.message.includes("codec")
		) {
			return `Unsupported ${
				mediaType || "media"
			} format. Your browser may not support this file type.`;
		}

		// Signed URL expiration
		if (
			error.message.includes("expired") ||
			error.message.includes("signature")
		) {
			return `${
				mediaType || "Media"
			} access link has expired. Please refresh to get a new link.`;
		}

		// Generic error
		return `Failed to load ${mediaType || "media"} file: ${error.message}`;
	};

	getSuggestions = (): string[] => {
		const { error } = this.state;
		const { mediaType } = this.props;
		const suggestions: string[] = [];

		if (!error) return suggestions;

		// Network-related suggestions
		if (
			error.message.includes("network") ||
			error.message.includes("fetch")
		) {
			suggestions.push("Check your internet connection");
			suggestions.push("Try refreshing the page");
			suggestions.push("Contact support if the problem persists");
		}

		// CORS/Access suggestions
		else if (
			error.message.includes("CORS") ||
			error.message.includes("cross-origin")
		) {
			suggestions.push("The file may have restricted access permissions");
			suggestions.push("Contact the event organizer for assistance");
		}

		// File not found suggestions
		else if (
			error.message.includes("404") ||
			error.message.includes("not found")
		) {
			suggestions.push("The file may have been moved or deleted");
			suggestions.push("Contact the artist or event organizer");
			suggestions.push("Try refreshing to reload the file list");
		}

		// Format/codec suggestions
		else if (
			error.message.includes("format") ||
			error.message.includes("codec")
		) {
			suggestions.push(
				`Try opening the ${mediaType} in a different browser`
			);
			suggestions.push(
				"Download the file to play in a local media player"
			);
			suggestions.push("Update your browser to the latest version");
		}

		// Expired URL suggestions
		else if (
			error.message.includes("expired") ||
			error.message.includes("signature")
		) {
			suggestions.push("Refresh the page to get a new access link");
			suggestions.push("The file access link has expired for security");
		}

		// Generic suggestions
		else {
			suggestions.push("Try refreshing the page");
			suggestions.push("Clear your browser cache");
			suggestions.push("Contact support if the issue continues");
		}

		return suggestions;
	};

	render() {
		if (this.state.hasError) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const errorMessage = this.getErrorMessage();
			const suggestions = this.getSuggestions();
			const { mediaType, fileName, fileUrl } = this.props;
			const { retryCount } = this.state;

			return (
				<Card className="border-destructive/20 bg-destructive/5">
					<CardContent className="p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
							<div className="flex-1 space-y-3">
								<div>
									<h4 className="font-medium text-destructive mb-1">
										{mediaType
											? `${
													mediaType
														.charAt(0)
														.toUpperCase() +
													mediaType.slice(1)
											  } Error`
											: "Media Error"}
									</h4>
									<p className="text-sm text-muted-foreground">
										{errorMessage}
									</p>
									{fileName && (
										<p className="text-xs text-muted-foreground mt-1">
											File: {fileName}
										</p>
									)}
								</div>

								{suggestions.length > 0 && (
									<div>
										<p className="text-xs font-medium text-muted-foreground mb-1">
											Suggestions:
										</p>
										<ul className="text-xs text-muted-foreground space-y-0.5">
											{suggestions.map(
												(suggestion, index) => (
													<li
														key={index}
														className="flex items-start gap-1"
													>
														<span className="text-muted-foreground/60">
															•
														</span>
														<span>
															{suggestion}
														</span>
													</li>
												)
											)}
										</ul>
									</div>
								)}

								<div className="flex flex-wrap gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={this.handleRetry}
										className="flex items-center gap-1"
									>
										<RefreshCw className="h-3 w-3" />
										Retry{" "}
										{retryCount > 0 && `(${retryCount})`}
									</Button>

									{fileUrl && (
										<>
											<Button
												variant="outline"
												size="sm"
												onClick={this.handleDownload}
												className="flex items-center gap-1"
											>
												<Download className="h-3 w-3" />
												Download
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={
													this.handleOpenInNewTab
												}
												className="flex items-center gap-1"
											>
												<ExternalLink className="h-3 w-3" />
												Open in New Tab
											</Button>
										</>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			);
		}

		return this.props.children;
	}
}

// Hook version for functional components
export function useMediaErrorHandler(mediaType?: "audio" | "video" | "image") {
	const [error, setError] = React.useState<string | null>(null);
	const [retryCount, setRetryCount] = React.useState(0);

	const handleError = React.useCallback((errorMessage: string) => {
		setError(errorMessage);
	}, []);

	const retry = React.useCallback(() => {
		setError(null);
		setRetryCount((prev) => prev + 1);
	}, []);

	const clearError = React.useCallback(() => {
		setError(null);
	}, []);

	return {
		error,
		retryCount,
		handleError,
		retry,
		clearError,
	};
}
