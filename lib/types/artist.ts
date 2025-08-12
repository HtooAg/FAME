// Artist Profile Types
export interface MusicTrack {
	song_title: string;
	duration: number;
	notes: string;
	is_main_track: boolean;
	tempo: string;
	file_url: string;
}

export interface GalleryFile {
	url: string;
	type: "image" | "video";
	name: string;
}

export interface SocialMediaLinks {
	instagram?: string;
	facebook?: string;
	youtube?: string;
	tiktok?: string;
	website?: string;
}

export interface TechnicalRequirements {
	costumeColor: string;
	customCostumeColor?: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition?: string;
	mcNotes: string;
	stageManagerNotes: string;
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
	status: "pending" | "approved" | "active" | "inactive";
	createdAt: string;
	updatedAt?: string;
	lastLogin?: string;
	musicTracks?: MusicTrack[];
	galleryFiles?: GalleryFile[];
	socialMedia?: SocialMediaLinks;
	technicalRequirements: TechnicalRequirements;
	showLink?: string;
	// Legacy fields for backward compatibility
	costumeColor: string;
	customCostumeColor?: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition?: string;
	mcNotes: string;
	stageManagerNotes: string;
}

export interface ArtistDashboardProps {
	params: {
		artistId: string;
	};
}

// API Response Types
export interface ApiError {
	success: false;
	error: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: string;
}

export interface ApiSuccess<T> {
	success: true;
	data: T;
	timestamp: string;
	message?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
