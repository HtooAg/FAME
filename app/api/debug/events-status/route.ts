import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, paths } from "@/lib/gcs";
import jwt, { type Secret } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

// Force dynamic rendering since this route uses request.cookies
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	try {
		// Get user from JWT
		const token = request.cookies.get("auth-token")?.value;
		let user = null;
		if (token) {
			try {
				user = jwt.verify(token, JWT_SECRET as Secret) as any;
			} catch (error) {
				// Invalid token
			}
		}

		// Read all events
		const allEvents = await readJsonFile<any[]>(paths.eventsIndex, []);

		// Read users
		const users = await readJsonFile<any[]>(paths.usersIndex, []);

		return NextResponse.json({
			currentUser: user,
			totalEvents: allEvents.length,
			allEvents: allEvents.map((e) => ({
				id: e.id,
				name: e.name,
				stageManagerId: e.stageManagerId,
				createdAt: e.createdAt,
			})),
			totalUsers: users.length,
			stageManagers: users
				.filter((u) => u.role === "stage_manager")
				.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					accountStatus: u.accountStatus,
				})),
		});
	} catch (error: unknown) {
		console.error("Debug events status error:", error);
		const message =
			typeof error === "object" && error && "message" in error
				? String((error as any).message)
				: "Unknown error";
		return NextResponse.json(
			{ error: "Internal server error", details: message },
			{ status: 500 }
		);
	}
}
