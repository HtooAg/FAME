export interface StorageConfig {
	gcs: {
		enabled: boolean;
		bucketName: string;
		keyFile: string;
		timeout: number;
		projectId: string;
	};
	local: {
		enabled: boolean;
		dataPath: string;
		backupPath: string;
	};
	sync: {
		enabled: boolean;
		interval: number;
		retryAttempts: number;
	};
}

export const defaultStorageConfig: StorageConfig = {
	gcs: {
		enabled: true,
		bucketName: process.env.GOOGLE_CLOUD_BUCKET_NAME || "fame-data",
		keyFile: process.env.GOOGLE_CLOUD_KEY_FILE || "./gcs_key.json",
		timeout: 10000, // 10 seconds
		projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "fame-468308",
	},
	local: {
		enabled: true,
		dataPath: "./data",
		backupPath: "./data/backups",
	},
	sync: {
		enabled: true,
		interval: 300000, // 5 minutes
		retryAttempts: 3,
	},
};

export function getStorageConfig(): StorageConfig {
	return {
		...defaultStorageConfig,
		// Override with environment variables if available
		gcs: {
			...defaultStorageConfig.gcs,
			enabled: process.env.GCS_ENABLED !== "false",
			bucketName:
				process.env.GOOGLE_CLOUD_BUCKET_NAME ||
				defaultStorageConfig.gcs.bucketName,
			keyFile:
				process.env.GOOGLE_CLOUD_KEY_FILE ||
				defaultStorageConfig.gcs.keyFile,
			timeout: parseInt(process.env.GCS_TIMEOUT || "10000"),
			projectId:
				process.env.GOOGLE_CLOUD_PROJECT_ID ||
				defaultStorageConfig.gcs.projectId,
		},
		local: {
			...defaultStorageConfig.local,
			enabled: process.env.LOCAL_STORAGE_ENABLED !== "false",
			dataPath:
				process.env.LOCAL_DATA_PATH ||
				defaultStorageConfig.local.dataPath,
			backupPath:
				process.env.LOCAL_BACKUP_PATH ||
				defaultStorageConfig.local.backupPath,
		},
		sync: {
			...defaultStorageConfig.sync,
			enabled: process.env.STORAGE_SYNC_ENABLED !== "false",
			interval: parseInt(process.env.SYNC_INTERVAL || "300000"),
			retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || "3"),
		},
	};
}
