"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowLeft,
	Calendar,
	Clock,
	GripVertical,
	Star,
	CheckCircle,
	RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

interface Artist {
	id: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	quality_rating: number | null;
	rehearsal_date: string | null;
	rehearsal_order: number | null;
	is_confirmed: boolean;
	performance_date: string | null;
	rehearsal_completed: boolean;
}

export default function RehearsalSchedule() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDate, setSelectedDate] = useState<string>("");
	const [wsConnected, setWsConnected] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		if (eventId) {
			fetchEvent();
			fetchArtists();
			// Initialize WebSocket connection for real-time updates
			initializeWebSocket();
		}
	}, [eventId]);

	// Add visibility change listener to refresh data when user returns to page
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden && eventId) {
				console.log(
					"Page became visible, refreshing rehearsal data from GCS..."
				);
				fetchArtists();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange
			);
		};
	}, [eventId]);

	// Add focus listener to refresh data when user returns to window
	useEffect(() => {
		const handleFocus = () => {
			if (eventId) {
				console.log(
					"Window focused, refreshing rehearsal data from GCS..."
				);
				fetchArtists();
			}
		};

		window.addEventListener("focus", handleFocus);

		return () => {
			window.removeEventListener("focus", handleFocus);
		};
	}, [eventId]);

	const fetchEvent = async () => {
		try {
			const res = await fetch(`/api/events/${eventId}`);
			if (!res.ok) throw new Error("Failed to fetch event");
			const json = await res.json();
			const evt = json.data || json.event || json; // tolerate shapes
			const showDates = evt.show_dates || evt.showDates || [];
			setEvent({
				id: String(evt.id),
				name: evt.name,
				venue: evt.venue,
				show_dates: showDates,
			});

			// Set first show date as default
			if (showDates.length > 0) {
				setSelectedDate(showDates[0]);
			}
		} catch (error) {
			console.error("Error fetching event:", error);
			toast({
				title: "Error fetching event",
				description: "Failed to load event details",
				variant: "destructive",
			});
		}
	};

	const fetchArtists = async (showRefreshIndicator = false) => {
		try {
			if (showRefreshIndicator) {
				setRefreshing(true);
			}

			const response = await fetch(`/api/events/${eventId}/artists`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					// Filter only assigned artists and map to expected format
					const assignedArtists = (data.data || [])
						.filter(
							(artist: any) =>
								artist.performanceDate ||
								artist.performance_date
						)
						.map((artist: any) => {
							console.log(`Mapping artist ${artist.id}:`, {
								rehearsal_date: artist.rehearsal_date,
								rehearsal_order: artist.rehearsal_order,
								rehearsal_completed: artist.rehearsal_completed,
								quality_rating: artist.quality_rating,
							});

							return {
								id: artist.id,
								artist_name:
									artist.artistName || artist.artist_name,
								style: artist.style,
								performance_duration:
									artist.performanceDuration ||
									artist.performance_duration ||
									5,
								quality_rating: artist.quality_rating || null,
								rehearsal_date: artist.rehearsal_date || null,
								rehearsal_order: artist.rehearsal_order || null,
								is_confirmed: artist.is_confirmed || false,
								performance_date:
									artist.performanceDate ||
									artist.performance_date,
								rehearsal_completed:
									artist.rehearsal_completed || false,
							};
						});
					setArtists(assignedArtists);
					console.log(
						`Loaded ${assignedArtists.length} assigned artists for rehearsal scheduling from GCS`
					);

					if (showRefreshIndicator) {
						toast({
							title: "Data refreshed",
							description:
								"Rehearsal data updated from Google Cloud Storage",
						});
					}
				} else {
					console.error("Failed to fetch artists:", data.error);
					setArtists([]);
				}
			} else {
				throw new Error("Failed to fetch artists");
			}
		} catch (error) {
			console.error("Error fetching artists:", error);
			toast({
				title: "Error fetching artists",
				description: "Failed to load artist list",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
			if (showRefreshIndicator) {
				setRefreshing(false);
			}
		}
	};

	const handleManualRefresh = () => {
		fetchArtists(true);
	};

	const initializeWebSocket = () => {
		// Initialize WebSocket connection for real-time artist assignment updates
		try {
			// First initialize the WebSocket server
			fetch("/api/websocket").then(() => {
				console.log(
					"WebSocket server initialized for rehearsal updates"
				);

				// Then establish client connection
				const ws = new WebSocket("ws://localhost:8080");

				ws.onopen = () => {
					console.log("WebSocket connected for rehearsal page");
					setWsConnected(true);

					// Subscribe to artist assignments for this event
					ws.send(
						JSON.stringify({
							type: "subscribe",
							channel: "artist_assignments",
							eventId: eventId,
						})
					);
				};

				ws.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data);
						console.log("WebSocket message received:", message);

						if (message.type === "artist_assigned") {
							// Add newly assigned artist to rehearsal list
							const assignedArtist = {
								id: message.data.id,
								artist_name:
									message.data.artistName ||
									message.data.artist_name,
								style: message.data.style,
								performance_duration:
									message.data.performanceDuration ||
									message.data.performance_duration ||
									5,
								quality_rating:
									message.data.quality_rating || null,
								rehearsal_date:
									message.data.rehearsal_date || null,
								rehearsal_order:
									message.data.rehearsal_order || null,
								is_confirmed:
									message.data.is_confirmed || false,
								performance_date:
									message.data.performanceDate ||
									message.data.performance_date,
								rehearsal_completed:
									message.data.rehearsal_completed || false,
							};

							setArtists((prev) => {
								// Check if artist already exists
								const existingIndex = prev.findIndex(
									(a) => a.id === assignedArtist.id
								);
								if (existingIndex >= 0) {
									// Update existing artist
									const updated = [...prev];
									updated[existingIndex] = assignedArtist;
									return updated;
								} else {
									// Add new artist
									return [assignedArtist, ...prev];
								}
							});

							toast({
								title: "Artist Assigned",
								description: `${assignedArtist.artist_name} is now available for rehearsal scheduling`,
							});
						} else if (message.type === "artist_unassigned") {
							// Remove unassigned artist from rehearsal list
							setArtists((prev) =>
								prev.filter(
									(artist) => artist.id !== message.data.id
								)
							);

							toast({
								title: "Artist Unassigned",
								description: `${
									message.data.artist_name ||
									message.data.artistName
								} has been removed from rehearsal schedule`,
								variant: "destructive",
							});
						} else if (message.type === "rehearsal_updated") {
							// Update rehearsal information
							setArtists((prev) =>
								prev.map((artist) =>
									artist.id === message.data.id
										? {
												...artist,
												rehearsal_date:
													message.data.rehearsal_date,
												rehearsal_order:
													message.data
														.rehearsal_order,
												rehearsal_completed:
													message.data
														.rehearsal_completed,
												quality_rating:
													message.data.quality_rating,
										  }
										: artist
								)
							);

							toast({
								title: "Rehearsal Updated",
								description: `${
									message.data.artist_name ||
									message.data.artistName
								} rehearsal information updated`,
							});
						} else if (message.type === "subscription_confirmed") {
							console.log(
								`Subscribed to artist assignments for event ${message.eventId}`
							);
						}
					} catch (error) {
						console.error(
							"Error parsing WebSocket message:",
							error
						);
					}
				};

				ws.onclose = () => {
					console.log("WebSocket disconnected");
					setWsConnected(false);

					// Attempt to reconnect after 3 seconds
					setTimeout(() => {
						console.log("Attempting to reconnect WebSocket...");
						initializeWebSocket();
					}, 3000);
				};

				ws.onerror = (error) => {
					console.error("WebSocket error:", error);
					setWsConnected(false);
				};

				// Store WebSocket reference for cleanup
				return () => {
					ws.close();
				};
			});
		} catch (error) {
			console.error("Failed to initialize WebSocket:", error);
		}
	};

	const updateQualityRating = async (artistId: string, rating: number) => {
		try {
			console.log(
				`Updating quality rating for artist ${artistId}: ${rating}`
			);

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ quality_rating: rating }),
				}
			);

			if (response.ok) {
				const result = await response.json();
				console.log("Quality rating API response:", result);

				setArtists(
					artists.map((artist) =>
						artist.id === artistId
							? { ...artist, quality_rating: rating }
							: artist
					)
				);

				toast({
					title: "Quality rating updated",
					description: "Artist quality rating has been saved to GCS",
				});

				// Refresh data from GCS to ensure consistency
				setTimeout(() => {
					fetchArtists();
				}, 1000);
			} else {
				const errorData = await response.json();
				console.error("API Error:", errorData);
				throw new Error(
					errorData.error?.message || "Failed to update rating"
				);
			}
		} catch (error: any) {
			console.error("Error updating quality rating:", error);
			toast({
				title: "Error updating rating",
				description: error.message || "Failed to update quality rating",
				variant: "destructive",
			});
		}
	};

	const scheduleRehearsal = async (
		artistId: string,
		date: string,
		order: number
	) => {
		try {
			console.log(`Scheduling rehearsal for artist ${artistId}:`, {
				rehearsal_date: date,
				rehearsal_order: order,
			});

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						rehearsal_date: date,
						rehearsal_order: order,
					}),
				}
			);

			if (response.ok) {
				const result = await response.json();
				console.log("Rehearsal scheduling API response:", result);

				// Update local state immediately
				setArtists(
					artists.map((artist) =>
						artist.id === artistId
							? {
									...artist,
									rehearsal_date: date,
									rehearsal_order: order,
							  }
							: artist
					)
				);

				toast({
					title: "Rehearsal scheduled",
					description: "Rehearsal date and order saved to GCS",
				});

				// Refresh data from GCS to ensure consistency
				setTimeout(() => {
					fetchArtists();
				}, 1000);

				console.log(
					`Rehearsal scheduled for artist ${artistId}: ${date}, order ${order}`
				);
			} else {
				const errorData = await response.json();
				console.error("API Error:", errorData);
				throw new Error(
					errorData.error?.message || "Failed to schedule rehearsal"
				);
			}
		} catch (error: any) {
			console.error("Error scheduling rehearsal:", error);
			toast({
				title: "Error scheduling rehearsal",
				description: error.message || "Failed to schedule rehearsal",
				variant: "destructive",
			});
		}
	};

	const moveArtist = (artistId: string, direction: "up" | "down") => {
		const scheduledArtists = artists.filter(
			(a) =>
				a.rehearsal_date === selectedDate && a.rehearsal_order !== null
		);
		const currentIndex = scheduledArtists.findIndex(
			(a) => a.id === artistId
		);

		if (currentIndex === -1) return;

		const newIndex =
			direction === "up" ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= scheduledArtists.length) return;

		// Swap orders
		const currentArtist = scheduledArtists[currentIndex];
		const swapArtist = scheduledArtists[newIndex];

		scheduleRehearsal(
			currentArtist.id,
			selectedDate,
			swapArtist.rehearsal_order!
		);
		scheduleRehearsal(
			swapArtist.id,
			selectedDate,
			currentArtist.rehearsal_order!
		);
	};

	const moveUnscheduledArtist = (
		artistId: string,
		direction: "up" | "down"
	) => {
		// Get artists for the selected date first
		const artistsForDate = artists.filter((a) => {
			if (!selectedDate) return false;
			return a.performance_date === selectedDate;
		});
		const filteredUnscheduled = artistsForDate.filter(
			(a) => !a.rehearsal_date
		);
		const currentIndex = filteredUnscheduled.findIndex(
			(a) => a.id === artistId
		);
		if (currentIndex === -1) return;

		const newIndex =
			direction === "up" ? currentIndex - 1 : currentIndex + 1;
		if (newIndex < 0 || newIndex >= filteredUnscheduled.length) return;

		// Swap in artists array
		const newArtists = [...artists];
		const artistsToSwap = newArtists.filter(
			(a) => a.performance_date === selectedDate && !a.rehearsal_date
		);
		const currentArtist = artistsToSwap[currentIndex];
		const swapArtist = artistsToSwap[newIndex];

		const currentArtistIndex = newArtists.findIndex(
			(a) => a.id === currentArtist.id
		);
		const swapArtistIndex = newArtists.findIndex(
			(a) => a.id === swapArtist.id
		);

		[newArtists[currentArtistIndex], newArtists[swapArtistIndex]] = [
			newArtists[swapArtistIndex],
			newArtists[currentArtistIndex],
		];

		setArtists(newArtists);
	};

	const addToRehearsalOrder = (artistId: string) => {
		const scheduledForDate = artists.filter(
			(a) => a.rehearsal_date === selectedDate
		);
		const nextOrder =
			scheduledForDate.length > 0
				? Math.max(
						...scheduledForDate.map((a) => a.rehearsal_order || 0)
				  ) + 1
				: 1;

		scheduleRehearsal(artistId, selectedDate, nextOrder);
	};

	const removeFromRehearsal = async (artistId: string) => {
		try {
			console.log(`Removing artist ${artistId} from rehearsal schedule`);

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						rehearsal_date: null,
						rehearsal_order: null,
					}),
				}
			);

			if (response.ok) {
				const result = await response.json();
				console.log("Remove from rehearsal API response:", result);

				setArtists(
					artists.map((artist) =>
						artist.id === artistId
							? {
									...artist,
									rehearsal_date: null,
									rehearsal_order: null,
							  }
							: artist
					)
				);

				toast({
					title: "Removed from rehearsal",
					description:
						"Artist removed from rehearsal schedule and saved to GCS",
				});

				// Refresh data from GCS to ensure consistency
				setTimeout(() => {
					fetchArtists();
				}, 1000);

				console.log(
					`Artist ${artistId} removed from rehearsal schedule`
				);
			} else {
				const errorData = await response.json();
				console.error("API Error:", errorData);
				throw new Error(
					errorData.error?.message ||
						"Failed to remove from rehearsal"
				);
			}
		} catch (error: any) {
			console.error("Error removing from rehearsal:", error);
			toast({
				title: "Error removing from rehearsal",
				description:
					error.message || "Failed to remove artist from rehearsal",
				variant: "destructive",
			});
		}
	};

	const toggleRehearsalStatus = async (
		artistId: string,
		currentStatus: boolean
	) => {
		try {
			const newStatus = !currentStatus;
			console.log(
				`Toggling rehearsal status for artist ${artistId}: ${currentStatus} -> ${newStatus}`
			);

			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ rehearsal_completed: newStatus }),
				}
			);

			if (response.ok) {
				const result = await response.json();
				console.log("Rehearsal status API response:", result);

				setArtists(
					artists.map((artist) =>
						artist.id === artistId
							? { ...artist, rehearsal_completed: newStatus }
							: artist
					)
				);

				toast({
					title: newStatus
						? "Rehearsal completed"
						: "Rehearsal marked as uncompleted",
					description: newStatus
						? "Artist is now ready for performance order and saved to GCS"
						: "Artist removed from performance order queue and saved to GCS",
				});

				// Refresh data from GCS to ensure consistency
				setTimeout(() => {
					fetchArtists();
				}, 1000);

				console.log(
					`Artist ${artistId} rehearsal status updated: ${
						newStatus ? "completed" : "uncompleted"
					}`
				);
			} else {
				const errorData = await response.json();
				console.error("API Error:", errorData);
				throw new Error(
					errorData.error?.message ||
						"Failed to update rehearsal status"
				);
			}
		} catch (error: any) {
			console.error("Error updating rehearsal status:", error);
			toast({
				title: "Error updating rehearsal status",
				description:
					error.message || "Failed to update rehearsal status",
				variant: "destructive",
			});
		}
	};

	const renderStarRating = (
		artistId: string,
		currentRating: number | null
	) => {
		return (
			<div className="flex items-center gap-1">
				{[3, 2, 1].map((starValue) => {
					const isActive = currentRating === starValue;
					const colors = {
						1: "text-green-500",
						2: "text-yellow-500",
						3: "text-blue-500",
					};

					return (
						<button
							key={starValue}
							onClick={() =>
								updateQualityRating(artistId, starValue)
							}
							className="hover:scale-110 transition-transform"
						>
							<Star
								className={`h-4 w-4 ${
									isActive
										? `fill-current ${
												colors[
													starValue as keyof typeof colors
												]
										  }`
										: "text-gray-300 hover:text-gray-400"
								}`}
							/>
						</button>
					);
				})}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading rehearsal schedule...
					</p>
				</div>
			</div>
		);
	}

	// Filter artists based on selected rehearsal date
	const artistsForSelectedDate = artists.filter((a) => {
		if (!selectedDate) return false;
		// Show artists who have a performance date matching the selected show date
		return a.performance_date === selectedDate;
	});

	const unscheduledArtists = artistsForSelectedDate.filter(
		(a) => a.rehearsal_date === null || a.rehearsal_date !== selectedDate
	);
	const scheduledArtists = artistsForSelectedDate
		.filter(
			(a) =>
				a.rehearsal_date !== null && a.rehearsal_date === selectedDate
		)
		.sort((a, b) => (a.rehearsal_order || 0) - (b.rehearsal_order || 0));

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									router.push(
										`/stage-manager/events/${eventId}`
									)
								}
								className="flex items-center gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Dashboard
							</Button>
							<div>
								<h1 className="text-2xl font-bold text-foreground">
									Rehearsal Schedule
								</h1>
								<p className="text-muted-foreground">
									{event?.name} - {event?.venue}
								</p>
								<div className="flex items-center gap-2 mt-1">
									<div
										className={`w-2 h-2 rounded-full ${
											wsConnected
												? "bg-green-500"
												: "bg-red-500"
										}`}
									></div>
									<span className="text-xs text-muted-foreground">
										{wsConnected
											? "Real-time updates active"
											: "Connecting..."}
									</span>
								</div>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleManualRefresh}
							disabled={refreshing}
							className="flex items-center gap-2"
						>
							<RefreshCw
								className={`h-4 w-4 ${
									refreshing ? "animate-spin" : ""
								}`}
							/>
							{refreshing ? "Refreshing..." : "Refresh"}
						</Button>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{/* Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<Calendar className="h-8 w-8 text-blue-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-muted-foreground">
										Assigned Artists
									</p>
									<p className="text-2xl font-bold text-foreground">
										{artists.length}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<Clock className="h-8 w-8 text-yellow-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-muted-foreground">
										Scheduled for Rehearsal
									</p>
									<p className="text-2xl font-bold text-foreground">
										{
											artists.filter(
												(a) => a.rehearsal_date
											).length
										}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<CheckCircle className="h-8 w-8 text-green-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-muted-foreground">
										Rehearsals Completed
									</p>
									<p className="text-2xl font-bold text-foreground">
										{
											artists.filter(
												(a) => a.rehearsal_completed
											).length
										}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Date Selection & Scheduled Artists */}
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Rehearsal Date
								</CardTitle>
								<CardDescription>
									Select a show date to schedule rehearsals
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Select
									value={selectedDate}
									onValueChange={setSelectedDate}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select rehearsal date" />
									</SelectTrigger>
									<SelectContent>
										{event?.show_dates?.map((date) => (
											<SelectItem key={date} value={date}>
												{new Date(
													date
												).toLocaleDateString("en-US", {
													weekday: "long",
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</CardContent>
						</Card>

						{selectedDate && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Clock className="h-5 w-5" />
										Rehearsal Order -{" "}
										{new Date(
											selectedDate
										).toLocaleDateString()}
									</CardTitle>
									<CardDescription>
										Drag to reorder or use buttons to move
										artists up/down
									</CardDescription>
								</CardHeader>
								<CardContent>
									{scheduledArtists.length === 0 ? (
										<p className="text-muted-foreground text-center py-4">
											No artists scheduled for this date
										</p>
									) : (
										<div className="space-y-3">
											{scheduledArtists.map(
												(artist, index) => (
													<div
														key={artist.id}
														className="flex items-center gap-3 p-3 border rounded-lg"
													>
														<div className="flex items-center gap-2">
															<GripVertical className="h-4 w-4 text-muted-foreground" />
															<span
																className="text-sm font-mono bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors"
																onClick={() =>
																	router.push(
																		`/artist-edit/${artist.id}`
																	)
																}
															>
																#{index + 1}
															</span>
														</div>
														<div className="flex-1">
															<div
																className="font-medium cursor-pointer hover:text-primary transition-colors"
																onClick={() =>
																	router.push(
																		`/artist-edit/${artist.id}`
																	)
																}
															>
																{
																	artist.artist_name
																}
															</div>
															<div className="text-sm text-muted-foreground">
																{artist.style} •{" "}
																{
																	artist.performance_duration
																}{" "}
																min
															</div>
														</div>
														<div className="flex items-center gap-2">
															{artist.rehearsal_completed && (
																<Badge
																	variant="secondary"
																	className="flex items-center gap-1"
																>
																	<CheckCircle className="h-3 w-3" />
																	Completed
																</Badge>
															)}
															{renderStarRating(
																artist.id,
																artist.quality_rating
															)}
															<div className="flex gap-1">
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		moveArtist(
																			artist.id,
																			"up"
																		)
																	}
																	disabled={
																		index ===
																		0
																	}
																>
																	↑
																</Button>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		moveArtist(
																			artist.id,
																			"down"
																		)
																	}
																	disabled={
																		index ===
																		scheduledArtists.length -
																			1
																	}
																>
																	↓
																</Button>
																<Button
																	size="sm"
																	variant={
																		artist.rehearsal_completed
																			? "secondary"
																			: "default"
																	}
																	onClick={() =>
																		toggleRehearsalStatus(
																			artist.id,
																			artist.rehearsal_completed
																		)
																	}
																>
																	{artist.rehearsal_completed
																		? "Completed"
																		: "Mark Complete"}
																</Button>
																<Button
																	size="sm"
																	variant="destructive"
																	onClick={() =>
																		removeFromRehearsal(
																			artist.id
																		)
																	}
																>
																	Remove
																</Button>
															</div>
														</div>
													</div>
												)
											)}
										</div>
									)}
								</CardContent>
							</Card>
						)}
					</div>

					{/* Unscheduled Artists */}
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Available Artists</CardTitle>
								<CardDescription>
									Artists not yet scheduled for rehearsal
								</CardDescription>
							</CardHeader>
							<CardContent>
								{unscheduledArtists.length === 0 ? (
									<p className="text-muted-foreground text-center py-4">
										All artists have been scheduled
									</p>
								) : (
									<div className="space-y-3">
										{unscheduledArtists.map(
											(artist, index) => (
												<div
													key={artist.id}
													className="flex items-center gap-3 p-3 border rounded-lg"
												>
													<div className="flex-1">
														<div className="font-medium">
															{artist.artist_name}
														</div>
														<div className="text-sm text-muted-foreground">
															{artist.style} •{" "}
															{
																artist.performance_duration
															}{" "}
															min
														</div>
													</div>
													<div className="flex items-center gap-2">
														<div className="flex gap-1">
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	moveUnscheduledArtist(
																		artist.id,
																		"up"
																	)
																}
																disabled={
																	index === 0
																}
															>
																↑
															</Button>
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	moveUnscheduledArtist(
																		artist.id,
																		"down"
																	)
																}
																disabled={
																	index ===
																	unscheduledArtists.length -
																		1
																}
															>
																↓
															</Button>
															<Button
																size="sm"
																onClick={() =>
																	addToRehearsalOrder(
																		artist.id
																	)
																}
																disabled={
																	!selectedDate
																}
															>
																Schedule
															</Button>
														</div>
													</div>
												</div>
											)
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
