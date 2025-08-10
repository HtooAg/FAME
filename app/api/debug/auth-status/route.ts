import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { readJsonFile, paths, readJsonDirectory } from "@/lib/gcs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

export async function GET(request: NextRequest) {
	try {
		// Get all users
		const users = await readJsonFile<any[]>(paths.usersIndex, []);

		// Get all registrations
		const registrations = await readJsonDirectory<any>(
			paths.registrationStageManagerDir
		);

		// Check current token
		const token = request.cookies.get("auth-token")?.value;
		let currentUser = null;
		let tokenValid = false;

		if (token) {
			try {
				const decoded = jwt.verify(token, JWT_SECRET) as any;
				currentUser = users.find((u) => u.id === decoded.userId);
				tokenValid = true;
			} catch (error) {
				tokenValid = false;
			}
		}

		// Categorize users by role and status
		const usersByRole = {
			super_admin: users.filter((u) => u.role === "super_admin"),
			stage_manager: users.filter((u) => u.role === "stage_manager"),
			artist: users.filter((u) => u.role === "artist"),
			dj: users.filter((u) => u.role === "dj"),
			mc: users.filter((u) => u.role === "mc"),
			graphics: users.filter((u) => u.role === "graphics"),
			other: users.filter(
				(u) =>
					![
						"super_admin",
						"stage_manager",
						"artist",
						"dj",
						"mc",
						"graphics",
					].includes(u.role)
			),
		};

		const usersByStatus = {
			active: users.filter((u) => u.accountStatus === "active"),
			pending: users.filter((u) => u.accountStatus === "pending"),
			suspended: users.filter((u) => u.accountStatus === "suspended"),
			deactivated: users.filter((u) => u.accountStatus === "deactivated"),
			rejected: users.filter((u) => u.accountStatus === "rejected"),
			other: users.filter(
				(u) =>
					![
						"active",
						"pending",
						"suspended",
						"deactivated",
						"rejected",
					].includes(u.accountStatus)
			),
		};

		return NextResponse.json({
			success: true,
			data: {
				totalUsers: users.length,
				totalRegistrations: registrations.length,
				currentUser: currentUser
					? {
							id: currentUser.id,
							name: currentUser.name,
							email: currentUser.email,
							role: currentUser.role,
							accountStatus: currentUser.accountStatus,
					  }
					: null,
				tokenValid,
				usersByRole: {
					super_admin: usersByRole.super_admin.length,
					stage_manager: usersByRole.stage_manager.length,
					artist: usersByRole.artist.length,
					other: usersByRole.other.length,
				},
				usersByStatus: {
					active: usersByStatus.active.length,
					pending: usersByStatus.pending.length,
					suspended: usersByStatus.suspended.length,
					deactivated: usersByStatus.deactivated.length,
					rejected: usersByStatus.rejected.length,
					other: usersByStatus.other.length,
				},
				superAdmins: usersByRole.super_admin.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					accountStatus: u.accountStatus,
					createdAt: u.createdAt,
				})),
				stageManagers: usersByRole.stage_manager.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					accountStatus: u.accountStatus,
					eventId: u.eventId,
					approvedAt: u.approvedAt,
				})),
				pendingRegistrations: registrations
					.filter((r) => r.accountStatus === "pending")
					.map((r) => ({
						id: r.id,
						name: r.name,
						email: r.email,
						eventName: r.eventName,
						registeredAt: r.registeredAt,
					})),
			},
		});
	} catch (error) {
		console.error("Debug auth status error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to get auth status",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
