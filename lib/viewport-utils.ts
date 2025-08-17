/**
 * Viewport utilities for Next.js 14+ metadata migration
 * Helps migrate viewport configurations from metadata exports to separate viewport exports
 */

export interface ViewportConfig {
	width?: string | number;
	height?: string | number;
	initialScale?: number;
	minimumScale?: number;
	maximumScale?: number;
	userScalable?: boolean;
	shrinkToFit?: boolean;
	viewportFit?: "auto" | "contain" | "cover";
}

/**
 * Standard viewport configuration for responsive web apps
 */
export const defaultViewport: ViewportConfig = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

/**
 * Mobile-optimized viewport configuration
 */
export const mobileViewport: ViewportConfig = {
	width: "device-width",
	initialScale: 1,
	minimumScale: 1,
	maximumScale: 5,
	userScalable: true,
};

/**
 * Desktop-optimized viewport configuration
 */
export const desktopViewport: ViewportConfig = {
	width: "device-width",
	initialScale: 1,
	userScalable: true,
};

/**
 * Convert legacy viewport string to ViewportConfig object
 */
export function parseViewportString(viewportString: string): ViewportConfig {
	const config: ViewportConfig = {};

	const parts = viewportString.split(",").map((part) => part.trim());

	for (const part of parts) {
		const [key, value] = part.split("=").map((s) => s.trim());

		switch (key) {
			case "width":
				config.width =
					value === "device-width" ? value : parseInt(value);
				break;
			case "height":
				config.height =
					value === "device-height" ? value : parseInt(value);
				break;
			case "initial-scale":
				config.initialScale = parseFloat(value);
				break;
			case "minimum-scale":
				config.minimumScale = parseFloat(value);
				break;
			case "maximum-scale":
				config.maximumScale = parseFloat(value);
				break;
			case "user-scalable":
				config.userScalable = value === "yes" || value === "1";
				break;
			case "shrink-to-fit":
				config.shrinkToFit = value === "yes" || value === "1";
				break;
			case "viewport-fit":
				config.viewportFit = value as "auto" | "contain" | "cover";
				break;
		}
	}

	return config;
}

/**
 * Convert ViewportConfig object to Next.js viewport export format
 */
export function generateViewportExport(config: ViewportConfig): string {
	const configEntries = Object.entries(config)
		.filter(([_, value]) => value !== undefined)
		.map(([key, value]) => {
			if (typeof value === "string") {
				return `  ${key}: '${value}',`;
			}
			return `  ${key}: ${value},`;
		});

	return `import { Viewport } from 'next';

export const viewport: Viewport = {
${configEntries.join("\n")}
};`;
}

/**
 * Extract viewport configuration from metadata object
 */
export function extractViewportFromMetadata(
	metadata: any
): ViewportConfig | null {
	if (!metadata || !metadata.viewport) {
		return null;
	}

	if (typeof metadata.viewport === "string") {
		return parseViewportString(metadata.viewport);
	}

	return metadata.viewport as ViewportConfig;
}
