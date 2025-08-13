// Client-safe status utilities (no server or GCS imports)

export type ArtistStatus =
    | "pending"
    | "approved"
    | "active"
    | "inactive"
    | "rejected"
    | "withdrawn"
    | null;

export function getStatusInfo(status: string | null): {
	label: string;
	color: string;
	description: string;
} {
	const statusInfo: Record<
		string,
		{ label: string; color: string; description: string }
	> = {
		pending: {
			label: "Pending Review",
			color: "yellow",
			description: "Application submitted, awaiting review",
		},
		approved: {
			label: "Approved",
			color: "green",
			description: "Application approved, ready for assignment",
		},
		active: {
			label: "Active",
			color: "blue",
			description: "Assigned to performance date and active",
		},
		inactive: {
			label: "Inactive",
			color: "gray",
			description: "Temporarily inactive or on hold",
		},
		rejected: {
			label: "Rejected",
			color: "red",
			description: "Application rejected",
		},
		withdrawn: {
			label: "Withdrawn",
			color: "orange",
			description: "Artist withdrew their application",
		},
	};

	const key = (status as ArtistStatus) || "pending";
	return statusInfo[key] || statusInfo["pending"];
}

export function getValidTransitions(currentStatus: string | null): string[] {
	const validTransitions: Record<string, string[]> = {
		null: ["pending"],
		pending: ["approved", "rejected", "withdrawn"],
		approved: ["active", "inactive", "withdrawn"],
		active: ["inactive", "withdrawn"],
		inactive: ["active", "withdrawn"],
		rejected: ["pending"],
		withdrawn: ["pending"],
	};

	const fromStatus = (currentStatus as ArtistStatus) || "null";
	return validTransitions[fromStatus] || [];
}
