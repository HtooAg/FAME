// Central export file for all types
export * from "./common";
export * from "./api";
export * from "./components";
export * from "./services";
export * from "./artist";
export * from "./event";
export * from "./user";

// Re-export commonly used types with aliases
export type {
	ApiResponse,
	ApiErrorResponse,
	ApiSuccessResponse,
	RouteParams,
	EventPageParams,
	ArtistPageParams,
	UserPageParams,
} from "./api";

export type {
	Result,
	Nullable,
	Optional,
	Maybe,
	BaseEntity,
	EntityStatus,
	FileUpload,
	WebSocketMessage,
	AppError,
	ValidationError,
	FormState,
	DateRange,
} from "./common";

export type {
	BaseComponentProps,
	PageProps,
	DashboardProps,
	FormProps,
	TableProps,
	TableColumn,
	ModalProps,
	ButtonProps,
	InputProps,
	SelectProps,
	SelectOption,
} from "./components";

export type {
	ServiceResult,
	FileOperationResult,
	StatusTransition,
	StatusHistoryEntry,
	UpdateArtistStatusRequest,
	ArtistStatusServiceResult,
} from "./services";
