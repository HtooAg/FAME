import { NextRequest } from "next/server";
import { User } from "./user";
import { AppError, Result } from "./common";

// API Response wrapper type
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp?: string;
}

// API Error response
export interface ApiErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: string;
}

// API Success response
export interface ApiSuccessResponse<T> {
	success: true;
	data: T;
	timestamp?: string;
}

// Route parameter types for Next.js dynamic routes
export interface RouteParams {
	eventId?: string;
	artistId?: string;
	userId?: string;
	performanceId?: string;
}

// Specific page params interfaces
export interface EventPageParams {
	eventId: string;
}

export interface ArtistPageParams {
	artistId: string;
}

export interface UserPageParams {
	userId: string;
}

// Extended request type with authentication
export interface AuthenticatedRequest extends NextRequest {
	user?: User;
}

// Common API request types
export interface CreateRequest<T> {
	data: T;
}

export interface UpdateRequest<T> {
	id: string;
	data: Partial<T>;
}

export interface DeleteRequest {
	id: string;
}

// Query parameters for list endpoints
export interface ListQueryParams {
	page?: string;
	limit?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	filter?: Record<string, string>;
}

// File upload request types
export interface FileUploadRequest {
	file: File;
	metadata?: Record<string, any>;
}

export interface MultipleFileUploadRequest {
	files: File[];
	metadata?: Record<string, any>;
}

// Status update request
export interface StatusUpdateRequest {
	status: string;
	reason?: string;
	metadata?: Record<string, any>;
}

// Bulk operation types
export interface BulkOperationRequest<T> {
	operation: "create" | "update" | "delete";
	items: T[];
}

export interface BulkOperationResponse<T> {
	success: boolean;
	results: Array<{
		item: T;
		success: boolean;
		error?: string;
	}>;
	summary: {
		total: number;
		successful: number;
		failed: number;
	};
}

// WebSocket API types
export interface WebSocketSubscribeRequest {
	type: "subscribe";
	channel: string;
	eventId?: string;
}

export interface WebSocketUnsubscribeRequest {
	type: "unsubscribe";
	channel: string;
	eventId?: string;
}

// Authentication types
export interface LoginRequest {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: User;
	token: string;
	expiresAt: string;
}

export interface RefreshTokenRequest {
	refreshToken: string;
}

// Search and filter types
export interface SearchRequest {
	query: string;
	filters?: Record<string, any>;
	pagination?: {
		page: number;
		limit: number;
	};
}

export interface SearchResponse<T> {
	results: T[];
	total: number;
	query: string;
	filters: Record<string, any>;
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
	};
}
