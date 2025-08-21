import { promises as fs } from "fs";
import path from "path";

export interface LocalStorageService {
	saveJSON(filePath: string, data: any): Promise<void>;
	readJSON(filePath: string): Promise<any | null>;
	exists(filePath: string): Promise<boolean>;
	ensureDirectory(dirPath: string): Promise<void>;
	deleteFile(filePath: string): Promise<void>;
	listFiles(dirPath: string): Promise<string[]>;
}

export class LocalStorageError extends Error {
	constructor(
		message: string,
		public path?: string,
		public operation?: string
	) {
		super(message);
		this.name = "LocalStorageError";
	}
}

export class LocalFileStorage implements LocalStorageService {
	private basePath: string;

	constructor(basePath: string = "./data") {
		this.basePath = path.resolve(basePath);
	}

	/**
	 * Ensure a directory exists with proper permissions
	 */
	async ensureDirectory(dirPath: string): Promise<void> {
		try {
			const fullPath = path.resolve(this.basePath, dirPath);
			await fs.mkdir(fullPath, { recursive: true, mode: 0o700 });
		} catch (error) {
			throw new LocalStorageError(
				`Failed to create directory: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				dirPath,
				"ensureDirectory"
			);
		}
	}

	/**
	 * Save JSON data to a file with secure permissions
	 */
	async saveJSON(filePath: string, data: any): Promise<void> {
		try {
			const fullPath = path.resolve(this.basePath, filePath);
			const dirPath = path.dirname(fullPath);

			// Ensure directory exists
			await this.ensureDirectory(path.relative(this.basePath, dirPath));

			// Convert data to JSON string
			const jsonData = JSON.stringify(data, null, 2);

			// Write file with secure permissions (600 - owner read/write only)
			await fs.writeFile(fullPath, jsonData, { mode: 0o600 });

			console.log(`Local storage: JSON data saved to ${filePath}`);
		} catch (error) {
			throw new LocalStorageError(
				`Failed to save JSON file: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				filePath,
				"saveJSON"
			);
		}
	}

	/**
	 * Read JSON data from a file
	 */
	async readJSON(filePath: string): Promise<any | null> {
		try {
			const fullPath = path.resolve(this.basePath, filePath);

			// Check if file exists first
			if (!(await this.exists(filePath))) {
				console.log(`Local storage: File not found ${filePath}`);
				return null;
			}

			// Read and parse JSON file
			const fileContent = await fs.readFile(fullPath, "utf-8");
			const data = JSON.parse(fileContent);

			console.log(`Local storage: JSON data read from ${filePath}`);
			return data;
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new LocalStorageError(
					`Invalid JSON in file: ${error.message}`,
					filePath,
					"readJSON"
				);
			}
			throw new LocalStorageError(
				`Failed to read JSON file: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				filePath,
				"readJSON"
			);
		}
	}

	/**
	 * Check if a file exists
	 */
	async exists(filePath: string): Promise<boolean> {
		try {
			const fullPath = path.resolve(this.basePath, filePath);
			await fs.access(fullPath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Delete a file
	 */
	async deleteFile(filePath: string): Promise<void> {
		try {
			const fullPath = path.resolve(this.basePath, filePath);
			await fs.unlink(fullPath);
			console.log(`Local storage: File deleted ${filePath}`);
		} catch (error) {
			throw new LocalStorageError(
				`Failed to delete file: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				filePath,
				"deleteFile"
			);
		}
	}

	/**
	 * List files in a directory
	 */
	async listFiles(dirPath: string): Promise<string[]> {
		try {
			const fullPath = path.resolve(this.basePath, dirPath);

			if (!(await this.exists(dirPath))) {
				return [];
			}

			const entries = await fs.readdir(fullPath, { withFileTypes: true });
			const files = entries
				.filter((entry) => entry.isFile())
				.map((entry) => path.join(dirPath, entry.name));

			console.log(
				`Local storage: Listed ${files.length} files from ${dirPath}`
			);
			return files;
		} catch (error) {
			throw new LocalStorageError(
				`Failed to list files: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				dirPath,
				"listFiles"
			);
		}
	}

	/**
	 * Get the full path for a file (for debugging)
	 */
	getFullPath(filePath: string): string {
		return path.resolve(this.basePath, filePath);
	}

	/**
	 * Get storage statistics
	 */
	async getStats(): Promise<{
		basePath: string;
		exists: boolean;
		writable: boolean;
	}> {
		try {
			const stats = await fs.stat(this.basePath);
			return {
				basePath: this.basePath,
				exists: stats.isDirectory(),
				writable: true, // If we can stat it, we can likely write to it
			};
		} catch {
			return {
				basePath: this.basePath,
				exists: false,
				writable: false,
			};
		}
	}
}

// Export a default instance
export const localFileStorage = new LocalFileStorage();
