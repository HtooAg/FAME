"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MobileCalendarProps {
	selected?: Date;
	onSelect: (date: Date | undefined) => void;
	disabled?: (date: Date) => boolean;
	placeholder?: string;
	className?: string;
	error?: boolean;
}

export function MobileCalendar({
	selected,
	onSelect,
	disabled,
	placeholder = "Pick a date",
	className,
	error = false,
}: MobileCalendarProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!selected && "text-muted-foreground",
						error && "border-red-500",
						className
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
					<span className="truncate">
						{selected ? format(selected, "PPP") : placeholder}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				side="bottom"
				sideOffset={4}
			>
				<Calendar
					mode="single"
					selected={selected}
					onSelect={onSelect}
					disabled={disabled}
					initialFocus
					className="rounded-md border"
				/>
			</PopoverContent>
		</Popover>
	);
}
