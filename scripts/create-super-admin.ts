import bcrypt from "bcryptjs";
import { readJsonFile, writeJsonFile, paths } from "../lib/gcs";

interface User {
	id: string;
	name: string;
	email: string;
	password: string;
	role: string;
	accountStatus: string;
	isActive: boolean;
	createdAt: string;
	lastLogin?: string;
	metadata?: any;
}

async function createSuperAdmin() {
	try {
		// Get command line arguments
		const args = process.argv.slice(2);
		if (args.length < 3) {
			console.log(
				"Usage: npx ts-node scripts/create-super-admin.ts <name> <email> <password>"
			);
			console.log(
				'Example: npx ts-node scripts/create-super-admin.ts "Admin User" admin@example.com mypassword123'
			);
			process.exit(1);
		}

		const [name, email, password] = args;

		console.log("Creating super admin account...");
		console.log(`Name: ${name}`);
		console.log(`Email: ${email}`);

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			console.error("❌ Error: Invalid email format");
			process.exit(1);
		}

		// Validate password strength
		if (password.length < 8) {
			console.error(
				"❌ Error: Password must be at least 8 characters long"
			);
			process.exit(1);
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Read existing users
		const users = await readJsonFile<User[]>(paths.usersIndex, []);

		// Check if email already exists
		const existingUser = users.find((user) => user.email === email);
		if (existingUser) {
			console.error(`❌ Error: User with email ${email} already exists!`);
			console.log(
				`Existing user: ${existingUser.name} (${existingUser.role})`
			);
			process.exit(1);
		}

		// Generate a unique ID
		const id = `super-admin-${Date.now()}`;

		// Create super admin user
		const superAdmin: User = {
			id,
			name,
			email,
			password: hashedPassword,
			role: "super_admin",
			accountStatus: "active",
			isActive: true,
			createdAt: new Date().toISOString(),
			metadata: {
				createdBy: "script",
				createdAt: new Date().toISOString(),
				ipAddress: "localhost",
				userAgent: "create-super-admin-script",
			},
		};

		// Add to users array
		users.push(superAdmin);

		// Save updated users list
		await writeJsonFile(paths.usersIndex, users);

		// Also save individual user file
		await writeJsonFile(paths.userByRole("super_admin", id), superAdmin);

		console.log("✅ Super admin account created successfully!");
		console.log(`ID: ${id}`);
		console.log(`Name: ${name}`);
		console.log(`Email: ${email}`);
		console.log(`Role: super_admin`);
		console.log(`Status: active`);
		console.log("");
		console.log("🚀 You can now login with these credentials:");
		console.log(`   Email: ${email}`);
		console.log(`   Password: [the password you provided]`);
		console.log("");
		console.log(
			"📍 The super admin dashboard will be available at: /super-admin"
		);
		console.log("");
		console.log(
			"🔐 Security note: Make sure to use a strong password and keep it secure!"
		);
	} catch (error) {
		console.error("❌ Error creating super admin:", error);
		if (error instanceof Error) {
			console.error("Details:", error.message);
		}
		process.exit(1);
	}
}

// Run the script
createSuperAdmin();
