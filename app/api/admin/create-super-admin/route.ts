import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readJsonFile, writeJsonFile, paths } from "@/lib/gcs";

// This endpoint should only be used in development or for initial setup
// In production, you should disable this or add additional security measures
export async function POST(request: NextRequest) {
	try {
		// Security check - only allow in development or if no super admin exists
		if (process.env.NODE_ENV === "production") {
			// Check if any super admin already exists
			const users = await readJsonFile<any[]>(paths.usersIndex, []);
			const existingSuperAdmin = users.find(
				(user) => user.role === "super_admin"
			);

			if (existingSuperAdmin) {
				return NextResponse.json(
					{
						error: "Super admin already exists. This endpoint is disabled in production.",
					},
					{ status: 403 }
				);
			}
		}

		const { name, email, password } = await request.json();

		// Validate required fields
		if (!name || !email || !password) {
			return NextResponse.json(
				{ error: "Name, email, and password are required" },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Invalid email format" },
				{ status: 400 }
			);
		}

		// Validate password strength
		if (password.length < 8) {
			return NextResponse.json(
				{ error: "Password must be at least 8 characters long" },
				{ status: 400 }
			);
		}

		// Read existing users
		const users = await readJsonFile<any[]>(paths.usersIndex, []);

		// Check if email already exists
		const existingUser = users.find((user) => user.email === email);
		if (existingUser) {
			return NextResponse.json(
				{ error: `User with email ${email} already exists` },
				{ status: 409 }
			);
		}

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

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
				createdBy: "api",
				createdAt: new Date().toISOString(),
				ipAddress: request.ip || "unknown",
				userAgent: request.headers.get("user-agent") || "unknown",
			},
		};

		// Add to users array
		users.push(superAdmin);

		// Save updated users list
		await writeJsonFile(paths.usersIndex, users);

		// Also save individual user file
		await writeJsonFile(paths.userByRole("super_admin", id), superAdmin);

		return NextResponse.json({
			success: true,
			message: "Super admin account created successfully",
			user: {
				id: superAdmin.id,
				name: superAdmin.name,
				email: superAdmin.email,
				role: superAdmin.role,
				accountStatus: superAdmin.accountStatus,
				createdAt: superAdmin.createdAt,
			},
		});
	} catch (error) {
		console.error("Error creating super admin:", error);
		return NextResponse.json(
			{ error: "Failed to create super admin account" },
			{ status: 500 }
		);
	}
}
