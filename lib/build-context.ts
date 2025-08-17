/**
 * Build context detection utility
 * Helps determine if code is running during build time vs runtime
 */

export class BuildContext {
	private static _isBuilding: boolean | null = null;

	/**
	 * Detect if we're currently in a build context
	 */
	static isBuilding(): boolean {
		if (this._isBuilding !== null) {
			return this._isBuilding;
		}

		// Check for explicit build environment variable
		if (process.env.NEXT_BUILD_SKIP_WEBSOCKET === "true") {
			this._isBuilding = true;
			return true;
		}

		// Check process arguments for build command
		const processArgs = process.argv.join(" ");
		const isBuildCommand =
			processArgs.includes("next build") ||
			processArgs.includes("npm run build") ||
			processArgs.includes("yarn build");

		// Check various build-time indicators
		const buildIndicators = [
			// Next.js build phases
			process.env.NEXT_PHASE === "phase-production-build",
			process.env.NEXT_PHASE === "phase-production-server",
			// Build-specific environment variables
			process.env.BUILDING === "true",
			// Check if we're in static generation
			process.env.__NEXT_PRIVATE_PREBUNDLED_REACT === "next",
			// Process arguments check
			isBuildCommand,
		];

		// Check if we're in a build context by examining the call stack
		const stack = new Error().stack || "";
		const buildStackIndicators = [
			"next/dist/build",
			"next/dist/server/lib/router-server",
			"getStaticProps",
			"getServerSideProps",
			"generateStaticParams",
			"static-generation",
		];

		const hasStackIndicator = buildStackIndicators.some((indicator) =>
			stack.includes(indicator)
		);

		this._isBuilding = buildIndicators.some(Boolean) || hasStackIndicator;

		return this._isBuilding;
	}

	/**
	 * Check if we're in runtime (not building)
	 */
	static isRuntime(): boolean {
		return !this.isBuilding();
	}

	/**
	 * Force set build context (for testing)
	 */
	static setBuildContext(isBuilding: boolean): void {
		this._isBuilding = isBuilding;
	}

	/**
	 * Reset build context detection
	 */
	static reset(): void {
		this._isBuilding = null;
	}

	/**
	 * Get environment info for debugging
	 */
	static getEnvironmentInfo(): Record<string, any> {
		return {
			NODE_ENV: process.env.NODE_ENV,
			NEXT_PHASE: process.env.NEXT_PHASE,
			BUILDING: process.env.BUILDING,
			NEXT_BUILD_SKIP_WEBSOCKET: process.env.NEXT_BUILD_SKIP_WEBSOCKET,
			VERCEL: process.env.VERCEL,
			hasWindow: typeof window !== "undefined",
			hasRequestContext:
				typeof globalThis !== "undefined" &&
				(globalThis as any).__NEXT_REQUEST_CONTEXT__,
			processArgs: process.argv.join(" "),
			isBuilding: this.isBuilding(),
			isRuntime: this.isRuntime(),
		};
	}
}
