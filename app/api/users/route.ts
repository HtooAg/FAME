import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { paths, readJsonFile, writeJsonFile } from "@/lib/gcs";

export async function GET() {
	try {
		const users = await readJsonFile<any[]>(paths.usersIndex, []);
		const safe = users.map(({ password, ...rest }) => rest);
		return NextResponse.json(safe);
	} catch (error) {
		console.error("Users GET error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { name, email, role, eventId, password } = await request.json();
		const rounds = parseInt(process.env.BCRYPT_ROUNDS || "10");

		const newUser = {
			id: uuidv4(),
			name,
			email,
			password: await bcrypt.hash(password, rounds),
			role,
			eventId,
			accountStatus: "active",
			subscriptionStatus: "unlimited",
			subscriptionEndDate: "2025-12-31",
			isActive: true,
			createdAt: new Date().toISOString(),
		};

		const users = await readJsonFile<any[]>(paths.usersIndex, []);
		users.push(newUser);
		await writeJsonFile(paths.usersIndex, users);
		await writeJsonFile(paths.userByRole(role, newUser.id), newUser);

		const { password: _pw, ...safe } = newUser;
		return NextResponse.json(safe);
	} catch (error) {
		console.error("Users POST error:", error);
		return NextResponse.json(
			{ error: "Failed to create user" },
			{ status: 500 }
		);
	}
}
