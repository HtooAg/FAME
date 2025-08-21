import { NextRequest, NextResponse } from "next/server";
import { storageManager } from "@/lib/storage/storage-manager";

export async function GET(request: NextRequest) {
	try {
		// Initialize storage manager if not already done
		await storageManager.initialize();

		// Get comprehensive health status
		const healthStatus = await storageManager.getHealthStatus();

		const response = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			storage: {
				gcs: {
					available: healthStatus.gcs.available,
					lastCheck: healthStatus.gcs.lastCheck,
				},
				local: {
					available: healthStatus.local.available,
					path: healthStatus.local.path,
				},
				fallbackActive: healthStatus.fallbackActive,
			},
			services: {
				authentication:
					healthStatus.local.available || healthStatus.gcs.available,
				registration:
					healthStatus.local.available || healthStatus.gcs.available,
			},
		};

		// Determine overall status
		if (!healthStatus.local.available && !healthStatus.gcs.available) {
			response.status = "unhealthy";
			return NextResponse.json(response, { status: 503 });
		} else if (healthStatus.fallbackActive) {
			response.status = "degraded";
			return NextResponse.json(response, { status: 200 });
		}

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Health check error:", error);

		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : "Unknown error",
				storage: {
					gcs: { available: false },
					local: { available: false },
					fallbackActive: false,
				},
				services: {
					authentication: false,
					registration: false,
				},
			},
			{ status: 503 }
		);
	}
}
