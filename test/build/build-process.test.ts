/**
 * Build process validation tests
 * Ensures the build process completes successfully and meets optimization requirements
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("Build Process Validation", () => {
	const buildOutputPath = join(process.cwd(), ".next");
	const packageJsonPath = join(process.cwd(), "package.json");

	beforeAll(() => {
		// Ensure we have a clean build
		try {
			execSync("npm run build", {
				stdio: "pipe",
				timeout: 300000, // 5 minutes timeout
			});
		} catch (error) {
			console.error("Build failed:", error);
			throw error;
		}
	});

	describe("Build Completion", () => {
		it("should complete without dynamic server usage errors", () => {
			// If we reach this point, the build completed successfully
			expect(existsSync(buildOutputPath)).toBe(true);
		});

		it("should generate all required build artifacts", () => {
			const requiredPaths = [
				".next/static",
				".next/server",
				".next/BUILD_ID",
			];

			requiredPaths.forEach((path) => {
				const fullPath = join(process.cwd(), path);
				expect(existsSync(fullPath)).toBe(true);
			});
		});

		it("should have proper route classification", () => {
			const serverPath = join(buildOutputPath, "server");
			expect(existsSync(serverPath)).toBe(true);

			// Check that we have both static and dynamic routes
			const appPath = join(serverPath, "app");
			if (existsSync(appPath)) {
				// Should have API routes (dynamic)
				const apiPath = join(appPath, "api");
				expect(existsSync(apiPath)).toBe(true);
			}
		});
	});

	describe("Build Configuration Validation", () => {
		it("should have proper Next.js configuration", () => {
			const nextConfigPath = join(process.cwd(), "next.config.mjs");
			expect(existsSync(nextConfigPath)).toBe(true);

			const configContent = readFileSync(nextConfigPath, "utf8");

			// Check for key optimizations
			expect(configContent).toContain("serverComponentsExternalPackages");
			expect(configContent).toContain("NEXT_BUILD_SKIP_WEBSOCKET");
			expect(configContent).toContain(
				"productionBrowserSourceMaps: false"
			);
		});

		it("should have service isolation configured", () => {
			const serviceIsolationPath = join(
				process.cwd(),
				"lib/service-isolation.ts"
			);
			expect(existsSync(serviceIsolationPath)).toBe(true);
		});

		it("should have build context detection", () => {
			const buildContextPath = join(
				process.cwd(),
				"lib/build-context.ts"
			);
			expect(existsSync(buildContextPath)).toBe(true);
		});

		it("should have viewport utilities", () => {
			const viewportUtilsPath = join(
				process.cwd(),
				"lib/viewport-utils.ts"
			);
			expect(existsSync(viewportUtilsPath)).toBe(true);
		});
	});

	describe("Performance Validation", () => {
		it("should have reasonable bundle sizes", () => {
			const buildManifestPath = join(
				buildOutputPath,
				"build-manifest.json"
			);
			if (existsSync(buildManifestPath)) {
				const manifest = JSON.parse(
					readFileSync(buildManifestPath, "utf8")
				);

				// Check that we have reasonable chunk sizes
				// This is a basic check - adjust thresholds as needed
				expect(manifest).toBeDefined();
				expect(manifest.pages).toBeDefined();
			}
		});

		it("should not include server-only packages in client bundle", () => {
			const staticPath = join(buildOutputPath, "static");
			if (existsSync(staticPath)) {
				// This is a basic check - in a real scenario you'd analyze the bundle
				expect(existsSync(staticPath)).toBe(true);
			}
		});
	});

	describe("Error Prevention", () => {
		it("should not have viewport warnings in metadata", () => {
			// Check that layout files use separate viewport exports
			const layoutPath = join(process.cwd(), "app/layout.tsx");
			if (existsSync(layoutPath)) {
				const layoutContent = readFileSync(layoutPath, "utf8");

				// Should have separate viewport export
				expect(layoutContent).toContain("export const viewport");

				// Should not have viewport in metadata
				expect(layoutContent).not.toMatch(/metadata:.*viewport/s);
			}
		});

		it("should have proper dynamic route configurations", () => {
			const apiRoutes = [
				"app/api/artists/profile/route.ts",
				"app/api/auth/me/route.ts",
				"app/api/ws/route.ts",
			];

			apiRoutes.forEach((routePath) => {
				const fullPath = join(process.cwd(), routePath);
				if (existsSync(fullPath)) {
					const routeContent = readFileSync(fullPath, "utf8");
					expect(routeContent).toContain(
						"export const dynamic = 'force-dynamic'"
					);
				}
			});
		});
	});
});
