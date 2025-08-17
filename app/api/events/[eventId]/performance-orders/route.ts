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

		// Fetch show order from GCS
		const showOrder = await GCSService.getShowOrder(
			eventId,
			performanceDate
		);

		if (!showOrder) {
			return NextResponse.json({
				success: true,
				data: {
					eventId,
					performanceDate,
					items: [],
					updated_at: new Date().toISOString(),
				},
			});
		}

		// Sort items by performance order
		const sortedItems =
			showOrder.items?.sort(
				(a: any, b: any) => a.performance_order - b.performance_order
			) || [];

		return NextResponse.json({
			success: true,
			data: {
				...showOrder,
				items: sortedItems,
			},
		});
	} catch (error) {
		console.error("Error fetching performance order:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch performance order",
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
		const { performanceDate, items, updated_by } = body;

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

		if (!Array.isArray(items)) {
			return NextResponse.json(
				{ success: false, error: "Items must be an array" },
				{ status: 400 }
			);
		}

		// Validate each item
		for (const item of items) {
			if (
				!item.id ||
				!item.type ||
				item.performance_order === undefined
			) {
				return NextResponse.json(
					{
						success: false,
						error: "Each item must have id, type, and performance_order",
					},
					{ status: 400 }
				);
			}

			if (!["artist", "cue"].includes(item.type)) {
				return NextResponse.json(
					{
						success: false,
						error: "Item type must be 'artist' or 'cue'",
					},
					{ status: 400 }
				);
			}
		}

		// Save show order to GCS
		await GCSService.saveShowOrder(eventId, performanceDate, items);

		// If there are artist items, update their performance orders in their profiles
		const artistItems = items.filter((item: any) => item.type === "artist");

		for (const artistItem of artistItems) {
			if (artistItem.artist?.id) {
				try {
					await GCSService.updateArtistPerformanceStatus(
						artistItem.artist.id,
						eventId,
						{
							performance_order: artistItem.performance_order,
							performance_date: performanceDate,
							performance_status: artistItem.status || null,
						}
					);
				} catch (error) {
					console.error(
						`Failed to update artist ${artistItem.artist.id}:`,
						error
					);
					// Continue with other artists even if one fails
				}
			}
		}

		// Send WebSocket notification for real-time updates
		try {
			await fetch(
				`${
					process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
				}/api/websocket`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						type: "performance_order_updated",
						eventId,
						performanceDate,
						data: { items },
					}),
				}
			);
		} catch (wsError) {
			console.error("Failed to send WebSocket notification:", wsError);
			// Don't fail the request if WebSocket fails
		}

		return NextResponse.json({
			success: true,
			message: "Performance order saved successfully",
			data: {
				eventId,
				performanceDate,
				items,
				updated_at: new Date().toISOString(),
				updated_by,
			},
		});
	} catch (error) {
		console.error("Error saving performance order:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to save performance order",
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
	// POST and PATCH do the same thing for performance orders
	return PATCH(request, { params });
}
