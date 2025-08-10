import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readJsonFile, readJsonDirectory, paths } from "@/lib/gcs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

export async function POST(request: NextRequest) {
	try {
		const { email, password } = await request.json();

		console.log("Login attempt for email:", email); // Debug log

		// First check users index (for approved users)
		const users = await readJsonFile<any[]>(paths.usersIndex, []);
		let user = users.find((u) => u.email === email);

		// If not found in users index, check registrations (for pending users)
		if (!user) {
			console.log(
				"User not found in users index, checking registrations"
			); // Debug log
			const registrations = await readJsonDirectory<any>(
				paths.registrationStageManagerDir
			);
			user = registrations.find((r) => r.email === email);
			console.log("Found in registrations:", !!user); // Debug log
		}

		if (!user) {
			console.log("User not found anywhere"); // Debug log
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		console.log(
			"User found with status:",
			user.accountStatus,
			"role:",
			user.role
		); // Debug log

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			console.log("Invalid password"); // Debug log
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 }
			);
		}

		// Handle different account statuses (super_admin bypasses most checks)
		if (user.role !== "super_admin") {
			if (user.accountStatus === "suspended") {
				console.log("Account suspended"); // Debug log
				return NextResponse.json(
					{
						error: "Account suspended",
						accountStatus: "suspended",
						message:
							"Your account has been suspended. Please contact support for assistance.",
					},
					{ status: 403 }
				);
			}

			if (user.accountStatus === "deactivated") {
				console.log("Account deactivated"); // Debug log
				return NextResponse.json(
					{
						error: "Account deactivated",
						accountStatus: "deactivated",
						message:
							"Your account has been deactivated. Please contact support to reactivate.",
					},
					{ status: 403 }
				);
			}

			if (user.accountStatus === "rejected") {
				console.log("Account rejected"); // Debug log
				return NextResponse.json(
					{
						error: "Account rejected",
						accountStatus: "rejected",
						message:
							"Your account registration was rejected. Please contact support for more information.",
					},
					{ status: 403 }
				);
			}

			// Allow pending users to login but they'll be redirected appropriately
			if (user.accountStatus === "pending") {
				console.log(
					"Account pending - allowing login but will redirect to pending page"
				); // Debug log
			}
		}

		const token = jwt.sign(
			{
				userId: user.id,
				email: user.email,
				role: user.role,
				eventId: user.eventId,
			},
			JWT_SECRET,
			{ expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
		);

		const response = NextResponse.json({
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			eventId: user.eventId,
			accountStatus: user.accountStatus,
			subscriptionStatus: user.subscriptionStatus,
			subscriptionEndDate: user.subscriptionEndDate,
		});

		const cookieOptions = {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict" as const,
			maxAge: 7 * 24 * 60 * 60,
			path: "/",
		};

		response.cookies.set("auth-token", token, cookieOptions);

		console.log(
			"Login successful, setting cookie with options:",
			cookieOptions
		); // Debug log
		console.log("Token preview:", token.substring(0, 50) + "..."); // Debug log
		console.log("Login successful, returning user data"); // Debug log
		return response;
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
