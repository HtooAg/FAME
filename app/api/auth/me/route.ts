import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { readJsonFile, readJsonDirectory, paths } from "@/lib/gcs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

// Force dynamic rendering since this route uses request.cookies
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		const token = request.cookies.get("auth-token")?.value;
		if (!token)
			return NextResponse.json({ error: "No token" }, { status: 401 });

		const decoded = jwt.verify(token, JWT_SECRET) as any;

		// First check users index (for approved users)
		const users = await readJsonFile<any[]>(paths.usersIndex, []);
		let user = users.find((u) => u.id === decoded.userId);

		console.log("User lookup result:", {
			userId: decoded.userId,
			found: !!user,
		}); // Debug log

		// Special handling for super admin
		if (decoded.role === "super_admin") {
			const adminUser = users.find(
				(u) => u.role === "super_admin" && u.id === decoded.userId
			);
			if (adminUser) {
				return NextResponse.json({
					id: adminUser.id,
					email: adminUser.email,
					name: adminUser.name,
					role: "super_admin",
					accountStatus: "active",
					subscriptionStatus: "active",
				});
			}
		}

		// If not found in users index, check registrations (for pending users)
		if (!user) {
			const registrations = await readJsonDirectory<any>(
				paths.registrationStageManagerDir
			);
			user = registrations.find((r) => r.id === decoded.userId);
			console.log("Registration lookup result:", {
				userId: decoded.userId,
				found: !!user,
			}); // Debug log
		}

		if (!user)
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 }
			);

		// Check account status (super_admin bypasses most checks)
		if (user.role !== "super_admin") {
			if (user.accountStatus === "suspended") {
				return NextResponse.json(
					{ error: "Account suspended", accountStatus: "suspended" },
					{ status: 403 }
				);
			}

			if (user.accountStatus === "deactivated") {
				return NextResponse.json(
					{
						error: "Account deactivated",
						accountStatus: "deactivated",
					},
					{ status: 403 }
				);
			}

			if (user.accountStatus === "rejected") {
				return NextResponse.json(
					{
						error: "Account rejected",
						accountStatus: "rejected",
					},
					{ status: 403 }
				);
			}

			// Allow pending users to get their data but they'll be redirected appropriately
			if (user.accountStatus === "pending") {
				// Return user data but the frontend will handle redirection
			}
		}

		return NextResponse.json({
			id: user.id,
			email: user.email,
			name: user.name,
			role: user.role,
			eventId: user.eventId,
			accountStatus: user.accountStatus,
			subscriptionStatus: user.subscriptionStatus,
			subscriptionEndDate: user.subscriptionEndDate,
		});
	} catch (error) {
		console.error("Me error:", error);
		return NextResponse.json({ error: "Invalid token" }, { status: 401 });
	}
}
