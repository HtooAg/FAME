"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowLeft, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, EventFormData } from "@/lib/schemas/event";
import { motion } from "framer-motion";

export default function CreateEventPage() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [showStartCalendar, setShowStartCalendar] = useState(false);
	const [showEndCalendar, setShowEndCalendar] = useState(false);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<EventFormData>({
		resolver: zodResolver(eventFormSchema),
	});

	const startDate = watch("startDate");
	const endDate = watch("endDate");

	const onSubmit = async (data: EventFormData) => {
		try {
			setLoading(true);

			console.log("Submitting event data:", data); // Debug log

			const response = await fetch("/api/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: data.name,
					venueName: data.venueName,
					startDate: data.startDate.toISOString(),
					endDate: data.endDate.toISOString(),
					description: data.description,
				}),
			});

			console.log("API response status:", response.status); // Debug log

			if (response.ok) {
				const result = await response.json();
				console.log("Event created successfully:", result); // Debug log
				// Navigate to show date selection (we'll implement this in the next task)
				router.push(
					`/stage-manager/events/${result.data.id}/show-dates`
				);
			} else {
				const error = await response.json();
				console.error("Failed to create event:", error);
				console.error("Response status:", response.status);
				// TODO: Show error toast
			}
		} catch (error) {
			console.error("Error creating event:", error);
			// TODO: Show error toast
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Link href="/stage-manager/events" className="mr-4">
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Events
								</Button>
							</Link>
							<Image
								src="/fame-logo.png"
								alt="FAME Logo"
								width={40}
								height={40}
								className="mr-3"
							/>
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									Create New Event
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name} • Stage Manager
								</p>
							</div>
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<Card className="shadow-lg">
						<CardHeader>
							<CardTitle className="text-2xl font-bold text-gray-900">
								Create New Event
							</CardTitle>
							<CardDescription>
								Create a new event that can be assigned to stage
								managers and artists.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleSubmit(onSubmit)}
								className="space-y-6"
							>
								{/* Event Name */}
								<div className="space-y-2">
									<Label htmlFor="name">Event Name *</Label>
									<Input
										id="name"
										placeholder="Enter event name"
										{...register("name")}
										className={cn(
											errors.name && "border-red-500"
										)}
									/>
									{errors.name && (
										<p className="text-sm text-red-600">
											{errors.name.message}
										</p>
									)}
								</div>

								{/* Venue Name */}
								<div className="space-y-2">
									<Label htmlFor="venueName">
										Venue Name *
									</Label>
									<Input
										id="venueName"
										placeholder="Enter venue name"
										{...register("venueName")}
										className={cn(
											errors.venueName && "border-red-500"
										)}
									/>
									{errors.venueName && (
										<p className="text-sm text-red-600">
											{errors.venueName.message}
										</p>
									)}
								</div>

								{/* Date Range */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Start Date */}
									<div className="space-y-2">
										<Label>Start Date *</Label>
										<Popover
											open={showStartCalendar}
											onOpenChange={setShowStartCalendar}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!startDate &&
															"text-muted-foreground",
														errors.startDate &&
															"border-red-500"
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4" />
													{startDate
														? format(
																startDate,
																"PPP"
														  )
														: "Pick start date"}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto p-0"
												align="start"
											>
												<Calendar
													mode="single"
													selected={startDate}
													onSelect={(date) => {
														if (date) {
															setValue(
																"startDate",
																date
															);
															setShowStartCalendar(
																false
															);
														}
													}}
													disabled={(date) =>
														date < new Date()
													}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										{errors.startDate && (
											<p className="text-sm text-red-600">
												{errors.startDate.message}
											</p>
										)}
									</div>

									{/* End Date */}
									<div className="space-y-2">
										<Label>End Date *</Label>
										<Popover
											open={showEndCalendar}
											onOpenChange={setShowEndCalendar}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!endDate &&
															"text-muted-foreground",
														errors.endDate &&
															"border-red-500"
													)}
												>
													<CalendarIcon className="mr-2 h-4 w-4" />
													{endDate
														? format(endDate, "PPP")
														: "Pick end date"}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto p-0"
												align="start"
											>
												<Calendar
													mode="single"
													selected={endDate}
													onSelect={(date) => {
														if (date) {
															setValue(
																"endDate",
																date
															);
															setShowEndCalendar(
																false
															);
														}
													}}
													disabled={(date) =>
														date <
														(startDate ||
															new Date())
													}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
										{errors.endDate && (
											<p className="text-sm text-red-600">
												{errors.endDate.message}
											</p>
										)}
									</div>
								</div>

								{/* Description */}
								<div className="space-y-2">
									<Label htmlFor="description">
										Description *
									</Label>
									<Textarea
										id="description"
										placeholder="Enter event description"
										rows={4}
										{...register("description")}
										className={cn(
											errors.description &&
												"border-red-500"
										)}
									/>
									{errors.description && (
										<p className="text-sm text-red-600">
											{errors.description.message}
										</p>
									)}
								</div>

								{/* Action Buttons */}
								<div className="flex flex-col sm:flex-row gap-4 pt-6">
									<Button
										type="submit"
										disabled={loading}
										className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
									>
										{loading ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Creating Event...
											</>
										) : (
											"Create Event"
										)}
									</Button>
									<Link
										href="/stage-manager/events"
										className="flex-1"
									>
										<Button
											type="button"
											variant="outline"
											className="w-full"
										>
											Cancel
										</Button>
									</Link>
								</div>
							</form>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
