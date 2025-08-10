import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
    paths,
    readJsonFile,
    readJsonDirectory,
    writeJsonFile,
} from "@/lib/gcs";
import { broadcastUserStatusUpdate } from "@/app/api/websocket/route";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

async function verifySuperAdmin(request: NextRequest) {
    const token = request.cookies.get("auth-token")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const users = await readJsonFile<any[]>(paths.usersIndex, []);
        const user = users.find((u) => u.id === decoded.userId);
        if (user && user.role === "super_admin") return user;
        return null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const admin = await verifySuperAdmin(request);
        if (!admin)
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );

        const registrations = await readJsonDirectory<any>(
            paths.registrationStageManagerDir
        );
        const users = await readJsonFile<any[]>(paths.usersIndex, []);
        const stageManagers = users.filter((u) => u.role === "stage_manager");

        return NextResponse.json({
            pendingRegistrations: registrations.filter(
                (r) => r.accountStatus === "pending"
            ),
            rejectedRegistrations: registrations.filter(
                (r) => r.accountStatus === "rejected"
            ),
            activeStageManagers: stageManagers.filter(
                (u) => u.accountStatus === "active"
            ),
            suspendedStageManagers: stageManagers.filter(
                (u) => u.accountStatus === "suspended"
            ),
            deactivatedStageManagers: stageManagers.filter(
                (u) => u.accountStatus === "deactivated"
            ),
            allStageManagers: stageManagers,
        });
    } catch (error) {
        console.error("SA GET error:", error);
        return NextResponse.json(
            { error: "Failed to fetch stage managers" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = await verifySuperAdmin(request);
        if (!admin)
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );

        const { action, stageManagerId, eventId, subscriptionEndDate } =
            await request.json();

        // Helper function to find registration by ID
        const findRegistrationById = async (id: string) => {
            const registrations = await readJsonDirectory<any>(
                paths.registrationStageManagerDir
            );
            return registrations.find((r) => r.id.toString() === id.toString());
        };

        switch (action) {
            case "approve": {
                const reg = await findRegistrationById(stageManagerId);
                if (!reg)
                    return NextResponse.json(
                        { error: "Registration not found" },
                        { status: 404 }
                    );

                const users = await readJsonFile<any[]>(paths.usersIndex, []);
                const approvedUser = {
                    ...reg,
                    accountStatus: "active",
                    isActive: true,
                    eventId,
                    subscriptionEndDate,
                    approvedAt: new Date().toISOString(),
                    role: "stage_manager",
                };
                users.push(approvedUser);
                await writeJsonFile(paths.usersIndex, users);
                await writeJsonFile(
                    paths.userByRole("stage_manager", approvedUser.id),
                    approvedUser
                );

                // Remove from registrations by updating status to migrated
                const regPath = paths.registrationStageManagerFile(
                    reg.name,
                    reg.id
                );
                await writeJsonFile(regPath, {
                    ...reg,
                    accountStatus: "migrated",
                    migratedAt: new Date().toISOString(),
                });

                // Notify the user in real-time
                await broadcastUserStatusUpdate(String(approvedUser.id), {
                    status: "approved",
                    message: "Your account has been approved",
                });

                return NextResponse.json({
                    message: "Stage manager approved successfully",
                });
            }
            case "reject": {
                const reg = await findRegistrationById(stageManagerId);
                if (!reg)
                    return NextResponse.json(
                        { error: "Registration not found" },
                        { status: 404 }
                    );

                // Update registration status to rejected
                const regPath = paths.registrationStageManagerFile(
                    reg.name,
                    reg.id
                );
                await writeJsonFile(regPath, {
                    ...reg,
                    accountStatus: "rejected",
                    rejectedAt: new Date().toISOString(),
                });

                // Notify the user in real-time
                await broadcastUserStatusUpdate(String(reg.id), {
                    status: "rejected",
                    message: "Your registration has been rejected",
                });

                return NextResponse.json({
                    message: "Stage manager registration rejected",
                });
            }
            case "suspend":
            case "activate":
            case "deactivate": {
                const users = await readJsonFile<any[]>(paths.usersIndex, []);
                const idx = users.findIndex((u) => u.id === stageManagerId);
                if (idx === -1)
                    return NextResponse.json(
                        { error: "Stage manager not found" },
                        { status: 404 }
                    );
                const statusMap: any = {
                    suspend: "suspended",
                    activate: "active",
                    deactivate: "deactivated",
                };
                const newStatus = statusMap[action] || "active";
                users[idx].accountStatus = newStatus;
                users[idx].isActive = newStatus === "active";
                users[idx].statusUpdatedAt = new Date().toISOString();
                await writeJsonFile(paths.usersIndex, users);
                await writeJsonFile(
                    paths.userByRole("stage_manager", users[idx].id),
                    users[idx]
                );

                // Notify the user in real-time
                await broadcastUserStatusUpdate(String(users[idx].id), {
                    status: newStatus,
                    message: `Your account status is now ${newStatus}`,
                });
                return NextResponse.json({
                    message: `Stage manager ${newStatus} successfully`,
                });
            }
            case "extend_subscription": {
                const users = await readJsonFile<any[]>(paths.usersIndex, []);
                const idx = users.findIndex((u) => u.id === stageManagerId);
                if (idx === -1)
                    return NextResponse.json(
                        { error: "Stage manager not found" },
                        { status: 404 }
                    );
                users[idx].subscriptionEndDate = subscriptionEndDate;
                users[idx].subscriptionUpdatedAt = new Date().toISOString();
                await writeJsonFile(paths.usersIndex, users);
                await writeJsonFile(
                    paths.userByRole("stage_manager", users[idx].id),
                    users[idx]
                );
                // FYI toast only, no status change
                await broadcastUserStatusUpdate(String(users[idx].id), {
                    status: "subscription_updated",
                    message: "Your subscription has been updated",
                });
                return NextResponse.json({
                    message: "Subscription extended successfully",
                });
            }
            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("SA POST error:", error);
        return NextResponse.json(
            { error: "Failed to manage stage manager" },
            { status: 500 }
        );
    }
}
