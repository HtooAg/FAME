import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PERFORMANCE_ORDER_FILE = join(
	process.cwd(),
	"data",
	"performance-orders.json"
);

interface PerformanceSlot {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	style: string;
	duration: number;
	order: number;
	startTime?: string;
	endTime?: string;
	notes?: string;
}

interface PerformanceOrder {
	eventId: string;
	showStartTime: string;
	performanceOrder: PerformanceSlot[];
	updatedAt: string;
}

function getPerformanceOrders(): PerformanceOrder[] {
	if (!existsSync(PERFORMANCE_ORDER_FILE)) {
		return [];
	}
	try {
		const data = readFileSync(PERFORMANCE_ORDER_FILE, "utf8");
		return JSON.parse(data);
	} catch (error) {
		console.error("Error reading performance orders file:", error);
		return [];
	}
}

function savePerformanceOrders(orders: PerformanceOrder[]) {
	try {
		writeFileSync(PERFORMANCE_ORDER_FILE, JSON.stringify(orders, null, 2));
	} catch (error) {
		console.error("Error saving performance orders file:", error);
		throw error;
	}
}

export async function GET(
	request: NextRequest,
	{ params }: { params: { eventId: string } }
) {
	try {
		const eventId = params.eventId;
		const orders = getPerformanceOrders();
		const eventOrder = orders.find((o) => o.eventId === eventId);

		return NextResponse.json({
			performanceOrder: eventOrder?.performanceOrder || [],
			showStartTime: eventOrder?.showStartTime || "19:00",
		});
	} catch (error) {
		console.error("Error fetching performance order:", error);
		return NextResponse.json(
			{ error: "Failed to fetch performance order" },
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
		const { performanceOrder, showStartTime } = await request.json();

		const orders = getPerformanceOrders();
		const existingOrderIndex = orders.findIndex(
			(o) => o.eventId === eventId
		);

		const newOrder: PerformanceOrder = {
			eventId,
			showStartTime: showStartTime || "19:00",
			performanceOrder: performanceOrder.map((slot: any) => ({
				...slot,
				eventId,
			})),
			updatedAt: new Date().toISOString(),
		};

		if (existingOrderIndex >= 0) {
			orders[existingOrderIndex] = newOrder;
		} else {
			orders.push(newOrder);
		}

		savePerformanceOrders(orders);

		return NextResponse.json({
			message: "Performance order saved successfully",
			performanceOrder: newOrder,
		});
	} catch (error) {
		console.error("Error saving performance order:", error);
		return NextResponse.json(
			{ error: "Failed to save performance order" },
			{ status: 500 }
		);
	}
}
