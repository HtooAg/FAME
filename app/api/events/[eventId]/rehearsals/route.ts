import { NextRequest, NextResponse } from "next/server";
import { GCSService } from "@/lib/google-cloud-storage";
import { readJsonFile, writeJsonFile } from "@/lib/gcs";

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
	timestamp: string;
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Get rehearsals from GCS
		const rehearsals = await readJsonFile<any[]>(
			`events/${eventId}/rehearsals.json`,
			[]
		);

		return NextResponse.json<ApiResponse<any[]>>({
			success: true,
			data: rehearsals || [],
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error fetching rehearsals:", error);
		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch rehearsals",
				},
				timestamp: new Date().toISOString(),
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
		const eventId = params.eventId;
		const { artistId, date, startTime, endTime, notes } =
			await request.json();

		console.log("Rehearsal POST request data:", {
			eventId,
			artistId,
			date,
			startTime,
			endTime,
			notes,
		});

		if (!eventId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "MISSING_PARAMETERS",
						message: "Event ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Validate required fields
		if (!artistId) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Artist ID is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		if (!date) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Date is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		if (!startTime) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Start time is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		if (!endTime) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "End time is required",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Validate time format (accept both HH:MM 24-hour and HH:MM AM/PM formats)
		const time24Regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/; // 24-hour format
		const time12Regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i; // 12-hour format

		if (!time24Regex.test(startTime) && !time12Regex.test(startTime)) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message:
							"Start time must be in HH:MM or HH:MM AM/PM format",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		if (!time24Regex.test(endTime) && !time12Regex.test(endTime)) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message:
							"End time must be in HH:MM or HH:MM AM/PM format",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 400 }
			);
		}

		// Get artist data to get artist name
		const artistData = await GCSService.getArtistData(artistId);
		if (!artistData) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Artist not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Create rehearsal object
		const rehearsal = {
			id: `rehearsal_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`,
			artistId,
			artistName: artistData.artistName || artistData.artist_name,
			date,
			startTime,
			endTime,
			status: "scheduled",
			notes: notes || "",
			eventId,
			createdAt: new Date().toISOString(),
		};

		// Get existing rehearsals
		const existingRehearsals = await readJsonFile<any[]>(
			`events/${eventId}/rehearsals.json`,
			[]
		);

		// Add new rehearsal
		const updatedRehearsals = [...existingRehearsals, rehearsal];

		// Save to GCS
		await writeJsonFile(
			`events/${eventId}/rehearsals.json`,
			updatedRehearsals
		);

		return NextResponse.json<ApiResponse<any>>({
			success: true,
			data: {
				message: "Rehearsal scheduled successfully",
				rehearsal,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error creating rehearsal:", error);
		return NextResponse.json<ApiResponse<null>>(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to schedule rehearsal",
				},
				timestamp: new Date().toISOString(),
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
		const eventId = params.eventId;
		const {
			rehearsalId,
			status,
			artistId,
			date,
			startTime,
			endTime,
			notes,
		} = await request.json();

		// Get existing rehearsals
		const existingRehearsals = await readJsonFile<any[]>(
			`events/${eventId}/rehearsals.json`,
			[]
		);

		if (!existingRehearsals || existingRehearsals.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "No rehearsals found",
				},
				{ status: 404 }
			);
		}

		// Find and update the rehearsal
		const rehearsalIndex = existingRehearsals.findIndex(
			(r: any) => r.id === rehearsalId
		);
		if (rehearsalIndex === -1) {
			return NextResponse.json<ApiResponse<null>>(
				{
					success: false,
					error: {
						code: "NOT_FOUND",
						message: "Rehearsal not found",
					},
					timestamp: new Date().toISOString(),
				},
				{ status: 404 }
			);
		}

		// Update rehearsal data
		const updatedRehearsal = {
			...existingRehearsals[rehearsalIndex],
			...(status && { status }),
			...(artistId && { artistId }),
			...(date && { date }),
			...(startTime && { startTime }),
			...(endTime && { endTime }),
			...(notes !== undefined && { notes }),
			updatedAt: new Date().toISOString(),
		};

		// If artistId changed, update artist name
		if (
			artistId &&
			artistId !== existingRehearsals[rehearsalIndex].artistId
		) {
			const artistData = await GCSService.getArtistData(artistId);
			if (artistData) {
				updatedRehearsal.artistName =
					artistData.artistName || artistData.artist_name;
			}
		}

		existingRehearsals[rehearsalIndex] = updatedRehearsal;

		// Save to GCS
		await writeJsonFile(
			`events/${eventId}/rehearsals.json`,
			existingRehearsals
		);

		return NextResponse.json({
			success: true,
			message: "Rehearsal updated successfully",
			rehearsal: updatedRehearsal,
		});
	} catch (error) {
		console.error("Error updating rehearsal:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to update rehearsal",
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
		const eventId = params.eventId;
		const { rehearsalId } = await request.json();

		// Get existing rehearsals
		const existingRehearsals = await readJsonFile<any[]>(
			`events/${eventId}/rehearsals.json`,
			[]
		);

		if (!existingRehearsals || existingRehearsals.length === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "No rehearsals found",
				},
				{ status: 404 }
			);
		}

		// Filter out the rehearsal to delete
		const updatedRehearsals = existingRehearsals.filter(
			(r: any) => r.id !== rehearsalId
		);

		if (updatedRehearsals.length === existingRehearsals.length) {
			return NextResponse.json(
				{
					success: false,
					error: "Rehearsal not found",
				},
				{ status: 404 }
			);
		}

		// Save to GCS
		await writeJsonFile(
			`events/${eventId}/rehearsals.json`,
			updatedRehearsals
		);

		return NextResponse.json({
			success: true,
			message: "Rehearsal deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting rehearsal:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to delete rehearsal",
			},
			{ status: 500 }
		);
	}
}
