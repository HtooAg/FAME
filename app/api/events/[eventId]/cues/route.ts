import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const { searchParams } = new URL(request.url);
		const performanceDate = searchParams.get("performanceDate");

		if (!eventId) {
			return NextResponse.json(
				{ success: false, error: "Event ID is required" },
				{ status: 400 }
			);
		}

		if (!performanceDate) {
			return NextResponse.json(
				{ success: false, error: "Performance date is required" },
				{ status: 400 }
			);
		}

		// Fetch cues from GCS
		const cues = await GCSService.getCues(eventId, performanceDate);

		// Sort cues by performance order
		const sortedCues = cues.sort(
			(a, b) => a.performance_order - b.performance_order
		);

		return NextResponse.json({
			success: true,
			data: sortedCues,
			count: sortedCues.length,
		});
	} catch (error) {
		console.error("Error fetching cues:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch cues",
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
	try {
		const { eventId } = params;
		const body = await request.json();
		const {
			id,
			type,
			title,
			duration,
			performance_order,
			notes,
			performanceDate,
		} = body;

		if (!eventId) {
			return NextResponse.json(
				{ success: false, error: "Event ID is required" },
				{ status: 400 }
			);
		}

		// Validate required fields
		if (
			!id ||
			!type ||
			!title ||
			performance_order === undefined ||
			!performanceDate
		) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields: id, type, title, performance_order, performanceDate",
				},
				{ status: 400 }
			);
		}

		// Validate cue type
		const validTypes = [
			"mc_break",
			"video_break",
			"cleaning_break",
			"speech_break",
			"opening",
			"countdown",
			"artist_ending",
			"animation",
		];

		if (!validTypes.includes(type)) {
			return NextResponse.json(
				{
					success: false,
					error: `Invalid cue type. Must be one of: ${validTypes.join(
						", "
					)}`,
				},
				{ status: 400 }
			);
		}

		// Create cue object
		const cue = {
			id,
			type,
			title,
			duration: duration || 0,
			performance_order,
			notes: notes || "",
			is_completed: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Save cue to GCS
		await GCSService.saveCue(eventId, performanceDate, cue);

		return NextResponse.json({
			success: true,
			message: "Cue created successfully",
			data: {
				...cue,
				eventId,
				performanceDate,
			},
		});
	} catch (error) {
		console.error("Error creating cue:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to create cue",
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
		const body = await request.json();
		const {
			id,
			type,
			title,
			duration,
			performance_order,
			notes,
			performanceDate,
			is_completed,
			completed_at,
			performance_status,
		} = body;

		if (!eventId || !id || !performanceDate) {
			return NextResponse.json(
				{
					success: false,
					error: "Event ID, cue ID, and performance date are required",
				},
				{ status: 400 }
			);
		}

		// Get existing cue to preserve data
		const existingCues = await GCSService.getCues(eventId, performanceDate);
		const existingCue = existingCues.find((cue) => cue.id === id);

		if (!existingCue) {
			return NextResponse.json(
				{ success: false, error: "Cue not found" },
				{ status: 404 }
			);
		}

		// Update cue object
		const updatedCue = {
			...existingCue,
			...(type && { type }),
			...(title && { title }),
			...(duration !== undefined && { duration }),
			...(performance_order !== undefined && { performance_order }),
			...(notes !== undefined && { notes }),
			...(is_completed !== undefined && { is_completed }),
			...(completed_at !== undefined && { completed_at }), // Allow null values
			...(performance_status !== undefined && { performance_status }), // Store the actual status
			updated_at: new Date().toISOString(),
		};

		// Save updated cue to GCS
		await GCSService.saveCue(eventId, performanceDate, updatedCue);

		return NextResponse.json({
			success: true,
			message: "Cue updated successfully",
			data: {
				...updatedCue,
				eventId,
				performanceDate,
			},
		});
	} catch (error) {
		console.error("Error updating cue:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update cue",
				details:
					error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const { eventId } = params;
		const { searchParams } = new URL(request.url);
		const cueId = searchParams.get("cueId");
		const performanceDate = searchParams.get("performanceDate");

		if (!eventId || !cueId || !performanceDate) {
			return NextResponse.json(
				{
					success: false,
					error: "Event ID, cue ID, and performance date are required",
				},
				{ status: 400 }
			);
		}

		// Delete cue from GCS
		await GCSService.deleteCue(eventId, performanceDate, cueId);

		return NextResponse.json({
			success: true,
			message: "Cue deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting cue:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to delete cue",
				details:
					error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
