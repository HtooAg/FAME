import { LocalFileStorage, LocalStorageError } from "../local-storage";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";

describe("LocalFileStorage", () => {
	let storage: LocalFileStorage;
	let testDir: string;

	beforeEach(async () => {
		// Create a temporary directory for testing
		testDir = path.join(tmpdir(), `test-storage-${Date.now()}`);
		storage = new LocalFileStorage(testDir);
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("ensureDirectory", () => {
		it("should create directory with proper permissions", async () => {
			const dirPath = "test/nested/dir";
			await storage.ensureDirectory(dirPath);

			const fullPath = path.join(testDir, dirPath);
			const stats = await fs.stat(fullPath);
			expect(stats.isDirectory()).toBe(true);
		});

		it("should not fail if directory already exists", async () => {
			const dirPath = "existing/dir";
			await storage.ensureDirectory(dirPath);
			await storage.ensureDirectory(dirPath); // Should not throw
		});
	});

	describe("saveJSON and readJSON", () => {
		it("should save and read JSON data correctly", async () => {
			const testData = {
				name: "test",
				value: 123,
				nested: { prop: true },
			};
			const filePath = "test/data.json";

			await storage.saveJSON(filePath, testData);
			const readData = await storage.readJSON(filePath);

			expect(readData).toEqual(testData);
		});

		it("should create directories automatically when saving", async () => {
			const testData = { test: "data" };
			const filePath = "deep/nested/path/data.json";

			await storage.saveJSON(filePath, testData);
			const readData = await storage.readJSON(filePath);

			expect(readData).toEqual(testData);
		});

		it("should return null for non-existent files", async () => {
			const result = await storage.readJSON("non-existent.json");
			expect(result).toBeNull();
		});

		it("should throw LocalStorageError for invalid JSON", async () => {
			const filePath = "invalid.json";
			const fullPath = path.join(testDir, filePath);

			// Create directory and write invalid JSON
			await fs.mkdir(path.dirname(fullPath), { recursive: true });
			await fs.writeFile(fullPath, "invalid json content");

			await expect(storage.readJSON(filePath)).rejects.toThrow(
				LocalStorageError
			);
		});
	});

	describe("exists", () => {
		it("should return true for existing files", async () => {
			const filePath = "existing.json";
			await storage.saveJSON(filePath, { test: "data" });

			const exists = await storage.exists(filePath);
			expect(exists).toBe(true);
		});

		it("should return false for non-existent files", async () => {
			const exists = await storage.exists("non-existent.json");
			expect(exists).toBe(false);
		});
	});

	describe("deleteFile", () => {
		it("should delete existing files", async () => {
			const filePath = "to-delete.json";
			await storage.saveJSON(filePath, { test: "data" });

			expect(await storage.exists(filePath)).toBe(true);
			await storage.deleteFile(filePath);
			expect(await storage.exists(filePath)).toBe(false);
		});

		it("should throw error when deleting non-existent file", async () => {
			await expect(
				storage.deleteFile("non-existent.json")
			).rejects.toThrow(LocalStorageError);
		});
	});

	describe("listFiles", () => {
		it("should list files in directory", async () => {
			await storage.saveJSON("dir/file1.json", { test: 1 });
			await storage.saveJSON("dir/file2.json", { test: 2 });
			await storage.saveJSON("dir/subdir/file3.json", { test: 3 });

			const files = await storage.listFiles("dir");
			expect(files).toContain("dir/file1.json");
			expect(files).toContain("dir/file2.json");
			expect(files).not.toContain("dir/subdir/file3.json"); // Should not include subdirectory files
		});

		it("should return empty array for non-existent directory", async () => {
			const files = await storage.listFiles("non-existent");
			expect(files).toEqual([]);
		});
	});

	describe("getStats", () => {
		it("should return storage statistics", async () => {
			await storage.ensureDirectory("test");
			const stats = await storage.getStats();

			expect(stats.basePath).toBe(testDir);
			expect(stats.exists).toBe(true);
			expect(stats.writable).toBe(true);
		});
	});
});
