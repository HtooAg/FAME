/**
 * Enhanced error handling for build-time vs runtime issues
 * Provides context-aware error handling and reporting
 */

import { BuildContext } from "./build-context";
import { buildLogger } from "./build-logger";

export interface BuildError extends Error {
	context: "build" | "runtime";
	category: "service" | "route" | "configuration" | "dependency" | "unknown";
	severity: "low" | "medium" | "high" | "critical";
	suggestions?: string[];
	metadata?: Record<string, any>;
}

export class BuildErrorHandler {
	private static instance: BuildErrorHandler | null = null;
	private errorCounts = new Map<string, number>();

	private constructor() {}

	static getInstance(): BuildErrorHandler {
		if (!this.instance) {
			this.instance = new BuildErrorHandler();
		}
		return this.instance;
	}

	/**
	 * Create a structured build error
	 */
	createBuildError(
		message: string,
		category: BuildError["category"],
		severity: BuildError["severity"] = "medium",
		originalError?: Error,
		suggestions?: string[]
	): BuildError {
		const error = new Error(message) as BuildError;
		error.context = BuildContext.isBuilding() ? "build" : "runtime";
		error.category = category;
		error.severity = severity;
		error.suggestions = suggestions;
		error.metadata = {
			timestamp: new Date().toISOString(),
			buildContext: BuildContext.getEnvironmentInfo(),
			originalError: originalError?.message,
			stack: originalError?.stack,
		};

		return error;
	}

	/**
	 * Handle service-related errors
	 */
	handleServiceError(
		serviceName: string,
		error: Error,
		fallbackAction?: () => void
	): BuildError {
		const errorKey = `service:${serviceName}`;
		const count = this.errorCounts.get(errorKey) || 0;
		this.errorCounts.set(errorKey, count + 1);

		const suggestions = this.getServiceErrorSuggestions(serviceName, error);
		const buildError = this.createBuildError(
			`Service '${serviceName}' error: ${error.message}`,
			"service",
			BuildContext.isBuilding() ? "low" : "high",
			error,
			suggestions
		);

		buildLogger.error("SERVICE-ERROR", buildError.message, {
			service: serviceName,
			context: buildError.context,
			errorCount: count + 1,
			suggestions: buildError.suggestions,
		});

		// Execute fallback if provided
		if (fallbackAction) {
			try {
				fallbackAction();
				buildLogger.info(
					"SERVICE-FALLBACK",
					`Fallback executed for ${serviceName}`
				);
			} catch (fallbackError) {
				buildLogger.error(
					"SERVICE-FALLBACK",
					`Fallback failed for ${serviceName}`,
					fallbackError
				);
			}
		}

		return buildError;
	}

	/**
	 * Handle route configuration errors
	 */
	handleRouteError(
		routePath: string,
		error: Error,
		routeType: "api" | "page" = "api"
	): BuildError {
		const suggestions = this.getRouteErrorSuggestions(
			routePath,
			error,
			routeType
		);
		const buildError = this.createBuildError(
			`Route '${routePath}' error: ${error.message}`,
			"route",
			"high",
			error,
			suggestions
		);

		buildLogger.error("ROUTE-ERROR", buildError.message, {
			route: routePath,
			type: routeType,
			context: buildError.context,
			suggestions: buildError.suggestions,
		});

		return buildError;
	}

	/**
	 * Handle WebSocket-related errors
	 */
	handleWebSocketError(
		error: Error,
		port?: number,
		fallbackPorts?: number[]
	): BuildError {
		const suggestions = this.getWebSocketErrorSuggestions(
			error,
			port,
			fallbackPorts
		);
		const severity = BuildContext.isBuilding() ? "low" : "medium";

		const buildError = this.createBuildError(
			`WebSocket error: ${error.message}`,
			"service",
			severity,
			error,
			suggestions
		);

		buildLogger.error("WEBSOCKET-ERROR", buildError.message, {
			port,
			fallbackPorts,
			context: buildError.context,
			suggestions: buildError.suggestions,
		});

		return buildError;
	}

