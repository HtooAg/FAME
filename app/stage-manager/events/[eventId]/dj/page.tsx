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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Music,
	Play,
	Pause,
	Clock,
	ArrowLeft,
	Upload,
	Edit3,
	Users,
	Calendar,
	Star,
	CheckCircle,
	Headphones,
	Edit,
	Timer,
	Mic,
	Video,
	Trash2,
	Speaker,
	Sparkles,
	AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Artist {
	id: string;
	artist_name: string;
	style: string;
	performance_duration: number;
	quality_rating: number | null;
	performance_order: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
	actual_duration?: number;
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
	start_time?: string;
	end_time?: string;
	is_completed?: boolean;
	completed_at?: string;
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

interface MusicTrack {
	id: string;
	artist_id: string;
	song_title: string;
	duration: number;
	file_url: string | null;
	is_main_track: boolean;
	tempo: string | null;
	notes: string | null;
	dj_notes?: string | null;
}

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

export default function DJDashboard() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;
	const wsRef = useRef<WebSocket | null>(null);

	const [event, setEvent] = useState<Event | null>(null);
	const [showOrderItems, setShowOrderItems] = useState<ShowOrderItem[]>([]);
	const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
	const [currentTrack, setCurrentTrack] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [loading, setLoading] = useState(true);
	const [selectedPerformanceDate, setSelectedPerformanceDate] =
		useState<string>("");
	const [eventDates, setEventDates] = useState<string[]>([]);
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
					console.log("DJ Dashboard WebSocket connected");
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
					console.log("DJ Dashboard WebSocket disconnected");
					setWsConnected(false);
					// Reconnect after 3 seconds
					setTimeout(connectWebSocket, 3000);
				};

				wsRef.current.onerror = (error) => {
					console.warn(
						"DJ Dashboard WebSocket connection failed:",
						error
					);
					setWsConnected(false);
				};
			} catch (error) {
				console.warn("DJ Dashboard WebSocket setup failed:", error);
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
						style: artist.style,
						performance_duration:
							artist.performanceDuration ||
							artist.performance_duration ||
							5,
						quality_rating: artist.quality_rating || null,
						performance_order: artist.performance_order || null,
						rehearsal_completed:
							artist.rehearsal_completed || false,
						performance_status: artist.performance_status || null,
						performance_date:
							artist.performanceDate || artist.performance_date,
						actual_duration: artist.actual_duration || null,
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
									cue,
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

					// Fetch music tracks for all artists
					const artistIds = filteredArtists.map(
						(artist: Artist) => artist.id
					);
					if (artistIds.length > 0) {
						await fetchMusicTracks(artistIds);
					}
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

	const fetchMusicTracks = async (artistIds: string[]) => {
		try {
			// This would need to be implemented in your API
			// For now, we'll use mock data
			const mockTracks: MusicTrack[] = [];
			setMusicTracks(mockTracks);
		} catch (error) {
			console.error("Error fetching music tracks:", error);
		}
	};

	const playTrack = (trackId: string) => {
		setCurrentTrack(trackId);
		setIsPlaying(true);
		toast({
			title: "Playing track",
			description: "Audio playback would start here",
		});
	};

	const pauseTrack = () => {
		setIsPlaying(false);
		toast({
			title: "Track paused",
			description: "Audio playback paused",
		});
	};

	const getArtistTracks = (artistId: string) => {
		return musicTracks.filter((track) => track.artist_id === artistId);
	};

	const getRowColorClasses = (status?: string | null) => {
		switch (status) {
			case "completed":
				return "bg-red-100 border-red-300 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300";
			case "currently_on_stage":
				return "bg-green-100 border-green-300 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400";
			case "next_on_stage":
				return "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400";
			case "next_on_deck":
				return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400";
			default:
				return "bg-card text-card-foreground border-border";
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
	const MusicEditDialog = ({
		artistId,
		tracks,
	}: {
		artistId: string;
		tracks: MusicTrack[];
	}) => {
		const [newTrackTitle, setNewTrackTitle] = useState("");
		const [selectedFile, setSelectedFile] = useState<File | null>(null);

		return (
			<Dialog>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Edit Music Tracks</DialogTitle>
						<DialogDescription>
							Upload new tracks or edit existing ones
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{/* Upload new track */}
						<div className="border rounded-lg p-4">
							<h4 className="font-medium mb-3">
								Upload New Track
							</h4>
							<div className="space-y-3">
								<div>
									<Label htmlFor="track-title">
										Track Title
									</Label>
									<Input
										id="track-title"
										value={newTrackTitle}
										onChange={(e) =>
											setNewTrackTitle(e.target.value)
										}
										placeholder="Enter track title"
									/>
								</div>
								<div>
									<Label htmlFor="track-file">
										Audio File
									</Label>
									<Input
										id="track-file"
										type="file"
										accept="audio/*"
										onChange={(e) =>
											setSelectedFile(
												e.target.files?.[0] || null
											)
										}
									/>
								</div>
								<Button
									onClick={() => {
										if (selectedFile && newTrackTitle) {
											// uploadNewTrack would be implemented here
											toast({
												title: "Track uploaded",
												description:
													"Track uploaded successfully",
											});
											setNewTrackTitle("");
											setSelectedFile(null);
										}
									}}
									disabled={!selectedFile || !newTrackTitle}
								>
									<Upload className="h-4 w-4 mr-1" />
									Upload Track
								</Button>
							</div>
						</div>

						{/* Existing tracks */}
						<div className="space-y-3">
							<h4 className="font-medium">Existing Tracks</h4>
							{tracks.length === 0 ? (
								<p className="text-muted-foreground text-center py-4">
									No tracks available
								</p>
							) : (
								tracks.map((track) => (
									<div
										key={track.id}
										className="border rounded-lg p-3"
									>
										<div className="flex items-center justify-between mb-2">
											<h5 className="font-medium">
												{track.song_title}
											</h5>
											<Badge
												variant={
													track.is_main_track
														? "default"
														: "outline"
												}
											>
												{track.is_main_track
													? "Main"
													: "Additional"}
											</Badge>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<div>
												<Label>Tempo</Label>
												<Input
													value={track.tempo || ""}
													placeholder="e.g., 120 BPM"
													readOnly
												/>
											</div>
											<div>
												<Label>
													Duration (seconds)
												</Label>
												<Input
													type="number"
													value={track.duration}
													readOnly
												/>
											</div>
										</div>
										<div className="mt-2">
											<Label>DJ Notes</Label>
											<Input
												value={track.notes || ""}
												placeholder="DJ notes or cues"
												readOnly
											/>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading DJ dashboard...
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
								DJ Dashboard
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
								<Music className="h-5 w-5" />
								<span className="text-sm text-muted-foreground">
									Live Performance Control
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

			<main className="container mx-auto px-4 py-6">
				<div className="mb-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold">
							Performance Order
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
					<div className="space-y-4">
						{(() => {
							// Filter performance items by selected date
							const filteredItems = showOrderItems.filter(
								(item) => {
									if (!selectedPerformanceDate) return true;

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

							return filteredItems.length === 0 ? (
								<Card className="p-6">
									<div className="text-center">
										<Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
										<h3 className="text-lg font-semibold mb-2">
											{selectedPerformanceDate
												? "No Performances Scheduled"
												: "No Performance Order Set"}
										</h3>
										<p className="text-muted-foreground">
											{selectedPerformanceDate
												? `No performances are scheduled for ${new Date(
														selectedPerformanceDate
												  ).toLocaleDateString()}.`
												: "The Stage Manager hasn't set up the performance order yet."}
										</p>
									</div>
								</Card>
							) : (
								filteredItems.map((item, index) => (
									<Card
										key={item.id}
										className={`transition-all duration-200 ${getRowColorClasses(
											item.status
										)}`}
									>
										<CardContent className="p-6">
											<div className="flex items-center justify-between">
												<div className="flex items-center space-x-4">
													<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
														{index + 1}
													</div>
													{item.type === "artist" &&
														item.artist && (
															<div>
																<h3 className="text-lg font-semibold">
																	{
																		item
																			.artist
																			.artist_name
																	}
																</h3>
																<div className="flex items-center gap-2 mt-1">
																	<Badge variant="outline">
																		{
																			item
																				.artist
																				.style
																		}
																	</Badge>
																	<span className="text-sm text-muted-foreground flex items-center gap-1">
																		<Clock className="h-3 w-3" />
																		{
																			item
																				.artist
																				.performance_duration
																		}{" "}
																		min
																	</span>
																	{item.artist
																		.rehearsal_completed && (
																		<Badge
																			variant="secondary"
																			className="flex items-center gap-1"
																		>
																			<CheckCircle className="h-3 w-3" />
																			Rehearsed
																		</Badge>
																	)}
																	{getQualityBadge(
																		item
																			.artist
																			.quality_rating
																	)}
																</div>
															</div>
														)}
													{item.type === "cue" &&
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
																	<h3 className="text-lg font-semibold">
																		{
																			item
																				.cue
																				.title
																		}
																	</h3>
																	<div className="flex items-center gap-2 mt-1">
																		<span className="text-sm text-muted-foreground flex items-center gap-1">
																			<Clock className="h-3 w-3" />
																			{
																				item
																					.cue
																					.duration
																			}{" "}
																			min
																		</span>
																		{item
																			.cue
																			.notes && (
																			<span className="text-sm text-muted-foreground">
																				•{" "}
																				{
																					item
																						.cue
																						.notes
																				}
																			</span>
																		)}
																	</div>
																</div>
															</div>
														)}
												</div>
												<div className="flex items-center gap-4">
													<Badge
														variant={
															item.status ===
															"completed"
																? "destructive"
																: item.status ===
																  "currently_on_stage"
																? "default"
																: "outline"
														}
													>
														{item.status ===
															"not_started" &&
															"Not Started"}
														{item.status ===
															"next_on_deck" &&
															"Next on Deck"}
														{item.status ===
															"next_on_stage" &&
															"Next on Stage"}
														{item.status ===
															"currently_on_stage" &&
															"Currently on Stage"}
														{item.status ===
															"completed" &&
															"Completed"}
													</Badge>
													{item.type === "artist" && (
														<div className="flex items-center gap-2">
															<MusicEditDialog
																artistId={
																	item.artist!
																		.id
																}
																tracks={getArtistTracks(
																	item.artist!
																		.id
																)}
															/>
														</div>
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								))
							);
						})()}
					</div>
				</div>
			</main>
		</div>
	);
}
