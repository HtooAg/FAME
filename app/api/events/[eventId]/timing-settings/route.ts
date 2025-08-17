import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;

		if (!eventId) {
			return NextResponse.json(
				{ success: false, error: "Event ID is required" },
				{ status: 400 }
			);
		}

		// Fetch timing settings from GCS
		const timingSettings = await GCSService.getTimingSettings(eventId);

		return NextResponse.json({
			success: true,
			data: timingSettings || {
				eventId,
				backstage_ready_time: null,
				show_start_time: null,
			},
		});
	} catch (error) {
		console.error("Error fetching timing settings:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch timing settings",
				details:
					error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;

		if (!eventId) {
			return NextResponse.json(
				{ success: false, error: "Event ID is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();
		const { backstage_ready_time, show_start_time, updated_by } = body;

		// Validate input
		if (!backstage_ready_time && !show_start_time) {
			return NextResponse.json(
				{
					success: false,
					error: "At least one timing setting is required",
				},
				{ status: 400 }
			);
		}

		// Validate time format (HH:MM)
		const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
		if (backstage_ready_time && !timeRegex.test(backstage_ready_time)) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid backstage ready time format. Use HH:MM",
				},
				{ status: 400 }
			);
		}

		if (show_start_time && !timeRegex.test(show_start_time)) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid show start time format. Use HH:MM",
				},
				{ status: 400 }
			);
		}

		// Save timing settings to GCS
		const timingSettings = {
			backstage_ready_time,
			show_start_time,
			updated_by,
			updated_at: new Date().toISOString(),
		};

		await GCSService.saveTimingSettings(eventId, timingSettings);

		return NextResponse.json({
			success: true,
			message: "Timing settings saved successfully",
			data: {
				eventId,
				...timingSettings,
			},
		});
	} catch (error) {
		console.error("Error saving timing settings:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to save timing settings",
				details:
					error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	// POST and PATCH do the same thing for timing settings
	return PATCH(request, { params });
}
