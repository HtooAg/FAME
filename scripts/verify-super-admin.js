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

async function verifySuperAdmin() {
	try {
		console.log("🔍 Checking super admin accounts...");

		// Read all users
		const users = await readJsonFile("users/users.json", []);
		console.log(`📊 Total users found: ${users.length}`);

		// Find super admins
		const superAdmins = users.filter((user) => user.role === "super_admin");
		console.log(`👑 Super admins found: ${superAdmins.length}`);

		if (superAdmins.length === 0) {
			console.log("❌ No super admin accounts found!");
			console.log(
				"💡 Create one using: npm run create-super-admin or visit /setup-admin"
			);
			return;
		}

		// Display super admin details
		superAdmins.forEach((admin, index) => {
			console.log(`\n👤 Super Admin ${index + 1}:`);
			console.log(`   ID: ${admin.id}`);
			console.log(`   Name: ${admin.name}`);
			console.log(`   Email: ${admin.email}`);
			console.log(`   Role: ${admin.role}`);
			console.log(
				`   Account Status: ${admin.accountStatus || "undefined"}`
			);
			console.log(`   Is Active: ${admin.isActive}`);
			console.log(`   Created: ${admin.createdAt || "unknown"}`);
		});

		// Check for any issues
		const issues = [];
		superAdmins.forEach((admin) => {
			if (!admin.accountStatus || admin.accountStatus !== "active") {
				issues.push(
					`${admin.email}: Account status is '${admin.accountStatus}' (should be 'active')`
				);
			}
			if (!admin.isActive) {
				issues.push(
					`${admin.email}: isActive is false (should be true)`
				);
			}
			if (!admin.password) {
				issues.push(`${admin.email}: No password hash found`);
			}
		});

		if (issues.length > 0) {
			console.log("\n⚠️  Issues found:");
			issues.forEach((issue) => console.log(`   - ${issue}`));
		} else {
			console.log("\n✅ All super admin accounts look good!");
		}

		// Show other user roles
		const roleStats = {};
		users.forEach((user) => {
			roleStats[user.role] = (roleStats[user.role] || 0) + 1;
		});

		console.log("\n📈 User role statistics:");
		Object.entries(roleStats).forEach(([role, count]) => {
			console.log(`   ${role}: ${count}`);
		});
	} catch (error) {
		console.error("❌ Error verifying super admin:", error.message);
	}
}

verifySuperAdmin();
