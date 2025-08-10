export interface User {
	id: string;
	email: string;
	name: string;
	role: "super_admin" | "stage_manager" | "artist" | "dj" | "mc" | "graphics";
	accountStatus:
		| "pending"
		| "approved"
		| "active"
		| "suspended"
		| "deactivated"
		| "rejected";
	eventId?: string;
	subscriptionStatus?: string;
	subscriptionEndDate?: string;
	createdAt: string;
	lastLogin?: string;
	approvedAt?: string;
	statusUpdatedAt?: string;
	subscriptionUpdatedAt?: string;
	isActive?: boolean;
}

export interface StageManagerRegistration {
	id: string;
	email: string;
	name: string;
	password: string;
	role: "stage_manager";
	accountStatus: "pending";
	eventName?: string;
	createdAt: string;
	migrated?: boolean;
	migratedAt?: string;
}

export interface SuperAdminData {
	pendingRegistrations: StageManagerRegistration[];
	activeStageManagers: User[];
	suspendedStageManagers: User[];
	allStageManagers: User[];
}

export interface AccountStatusAction {
	action:
		| "approve"
		| "reject"
		| "activate"
		| "suspend"
		| "deactivate"
		| "extend_subscription";
	stageManagerId: string;
	eventId?: string;
	subscriptionEndDate?: string;
}
