"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	Undo2,
	Redo2,
	Plus,
	Loader2,
	X,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format, isWithinInterval, parseISO } from "date-fns";
import { Event } from "@/lib/types/event";
import { motion } from "framer-motion";

export default function ShowDateSelectionPage() {
	const { user } = useAuth();
	const router = useRouter();
	const params = useParams();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [selectedDates, setSelectedDates] = useState<Date[]>([]);
	const [history, setHistory] = useState<Date[][]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);

	const removeDate = (date: Date) => {
		const newDates = selectedDates.filter((d) => d.getTime() !== date.getTime());
		setSelectedDates(newDates);
		addToHistory(newDates);
	};

	const clearAllDates = () => {
		setSelectedDates([]);
		addToHistory([]);
	};

	useEffect(() => {
		fetchEvent();
	}, [eventId]);

	const fetchEvent = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/events/${eventId}`, {
				headers: {
					"x-stage-manager-id": user?.id || "placeholder-id",
				},
			});

			if (response.ok) {
				const result = await response.json();
				setEvent(result.data);
				// Initialize with existing show dates if any
				const existingDates = result.data.showDates.map(
					(date: string) => new Date(date)
				);
				setSelectedDates(existingDates);
				setHistory([existingDates]);
				setHistoryIndex(0);
			} else {
				console.error("Failed to fetch event");
				router.push("/stage-manager/events");
			}
		} catch (error) {
			console.error("Error fetching event:", error);
			router.push("/stage-manager/events");
		} finally {
			setLoading(false);
		}
	};

	const addToHistory = (dates: Date[]) => {
		const newHistory = history.slice(0, historyIndex + 1);
		newHistory.push([...dates]);
		setHistory(newHistory);
		setHistoryIndex(newHistory.length - 1);
	};

	const handleDateSelect = (date: Date | undefined) => {
		if (!date || !event) return;

		const eventStart = parseISO(event.startDate);
		const eventEnd = parseISO(event.endDate);

		// Check if date is within event range
		if (!isWithinInterval(date, { start: eventStart, end: eventEnd })) {
			return;
		}

		const newDates = selectedDates.some(
			(d) => d.getTime() === date.getTime()
		)
			? selectedDates.filter((d) => d.getTime() !== date.getTime())
			: [...selectedDates, date].sort(
					(a, b) => a.getTime() - b.getTime()
			  );

		setSelectedDates(newDates);
		addToHistory(newDates);
	};

	const undo = () => {
		if (historyIndex > 0) {
			setHistoryIndex(historyIndex - 1);
			setSelectedDates([...history[historyIndex - 1]]);
		}
	};

	const redo = () => {
		if (historyIndex < history.length - 1) {
			setHistoryIndex(historyIndex + 1);
			setSelectedDates([...history[historyIndex + 1]]);
		}
	};

	const saveShowDates = async () => {
		try {
			setSaving(true);
			const response = await fetch(`/api/events/${eventId}/show-dates`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					dates: selectedDates.map((date) => date.toISOString()),
				}),
			});

			if (response.ok) {
				const result = await response.json();
				console.log("Show dates saved successfully:", result);
				router.push("/stage-manager/events");
			} else {
				const contentType = response.headers.get("content-type") || "";
				let errorData: unknown;
				try {
					errorData = contentType.includes("application/json")
						? await response.json()
						: await response.text();
				} catch (e) {
					errorData = `HTTP ${response.status} ${response.statusText}`;
				}
				console.error("Failed to save show dates:", errorData);
				console.error("Response status:", response.status);
			}
		} catch (error) {
			console.error("Error saving show dates:", error);
		} finally {
			setSaving(false);
		}
	};

	const skipForNow = () => {
		router.push("/stage-manager/events");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading event...</p>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600">Event not found</p>
				</div>
			</div>
		);
	}

	const eventStart = parseISO(event.startDate);
	const eventEnd = parseISO(event.endDate);

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
									Select Show Dates
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name} • Stage Manager
								</p>
							</div>
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
				>
					<Card className="shadow-lg">
						<CardHeader>
							<CardTitle className="text-2xl font-bold text-gray-900">
								Select Show Dates
							</CardTitle>
							<CardDescription>
								Choose which dates from{" "}
								<span className="font-semibold text-purple-600">
									{event.name}
								</span>{" "}
								event will have shows
							</CardDescription>
							<div className="flex items-center text-sm text-gray-600 mt-2">
								<CalendarIcon className="h-4 w-4 mr-2" />
								Event Runs from {format(
									eventStart,
									"PPP"
								)} to {format(eventEnd, "PPP")}
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Undo/Redo Controls */}
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={undo}
									disabled={historyIndex <= 0}
								>
									<Undo2 className="h-4 w-4 mr-2" />
									Undo
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={redo}
									disabled={
										historyIndex >= history.length - 1
									}
								>
									<Redo2 className="h-4 w-4 mr-2" />
									Redo
								</Button>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
								{/* Calendar */}
								<div>
									<h3 className="text-lg font-semibold mb-4">
										Available Dates For Shows
									</h3>
									<div className="border rounded-lg p-4">
										<Calendar
											mode="multiple"
											selected={selectedDates}
											onSelect={(dates) => {
												if (dates) {
													setSelectedDates(dates);
													addToHistory(dates);
												}
											}}
											disabled={(date) =>
												!isWithinInterval(date, {
													start: eventStart,
													end: eventEnd,
												}) || date < new Date()
											}
											className="rounded-md"
										/>
									</div>
									<p className="text-sm text-gray-500 mt-2">
										Click dates to select/deselect show
										dates. Only dates within the event
										period are available.
									</p>
								</div>

								{/* Selected Dates */}
								<div>
									<h3 className="text-lg font-semibold mb-4">
										Selected Show Dates
									</h3>
									{selectedDates.length > 0 && (
										<div className="flex items-center justify-end mb-3">
											<Button
												type="button"
												variant="outline"
												onClick={clearAllDates}
												className="h-8 px-2 py-1 text-sm"
											>
												<Trash2 className="h-3 w-3 mr-1" />
												Clear All
											</Button>
										</div>
									)}
									<div className="space-y-3">
										{selectedDates.length === 0 ? (
											<div className="text-center py-8 text-gray-500">
												<CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
												<p>
													No show dates selected yet
												</p>
												<p className="text-sm">
													Click on the calendar to add
													dates
												</p>
											</div>
										) : (
											<div className="grid gap-2">
												{selectedDates.map(
													(date, index) => (
														<motion.div
															key={date.getTime()}
															initial={{
																opacity: 0,
																x: -20,
															}}
															animate={{
																opacity: 1,
																x: 0,
															}}
															transition={{
																duration: 0.3,
																delay:
																	index * 0.1,
															}}
														>
															<div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border">
																<div className="flex items-center">
																	<CalendarIcon className="h-4 w-4 mr-2 text-purple-600" />
																	<span className="font-medium">
																		{format(
																			date,
																			"PPP"
																		)}
																	</span>
																</div>
																<div className="flex items-center gap-2">
																	<Badge variant="secondary">
																		Show #
																		{index + 1}
																	</Badge>
																	<Button
																		type="button"
																		variant="outline"
																		onClick={() => removeDate(date)}
																		className="h-7 w-7 p-0"
																		aria-label={`Remove ${format(date, "PPP")}`}
																	>
																		<X className="h-3 w-3" />
																	</Button>
																</div>
															</div>
														</motion.div>
													)
												)}
											</div>
										)}
									</div>

									{selectedDates.length > 0 && (
										<div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
											<p className="text-sm text-green-800">
												<span className="font-semibold">
													{selectedDates.length}
												</span>{" "}
												show dates selected
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
								<Button
									onClick={saveShowDates}
									disabled={
										saving || selectedDates.length === 0
									}
									className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
								>
									{saving ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Saving Show Dates...
										</>
									) : (
										<>
											<Plus className="mr-2 h-4 w-4" />
											Save Show Dates (
											{selectedDates.length})
										</>
									)}
								</Button>
								<Button
									variant="outline"
									onClick={skipForNow}
									className="flex-1"
								>
									Skip for Now
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
