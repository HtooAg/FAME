// Mock data for development and testing

export interface MockUser {
	id: string;
	name: string;
	email: string;
	role: "super_admin" | "stage_manager" | "artist";
	status: "active" | "pending" | "inactive";
	createdAt: string;
	lastLogin?: string;
}

export interface MockEvent {
	id: string;
	name: string;
	venue: string;
	date: string;
	status: "upcoming" | "active" | "completed";
	artistCount: number;
}

export interface MockNotification {
	id: string;
	title: string;
	message: string;
	type: "info" | "success" | "warning" | "error";
	timestamp: string;
	read: boolean;
}

export interface MockPendingRegistration {
	id: string;
	name: string;
	email: string;
	role: string;
	submittedAt: string;
	status: "pending" | "approved" | "rejected";
}

export const mockUsers: MockUser[] = [
	{
		id: "1",
		name: "John Admin",
		email: "admin@example.com",
		role: "super_admin",
		status: "active",
		createdAt: "2024-01-01T00:00:00Z",
		lastLogin: "2024-01-15T10:30:00Z",
	},
	{
		id: "2",
		name: "Jane Manager",
		email: "manager@example.com",
		role: "stage_manager",
		status: "active",
		createdAt: "2024-01-02T00:00:00Z",
		lastLogin: "2024-01-14T15:45:00Z",
	},
	{
		id: "3",
		name: "Bob Artist",
		email: "artist@example.com",
		role: "artist",
		status: "active",
		createdAt: "2024-01-03T00:00:00Z",
		lastLogin: "2024-01-13T09:20:00Z",
	},
];

export const mockEvents: MockEvent[] = [
	{
		id: "1",
		name: "Summer Music Festival",
		venue: "Central Park",
		date: "2024-07-15",
		status: "upcoming",
		artistCount: 12,
	},
	{
		id: "2",
		name: "Jazz Night",
		venue: "Blue Note",
		date: "2024-06-20",
		status: "active",
		artistCount: 8,
	},
	{
		id: "3",
		name: "Rock Concert",
		venue: "Madison Square Garden",
		date: "2024-05-10",
		status: "completed",
		artistCount: 15,
	},
];

export const mockNotifications: MockNotification[] = [
	{
		id: "1",
		title: "New Artist Registration",
		message: "A new artist has registered for Summer Music Festival",
		type: "info",
		timestamp: "2024-01-15T10:00:00Z",
		read: false,
	},
	{
		id: "2",
		title: "Event Approved",
		message: "Jazz Night has been approved and is now live",
		type: "success",
		timestamp: "2024-01-14T14:30:00Z",
		read: true,
	},
	{
		id: "3",
		title: "System Maintenance",
		message: "Scheduled maintenance tonight from 2-4 AM",
		type: "warning",
		timestamp: "2024-01-13T16:00:00Z",
		read: false,
	},
];

export const mockPendingRegistrations: MockPendingRegistration[] = [
	{
		id: "1",
		name: "Alice Smith",
		email: "alice@example.com",
		role: "stage_manager",
		submittedAt: "2024-01-15T09:00:00Z",
		status: "pending",
	},
	{
		id: "2",
		name: "Charlie Brown",
		email: "charlie@example.com",
		role: "stage_manager",
		submittedAt: "2024-01-14T11:30:00Z",
		status: "pending",
	},
	{
		id: "3",
		name: "Diana Prince",
		email: "diana@example.com",
		role: "artist",
		submittedAt: "2024-01-13T15:45:00Z",
		status: "approved",
	},
];
