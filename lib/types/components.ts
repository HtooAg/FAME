import React from "react";
import { User } from "./user";
import { Event } from "./event";
import { ArtistProfile } from "./artist";

// Base component props
export interface BaseComponentProps {
	className?: string;
	children?: React.ReactNode;
}

// Page component props with Next.js params
export interface PageProps<T = Record<string, string>> {
	params: T;
	searchParams?: { [key: string]: string | string[] | undefined };
}

// Common page params
export interface EventPageParams {
	eventId: string;
}

export interface ArtistPageParams {
	artistId: string;
}

export interface UserPageParams {
	userId: string;
}

// Dashboard component props
export interface DashboardProps extends BaseComponentProps {
	user: User;
	eventId?: string;
}

// Form component props
export interface FormProps<T = any> extends BaseComponentProps {
	initialData?: T;
	onSubmit: (data: T) => void | Promise<void>;
	onCancel?: () => void;
	isLoading?: boolean;
	errors?: Record<string, string>;
}

// Table component props
export interface TableProps<T = any> extends BaseComponentProps {
	data: T[];
	columns: TableColumn<T>[];
	loading?: boolean;
	onRowClick?: (item: T) => void;
	onSort?: (column: string, direction: "asc" | "desc") => void;
	sortColumn?: string;
	sortDirection?: "asc" | "desc";
}

export interface TableColumn<T = any> {
	key: keyof T | string;
	title: string;
	sortable?: boolean;
	render?: (value: any, item: T) => React.ReactNode;
	width?: string;
}

// Modal component props
export interface ModalProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	size?: "sm" | "md" | "lg" | "xl";
}

// Button component props
export interface ButtonProps extends BaseComponentProps {
	variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	loading?: boolean;
	onClick?: () => void;
	type?: "button" | "submit" | "reset";
}

// Input component props
export interface InputProps extends BaseComponentProps {
	type?: "text" | "email" | "password" | "number" | "tel" | "url";
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	error?: string;
	label?: string;
}

// Select component props
export interface SelectProps extends BaseComponentProps {
	value?: string;
	onChange?: (value: string) => void;
	options: SelectOption[];
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	error?: string;
	label?: string;
}

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

// File upload component props
export interface FileUploadProps extends BaseComponentProps {
	accept?: string;
	multiple?: boolean;
	maxSize?: number;
	onUpload: (files: any[]) => void | Promise<void>; // File-like objects
	loading?: boolean;
	error?: string;
}

// Navigation component props
export interface NavigationProps extends BaseComponentProps {
	user?: User;
	currentPath?: string;
	onLogout?: () => void;
}

// Sidebar component props
export interface SidebarProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: () => void;
	user?: User;
	navigation: NavigationItem[];
}

export interface NavigationItem {
	label: string;
	href: string;
	icon?: React.ComponentType;
	active?: boolean;
	children?: NavigationItem[];
}

// Card component props
export interface CardProps extends BaseComponentProps {
	title?: string;
	description?: string;
	actions?: React.ReactNode;
	loading?: boolean;
}

// Badge component props
export interface BadgeProps extends BaseComponentProps {
	variant?: "default" | "secondary" | "success" | "warning" | "error";
	size?: "sm" | "md" | "lg";
}

// Toast/notification props
export interface ToastProps {
	id: string;
	type: "success" | "error" | "warning" | "info";
	title: string;
	message?: string;
	duration?: number;
	onClose: (id: string) => void;
}

// Loading component props
export interface LoadingProps extends BaseComponentProps {
	size?: "sm" | "md" | "lg";
	text?: string;
}

// Empty state component props
export interface EmptyStateProps extends BaseComponentProps {
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	icon?: React.ComponentType;
}

// Error boundary props
export interface ErrorBoundaryProps extends BaseComponentProps {
	fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Specific dashboard component props
export interface ArtistDashboardProps extends DashboardProps {
	artist?: ArtistProfile;
	event?: Event;
}

export interface StageManagerDashboardProps extends DashboardProps {
	events: Event[];
	artists: ArtistProfile[];
}

export interface DJDashboardProps extends DashboardProps {
	playlist: any[];
	currentTrack?: string;
	performanceOrder: any[];
}

// WebSocket component props
export interface WebSocketProviderProps extends BaseComponentProps {
	url: string;
	eventId?: string;
}

// Media player component props
export interface MediaPlayerProps extends BaseComponentProps {
	src: string;
	type: "audio" | "video";
	autoPlay?: boolean;
	controls?: boolean;
	onPlay?: () => void;
	onPause?: () => void;
	onEnded?: () => void;
}
