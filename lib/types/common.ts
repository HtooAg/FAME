// Common utility types used across the application

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Generic result type for operations that can succeed or fail
export interface Result<T, E = string> {
	success: boolean;
	data?: T;
	error?: E;
}

// Pagination types
export interface PaginationParams {
	page?: number;
	limit?: number;
	offset?: number;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

// Base entity interface
export interface BaseEntity {
	id: string;
	createdAt: string;
	updatedAt: string;
}

// Status types
export type EntityStatus = "active" | "inactive" | "pending" | "archived";

// File upload types
export interface FileUpload {
	name: string;
	size: number;
	type: string;
	url: string;
	path?: string;
	uploadedAt: string;
}

// WebSocket message types
export interface WebSocketMessage<T = any> {
	type: string;
	channel?: string;
	eventId?: string;
	data?: T;
	timestamp: string;
}

// Error types
export interface AppError {
	code: string;
	message: string;
	details?: any;
	timestamp: string;
}

// Form validation types
export interface ValidationError {
	field: string;
	message: string;
	code?: string;
}

export interface FormState<T> {
	data: T;
	errors: ValidationError[];
	isValid: boolean;
	isSubmitting: boolean;
}

// Date range type
export interface DateRange {
	startDate: string;
	endDate: string;
}

// Generic ID types
export type UserId = string;
export type EventId = string;
export type ArtistId = string;
export type PerformanceId = string;