	/**
	 * Handle configuration errors
	 */
	handleConfigurationError(
		configType: string,
		error: Error,
		configPath?: string
	): BuildError {
		const suggestions = this.getConfigurationErrorSuggestions(
			configType,
			error
		);
		const buildError = this.createBuildError(
			`Configuration error in ${configType}: ${error.message}`,
			"configuration",
			"high",
			error,
			suggestions
		);

		buildLogger.error("CONFIG-ERROR", buildError.message, {
			configType,
			configPath,
			context: buildError.context,
			suggestions: buildError.suggestions,
		});

		return buildError;
	}

	/**
	 * Get service-specific error suggestions
	 */
	private getServiceErrorSuggestions(
		serviceName: string,
		error: Error
	): string[] {
		const suggestions: string[] = [];

		switch (serviceName) {
			case "google-cloud-storage":
				suggestions.push(
					"Check GOOGLE_CLOUD_PROJECT_ID environment variable"
				);
				suggestions.push(
					"Verify Google Cloud credentials are properly configured"
				);
				if (BuildContext.isBuilding()) {
					suggestions.push(
						"This error during build is expected - GCS is disabled during static generation"
					);
				}
				break;

			case "websocket":
				if (error.message.includes("EADDRINUSE")) {
					suggestions.push(
						"Port is already in use - trying fallback ports"
					);
					suggestions.push("Consider using a different port range");
				}
				if (BuildContext.isBuilding()) {
					suggestions.push(
						"WebSocket errors during build are expected and can be ignored"
					);
				}
				break;

			default:
				suggestions.push(
					"Check service configuration and dependencies"
				);
				suggestions.push(
					"Verify environment variables are set correctly"
				);
		}

		return suggestions;
	}

	/**
	 * Get route-specific error suggestions
	 */
	private getRouteErrorSuggestions(
		routePath: string,
		error: Error,
		routeType: string
	): string[] {
		const suggestions: string[] = [];

		if (error.message.includes("Dynamic server usage")) {
			suggestions.push(
				`Add 'export const dynamic = "force-dynamic"' to ${routePath}`
			);
			suggestions.push(
				"This route uses request.url, request.cookies, or request.headers"
			);
		}

		if (error.message.includes("viewport")) {
			suggestions.push(
				"Move viewport configuration from metadata to separate viewport export"
			);
			suggestions.push('Import Viewport type from "next"');
		}

		suggestions.push(
			"Check Next.js documentation for route configuration best practices"
		);
		return suggestions;
	}

	/**
	 * Get WebSocket-specific error suggestions
	 */
	private getWebSocketErrorSuggestions(
		error: Error,
		port?: number,
		fallbackPorts?: number[]
	): string[] {
		const suggestions: string[] = [];

		if (error.message.includes("EADDRINUSE")) {
			suggestions.push(`Port ${port} is already in use`);
			if (fallbackPorts?.length) {
				suggestions.push(
					`Trying fallback ports: ${fallbackPorts.join(", ")}`
				);
			}
			suggestions.push(
				"Consider stopping other services using the same port"
			);
		}

		if (BuildContext.isBuilding()) {
			suggestions.push(
				"WebSocket initialization during build can be safely ignored"
			);
			suggestions.push(
				"Set NEXT_BUILD_SKIP_WEBSOCKET=true to suppress these errors"
			);
		}

		return suggestions;
	}

	/**
	 * Get configuration-specific error suggestions
	 */
	private getConfigurationErrorSuggestions(
		configType: string,
		error: Error
	): string[] {
		const suggestions: string[] = [];

		switch (configType) {
			case "next.config.mjs":
				suggestions.push("Check Next.js configuration syntax");
				suggestions.push("Verify all imported modules are available");
				break;

			case "viewport":
				suggestions.push(
					"Use separate viewport export instead of metadata.viewport"
				);
				suggestions.push('Import Viewport type from "next"');
				break;

			default:
				suggestions.push(
					"Check configuration file syntax and structure"
				);
				suggestions.push("Verify all required properties are present");
		}

		return suggestions;
	}

	/**
	 * Get error statistics
	 */
	getErrorStats(): Record<string, number> {
		return Object.fromEntries(this.errorCounts);
	}

	/**
	 * Reset error counts (useful for testing)
	 */
	reset(): void {
		this.errorCounts.clear();
	}
}

// Export singleton instance
export const buildErrorHandler = BuildErrorHandler.getInstance();
