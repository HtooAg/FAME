import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readJsonFile, paths } from "@/lib/gcs";

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			return NextResponse.json(
				{
					success: false,
					error: "Email and password are required",
				},
				{ status: 400 }
			);
		}

		// Get all users
		const users = await readJsonFile<any[]>(paths.usersIndex, []);
		console.log(`Found ${users.length} total users in system`);

		// Find user by email
		const user = users.find((u) => u.email === email);

		if (!user) {
			return NextResponse.json(
				{
					success: false,
					error: "User not found",
					debug: {
						searchedEmail: email,
						availableEmails: users.map((u) => u.email),
						totalUsers: users.length,
					},
				},
				{ status: 404 }
			);
		}

		// Check password
		const isValidPassword = await bcrypt.compare(password, user.password);

		if (!isValidPassword) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid password",
					debug: {
						userFound: true,
						passwordMatch: false,
						userRole: user.role,
						accountStatus: user.accountStatus,
					},
				},
				{ status: 401 }
			);
		}

		// Check account status
		const statusCheck = {
			accountStatus: user.accountStatus,
			isActive: user.isActive,
			canLogin: false,
			reason: "",
		};

		if (user.accountStatus === "suspended") {
			statusCheck.reason = "Account is suspended";
		} else if (user.accountStatus === "deactivated") {
			statusCheck.reason = "Account is deactivated";
		} else if (user.accountStatus === "pending") {
			statusCheck.reason = "Account is pending approval";
		} else if (user.accountStatus === "rejected") {
			statusCheck.reason = "Account was rejected";
		} else if (
			user.accountStatus === "active" ||
			user.role === "super_admin"
		) {
			statusCheck.canLogin = true;
			statusCheck.reason = "Account is valid for login";
		} else {
			statusCheck.reason = `Unknown account status: ${user.accountStatus}`;
		}

		return NextResponse.json({
			success: true,
			message: "Credentials validated",
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				accountStatus: user.accountStatus,
				isActive: user.isActive,
				eventId: user.eventId,
				createdAt: user.createdAt,
				approvedAt: user.approvedAt,
			},
			statusCheck,
			expectedRedirect:
				user.role === "super_admin"
					? "/super-admin"
					: user.role === "stage_manager" &&
					  user.accountStatus === "active"
					? "/stage-manager"
					: "No redirect (account not active or unknown role)",
		});
	} catch (error) {
		console.error("Test login error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Internal server error",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
