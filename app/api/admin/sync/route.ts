import { NextRequest, NextResponse } from "next/server";
import { dataSyncService } from "@/lib/storage/sync-service";
import { ErrorHandler } from "@/lib/storage/errors";

export async function POST(request: NextRequest) {
	try {
		const { direction } = await request.json().catch(() => ({}));

		let syncResult;

		switch (direction) {
			case "gcs-to-local":
				syncResult = await dataSyncService.syncFromGCSToLocal();
				break;
			case "local-to-gcs":
				syncResult = await dataSyncService.syncFromLocalToGCS();
				break;
			case "bidirectional":
			default:
				syncResult = await dataSyncService.syncData();
				break;
		}

		return NextResponse.json(
			{
				success: syncResult.success,
				message: syncResult.success
					? `Synchronization completed successfully (${
							direction || "bidirectional"
					  })`
					: "Synchronization completed with errors",
				result: syncResult,
			},
			{
				status: syncResult.success ? 200 : 207, // 207 Multi-Status for partial success
			}
		);
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			{
				operation: "sync",
				ip: request.ip,
			}
		);

		const errorResponse = ErrorHandler.createErrorResponse(
			error instanceof Error ? error : new Error("Sync failed")
		);

		return NextResponse.json(errorResponse, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		// Get sync status and metadata
		const metadata = await dataSyncService.getLastSyncMetadata();

		return NextResponse.json({
			lastSync: metadata,
			syncInProgress: false, // We could add this to the service if needed
			availableDirections: [
				"bidirectional",
				"gcs-to-local",
				"local-to-gcs",
			],
		});
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			{
				operation: "sync-status",
				ip: request.ip,
			}
		);

		const errorResponse = ErrorHandler.createErrorResponse(
			error instanceof Error
				? error
				: new Error("Failed to get sync status")
		);

		return NextResponse.json(errorResponse, { status: 500 });
	}
}
