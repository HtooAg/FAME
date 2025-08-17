import { Result } from "./common";
import { ArtistProfile } from "./artist";
import { Event } from "./event";
import { User } from "./user";

// Service result wrapper
export interface ServiceResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	code?: string;
}

// File operation types
export interface FileOperationResult {
	success: boolean;
	filePath?: string;
	url?: string;
	error?: string;
	metadata?: {
		size: number;
		contentType: string;
		uploadedAt: string;
	};
}

// Status transition types
export interface StatusTransition {
	from: string | null;
	to: string;
	isValid: boolean;
	reason?: string;
}

export interface StatusHistoryEntry {
	id: string;
	previousStatus: string | null;
	newStatus: string;
	changedBy: string;
	changedByName: string;
	reason?: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

// Artist status service types
export interface UpdateArtistStatusRequest {
	artistId: string;
	newStatus: string;
	reason?: string;
	changedBy: string;
	changedByName: string;
}

export interface ArtistStatusServiceResult {
	success: boolean;
	data?: ArtistProfile;
	error?: string;
}

// Google Cloud Storage service types
export interface GCSUploadOptions {
	bucket?: string;
	folder?: string;
	makePublic?: boolean;
	metadata?: Record<string, any>;
}

export interface GCSUploadResult {
	success: boolean;
	filePath?: string;
	publicUrl?: string;
	error?: string;
}

export interface GCSDeleteResult {
	success: boolean;
	error?: string;
}

// Authentication service types
export interface AuthServiceResult<T = User> {
	success: boolean;
	user?: T;
	token?: string;
	error?: string;
	code?: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	email: string;
	password: string;
	name: string;
	role: string;
}

// Event service types
export interface EventServiceResult<T = Event> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface CreateEventRequest {
	name: string;
	venueName: string;
	startDate: string;
	endDate: string;
	description: string;
	stageManagerId: string;
}

export interface UpdateEventRequest {
	id: string;
	name?: string;
	venueName?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
	showDates?: string[];
	status?: string;
}

// Artist service types
export interface ArtistServiceResult<T = ArtistProfile> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface CreateArtistRequest {
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	eventId: string;
}

export interface UpdateArtistRequest {
	id: string;
	data: Partial<ArtistProfile>;
}

// Performance order service types
export interface PerformanceSlot {
	id: string;
	artistId: string;
	artistName: string;
	style: string;
	order: number;
	status: "pending" | "active" | "completed";
	performanceDate?: string;
	duration: number;
	musicTracks?: any[];
}

export interface PerformanceOrderResult {
	success: boolean;
	data?: {
		performanceOrder: PerformanceSlot[];
		showStatus: string;
		currentPerformanceId?: string;
	};
	error?: string;
}

// WebSocket service types
export interface WebSocketServiceResult {
	success: boolean;
	error?: string;
}

export interface BroadcastMessage<T = any> {
	type: string;
	channel?: string;
	eventId?: string;
	data: T;
}

// Email service types
export interface EmailServiceResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

export interface EmailTemplate {
	to: string | string[];
	subject: string;
	template: string;
	data: Record<string, any>;
}

// Validation service types
export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

export interface ValidationError {
	field: string;
	message: string;
	code?: string;
}

// Cache service types
export interface CacheServiceResult<T = any> {
	success: boolean;
	data?: T;
	hit?: boolean;
	error?: string;
}

export interface CacheOptions {
	ttl?: number; // Time to live in seconds
	tags?: string[];
}

// Search service types
export interface SearchServiceResult<T = any> {
	success: boolean;
	results?: T[];
	total?: number;
	query?: string;
	error?: string;
}

export interface SearchQuery {
	query: string;
	filters?: Record<string, any>;
	pagination?: {
		page: number;
		limit: number;
	};
	sort?: {
		field: string;
		direction: "asc" | "desc";
	};
}

// Notification service types
export interface NotificationServiceResult {
	success: boolean;
	notificationId?: string;
	error?: string;
}

export interface NotificationData {
	userId: string;
	type: "info" | "success" | "warning" | "error";
	title: string;
	message: string;
	data?: Record<string, any>;
}

// Analytics service types
export interface AnalyticsEvent {
	event: string;
	userId?: string;
	eventId?: string;
	properties?: Record<string, any>;
	timestamp?: string;
}

export interface AnalyticsServiceResult {
	success: boolean;
	error?: string;
}
