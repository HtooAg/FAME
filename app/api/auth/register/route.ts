import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { writeJsonFile, paths, readJsonFile } from "@/lib/gcs";

async function getNextId(): Promise<number> {
	const counter = await readJsonFile<{ currentId: number }>(
		paths.stageManagerCounter,
		{ currentId: 0 }
	);
	const nextId = counter.currentId + 1;
	await writeJsonFile(paths.stageManagerCounter, { currentId: nextId });
	return nextId;
}

export async function POST(request: NextRequest) {
	try {
		const { name, email, password, eventName } = await request.json();

		// Validate required fields
		if (!name || !email || !password) {
			return NextResponse.json(
				{ error: "Name, email, and password are required" },
				{ status: 400 }
			);
		}

		// Check email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Invalid email format" },
				{ status: 400 }
			);
		}

		const id = await getNextId();
		const hashedPassword = await bcrypt.hash(
			password,
			parseInt(process.env.BCRYPT_ROUNDS || "10")
		);

		// Store a registration per-role file with name in filename
		const registration = {
			id,
			name,
			email,
			password: hashedPassword,
			role: "stage_manager",
			accountStatus: "pending",
			subscriptionStatus: "trial",
			subscriptionEndDate: "",
			isActive: false,
			eventName,
			registeredAt: new Date().toISOString(),
			metadata: {
				ipAddress: request.ip || "unknown",
				userAgent: request.headers.get("user-agent") || "unknown",
				createdAt: new Date().toISOString(),
			},
		};

		// Save the registration using both name and ID in the path
		await writeJsonFile(
			paths.registrationStageManagerFile(name, id),
			registration
		);

		// Create notification for super admin with sequential ID
		await writeJsonFile(`notifications/admin/registration-${id}.json`, {
			id: `reg-${id}`,
			type: "new_registration",
			stageManagerId: id,
			stageManagerName: name,
			message: `New stage manager registration: ${name} (${email})`,
			eventName,
			timestamp: new Date().toISOString(),
			read: false,
		});

		return NextResponse.json({
			message:
				"Registration submitted successfully. Await admin approval.",
			id,
		});
	} catch (error) {
		console.error("Registration error:", error);
		return NextResponse.json(
			{ error: "Registration failed" },
			{ status: 500 }
		);
	}
}
