export interface Event {
	id: string;
	name: string;
	venueName: string;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	description: string;
	stageManagerId: string;
	showDates: string[]; // Array of ISO date strings
	status: "draft" | "active" | "completed" | "cancelled";
	createdAt: string; // ISO date string
	updatedAt: string; // ISO date string
}

export interface ShowDate {
	id: string;
	eventId: string;
	date: string; // ISO date string
	status: "scheduled" | "completed" | "cancelled";
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateEventData {
	name: string;
	venueName: string;
	startDate: Date;
	endDate: Date;
	description: string;
}

export interface EventFormData {
	name: string;
	venueName: string;
	startDate: Date;
	endDate: Date;
	description: string;
}
