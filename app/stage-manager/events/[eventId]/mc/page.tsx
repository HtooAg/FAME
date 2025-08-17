"use client";

import { useState, useEffect, useRef } from "react";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Mic,
	Clock,
	User,
	ArrowLeft,
	Users,
	Calendar,
	Star,
	CheckCircle,
	Edit3,
	Timer,
	Video,
	Trash2,
	Speaker,
	Sparkles,
	Play,
	AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Artist {
	id: string;
	artist_name: string;
	real_name?: string | null;
	style: string;
	biography?: string | null;
	artist_notes?: string | null;
	performance_duration: number;
	performance_order: number | null;
	rehearsal_completed: boolean;
	quality_rating: number | null;
	mc_notes?: string | null;
	phone?: string | null;
	email?: string | null;
	performance_status?: string | null;
	performance_date?: string | null;
}

interface Cue {
	id: string;
	type:
		| "mc_break"
		| "video_break"
		| "cleaning_break"
		| "speech_break"
		| "opening"
		| "countdown"
		| "artist_ending"
		| "animation";
	title: string;
	duration?: number;
	performance_order: number;
	notes?: string;
	is_completed?: boolean;
	mc_notes?: string | null;
	performance_date?: string | null;
}

interface ShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: Artist;
	cue?: Cue;
	performance_order: number;
	status?:
		| "not_started"
		| "next_on_deck"
		| "next_on_stage"
		| "currently_on_stage"
		| "completed";
}

interface EmergencyBroadcast {
	id: string;
	message: string;
	emergency_code: string;
	is_active: boolean;
	created_at: string;
}

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

