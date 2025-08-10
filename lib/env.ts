export function validateEnv() {
	const required = [
		"GOOGLE_CLOUD_PROJECT_ID",
		"GCS_BUCKET",
		"GOOGLE_CLOUD_CREDENTIALS",
	];

	const missing = required.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(", ")}`
		);
	}

	// Validate GCS credentials
	try {
		if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
			JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
		}
	} catch (e) {
		throw new Error("Invalid GOOGLE_CLOUD_CREDENTIALS JSON format");
	}
}
