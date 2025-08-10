import { z } from "zod";

export const eventFormSchema = z
	.object({
		name: z
			.string()
			.min(1, "Event name is required")
			.max(100, "Event name must be less than 100 characters"),
		venueName: z
			.string()
			.min(1, "Venue name is required")
			.max(100, "Venue name must be less than 100 characters"),
		startDate: z.date({
			required_error: "Start date is required",
			invalid_type_error: "Please select a valid start date",
		}),
		endDate: z.date({
			required_error: "End date is required",
			invalid_type_error: "Please select a valid end date",
		}),
		description: z
			.string()
			.min(1, "Description is required")
			.max(500, "Description must be less than 500 characters"),
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: "End date must be after or equal to start date",
		path: ["endDate"],
	});

export const showDateSchema = z.object({
	eventId: z.string().min(1, "Event ID is required"),
	dates: z.array(z.date()).min(1, "At least one show date is required"),
});

export type EventFormData = z.infer<typeof eventFormSchema>;
export type ShowDateFormData = z.infer<typeof showDateSchema>;
