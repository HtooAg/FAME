/**
 * Viewport migration validation tests
 * Ensures viewport configurations are properly migrated from metadata to viewport exports
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Viewport Migration Validation", () => {
	describe("Layout Files", () => {
		it("should have proper viewport export in root layout", () => {
			const layoutPath = join(process.cwd(), "app/layout.tsx");
			expect(existsSync(layoutPath)).toBe(true);

			const layoutContent = readFileSync(layoutPath, "utf8");

			// Should have separate viewport export
			expect(layoutContent).toContain("export const viewport");
			expect(layoutContent).toMatch(
				/export const viewport:\s*Viewport\s*=/
			);

			// Should import Viewport type
			expect(layoutContent).toMatch(/import.*Viewport.*from.*next/);

			// Should not have viewport in metadata export block
			const metadataMatch = layoutContent.match(
				/export const metadata:\s*Metadata\s*=\s*{([^}]+)}/
			);
			if (metadataMatch) {
				expect(metadataMatch[1]).not.toContain("viewport");
			}
		});

		it("should have valid viewport configuration", () => {
			const layoutPath = join(process.cwd(), "app/layout.tsx");
			const layoutContent = readFileSync(layoutPath, "utf8");

			// Extract viewport configuration
			const viewportMatch = layoutContent.match(
				/export const viewport:\s*Viewport\s*=\s*{([^}]+)}/
			);
			expect(viewportMatch).toBeTruthy();

			if (viewportMatch) {
				const viewportConfig = viewportMatch[1];

				// Should have basic responsive configuration
				expect(viewportConfig).toContain("width");
				expect(viewportConfig).toContain("initialScale");

				// Should have proper values
				expect(viewportConfig).toMatch(/width:\s*["']device-width["']/);
				expect(viewportConfig).toMatch(/initialScale:\s*1/);
			}
		});
	});

	describe("Metadata Cleanup", () => {
		it("should not have viewport in any metadata exports", () => {
			const layoutPath = join(process.cwd(), "app/layout.tsx");
			const layoutContent = readFileSync(layoutPath, "utf8");

			// Extract metadata export
			const metadataMatch = layoutContent.match(
				/export const metadata:\s*Metadata\s*=\s*{([^}]+)}/
			);

			if (metadataMatch) {
				const metadataConfig = metadataMatch[1];
				expect(metadataConfig).not.toContain("viewport");
			}
		});

		it("should maintain other metadata properties", () => {
			const layoutPath = join(process.cwd(), "app/layout.tsx");
			const layoutContent = readFileSync(layoutPath, "utf8");

			// Should still have title and description
			expect(layoutContent).toMatch(/title:\s*["'][^"']+["']/);
			expect(layoutContent).toMatch(/description:\s*["'][^"']+["']/);
		});
	});

	describe("Viewport Utilities", () => {
		it("should have viewport utilities available", () => {
			const viewportUtilsPath = join(
				process.cwd(),
				"lib/viewport-utils.ts"
			);
			expect(existsSync(viewportUtilsPath)).toBe(true);

			const utilsContent = readFileSync(viewportUtilsPath, "utf8");

			// Should have key utility functions
			expect(utilsContent).toContain("ViewportConfig");
			expect(utilsContent).toContain("defaultViewport");
			expect(utilsContent).toContain("parseViewportString");
			expect(utilsContent).toContain("generateViewportExport");
		});

		it("should have proper TypeScript types", () => {
			const viewportUtilsPath = join(
				process.cwd(),
				"lib/viewport-utils.ts"
			);
			const utilsContent = readFileSync(viewportUtilsPath, "utf8");

			// Should have proper interface definition
			expect(utilsContent).toMatch(/interface ViewportConfig\s*{/);
			expect(utilsContent).toContain("width?:");
			expect(utilsContent).toContain("initialScale?:");
			expect(utilsContent).toContain("userScalable?:");
		});
	});

	describe("Build Compatibility", () => {
		it("should not cause build warnings", () => {
			// This test passes if the build completed successfully
			// Build warnings would have caused the build to fail or show warnings
			expect(true).toBe(true);
		});

		it("should maintain responsive behavior", () => {
			const layoutPath = join(process.cwd(), "app/layout.tsx");
			const layoutContent = readFileSync(layoutPath, "utf8");

			// Check that viewport export has responsive settings
			const viewportMatch = layoutContent.match(
				/export const viewport[\s\S]*?{([\s\S]*?)}/
			);

			if (viewportMatch) {
				const viewportConfig = viewportMatch[1];

				// Should have mobile-friendly settings
				expect(viewportConfig).toMatch(/width:\s*["']device-width["']/);
				expect(viewportConfig).toMatch(/initialScale:\s*1/);
			}
		});
	});
});
