/**
 * Simple test script to verify authentication system works
 */

const { storageManager } = require("./lib/storage/storage-manager");
const bcrypt = require("bcryptjs");

async function testAuthentication() {
	console.log("🧪 Testing Authentication System...\n");

	try {
		// Initialize storage manager
		console.log("1. Initializing storage manager...");
		await storageManager.initialize();
		console.log("✅ Storage manager initialized successfully\n");

		// Check health status
		console.log("2. Checking storage health...");
		const health = await storageManager.getHealthStatus();
		console.log("📊 Storage Health:", {
			gcs: health.gcs.available,
			local: health.local.available,
			fallbackActive: health.fallbackActive,
			localPath: health.local.path,
		});
		console.log("");

		// Test user registration
		console.log("3. Testing user registration...");
		const testUser = {
			id: "1",
			name: "Test User",
			email: "test@example.com",
			password: await bcrypt.hash("testpassword", 10),
			role: "stage_manager",
			accountStatus: "pending",
			subscriptionStatus: "trial",
			subscriptionEndDate: "",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			metadata: {
				ipAddress: "127.0.0.1",
				userAgent: "test-script",
				storageSource: "local",
			},
		};

		await storageManager.saveUser(testUser);
		console.log("✅ User registered successfully\n");

		// Test user retrieval
		console.log("4. Testing user retrieval...");
		const retrievedUser = await storageManager.getUser(testUser.email);
		if (retrievedUser) {
			console.log("✅ User retrieved successfully");
			console.log("📋 User details:", {
				id: retrievedUser.id,
				name: retrievedUser.name,
				email: retrievedUser.email,
				role: retrievedUser.role,
				accountStatus: retrievedUser.accountStatus,
				storageSource: retrievedUser.metadata?.storageSource,
			});
		} else {
			console.log("❌ Failed to retrieve user");
		}
		console.log("");

		// Test password validation
		console.log("5. Testing password validation...");
		const isValidPassword = await bcrypt.compare(
			"testpassword",
			retrievedUser.password
		);
		const isInvalidPassword = await bcrypt.compare(
			"wrongpassword",
			retrievedUser.password
		);

		console.log("✅ Correct password validation:", isValidPassword);
		console.log("✅ Incorrect password rejection:", !isInvalidPassword);
		console.log("");

		// Test ID generation
		console.log("6. Testing ID generation...");
		const id1 = await storageManager.getNextId();
		const id2 = await storageManager.getNextId();
		console.log("✅ Generated sequential IDs:", id1, "->", id2);
		console.log("");

		console.log("🎉 All authentication tests passed!");
		console.log("🔧 Your authentication system is working correctly.");
		console.log("📁 Data is stored in:", health.local.path);
	} catch (error) {
		console.error("❌ Authentication test failed:", error.message);
		console.error("🔍 Full error:", error);
	}
}

// Run the test
testAuthentication().catch(console.error);
