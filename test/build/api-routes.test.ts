/**
 * API Routes validation tests
 * Ensures all API routes have proper dynamic configuration
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

describe("API Routes Validation", () => {
	const apiDir = join(process.cwd(), "app/api");

	// Helper function to recursively find all route files
	function findRouteFiles(dir: string): string[] {
		const files: string[] = [];

		if (!statSync(dir).isDirectory()) {
			return files;
		}

		const items = readdirSync(dir);

		for (const item of items) {
			const fullPath = join(dir, item);
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				files.push(...findRouteFiles(fullPath));
			} else if (item === "route.ts" || item === "route.js") {
				files.push(fullPath);
			}
		}

		return files;
	}

	// Helper function to check if route uses dynamic features
	function usesDynamicFeatures(content: string): boolean {
		const dynamicFeatures = [
			"request.url",
			"request.cookies",
			"request.headers",
			"request.json()",
			"request.formData()",
		];

		return dynamicFeatures.some((feature) => content.includes(feature));
	}

	describe("Dynamic Configuration", () => {
		it("should have proper dynamic configuration for all API routes", () => {
			const routeFiles = findRouteFiles(apiDir);
			expect(routeFiles.length).toBeGreaterThan(0);

			const routesWithIssues: string[] = [];

			routeFiles.forEach((routeFile) => {
				const content = readFileSync(routeFile, "utf8");
				const relativePath = routeFile.replace(process.cwd(), "");

				// Check if route uses dynamic features
				const hasDynamicFeatures = usesDynamicFeatures(content);
				const hasDynamicConfig = content.includes(
					"export const dynamic = 'force-dynamic'"
				);

				if (hasDynamicFeatures && !hasDynamicConfig) {
					routesWithIssues.push(
						`${relativePath}: Uses dynamic features but missing dynamic config`
					);
				}
			});

			if (routesWithIssues.length > 0) {
				console.log("Routes with configuration issues:");
				routesWithIssues.forEach((issue) =>
					console.log(`  - ${issue}`)
				);
			}

			expect(routesWithIssues).toHaveLength(0);
		});

		it("should have consistent export patterns", () => {
			const routeFiles = findRouteFiles(apiDir);
			const inconsistentRoutes: string[] = [];

			routeFiles.forEach((routeFile) => {
				const content = readFileSync(routeFile, "utf8");
				const relativePath = routeFile.replace(process.cwd(), "");

				// Check for proper HTTP method exports
				const hasHttpMethods =
					/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g.test(
						content
					);

				if (!hasHttpMethods) {
					inconsistentRoutes.push(
						`${relativePath}: No HTTP method exports found`
					);
				}
			});

			expect(inconsistentRoutes).toHaveLength(0);
		});
	});

	describe("Service Integration", () => {
		it("should properly handle service isolation in API routes", () => {
			const routeFiles = findRouteFiles(apiDir);
			const routesUsingServices: string[] = [];

			routeFiles.forEach((routeFile) => {
				const content = readFileSync(routeFile, "utf8");
				const relativePath = routeFile.replace(process.cwd(), "");

				// Check if route uses external services
				const usesGCS =
					content.includes("GCSService") ||
					content.includes("google-cloud-storage");
				const usesWebSocket =
					content.includes("WebSocket") || content.includes("ws");

				if (usesGCS || usesWebSocket) {
					routesUsingServices.push(relativePath);
				}
			});

			// This is informational - we want to know which routes use services
			console.log(
				`Found ${routesUsingServices.length} routes using external services`
			);

			// All routes using services should be dynamic
			routesUsingServices.forEach((routePath) => {
				const fullPath = join(process.cwd(), routePath);
				const content = readFileSync(fullPath, "utf8");

				expect(content).toContain(
					"export const dynamic = 'force-dynamic'"
				);
			});
		});
	});

	describe("Error Handling", () => {
		it("should have proper error handling in API routes", () => {
			const routeFiles = findRouteFiles(apiDir);
			const routesWithoutErrorHandling: string[] = [];

			routeFiles.forEach((routeFile) => {
				const content = readFileSync(routeFile, "utf8");
				const relativePath = routeFile.replace(process.cwd(), "");

				// Check for basic error handling patterns
				const hasTryCatch =
					content.includes("try") && content.includes("catch");
				const hasErrorResponse =
					content.includes("NextResponse.json") &&
					content.includes("status: 500");

				if (!hasTryCatch && !hasErrorResponse) {
					routesWithoutErrorHandling.push(relativePath);
				}
			});

			// This is a warning rather than a hard requirement
			if (routesWithoutErrorHandling.length > 0) {
				console.warn(
					`Routes without error handling: ${routesWithoutErrorHandling.length}`
				);
			}
		});
	});
});
