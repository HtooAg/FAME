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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Music,
	Mail,
	Phone,
	Clock,
	CheckCircle,
	AlertCircle,
	ArrowLeft,
	Eye,
	Trash2,
	Plus,
	Users,
	UserCheck,
	Calendar,
	X,
	Copy,
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

interface Event {
	id: string;
	name: string;
	venueName: string;
	showDates: string[];
}

interface ArtistData {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceDuration: number;
	biography: string;
	socialMedia?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		website?: string;
	};
	eventId: string;
	eventName: string;
	status: "pending" | "approved" | "rejected" | "active" | "inactive";
	performanceDate?: string | null;
	createdAt: string;
	lastLogin?: string;
	profileImage?: string;
	musicTracks?: Array<{
		song_title: string;
		duration: number;
		notes: string;
		is_main_track: boolean;
		tempo: string;
		file_url: string;
	}>;
	actualDuration?: number; // Duration from uploaded music in seconds
}

interface NewArtist {
	artistName: string;
	realName: string;
	email: string;
	password: string;
	phone: string;
	style: string;
	performanceDuration: number;
	biography: string;
}

export default function ArtistManagement() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [artists, setArtists] = useState<ArtistData[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedArtist, setSelectedArtist] = useState<ArtistData | null>(
		null
	);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [newArtist, setNewArtist] = useState<NewArtist>({
		artistName: "",
		realName: "",
		email: "",
		password: "",
		phone: "",
		style: "",
		performanceDuration: 15,
		biography: "",
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
			const response = await fetch(`/api/events/${eventId}`);
			if (response.ok) {
				const data = await response.json();
				setEvent(data.event);
			} else {
				throw new Error("Failed to fetch event");
			}
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

				// Process artists to include actual duration from music tracks
				const artistsWithDuration = (data.artists || []).map(
					(artist: ArtistData) => {
						const mainTrack = artist.musicTracks?.find(
							(track) => track.is_main_track
						);
						return {
							...artist,
							actualDuration: mainTrack?.duration || null,
						};
					}
				);

				setArtists(artistsWithDuration);
			} else {
				throw new Error("Failed to fetch artists");
			}
		} catch (error) {
			console.error("Error fetching artists:", error);
			toast({
				title: "Error",
				description: "Failed to load artists data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const initializeWebSocket = () => {
		// Initialize WebSocket connection for real-time artist submissions
		try {
			fetch("/api/websocket").then(() => {
				// WebSocket server initialized
				console.log("WebSocket server initialized for artist updates");
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
						performanceDate,
					}),
				}
			);

			if (response.ok) {
				setArtists(
					artists.map((artist) =>
						artist.id === artistId
							? { ...artist, performanceDate }
							: artist
					)
				);

				toast({
					title: performanceDate
						? "Performance date assigned"
						: "Artist unassigned",
					description: performanceDate
						? "Artist has been assigned to a performance date"
						: "Artist has been moved back to submitted applications",
				});
			} else {
				throw new Error("Failed to update performance date");
			}
		} catch (error) {
			console.error("Error updating performance date:", error);
			toast({
				title: "Error",
				description: "Failed to update performance date",
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
				setArtists(artists.filter((artist) => artist.id !== artistId));
				toast({
					title: "Artist deleted",
					description:
						"Artist profile has been removed. They will need to register again.",
				});
			} else {
				throw new Error("Failed to delete artist");
			}
		} catch (error) {
			console.error("Error deleting artist:", error);
			toast({
				title: "Error",
				description: "Failed to delete artist profile",
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
					...newArtist,
					eventId,
				}),
			});

			if (response.ok) {
				const result = await response.json();

				// Generate login URL with pre-filled email
				const loginUrl = `${window.location.origin}/artist-dashboard/${result.artist.id}`;

				setCreatedCredentials({
					email: newArtist.email,
					password: newArtist.password,
					loginUrl,
				});

				// Reset form
				setNewArtist({
					artistName: "",
					realName: "",
					email: "",
					password: "",
					phone: "",
					style: "",
					performanceDuration: 15,
					biography: "",
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
		} catch (error) {
			console.error("Error creating artist:", error);
			toast({
				title: "Error creating artist",
				description: "Failed to create artist account",
				variant: "destructive",
			});
		}
	};

	// Helper function to format duration
	const formatDuration = (seconds: number | null | undefined) => {
		if (seconds == null) return "N/A";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const copyCredentials = () => {
		if (!createdCredentials) return;

		const credentialsText = `Artist Login Credentials

Name: ${newArtist.artistName}
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

	const submittedArtists = artists.filter((a) => !a.performanceDate);
	const assignedArtists = artists.filter((a) => a.performanceDate);

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
									{event?.name} - {event?.venueName}
								</p>
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
													value={newArtist.artistName}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															artistName:
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
													value={newArtist.realName}
													onChange={(e) =>
														setNewArtist({
															...newArtist,
															realName:
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
												!newArtist.artistName ||
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
																	artist.artistName
																}
															</p>
															<p className="text-sm text-muted-foreground">
																{
																	artist.realName
																}
																</p>
														</div>
													</TableCell>
													<TableCell>
														{artist.style}
													</TableCell>
													<TableCell>
														{formatDuration(
															artist.actualDuration
														)}
													</TableCell>
													<TableCell>
														<Badge variant="secondary">
															{new Date(
																artist.performanceDate!
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
																artist.performanceDate ||
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
																{event?.showDates?.map(
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
																	router.push(
																		`/artist-dashboard/${artist.id}`
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
																				artist.artistName
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
																	artist.artistName
																}
															</p>
															<p className="text-sm text-muted-foreground">
																{
																	artist.realName
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
														{formatDuration(
															artist.actualDuration
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
																{event?.showDates?.map(
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
																	router.push(
																		`/artist-dashboard/${artist.id}`
																	)
																}
																className="flex items-center gap-1"
															>
																<Eye className="h-3 w-3" />
																View
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
																				artist.artistName
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
			</div>
		</NotificationProvider>
	);
}
