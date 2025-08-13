"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	NotificationProvider,
	NotificationBell,
} from "@/components/NotificationProvider";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	UserCheck,
	Calendar,
	CheckCircle,
	Eye,
	Trash2,
	Plus,
	Copy,
	X,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";
import { LazyMediaLoader } from "@/components/ui/lazy-media-loader";
import { ArtistStatusBadge } from "@/components/ui/artist-status-badge";
import { ArtistStatusDialog } from "@/components/ui/artist-status-dialog";

interface Event {
	id: string;
	name: string;
	venue: string;
	show_dates: string[];
}

interface Artist {
	id: string;
	artist_name: string;
	real_name: string;
	email: string;
	style: string;
	performance_duration: number;
	performance_date: string | null;
	created_at: string;
	actual_duration: number | null; // Duration from uploaded music in seconds
	status: string | null; // Artist status
}

export default function ArtistManagement() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [loading, setLoading] = useState(true);
	const [wsConnected, setWsConnected] = useState(false);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [statusArtist, setStatusArtist] = useState<Artist | null>(null);
	const [newArtist, setNewArtist] = useState({
		artist_name: "",
		real_name: "",
		email: "",
		password: "",
		style: "",
		performance_duration: 15,
		biography: "",
		phone: "",
	});
	const [createdCredentials, setCreatedCredentials] = useState<{
		email: string;
		password: string;
		loginUrl: string;
	} | null>(null);

	useEffect(() => {
		if (eventId) {
			fetchEvent();
			fetchArtists();
			// Initialize WebSocket connection for real-time updates
			initializeWebSocket();
		}
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
		} catch (error) {
			console.error("Error fetching event:", error);
			toast({
				title: "Error",
				description: "Failed to load event details",
				variant: "destructive",
			});
		}
	};

	const fetchArtists = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/artists`);
			if (response.ok) {
				const data = await response.json();

				// Process artists to match sample UI format
				const processedArtists = (data.data || []).map(
					(artist: any) => ({
						id: artist.id,
						artist_name: artist.artistName || artist.artist_name,
						real_name: artist.realName || artist.real_name,
						email: artist.email,
						style: artist.style,
						performance_duration:
							artist.performanceDuration ||
							artist.performance_duration,
						performance_date:
							artist.performanceDate || artist.performance_date,
						created_at: artist.createdAt || artist.created_at,
						status: artist.status || "pending",
						actual_duration:
							artist.musicTracks?.find(
								(track: any) => track.is_main_track
							)?.duration || null,
					})
				);

				setArtists(processedArtists);
			} else {
				throw new Error("Failed to fetch artists");
			}
		} catch (error) {
			console.error("Error fetching artists:", error);
			toast({
				title: "Error",
				description: "Failed to load artist submissions",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const initializeWebSocket = () => {
		// Initialize WebSocket connection for real-time artist submissions
		try {
			// First initialize the WebSocket server
			fetch("/api/websocket").then(() => {
				console.log("WebSocket server initialized for artist updates");

				// Then establish client connection
				const ws = new WebSocket("ws://localhost:8080");

				ws.onopen = () => {
					console.log("WebSocket connected");
					setWsConnected(true);

					// Subscribe to artist submissions for this event
					ws.send(
						JSON.stringify({
							type: "subscribe",
							channel: "artist_submissions",
							eventId: eventId,
						})
					);
				};

				ws.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data);
						console.log("WebSocket message received:", message);

						if (message.type === "artist_registered") {
							// Add new artist to the list
							const newArtist = {
								id: message.data.id,
								artist_name:
									message.data.artistName ||
									message.data.artist_name,
								real_name:
									message.data.realName ||
									message.data.real_name,
								email: message.data.email,
								style: message.data.style,
								performance_duration:
									message.data.performanceDuration ||
									message.data.performance_duration,
								performance_date:
									message.data.performanceDate ||
									message.data.performance_date,
								status: message.data.status || "pending",
								created_at:
									message.data.createdAt ||
									message.data.created_at,
								actual_duration:
									message.data.musicTracks?.find(
										(track: any) => track.is_main_track
									)?.duration || null,
							};

							setArtists((prev) => [newArtist, ...prev]);

							toast({
								title: "New Artist Registration",
								description: `${newArtist.artist_name} has submitted their application`,
							});
						} else if (message.type === "artist_assigned") {
							// Update existing artist assignment
							setArtists((prev) =>
								prev.map((artist) =>
									artist.id === message.data.id
										? {
												...artist,
												performance_date:
													message.data
														.performance_date,
										  }
										: artist
								)
							);

							toast({
								title: "Artist Assignment Updated",
								description: `${
									message.data.artist_name ||
									message.data.artistName
								} has been assigned`,
							});
						} else if (message.type === "artist_status_changed") {
							// Update artist status
							setArtists((prev) =>
								prev.map((artist) =>
									artist.id === message.data.id
										? {
												...artist,
												status: message.data.status,
												...message.data,
										  }
										: artist
								)
							);

							toast({
								title: "Artist Status Updated",
								description: `${
									message.data.artist_name ||
									message.data.artistName
								} status changed`,
							});
						} else if (message.type === "artist_deleted") {
							// Remove artist from list
							setArtists((prev) =>
								prev.filter(
									(artist) => artist.id !== message.data.id
								)
							);

							toast({
								title: "Artist Removed",
								description: `${
									message.data.artist_name ||
									message.data.artistName
								} has been removed`,
								variant: "destructive",
							});
						} else if (message.type === "subscription_confirmed") {
							console.log(
								`Subscribed to artist submissions for event ${message.eventId}`
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

	const assignPerformanceDate = async (
		artistId: string,
		performanceDate: string | null
	) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						performance_date: performanceDate,
					}),
				}
			);

			if (response.ok) {
				const result = await response.json();

				// Update local state immediately for better UX
				setArtists(
					artists.map((artist) =>
						artist.id === artistId
							? { ...artist, performance_date: performanceDate }
							: artist
					)
				);

				toast({
					title: performanceDate
						? "Performance date assigned"
						: "Artist unassigned",
					description: performanceDate
						? "Artist has been assigned to a performance date and will appear in rehearsal calendar"
						: "Artist has been moved back to submitted applications",
				});

				// WebSocket broadcast will be handled by the API endpoint
				console.log(
					`Artist ${artistId} assignment updated: ${
						performanceDate
							? "assigned to " + performanceDate
							: "unassigned"
					}`
				);
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message ||
						"Failed to update performance date"
				);
			}
		} catch (error: any) {
			console.error("Error updating performance date:", error);
			toast({
				title: "Error updating artist",
				description:
					error.message || "Failed to update performance date",
				variant: "destructive",
			});
		}
	};

	const deleteArtist = async (artistId: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/artists/${artistId}`,
				{
					method: "DELETE",
				}
			);

			if (response.ok) {
				// Update local state immediately for better UX
				setArtists(artists.filter((artist) => artist.id !== artistId));

				toast({
					title: "Artist deleted",
					description:
						"Artist profile has been removed. They will need to register again.",
				});

				// WebSocket broadcast will be handled by the API endpoint
				console.log(`Artist ${artistId} deleted successfully`);
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Failed to delete artist"
				);
			}
		} catch (error: any) {
			console.error("Error deleting artist:", error);
			toast({
				title: "Error deleting artist",
				description: error.message || "Failed to delete artist profile",
				variant: "destructive",
			});
		}
	};

	const generatePassword = () => {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let password = "";
		for (let i = 0; i < 12; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return password;
	};

	const createArtistManually = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/artists`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					artistName: newArtist.artist_name,
					realName: newArtist.real_name,
					email: newArtist.email,
					phone: newArtist.phone,
					style: newArtist.style,
					performanceDuration: newArtist.performance_duration,
					biography: newArtist.biography,
					password: newArtist.password,
				}),
			});

			if (response.ok) {
				const result = await response.json();

				// Generate login URL with pre-filled email
				const loginUrl = `${window.location.origin}/artist-dashboard/${result.data.id}`;

				setCreatedCredentials({
					email: newArtist.email,
					password: newArtist.password,
					loginUrl,
				});

				// Reset form
				setNewArtist({
					artist_name: "",
					real_name: "",
					email: "",
					password: "",
					style: "",
					performance_duration: 15,
					biography: "",
					phone: "",
				});

				// Refresh artists list
				fetchArtists();

				toast({
					title: "Artist created successfully",
					description:
						"The artist account has been created with login credentials",
				});
			} else {
				throw new Error("Failed to create artist");
			}
		} catch (error: any) {
			console.error("Error creating artist:", error);
			toast({
				title: "Error creating artist",
				description: error.message || "Failed to create artist account",
				variant: "destructive",
			});
		}
	};

	// Helper function to format duration
	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const copyCredentials = () => {
		if (!createdCredentials) return;

		const credentialsText = `Artist Login Credentials

Name: ${newArtist.artist_name}
Email: ${createdCredentials.email}
Password: ${createdCredentials.password}
Login URL: ${createdCredentials.loginUrl}

Please use these credentials to access your artist dashboard.`;

		navigator.clipboard.writeText(credentialsText);
		toast({
			title: "Credentials copied",
			description: "Login credentials have been copied to clipboard",
		});
	};

	const viewArtistDetails = async (artistId: string) => {
		try {
			const response = await fetch(`/api/artists/${artistId}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					// Convert the detailed artist data to match our Artist interface
					const detailedArtist: Artist = {
						id: data.data.id,
						artist_name:
							data.data.artistName || data.data.artist_name,
						real_name: data.data.realName || data.data.real_name,
						email: data.data.email,
						style: data.data.style,
						performance_duration:
							data.data.performanceDuration ||
							data.data.performance_duration,
						performance_date:
							data.data.performanceDate ||
							data.data.performance_date,
						created_at: data.data.createdAt || data.data.created_at,
						status: data.data.status,
						actual_duration:
							data.data.musicTracks?.find(
								(track: any) => track.is_main_track
							)?.duration || null,
						// Add additional detailed data
						...data.data,
					};
					setSelectedArtist(detailedArtist);
					setIsDetailDialogOpen(true);
				}
			} else {
				throw new Error("Failed to fetch artist details");
			}
		} catch (error) {
			console.error("Error fetching artist details:", error);
			toast({
				title: "Error",
				description: "Failed to load artist details",
				variant: "destructive",
			});
		}
	};

	const openStatusDialog = (artist: Artist) => {
		setStatusArtist(artist);
		setIsStatusDialogOpen(true);
	};

	const handleStatusUpdated = (newStatus: string) => {
		if (statusArtist) {
			// Update the artist in the local state
			setArtists((prev) =>
				prev.map((artist) =>
					artist.id === statusArtist.id
						? { ...artist, status: newStatus }
						: artist
				)
			);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading artist submissions...
					</p>
				</div>
			</div>
		);
	}

	const submittedArtists = artists.filter((a) => !a.performance_date);
	const assignedArtists = artists.filter((a) => a.performance_date);

	return (
		<NotificationProvider userRole="stage-manager">
			<div className="min-h-screen bg-background">
				<header className="border-b border-border">
					<div className="container mx-auto px-4 py-4">
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
									Artist Management
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
					</div>
				</header>

				<main className="container mx-auto px-4 py-8">
					<div className="space-y-8">
						{/* Add Artist Manually */}
						<div className="flex justify-end">
							<Dialog
								open={isAddDialogOpen}
								onOpenChange={setIsAddDialogOpen}
							>
								<DialogTrigger asChild>
									<Button className="flex items-center gap-2">
										<Plus className="h-4 w-4" />
										Add Artist Manually
									</Button>
								</DialogTrigger>
								<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
									<DialogHeader>
										<DialogTitle>
											Add Artist Manually
										</DialogTitle>
										<DialogDescription>
											Create an artist account with login
											credentials that you can share
										</DialogDescription>
									</DialogHeader>

									<div className="grid gap-4 py-4">
										<div className="grid grid-cols-2 gap-4">
											<div className="grid gap-2">
												<Label htmlFor="artist_name">
													Artist Name *
												</Label>
												<Input
													id="artist_name"
													value={
														newArtist.artist_name
													}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															artist_name:
																e.target.value,
														})
													}
													placeholder="Stage name"
												/>
											</div>
											<div className="grid gap-2">
												<Label htmlFor="real_name">
													Real Name
												</Label>
												<Input
													id="real_name"
													value={newArtist.real_name}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															real_name:
																e.target.value,
														})
													}
													placeholder="Legal name"
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="grid gap-2">
												<Label htmlFor="email">
													Email *
												</Label>
												<Input
													id="email"
													type="email"
													value={newArtist.email}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															email: e.target
																.value,
														})
													}
													placeholder="artist@example.com"
												/>
											</div>
											<div className="grid gap-2">
												<Label htmlFor="phone">
													Phone
												</Label>
												<Input
													id="phone"
													value={newArtist.phone}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															phone: e.target
																.value,
														})
													}
													placeholder="Phone number"
												/>
											</div>
										</div>

										<div className="grid gap-2">
											<Label htmlFor="password">
												Password *
											</Label>
											<div className="flex gap-2">
												<Input
													id="password"
													type="text"
													value={newArtist.password}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															password:
																e.target.value,
														})
													}
													placeholder="Login password"
												/>
												<Button
													type="button"
													variant="outline"
													onClick={() =>
														setNewArtist({
															...newArtist,
															password:
																generatePassword(),
														})
													}
												>
													Generate
												</Button>
											</div>
										</div>

										<div className="grid gap-2">
											<Label htmlFor="style">
												Performance Style
											</Label>
											<Input
												id="style"
												value={newArtist.style}
												onChange={(e) =>
													setNewArtist({
														...newArtist,
														style: e.target.value,
													})
												}
												placeholder="e.g., Singer, Dancer, Comedy"
											/>
										</div>

										<div className="grid gap-2">
											<Label htmlFor="biography">
												Biography
											</Label>
											<Textarea
												id="biography"
												value={newArtist.biography}
												onChange={(e) =>
													setNewArtist({
														...newArtist,
														biography:
															e.target.value,
													})
												}
												placeholder="Artist background and experience"
												rows={3}
											/>
										</div>
									</div>

									<DialogFooter>
										<Button
											variant="outline"
											onClick={() =>
												setIsAddDialogOpen(false)
											}
										>
											Cancel
										</Button>
										<Button
											onClick={createArtistManually}
											disabled={
												!newArtist.artist_name ||
												!newArtist.email ||
												!newArtist.password
											}
										>
											Create Artist Account
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>

						{/* Credentials Display Dialog */}
						<Dialog
							open={!!createdCredentials}
							onOpenChange={() => setCreatedCredentials(null)}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										Artist Account Created
									</DialogTitle>
									<DialogDescription>
										Share these login credentials with the
										artist
									</DialogDescription>
								</DialogHeader>

								{createdCredentials && (
									<div className="space-y-4">
										<div className="p-4 bg-muted rounded-lg space-y-2">
											<div>
												<strong>Email:</strong>{" "}
												{createdCredentials.email}
											</div>
											<div>
												<strong>Password:</strong>{" "}
												{createdCredentials.password}
											</div>
											<div>
												<strong>Login URL:</strong>
												<a
													href={
														createdCredentials.loginUrl
													}
													target="_blank"
													rel="noopener noreferrer"
													className="text-primary hover:underline ml-2"
												>
													{
														createdCredentials.loginUrl
													}
												</a>
											</div>
										</div>

										<Button
											onClick={copyCredentials}
											className="w-full flex items-center gap-2"
										>
											<Copy className="h-4 w-4" />
											Copy Credentials to Clipboard
										</Button>
									</div>
								)}

								<DialogFooter>
									<Button
										onClick={() =>
											setCreatedCredentials(null)
										}
									>
										Close
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						{/* Artist Detail Dialog */}
						<Dialog
							open={isDetailDialogOpen}
							onOpenChange={setIsDetailDialogOpen}
						>
							<DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>
										Artist Details -{" "}
										{selectedArtist?.artist_name}
									</DialogTitle>
									<DialogDescription>
										Complete artist information and media
										files
									</DialogDescription>
								</DialogHeader>

								{selectedArtist && (
									<div className="space-y-6">
										{/* Basic Information and Performance Details */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<Card>
												<CardHeader>
													<CardTitle className="text-lg">
														Basic Information
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-3">
													<div>
														<p className="text-sm text-muted-foreground">
															Artist Name
														</p>
														<p className="font-medium">
															{
																selectedArtist.artist_name
															}
														</p>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															Real Name
														</p>
														<p className="font-medium">
															{
																selectedArtist.real_name
															}
														</p>
													</div>
													<div>
														<p className="text-sm text-muted-foreground">
															Email
														</p>
														<p className="font-medium">
															{
																selectedArtist.email
															}
														</p>
													</div>
													{(selectedArtist as any)
														.phone && (
														<div>
															<p className="text-sm text-muted-foreground">
																Phone
															</p>
															<p className="font-medium">
																{
																	(
																		selectedArtist as any
																	).phone
																}
															</p>
														</div>
													)}
													<div>
														<p className="text-sm text-muted-foreground">
															Performance Style
														</p>
														<p className="font-medium">
															{
																selectedArtist.style
															}
														</p>
													</div>
													{(selectedArtist as any)
														.performanceType && (
														<div>
															<p className="text-sm text-muted-foreground">
																Performance Type
															</p>
															<p className="font-medium">
																{
																	(
																		selectedArtist as any
																	)
																		.performanceType
																}
															</p>
														</div>
													)}
													<div>
														<p className="text-sm text-muted-foreground">
															Duration
														</p>
														<p className="font-medium">
															{
																selectedArtist.performance_duration
															}{" "}
															minutes
														</p>
													</div>
													{selectedArtist.performance_date && (
														<div>
															<p className="text-sm text-muted-foreground">
																Assigned
																Performance Date
															</p>
															<Badge variant="secondary">
																{new Date(
																	selectedArtist.performance_date
																).toLocaleDateString(
																	"en-US",
																	{
																		weekday:
																			"long",
																		month: "long",
																		day: "numeric",
																		year: "numeric",
																	}
																)}
															</Badge>
														</div>
													)}
												</CardContent>
											</Card>

											{/* Technical Requirements */}
											<Card>
												<CardHeader>
													<CardTitle className="text-lg">
														Technical Requirements
													</CardTitle>
												</CardHeader>
												<CardContent className="space-y-3">
													{(selectedArtist as any)
														.costumeColor && (
														<div>
															<p className="text-sm text-muted-foreground">
																Costume Color
															</p>
															<div className="flex items-center gap-2">
																<div
																	className="w-4 h-4 rounded border"
																	style={{
																		backgroundColor:
																			(
																				selectedArtist as any
																			)
																				.costumeColor ===
																			"custom"
																				? (
																						selectedArtist as any
																				  )
																						.customCostumeColor
																				: (
																						selectedArtist as any
																				  )
																						.costumeColor,
																	}}
																></div>
																<p className="font-medium capitalize">
																	{(
																		selectedArtist as any
																	)
																		.costumeColor ===
																	"custom"
																		? (
																				selectedArtist as any
																		  )
																				.customCostumeColor
																		: (
																				selectedArtist as any
																		  )
																				.costumeColor}
																</p>
															</div>
														</div>
													)}
													{(selectedArtist as any)
														.lightColorSingle && (
														<div>
															<p className="text-sm text-muted-foreground">
																Lighting Colors
															</p>
															<div className="space-y-2">
																<div className="flex items-center gap-2">
																	<div
																		className="w-4 h-4 rounded border"
																		style={{
																			backgroundColor:
																				(
																					selectedArtist as any
																				)
																					.lightColorSingle,
																		}}
																	></div>
																	<p className="text-sm">
																		Primary:{" "}
																		{
																			(
																				selectedArtist as any
																			)
																				.lightColorSingle
																		}
																	</p>
																</div>
																{(
																	selectedArtist as any
																)
																	.lightColorTwo &&
																	(
																		selectedArtist as any
																	)
																		.lightColorTwo !==
																		"none" && (
																		<div className="flex items-center gap-2">
																			<div
																				className="w-4 h-4 rounded border"
																				style={{
																					backgroundColor:
																						(
																							selectedArtist as any
																						)
																							.lightColorTwo,
																				}}
																			></div>
																			<p className="text-sm">
																				Secondary:{" "}
																				{
																					(
																						selectedArtist as any
																					)
																						.lightColorTwo
																				}
																			</p>
																		</div>
																	)}
																{(
																	selectedArtist as any
																)
																	.lightColorThree &&
																	(
																		selectedArtist as any
																	)
																		.lightColorThree !==
																		"none" && (
																		<div className="flex items-center gap-2">
																			<div
																				className="w-4 h-4 rounded border"
																				style={{
																					backgroundColor:
																						(
																							selectedArtist as any
																						)
																							.lightColorThree,
																				}}
																			></div>
																			<p className="text-sm">
																				Third:{" "}
																				{
																					(
																						selectedArtist as any
																					)
																						.lightColorThree
																				}
																			</p>
																		</div>
																	)}
															</div>
														</div>
													)}
													{(selectedArtist as any)
														.lightRequests && (
														<div>
															<p className="text-sm text-muted-foreground">
																Lighting
																Requests
															</p>
															<p className="text-sm">
																{
																	(
																		selectedArtist as any
																	)
																		.lightRequests
																}
															</p>
														</div>
													)}
													{(selectedArtist as any)
														.stagePositionStart && (
														<div>
															<p className="text-sm text-muted-foreground">
																Stage Position
															</p>
															<div className="space-y-1">
																<p className="text-sm">
																	Start:{" "}
																	{
																		(
																			selectedArtist as any
																		)
																			.stagePositionStart
																	}
																</p>
																{(
																	selectedArtist as any
																)
																	.stagePositionEnd && (
																	<p className="text-sm">
																		End:{" "}
																		{
																			(
																				selectedArtist as any
																			)
																				.stagePositionEnd
																		}
																	</p>
																)}
																{(
																	selectedArtist as any
																)
																	.customStagePosition && (
																	<p className="text-sm">
																		Custom:{" "}
																		{
																			(
																				selectedArtist as any
																			)
																				.customStagePosition
																		}
																	</p>
																)}
															</div>
														</div>
													)}
													{(selectedArtist as any)
														.equipment && (
														<div>
															<p className="text-sm text-muted-foreground">
																Equipment
															</p>
															<p className="text-sm">
																{
																	(
																		selectedArtist as any
																	).equipment
																}
															</p>
														</div>
													)}
													{(selectedArtist as any)
														.specialRequirements && (
														<div>
															<p className="text-sm text-muted-foreground">
																Special
																Requirements
															</p>
															<p className="text-sm">
																{
																	(
																		selectedArtist as any
																	)
																		.specialRequirements
																}
															</p>
														</div>
													)}
												</CardContent>
											</Card>
										</div>

										{/* Biography and Social Media */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{(selectedArtist as any)
												.biography && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															Biography
														</CardTitle>
													</CardHeader>
													<CardContent>
														<p className="text-sm whitespace-pre-wrap">
															{
																(
																	selectedArtist as any
																).biography
															}
														</p>
													</CardContent>
												</Card>
											)}

											{(selectedArtist as any)
												.socialMedia && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															Social Media & Links
														</CardTitle>
													</CardHeader>
													<CardContent className="space-y-2">
														{(selectedArtist as any)
															.socialMedia
															.instagram && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Instagram
																</p>
																<a
																	href={
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.instagram
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-primary hover:underline"
																>
																	{
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.instagram
																	}
																</a>
															</div>
														)}
														{(selectedArtist as any)
															.socialMedia
															.facebook && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Facebook
																</p>
																<a
																	href={
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.facebook
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-primary hover:underline"
																>
																	{
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.facebook
																	}
																</a>
															</div>
														)}
														{(selectedArtist as any)
															.socialMedia
															.youtube && (
															<div>
																<p className="text-sm text-muted-foreground">
																	YouTube
																</p>
																<a
																	href={
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.youtube
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-primary hover:underline"
																>
																	{
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.youtube
																	}
																</a>
															</div>
														)}
														{(selectedArtist as any)
															.socialMedia
															.tiktok && (
															<div>
																<p className="text-sm text-muted-foreground">
																	TikTok
																</p>
																<a
																	href={
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.tiktok
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-primary hover:underline"
																>
																	{
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.tiktok
																	}
																</a>
															</div>
														)}
														{(selectedArtist as any)
															.socialMedia
															.website && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Website
																</p>
																<a
																	href={
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.website
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-primary hover:underline"
																>
																	{
																		(
																			selectedArtist as any
																		)
																			.socialMedia
																			.website
																	}
																</a>
															</div>
														)}
														{(selectedArtist as any)
															.showLink && (
															<div>
																<p className="text-sm text-muted-foreground">
																	Show Link
																</p>
																<a
																	href={
																		(
																			selectedArtist as any
																		)
																			.showLink
																	}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-sm text-primary hover:underline"
																>
																	{
																		(
																			selectedArtist as any
																		)
																			.showLink
																	}
																</a>
															</div>
														)}
													</CardContent>
												</Card>
											)}
										</div>

										{/* Music Tracks */}
										{(selectedArtist as any).musicTracks &&
											(selectedArtist as any).musicTracks
												.length > 0 && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															Music Tracks
														</CardTitle>
														<CardDescription>
															Uploaded audio files
															with playback
															controls
														</CardDescription>
													</CardHeader>
													<CardContent className="space-y-4">
														{(
															selectedArtist as any
														).musicTracks.map(
															(
																track: any,
																index: number
															) => (
																<AudioPlayer
																	key={index}
																	track={
																		track
																	}
																	onError={(
																		error
																	) =>
																		toast({
																			title: "Audio Error",
																			description:
																				error,
																			variant:
																				"destructive",
																		})
																	}
																/>
															)
														)}
													</CardContent>
												</Card>
											)}

										{/* Gallery Files */}
										{(selectedArtist as any).galleryFiles &&
											(selectedArtist as any).galleryFiles
												.length > 0 && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															Gallery
														</CardTitle>
														<CardDescription>
															Uploaded images and
															videos
														</CardDescription>
													</CardHeader>
													<CardContent>
														<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
															{(
																selectedArtist as any
															).galleryFiles.map(
																(
																	file: any,
																	index: number
																) => (
																	<div
																		key={
																			index
																		}
																	>
																		{file.type ===
																		"video" ? (
																			<VideoPlayer
																				file={
																					file
																				}
																				onError={(
																					error
																				) =>
																					toast(
																						{
																							title: "Video Error",
																							description:
																								error,
																							variant:
																								"destructive",
																						}
																					)
																				}
																			/>
																		) : (
																			<ImageViewer
																				file={
																					file
																				}
																				onError={(
																					error
																				) =>
																					toast(
																						{
																							title: "Image Error",
																							description:
																								error,
																							variant:
																								"destructive",
																						}
																					)
																				}
																			/>
																		)}
																	</div>
																)
															)}
														</div>
													</CardContent>
												</Card>
											)}

										{/* Notes and Communication */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{(selectedArtist as any)
												.mcNotes && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															MC Notes
														</CardTitle>
													</CardHeader>
													<CardContent>
														<p className="text-sm whitespace-pre-wrap">
															{
																(
																	selectedArtist as any
																).mcNotes
															}
														</p>
													</CardContent>
												</Card>
											)}

											{(selectedArtist as any)
												.stageManagerNotes && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															Stage Manager Notes
														</CardTitle>
													</CardHeader>
													<CardContent>
														<p className="text-sm whitespace-pre-wrap">
															{
																(
																	selectedArtist as any
																)
																	.stageManagerNotes
															}
														</p>
													</CardContent>
												</Card>
											)}

											{(selectedArtist as any).notes && (
												<Card>
													<CardHeader>
														<CardTitle className="text-lg">
															General Notes
														</CardTitle>
													</CardHeader>
													<CardContent>
														<p className="text-sm whitespace-pre-wrap">
															{
																(
																	selectedArtist as any
																).notes
															}
														</p>
													</CardContent>
												</Card>
											)}
										</div>

										{/* Registration Information */}
										<Card>
											<CardHeader>
												<CardTitle className="text-lg">
													Registration Information
												</CardTitle>
											</CardHeader>
											<CardContent className="space-y-3">
												<div>
													<p className="text-sm text-muted-foreground">
														Registration Date
													</p>
													<p className="font-medium">
														{new Date(
															selectedArtist.created_at
														).toLocaleDateString(
															"en-US",
															{
																weekday: "long",
																month: "long",
																day: "numeric",
																year: "numeric",
																hour: "2-digit",
																minute: "2-digit",
															}
														)}
													</p>
												</div>
												{(selectedArtist as any)
													.status && (
													<div>
														<p className="text-sm text-muted-foreground">
															Status
														</p>
														<Badge
															variant={
																(
																	selectedArtist as any
																).status ===
																"active"
																	? "default"
																	: "secondary"
															}
														>
															{(
																selectedArtist as any
															).status.toUpperCase()}
														</Badge>
													</div>
												)}
												{(selectedArtist as any)
													.eventName && (
													<div>
														<p className="text-sm text-muted-foreground">
															Event
														</p>
														<p className="font-medium">
															{
																(
																	selectedArtist as any
																).eventName
															}
														</p>
													</div>
												)}
											</CardContent>
										</Card>
									</div>
								)}

								<DialogFooter>
									<Button
										variant="outline"
										onClick={() =>
											setIsDetailDialogOpen(false)
										}
									>
										Close
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						{/* Assigned Artists */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CheckCircle className="h-5 w-5" />
									Assigned Artists
								</CardTitle>
								<CardDescription>
									Artists who have been assigned to a
									performance date and are ready for
									scheduling
								</CardDescription>
							</CardHeader>
							<CardContent>
								{assignedArtists.length === 0 ? (
									<p className="text-muted-foreground text-center py-4">
										No artists assigned yet
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Artist</TableHead>
												<TableHead>Style</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Duration</TableHead>
												<TableHead>
													Performance Date
												</TableHead>
												<TableHead>
													Change Date
												</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{assignedArtists.map((artist) => (
												<TableRow key={artist.id}>
													<TableCell>
														<div>
															<p className="font-medium">
																{
																	artist.artist_name
																}
															</p>
															<p className="text-sm text-muted-foreground">
																{
																	artist.real_name
																}
															</p>
														</div>
													</TableCell>
													<TableCell>
														{artist.style}
													</TableCell>
													<TableCell>
														<ArtistStatusBadge
															status={
																artist.status
															}
														/>
													</TableCell>
													<TableCell>
														{formatDuration(
															artist.actual_duration ??
																null
														)}
													</TableCell>
													<TableCell>
														<Badge variant="secondary">
															{new Date(
																artist.performance_date!
															).toLocaleDateString(
																"en-US",
																{
																	weekday:
																		"short",
																	month: "short",
																	day: "numeric",
																}
															)}
														</Badge>
													</TableCell>
													<TableCell>
														<Select
															value={
																artist.performance_date ||
																""
															}
															onValueChange={(
																value
															) =>
																assignPerformanceDate(
																	artist.id,
																	value
																)
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Change date" />
															</SelectTrigger>
															<SelectContent>
																{event?.show_dates?.map(
																	(date) => (
																		<SelectItem
																			key={
																				date
																			}
																			value={
																				date
																			}
																		>
																			{new Date(
																				date
																			).toLocaleDateString(
																				"en-US",
																				{
																					weekday:
																						"short",
																					month: "short",
																					day: "numeric",
																				}
																			)}
																		</SelectItem>
																	)
																)}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	viewArtistDetails(
																		artist.id
																	)
																}
																className="flex items-center gap-1"
															>
																<Eye className="h-3 w-3" />
																View
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	openStatusDialog(
																		artist
																	)
																}
																className="flex items-center gap-1"
															>
																<UserCheck className="h-3 w-3" />
																Status
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	assignPerformanceDate(
																		artist.id,
																		null
																	)
																}
																className="flex items-center gap-1"
															>
																<X className="h-3 w-3" />
																Unassign
															</Button>
															<AlertDialog>
																<AlertDialogTrigger
																	asChild
																>
																	<Button
																		variant="outline"
																		size="sm"
																		className="flex items-center gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
																	>
																		<Trash2 className="h-3 w-3" />
																		Delete
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Delete
																			Artist
																			Profile
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			Are
																			you
																			sure
																			you
																			want
																			to
																			delete{" "}
																			{
																				artist.artist_name
																			}
																			's
																			profile?
																			This
																			action
																			cannot
																			be
																			undone
																			and
																			they
																			will
																			need
																			to
																			register
																			again.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<AlertDialogAction
																			onClick={() =>
																				deleteArtist(
																					artist.id
																				)
																			}
																			className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																		>
																			Delete
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						{/* Submitted Artists - Not Yet Assigned */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<UserCheck className="h-5 w-5" />
									Submitted Applications
								</CardTitle>
								<CardDescription>
									Artists who have submitted their information
									but haven't been assigned a performance date
								</CardDescription>
							</CardHeader>
							<CardContent>
								{submittedArtists.length === 0 ? (
									<p className="text-muted-foreground text-center py-4">
										No pending artist submissions
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Artist</TableHead>
												<TableHead>Style</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Duration</TableHead>
												<TableHead>
													Assign Date
												</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{submittedArtists.map((artist) => (
												<TableRow key={artist.id}>
													<TableCell>
														<div>
															<p className="font-medium">
																{
																	artist.artist_name
																}
															</p>
															<p className="text-sm text-muted-foreground">
																{
																	artist.real_name
																}
															</p>
															<p className="text-xs text-muted-foreground">
																{artist.email}
															</p>
														</div>
													</TableCell>
													<TableCell>
														{artist.style}
													</TableCell>
													<TableCell>
														<ArtistStatusBadge
															status={
																artist.status
															}
														/>
													</TableCell>
													<TableCell>
														{formatDuration(
															artist.actual_duration ??
																null
														)}
													</TableCell>
													<TableCell>
														<Select
															onValueChange={(
																value
															) =>
																assignPerformanceDate(
																	artist.id,
																	value
																)
															}
														>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Assign date" />
															</SelectTrigger>
															<SelectContent>
																{event?.show_dates?.map(
																	(date) => (
																		<SelectItem
																			key={
																				date
																			}
																			value={
																				date
																			}
																		>
																			{new Date(
																				date
																			).toLocaleDateString(
																				"en-US",
																				{
																					weekday:
																						"short",
																					month: "short",
																					day: "numeric",
																				}
																			)}
																		</SelectItem>
																	)
																)}
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell>
														<div className="flex items-center gap-2">
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	viewArtistDetails(
																		artist.id
																	)
																}
																className="flex items-center gap-1"
															>
																<Eye className="h-3 w-3" />
																View
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() =>
																	openStatusDialog(
																		artist
																	)
																}
																className="flex items-center gap-1"
															>
																<UserCheck className="h-3 w-3" />
																Status
															</Button>
															<AlertDialog>
																<AlertDialogTrigger
																	asChild
																>
																	<Button
																		variant="outline"
																		size="sm"
																		className="flex items-center gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
																	>
																		<Trash2 className="h-3 w-3" />
																		Delete
																	</Button>
																</AlertDialogTrigger>
																<AlertDialogContent>
																	<AlertDialogHeader>
																		<AlertDialogTitle>
																			Delete
																			Artist
																			Profile
																		</AlertDialogTitle>
																		<AlertDialogDescription>
																			Are
																			you
																			sure
																			you
																			want
																			to
																			delete{" "}
																			{
																				artist.artist_name
																			}
																			's
																			profile?
																			This
																			action
																			cannot
																			be
																			undone
																			and
																			they
																			will
																			need
																			to
																			register
																			again.
																		</AlertDialogDescription>
																	</AlertDialogHeader>
																	<AlertDialogFooter>
																		<AlertDialogCancel>
																			Cancel
																		</AlertDialogCancel>
																		<AlertDialogAction
																			onClick={() =>
																				deleteArtist(
																					artist.id
																				)
																			}
																			className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																		>
																			Delete
																		</AlertDialogAction>
																	</AlertDialogFooter>
																</AlertDialogContent>
															</AlertDialog>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</div>
				</main>

				{/* Artist Status Management Dialog */}
				{statusArtist && (
					<ArtistStatusDialog
						open={isStatusDialogOpen}
						onOpenChange={setIsStatusDialogOpen}
						artistId={statusArtist.id}
						artistName={statusArtist.artist_name}
						eventId={eventId}
						currentStatus={statusArtist.status}
						onStatusUpdated={handleStatusUpdated}
					/>
				)}
			</div>
		</NotificationProvider>
	);
}
