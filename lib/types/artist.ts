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

export interface ArtistProfile {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	eventId: string;
	eventName: string;
	status:
		| "pending"
		| "approved"
		| "active"
		| "inactive"
		| "rejected"
		| "withdrawn";
	createdAt: string;
	updatedAt?: string;
	lastLogin?: string;

	// Performance scheduling
	performanceDate?: string;
	performance_date?: string;

	// Status history
	statusHistory?: StatusHistoryEntry[];

	// Technical requirements
	costumeColor: string;
	customCostumeColor?: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition?: string;
	equipment?: string;
	specialRequirements?: string;

	// Media files
	musicTracks: MusicTrack[];
	galleryFiles: GalleryFile[];

	// Social media and links
	socialMedia: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		website?: string;
	};
	showLink?: string;

	// Notes and communication
	mcNotes: string;
	stageManagerNotes: string;
	notes?: string;
}

export interface MusicTrack {
	song_title: string;
	duration: number;
	notes: string;
	is_main_track: boolean;
	tempo: string;
	file_url: string;
	file_path?: string;
	uploadedAt?: string;
	fileSize?: number;
	contentType?: string;
}

export interface GalleryFile {
	name: string;
	type: "image" | "video";
	url: string;
	file_path?: string;
	size: number;
	uploadedAt?: string;
	contentType?: string;
	thumbnail?: string; // For videos
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
	timestamp: string;
}