export default function MCDashboard() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;
	const wsRef = useRef<WebSocket | null>(null);

	const [event, setEvent] = useState<Event | null>(null);
	const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [eventDates, setEventDates] = useState<string[]>([]);
	const [selectedItem, setSelectedItem] = useState<ShowOrderItem | null>(
		null
	);
	const [emergencyBroadcasts, setEmergencyBroadcasts] = useState<
		EmergencyBroadcast[]
	>([]);
	const [wsConnected, setWsConnected] = useState(false);

	// Initialize WebSocket connection for emergency alerts
	useEffect(() => {
		const connectWebSocket = () => {
			try {
				const protocol =
					window.location.protocol === "https:" ? "wss" : "ws";
				wsRef.current = new WebSocket(
					`${protocol}://${window.location.host}/ws`
				);

				wsRef.current.onopen = () => {
					console.log("MC Dashboard WebSocket connected");
					setWsConnected(true);
				};

				wsRef.current.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						if (data.type === "emergency-alert") {
							fetchEmergencyBroadcasts();
							toast({
								title: `${data.data.emergency_code.toUpperCase()} EMERGENCY ALERT`,
								description: data.data.message,
								variant: "destructive",
							});
						} else if (data.type === "emergency-clear") {
							fetchEmergencyBroadcasts();
							toast({
								title: "Emergency alert cleared",
								description:
									"Emergency broadcast has been deactivated",
							});
						}
					} catch (error) {
						console.error(
							"Error parsing WebSocket message:",
							error
						);
					}
				};

				wsRef.current.onclose = () => {
					console.log("MC Dashboard WebSocket disconnected");
					setWsConnected(false);
					// Reconnect after 3 seconds
					setTimeout(connectWebSocket, 3000);
				};

				wsRef.current.onerror = (error) => {
					console.warn(
						"MC Dashboard WebSocket connection failed:",
						error
					);
					setWsConnected(false);
				};
			} catch (error) {
				console.warn("MC Dashboard WebSocket setup failed:", error);
				setWsConnected(false);
			}
		};

		connectWebSocket();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, [eventId]);

	useEffect(() => {
		if (eventId) {
			fetchEventData();
			fetchEventDates();
			fetchEmergencyBroadcasts();
		}
	}, [eventId]);

	useEffect(() => {
		if (selectedPerformanceDate) {
			fetchPerformanceOrder();
		}
	}, [selectedPerformanceDate]);

	const fetchEventData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				setEvent({
					id: evt.id,
					name: evt.name || evt.eventName,
					venue: evt.venue,
					show_dates: evt.show_dates || evt.showDates || [],
				});
			}
		} catch (error) {
			console.error("Error fetching event data:", error);
		}
	};

	const fetchEventDates = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}`);
			if (response.ok) {
				const data = await response.json();
				const evt = data.data || data.event || data;
				const showDates = evt.show_dates || evt.showDates || [];

				if (showDates.length > 0) {
					const dates = showDates.map(
						(date: string) => date.split("T")[0]
					);
					setEventDates(dates);
					if (!selectedPerformanceDate) {
						setSelectedPerformanceDate(dates[0]);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching event dates:", error);
		}
	};

	const fetchPerformanceOrder = async () => {
		if (!selectedPerformanceDate) return;

		try {
			setLoading(true);

			// Fetch artists from GCS (same as performance order page)
			const response = await fetch(`/api/events/${eventId}/artists`);
			if (response.ok) {
				const data = await response.json();

				if (data.success) {
					const artists = (data.data || []).map((artist: any) => ({
						id: artist.id,
						artist_name: artist.artistName || artist.artist_name,
						real_name: artist.realName || artist.real_name,
						style: artist.style,
						biography: artist.biography,
						artist_notes: artist.artist_notes || artist.artistNotes,
						performance_duration:
							artist.performanceDuration ||
							artist.performance_duration ||
							5,
						performance_order: artist.performance_order || null,
						rehearsal_completed:
							artist.rehearsal_completed || false,
						quality_rating: artist.quality_rating || null,
						mc_notes: artist.mc_notes,
						phone: artist.phone,
						email: artist.email,
						performance_status: artist.performance_status || null,
						performance_date:
							artist.performanceDate || artist.performance_date,
					}));

					// Filter artists for the selected performance date
					const filteredArtists = artists.filter((a: Artist) => {
						if (!a.performance_date) return true;
						const artistDate = new Date(a.performance_date)
							.toISOString()
							.split("T")[0];
						return artistDate === selectedPerformanceDate;
					});

					// Artists assigned to show order
					const assignedArtists = filteredArtists
						.filter(
							(a: Artist) =>
								a.performance_order !== null ||
								(a.performance_status &&
									a.performance_status !== "not_started" &&
									a.rehearsal_completed)
						)
						.map((artist: Artist) => ({
							id: artist.id,
							type: "artist" as const,
							artist,
							performance_order: artist.performance_order || 0,
							status: (artist.performance_status ||
								"not_started") as ShowOrderItem["status"],
						}));

					// Fetch cues from GCS
					let cueItems: ShowOrderItem[] = [];
					try {
						const cuesResponse = await fetch(
							`/api/events/${eventId}/cues?performanceDate=${selectedPerformanceDate}`
						);
						if (cuesResponse.ok) {
							const cuesResult = await cuesResponse.json();
							if (cuesResult.success) {
								cueItems = cuesResult.data.map((cue: any) => ({
									id: cue.id,
									type: "cue" as const,
									cue: {
										...cue,
										mc_notes: cue.mc_notes,
									},
									performance_order: cue.performance_order,
									status: (cue.performance_status ||
										(cue.is_completed
											? "completed"
											: "not_started")) as ShowOrderItem["status"],
								}));
							}
						}
					} catch (cueError) {
						console.error("Error fetching cues:", cueError);
					}

					// Combine and sort all show order items
					const allShowOrderItems = [
						...assignedArtists,
						...cueItems,
					].sort((a, b) => a.performance_order - b.performance_order);

					setShowOrderItems(allShowOrderItems);
				}
			}
		} catch (error) {
			console.error("Error fetching performance order:", error);
			toast({
				title: "Error loading data",
				description: "Failed to load performance order",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};
	const updateMCNotes = async (
		itemId: string,
		notes: string,
		itemType: "artist" | "cue"
	) => {
		try {
			if (itemType === "artist") {
				// Update artist MC notes via API
				const response = await fetch(
					`/api/events/${eventId}/artists/${itemId}`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							mc_notes: notes,
						}),
					}
				);

				if (response.ok) {
					// Update local state
					setShowOrderItems((prev) =>
						prev.map((item) =>
							item.id === itemId && item.type === "artist"
								? {
										...item,
										artist: {
											...item.artist!,
											mc_notes: notes,
										},
								  }
								: item
						)
					);

					toast({
						title: "MC Notes updated",
						description:
							"Artist notes have been saved successfully",
					});
				} else {
					throw new Error("Failed to update artist MC notes");
				}
			} else {
				// Update cue MC notes via API
				const response = await fetch(`/api/events/${eventId}/cues`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: itemId,
						mc_notes: notes,
						performanceDate: selectedPerformanceDate,
					}),
				});

				if (response.ok) {
					// Update local state
					setShowOrderItems((prev) =>
						prev.map((item) =>
							item.id === itemId && item.type === "cue"
								? {
										...item,
										cue: { ...item.cue!, mc_notes: notes },
								  }
								: item
						)
					);

					toast({
						title: "MC Notes updated",
						description: "Cue notes have been saved successfully",
					});
				} else {
					throw new Error("Failed to update cue MC notes");
				}
			}
		} catch (error) {
			console.error("Error updating MC notes:", error);
			toast({
				title: "Error updating notes",
				description: "Failed to save MC notes",
				variant: "destructive",
			});
		}
	};

	const getItemStatus = (item: ShowOrderItem, index: number) => {
		if (item.status) return item.status;
		if (item.type === "cue" && item.cue?.is_completed) {
			return "completed";
		}
		if (index === 0) return "currently_on_stage";
		if (index === 1) return "next_on_stage";
		if (index === 2) return "next_on_deck";
		return "not_started";
	};

	const getRowColorClasses = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
			case "currently_on_stage":
				return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800";
			case "next_on_stage":
				return "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
			case "next_on_deck":
				return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
			default:
				return "bg-background";
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "completed":
				return (
					<Badge className="bg-red-500 text-white">Completed</Badge>
				);
			case "currently_on_stage":
				return (
					<Badge className="bg-green-500 text-white">
						Currently On Stage
					</Badge>
				);
			case "next_on_stage":
				return (
					<Badge className="bg-yellow-500 text-white">
						Next On Stage
					</Badge>
				);
			case "next_on_deck":
				return (
					<Badge className="bg-blue-500 text-white">
						Next On Deck
					</Badge>
				);
			default:
				return <Badge variant="outline">Not Started</Badge>;
		}
	};

	// Emergency broadcast functions
	const fetchEmergencyBroadcasts = async () => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/emergency-broadcasts`
			);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					setEmergencyBroadcasts(data.data || []);
				}
			}
		} catch (error) {
			console.error("Error fetching emergency broadcasts:", error);
		}
	};

	const getEmergencyColor = (code: string) => {
		switch (code) {
			case "red":
				return "bg-red-500 text-white";
			case "blue":
				return "bg-blue-500 text-white";
			case "green":
				return "bg-green-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	const getQualityBadge = (rating: number | null) => {
		if (!rating) return null;

		const colors = {
			1: "text-green-500",
			2: "text-yellow-500",
			3: "text-blue-500",
		};

		return (
			<div className="flex items-center gap-1">
				{Array.from({ length: rating }, (_, i) => (
					<Star
						key={i}
						className={`h-3 w-3 fill-current ${
							colors[rating as keyof typeof colors]
						}`}
					/>
				))}
			</div>
		);
	};

	const getCueIcon = (cueType: Cue["type"]) => {
		const iconMap = {
			mc_break: Mic,
			video_break: Video,
			cleaning_break: Trash2,
			speech_break: Speaker,
			opening: Play,
			countdown: Timer,
			artist_ending: CheckCircle,
			animation: Sparkles,
		};
		return iconMap[cueType];
	};

	const getDefaultIntroduction = (item: ShowOrderItem) => {
		if (item.type === "artist" && item.artist) {
			return `Ladies and gentlemen, please welcome to the stage ${item.artist.artist_name}! ${item.artist.artist_name} is a talented ${item.artist.style} performer who brings ${item.artist.performance_duration} minutes of incredible entertainment. Let's give them a warm welcome!`;
		} else if (item.type === "cue" && item.cue) {
			return `Ladies and gentlemen, we now have a ${item.cue.title.toLowerCase()} for ${
				item.cue.duration
			} minutes. Please enjoy this brief intermission.`;
		}
		return "";
	};

	// MC Notes Cell Component
	const MCNotesCell = ({
		item,
		onUpdate,
	}: {
		item: ShowOrderItem;
		onUpdate: (id: string, notes: string, type: "artist" | "cue") => void;
	}) => {
		const [isEditing, setIsEditing] = useState(false);
		const [notes, setNotes] = useState(
			(item.type === "artist"
				? item.artist?.mc_notes
				: item.cue?.mc_notes) || ""
		);

		const handleSave = () => {
			onUpdate(item.id, notes, item.type);
			setIsEditing(false);
		};

		const handleCancel = () => {
			setNotes(
				(item.type === "artist"
					? item.artist?.mc_notes
					: item.cue?.mc_notes) || ""
			);
			setIsEditing(false);
		};

		if (isEditing) {
			return (
				<div className="space-y-2 min-w-[200px]">
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Add MC introduction notes..."
						className="min-h-[60px]"
					/>
					<div className="flex gap-1">
						<Button size="sm" onClick={handleSave}>
							Save
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={handleCancel}
						>
							Cancel
						</Button>
					</div>
				</div>
			);
		}

		return (
			<div className="max-w-[200px]">
				{notes ? (
					<div className="space-y-1">
						<p className="text-sm truncate" title={notes}>
							{notes}
						</p>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setIsEditing(true)}
							className="h-6 px-2 text-xs"
						>
							<Edit3 className="h-3 w-3 mr-1" />
							Edit
						</Button>
					</div>
				) : (
					<Button
						size="sm"
						variant="outline"
						onClick={() => setIsEditing(true)}
						className="h-8 text-xs"
					>
						<Edit3 className="h-3 w-3 mr-1" />
						Add Notes
					</Button>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading MC dashboard...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4 mb-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								router.push(`/stage-manager/events/${eventId}`)
							}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							Back
						</Button>
					</div>
					<div className="flex justify-between items-center">
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								MC Dashboard
							</h1>
							<p className="text-muted-foreground">
								{event?.name} at New York
							</p>
						</div>
						<div className="flex items-center gap-4">
							{eventDates.length > 1 && (
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									<Select
										value={selectedPerformanceDate}
										onValueChange={
											setSelectedPerformanceDate
										}
									>
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder="Select show date" />
										</SelectTrigger>
										<SelectContent>
											{eventDates.map((date, index) => (
												<SelectItem
													key={date}
													value={date}
												>
													Day {index + 1} -{" "}
													{new Date(
														date
													).toLocaleDateString()}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
							<div className="flex items-center gap-2">
								<Mic className="h-5 w-5" />
								<span className="text-sm text-muted-foreground">
									Artist Introductions
								</span>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Emergency Broadcasts */}
			{emergencyBroadcasts.length > 0 && (
				<div className="border-b border-border">
					{emergencyBroadcasts.map((broadcast) => (
						<div
							key={broadcast.id}
							className={`p-4 ${getEmergencyColor(
								broadcast.emergency_code
							)}`}
						>
							<div className="container mx-auto flex justify-between items-center">
								<div className="flex items-center gap-3">
									<AlertTriangle className="h-5 w-5" />
									<div>
										<span className="font-bold">
											{broadcast.emergency_code.toUpperCase()}{" "}
											ALERT:
										</span>
										<span className="ml-2">
											{broadcast.message}
										</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Current Status Section */}
			<div className="border-b border-border bg-muted/30">
				<div className="container mx-auto px-4 py-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Currently On Stage */}
						<Card className="border-green-500 bg-green-50 dark:bg-green-950">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-green-700 dark:text-green-300 flex items-center gap-2">
									<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
									Currently On Stage
								</CardTitle>
							</CardHeader>
							<CardContent>
								{showOrderItems.length > 0 &&
								showOrderItems[0]?.type === "artist" ? (
									<div className="flex items-center gap-4">
										<Avatar className="h-12 w-12">
											<AvatarFallback>
												{showOrderItems[0]
													.artist!.artist_name.charAt(
														0
													)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<h3 className="font-semibold text-lg">
												{
													showOrderItems[0].artist!
														.artist_name
												}
											</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Badge variant="outline">
													{
														showOrderItems[0]
															.artist!.style
													}
												</Badge>
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{
														showOrderItems[0]
															.artist!
															.performance_duration
													}{" "}
													min
												</span>
											</div>
										</div>
									</div>
								) : showOrderItems.length > 0 &&
								  showOrderItems[0]?.type === "cue" ? (
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
											{(() => {
												const IconComponent =
													getCueIcon(
														showOrderItems[0].cue!
															.type
													);
												return (
													<IconComponent className="h-6 w-6 text-muted-foreground" />
												);
											})()}
										</div>
										<div>
											<h3 className="font-semibold text-lg">
												{showOrderItems[0].cue!.title}
											</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Badge variant="outline">
													{
														showOrderItems[0].cue!
															.type
													}
												</Badge>
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{
														showOrderItems[0].cue!
															.duration
													}{" "}
													min
												</span>
											</div>
										</div>
									</div>
								) : (
									<div className="text-center text-muted-foreground">
										<Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No performance currently on stage</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Next Up */}
						<Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
									<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
									Next Up
								</CardTitle>
							</CardHeader>
							<CardContent>
								{showOrderItems.length > 1 &&
								showOrderItems[1]?.type === "artist" ? (
									<div className="flex items-center gap-4">
										<Avatar className="h-12 w-12">
											<AvatarFallback>
												{showOrderItems[1]
													.artist!.artist_name.charAt(
														0
													)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<h3 className="font-semibold text-lg">
												{
													showOrderItems[1].artist!
														.artist_name
												}
											</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Badge variant="outline">
													{
														showOrderItems[1]
															.artist!.style
													}
												</Badge>
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{
														showOrderItems[1]
															.artist!
															.performance_duration
													}{" "}
													min
												</span>
											</div>
										</div>
									</div>
								) : showOrderItems.length > 1 &&
								  showOrderItems[1]?.type === "cue" ? (
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
											{(() => {
												const IconComponent =
													getCueIcon(
														showOrderItems[1].cue!
															.type
													);
												return (
													<IconComponent className="h-6 w-6 text-muted-foreground" />
												);
											})()}
										</div>
										<div>
											<h3 className="font-semibold text-lg">
												{showOrderItems[1].cue!.title}
											</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Badge variant="outline">
													{
														showOrderItems[1].cue!
															.type
													}
												</Badge>
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{
														showOrderItems[1].cue!
															.duration
													}{" "}
													min
												</span>
											</div>
										</div>
									</div>
								) : showOrderItems.length === 1 ? (
									<div className="text-center text-muted-foreground">
										<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>Last item in performance order</p>
									</div>
								) : (
									<div className="text-center text-muted-foreground">
										<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No next performance scheduled</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Next on Deck */}
						<Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
							<CardHeader className="pb-3">
								<CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
									<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
									Next on Deck
								</CardTitle>
							</CardHeader>
							<CardContent>
								{showOrderItems.length > 2 &&
								showOrderItems[2]?.type === "artist" ? (
									<div className="flex items-center gap-4">
										<Avatar className="h-12 w-12">
											<AvatarFallback>
												{showOrderItems[2]
													.artist!.artist_name.charAt(
														0
													)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<h3 className="font-semibold text-lg">
												{
													showOrderItems[2].artist!
														.artist_name
												}
											</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Badge variant="outline">
													{
														showOrderItems[2]
															.artist!.style
													}
												</Badge>
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{
														showOrderItems[2]
															.artist!
															.performance_duration
													}{" "}
													min
												</span>
											</div>
										</div>
									</div>
								) : showOrderItems.length > 2 &&
								  showOrderItems[2]?.type === "cue" ? (
									<div className="flex items-center gap-4">
										<div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
											{(() => {
												const IconComponent =
													getCueIcon(
														showOrderItems[2].cue!
															.type
													);
												return (
													<IconComponent className="h-6 w-6 text-muted-foreground" />
												);
											})()}
										</div>
										<div>
											<h3 className="font-semibold text-lg">
												{showOrderItems[2].cue!.title}
											</h3>
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Badge variant="outline">
													{
														showOrderItems[2].cue!
															.type
													}
												</Badge>
												<span className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													{
														showOrderItems[2].cue!
															.duration
													}{" "}
													min
												</span>
											</div>
										</div>
									</div>
								) : showOrderItems.length <= 2 ? (
									<div className="text-center text-muted-foreground">
										<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No upcoming performances</p>
									</div>
								) : (
									<div className="text-center text-muted-foreground">
										<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No performance on deck</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<main className="container mx-auto px-4 py-8">
				<div className="space-y-6">
					{/* Performance Schedule */}
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">
							Performance Schedule
						</h2>
						{selectedPerformanceDate && (
							<Badge
								variant="outline"
								className="flex items-center gap-1"
							>
								<Calendar className="h-3 w-3" />
								{new Date(
									selectedPerformanceDate
								).toLocaleDateString("en-US", {
									weekday: "long",
									month: "long",
									day: "numeric",
								})}
							</Badge>
						)}
					</div>

					{/* Performance Order List */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Mic className="h-5 w-5" />
								MC Introduction Schedule
							</CardTitle>
						</CardHeader>
						<CardContent>
							{(() => {
								// Filter performance items by selected date
								const filteredItems = showOrderItems.filter(
									(item) => {
										if (!selectedPerformanceDate)
											return true;

										if (item.type === "artist") {
											const performanceDate =
												item.artist?.performance_date;
											if (!performanceDate) return false;
											const artistDate = new Date(
												performanceDate
											)
												.toISOString()
												.split("T")[0];
											const filterDate = new Date(
												selectedPerformanceDate
											)
												.toISOString()
												.split("T")[0];
											return artistDate === filterDate;
										}

										if (item.type === "cue") {
											// Cues are already filtered by performance date in the API call
											return true;
										}

										return true;
									}
								);

								if (filteredItems.length === 0) {
									return (
										<div className="text-center py-12">
											<Mic className="h-16 w-16 mx-auto mb-4 opacity-50" />
											<h3 className="text-lg font-medium mb-2">
												No performances scheduled
											</h3>
											<p className="text-muted-foreground">
												No performances found for the
												selected date
											</p>
										</div>
									);
								}

								return (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-16">
													#
												</TableHead>
												<TableHead>
													Performer/Cue
												</TableHead>
												<TableHead>Type</TableHead>
												<TableHead>Duration</TableHead>
												<TableHead>Biography</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="w-32">
													Action
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredItems.map(
												(item, index) => {
													const status =
														getItemStatus(
															item,
															index
														);
													const rowClasses =
														getRowColorClasses(
															status
														);

													return (
														<TableRow
															key={item.id}
															className={
																rowClasses
															}
														>
															<TableCell className="font-medium">
																{index + 1}
															</TableCell>
															<TableCell>
																{item.type ===
																	"artist" &&
																item.artist ? (
																	<div className="flex items-center gap-3">
																		<Avatar className="h-8 w-8">
																			<AvatarFallback>
																				{item.artist.artist_name
																					.charAt(
																						0
																					)
																					.toUpperCase()}
																			</AvatarFallback>
																		</Avatar>
																		<div>
																			<div className="font-medium">
																				{
																					item
																						.artist
																						.artist_name
																				}
																			</div>
																			{item
																				.artist
																				.real_name && (
																				<div className="text-sm text-muted-foreground">
																					{
																						item
																							.artist
																							.real_name
																					}
																				</div>
																			)}
																		</div>
																	</div>
																) : (
																	item.type ===
																		"cue" &&
																	item.cue && (
																		<div className="flex items-center gap-3">
																			{(() => {
																				const IconComponent =
																					getCueIcon(
																						item.cue!
																							.type
																					);
																				return (
																					<IconComponent className="h-5 w-5" />
																				);
																			})()}
																			<div>
																				<div className="font-medium">
																					{
																						item
																							.cue
																							.title
																					}
																				</div>
																				<div className="text-sm text-muted-foreground">
																					{item.cue.type.replace(
																						"_",
																						" "
																					)}
																				</div>
																			</div>
																		</div>
																	)
																)}
															</TableCell>
															<TableCell>
																{item.type ===
																	"artist" &&
																item.artist ? (
																	<Badge variant="outline">
																		{
																			item
																				.artist
																				.style
																		}
																	</Badge>
																) : (
																	item.type ===
																		"cue" &&
																	item.cue && (
																		<Badge variant="secondary">
																			{item.cue.type.replace(
																				"_",
																				" "
																			)}
																		</Badge>
																	)
																)}
															</TableCell>
															<TableCell>
																<span className="flex items-center gap-1">
																	<Clock className="h-3 w-3" />
																	{item.type ===
																	"artist"
																		? item
																				.artist
																				?.performance_duration
																		: item
																				.cue
																				?.duration}{" "}
																	min
																</span>
															</TableCell>
															<TableCell className="max-w-[200px]">
																{item.type ===
																	"artist" &&
																item.artist ? (
																	<div className="text-sm">
																		{item
																			.artist
																			.biography ||
																			`${item.artist.artist_name} is a talented ${item.artist.style} performer.`}
																	</div>
																) : (
																	item.type ===
																		"cue" &&
																	item.cue && (
																		<div className="text-sm text-muted-foreground">
																			{item
																				.cue
																				.notes ||
																				"Performance cue"}
																		</div>
																	)
																)}
															</TableCell>
															<TableCell>
																{getStatusBadge(
																	status
																)}
															</TableCell>
															<TableCell>
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		setSelectedItem(
																			item
																		)
																	}
																>
																	Select
																</Button>
															</TableCell>
														</TableRow>
													);
												}
											)}
										</TableBody>
									</Table>
								);
							})()}
						</CardContent>
					</Card>

					{/* Selected Performance Item Details */}
					{selectedItem && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Edit3 className="h-5 w-5" />
									Selected Performance Item
								</CardTitle>
								<CardDescription>
									Edit MC notes and introduction details
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-6">
									{/* Item Details */}
									<div className="space-y-6">
										<div>
											<h3 className="text-lg font-semibold mb-2">
												{selectedItem.type === "artist"
													? selectedItem.artist
															?.artist_name
													: selectedItem.cue?.title}
											</h3>
											{selectedItem.type === "artist" &&
												selectedItem.artist && (
													<div className="space-y-3">
														<div className="flex items-center gap-2">
															<Badge variant="outline">
																{
																	selectedItem
																		.artist
																		.style
																}
															</Badge>
															<span className="text-sm text-muted-foreground flex items-center gap-1">
																<Clock className="h-3 w-3" />
																{
																	selectedItem
																		.artist
																		.performance_duration
																}{" "}
																min
															</span>
															{getQualityBadge(
																selectedItem
																	.artist
																	.quality_rating
															)}
														</div>
														{selectedItem.artist
															.real_name && (
															<p className="text-sm text-muted-foreground">
																Real Name:{" "}
																{
																	selectedItem
																		.artist
																		.real_name
																}
															</p>
														)}
														{selectedItem.artist
															.phone && (
															<p className="text-sm text-muted-foreground">
																Phone:{" "}
																{
																	selectedItem
																		.artist
																		.phone
																}
															</p>
														)}
														{selectedItem.artist
															.email && (
															<p className="text-sm text-muted-foreground">
																Email:{" "}
																{
																	selectedItem
																		.artist
																		.email
																}
															</p>
														)}
													</div>
												)}
											{selectedItem.type === "cue" &&
												selectedItem.cue && (
													<div className="space-y-3">
														<div className="flex items-center gap-2">
															<Badge variant="secondary">
																{selectedItem.cue.type.replace(
																	"_",
																	" "
																)}
															</Badge>
															<span className="text-sm text-muted-foreground flex items-center gap-1">
																<Clock className="h-3 w-3" />
																{
																	selectedItem
																		.cue
																		.duration
																}{" "}
																min
															</span>
														</div>
													</div>
												)}
										</div>

										{/* Artist Biography Section */}
										{selectedItem.type === "artist" && (
											<Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
												<CardHeader className="pb-3">
													<CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
														Artist Biography
													</CardTitle>
												</CardHeader>
												<CardContent className="pt-0">
													<p className="text-sm text-muted-foreground leading-relaxed">
														{selectedItem.artist
															?.biography ||
															"No biography provided yet"}
													</p>
												</CardContent>
											</Card>
										)}

										{/* Artist Notes Section */}
										{selectedItem.type === "artist" && (
											<Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
												<CardHeader className="pb-3">
													<CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
														Artist Notes
													</CardTitle>
												</CardHeader>
												<CardContent className="pt-0">
													<p className="text-sm text-muted-foreground leading-relaxed">
														{selectedItem.artist
															?.artist_notes ||
															"No additional notes provided"}
													</p>
												</CardContent>
											</Card>
										)}

										{/* Cue Notes Section */}
										{selectedItem.type === "cue" && (
											<Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
												<CardHeader className="pb-3">
													<CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
														Cue Notes
													</CardTitle>
												</CardHeader>
												<CardContent className="pt-0">
													<p className="text-sm text-muted-foreground leading-relaxed">
														{selectedItem.cue
															?.notes ||
															"No additional notes provided"}
													</p>
												</CardContent>
											</Card>
										)}

										{/* Default Introduction Section */}
										<Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
											<CardHeader className="pb-3">
												<CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
													Default Introduction
												</CardTitle>
											</CardHeader>
											<CardContent className="pt-0">
												<p className="text-sm text-muted-foreground leading-relaxed">
													{selectedItem.type ===
														"artist" &&
													selectedItem.artist
														? `Ladies and gentlemen, please welcome to the stage, performing ${selectedItem.artist.style}, ${selectedItem.artist.artist_name}!`
														: selectedItem.type ===
																"cue" &&
														  selectedItem.cue
														? `We now have a ${selectedItem.cue.type.replace(
																"_",
																" "
														  )} - ${
																selectedItem.cue
																	.title
														  }. Please stay tuned!`
														: "Default introduction will be generated based on performer details."}
												</p>
											</CardContent>
										</Card>

										{/* MC Notes Editor */}
										<Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
											<CardHeader className="pb-3">
												<CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">
													MC Introduction Notes
												</CardTitle>
											</CardHeader>
											<CardContent className="pt-0">
												<MCNotesCell
													item={selectedItem}
													onUpdate={updateMCNotes}
												/>
											</CardContent>
										</Card>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	);
}
