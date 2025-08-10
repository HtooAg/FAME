const bcrypt = require("bcryptjs");
const { Storage } = require("@google-cloud/storage");
require("dotenv").config();

const BUCKET_NAME = process.env.GCS_BUCKET || "fame-data";
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "fame-468308";

// Initialize Google Cloud Storage
let storage;
const creds = process.env.GOOGLE_CLOUD_CREDENTIALS;
if (creds) {
	const json = JSON.parse(creds);
	storage = new Storage({
		projectId: PROJECT_ID,
		credentials: {
			client_email: json.client_email,
			private_key: json.private_key,
		},
	});
} else {
	storage = new Storage({
		projectId: PROJECT_ID,
		keyFilename: process.env.GOOGLE_CLOUD_KEYFILE_PATH || undefined,
	});
}

const bucket = storage.bucket(BUCKET_NAME);

async function readJsonFile(filePath, defaultValue) {
	const file = bucket.file(filePath);
	const [exists] = await file.exists();
	if (!exists) {
		return defaultValue;
	}
	const [data] = await file.download();
	try {
		return JSON.parse(data.toString());
	} catch {
		return defaultValue;
	}
}

async function writeJsonFile(filePath, data) {
	const file = bucket.file(filePath);
	await file.save(JSON.stringify(data, null, 2), {
		metadata: { contentType: "application/json" },
	});
}

async function createSuperAdmin() {
	try {
		// Get command line arguments
		const args = process.argv.slice(2);
		if (args.length < 3) {
			console.log(
				"Usage: node create-super-admin.js <name> <email> <password>"
			);
			console.log(
				'Example: node create-super-admin.js "Admin User" admin@example.com mypassword123'
			);
			process.exit(1);
		}

		const [name, email, password] = args;

		console.log("Creating super admin account...");
		console.log(`Name: ${name}`);
		console.log(`Email: ${email}`);

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Read existing users
		const users = await readJsonFile("users/users.json", []);

		// Check if email already exists
		const existingUser = users.find((user) => user.email === email);
		if (existingUser) {
			console.error(`Error: User with email ${email} already exists!`);
			process.exit(1);
		}

		// Generate a unique ID
		const id = `super-admin-${Date.now()}`;

		// Create super admin user
		const superAdmin = {
			id,
			name,
			email,
			password: hashedPassword,
			role: "super_admin",
			accountStatus: "active",
			isActive: true,
			createdAt: new Date().toISOString(),
			lastLogin: null,
			metadata: {
				createdBy: "script",
				createdAt: new Date().toISOString(),
			},
		};

		// Add to users array
		users.push(superAdmin);

		// Save updated users list
		await writeJsonFile("users/users.json", users);

		// Also save individual user file
		await writeJsonFile(`users/super_admin/${id}.json`, superAdmin);

		console.log("✅ Super admin account created successfully!");
		console.log(`ID: ${id}`);
		console.log(`You can now login with email: ${email}`);
		console.log(
			"The super admin dashboard will be available at /super-admin"
		);
	} catch (error) {
		console.error("❌ Error creating super admin:", error.message);
		process.exit(1);
	}
}

createSuperAdmin();
