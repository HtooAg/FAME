require("dotenv").config();
const { Storage } = require("@google-cloud/storage");

async function testGCSConnection() {
	try {
		const storage = new Storage({
			projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
			keyFilename: process.env.GOOGLE_CLOUD_KEYFILE_PATH,
		});

		const bucket = storage.bucket(process.env.GCS_BUCKET);

		console.log("Testing bucket access...");
		const [exists] = await bucket.exists();
		console.log("Bucket exists:", exists);

		if (exists) {
			// Try to write a test file
			console.log("Testing write access...");
			const testFile = bucket.file("_test_connection.txt");
			await testFile.save("Testing GCS connection");
			console.log("Successfully wrote test file");

			// Try to read the file
			console.log("Testing read access...");
			const [content] = await testFile.download();
			console.log("Successfully read file:", content.toString());

			// Clean up
			console.log("Cleaning up...");
			await testFile.delete();
			console.log("Successfully deleted test file");
		}

		console.log("All GCS tests passed successfully!");
	} catch (error) {
		console.error("Error testing GCS connection:", error);
		process.exit(1);
	}
}

testGCSConnection();
