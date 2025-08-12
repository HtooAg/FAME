"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ArrowLeft,
	User,
	Music,
	Image,
	Calendar,
	Phone,
	Mail,
	Globe,
	Instagram,
	Facebook,
	Youtube,
	Edit,
	Download,
	Play,
	Pause,
	Palette,
	Navigation,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ArtistProfile {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	performanceDuration: number;
	biography: string;
	costumeColor: string;
	customCostumeColor: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition: string;
	socialMedia: {
		instagram: string;
		facebook: string;
		youtube: string;
		tiktok: string;
		website: string;
	};
	mcNotes: string;
	stageManagerNotes: string;
	showLink: string;
	musicTracks: Array<{
		song_title: string;
		duration: number;
		notes: string;
		is_main_track: boolean;
		tempo: string;
		file_url: string;
	}>;
	galleryFiles: Array<{
		url: string;
		type: "image" | "video";
		name: string;
	}>;
	eventName: string;
	eventId: string;
	status: string;
	createdAt: string;
}

// Helper function to get color style
const getColorStyle = (colorValue: string) => {
	const colorMap: { [key: string]: string } = {
		red: "#ff0000",
		blue: "#0000ff",
		green: "#00ff00",
		amber: "#ffbf00",
		magenta: "#ff00ff",
		cyan: "#00ffff",
		purple: "#800080",
		yellow: "#ffff00",
		white: "#ffffff",
		"warm-white": "#fff8dc",
		"cold-blue": "#add8e6",
		uv: "#9400d3",
		rose: "#ff69b4",
		orange: "#ffa500",
		pink: "#ffc0cb",
		teal: "#008080",
		lavender: "#e6e6fa",
		gold: "#ffd700",
		turquoise: "#40e0d0",
		black: "#000000",
		silver: "#c0c0c0",
		trust: "#888888",
	};
	return colorMap[colorValue] || "#888888";
};

// Helper function to format duration
const formatDuration = (seconds: number) => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function ArtistDashboard() {
	const router = useRouter();
	const { toast } = useToast();
	const [profile, setProfile] = useState<ArtistProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(
		null
	);

	useEffect(() => {
		fetchArtistProfile();
	}, []);

	const fetchArtistProfile = async () => {
		try {
			// Get artist ID from URL parameters
			const urlParams = new URLSearchParams(window.location.search);
			const artistId = urlParams.get("artistId");

			if (artistId) {
				// Redirect to ID-based route
				router.replace(`/artist-dashboard/${artistId}`);
				return;
			} else {
				// If no artistId provided, try to get the latest artist profile
				const response = await fetch("/api/artists/profile");
				if (response.ok) {
					const data = await response.json();
					if (data && data.id) {
						// Redirect to ID-based route with the found artist ID
						router.replace(`/artist-dashboard/${data.id}`);
						return;
					}
					setProfile(data);
				} else {
					throw new Error("Failed to fetch profile");
				}
			}
		} catch (error) {
			console.error("Error fetching profile:", error);
			toast({
				title: "Error",
				description:
					"Failed to load your profile. Please try logging in again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handlePlayPause = (trackUrl: string) => {
		if (currentlyPlaying === trackUrl) {
			setCurrentlyPlaying(null);
		} else {
			setCurrentlyPlaying(trackUrl);
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "approved":
				return "default";
			case "pending":
				return "secondary";
			case "active":
				return "default";
			default:
				return "outline";
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading your dashboard...
					</p>
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">
						No Profile Found
					</h2>
					<p className="text-muted-foreground mb-4">
						You haven't registered for any events yet, or your
						profile could not be found.
					</p>
					<div className="space-x-2">
						<Button onClick={() => router.push("/")}>
							Browse Events
						</Button>
						<Button
							variant="outline"
							onClick={() => router.push("/login")}
						>
							Login
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<NotificationProvider userRole="artist">
			<div className="min-h-screen bg-background">
				<header className="border-b border-border">
					<div className="container mx-auto px-4 py-4">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-2xl font-bold text-foreground">
									Artist Dashboard
								</h1>
								<p className="text-muted-foreground">
									Welcome back, {profile.artistName}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Badge
									variant={getStatusBadgeVariant(
										profile.status
									)}
								>
									{profile.status.charAt(0).toUpperCase() +
										profile.status.slice(1)}
								</Badge>
								<NotificationBell />
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										const url = `/api/artists/export?artistId=${profile.id}`;
										window.open(url, "_blank");
									}}
								>
									<Download className="h-4 w-4 mr-2" />
									Export Data
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										router.push(
											`/artist-register/${profile.eventId}?artistId=${profile.id}`
										)
									}
								>
									<Edit className="h-4 w-4 mr-2" />
									Edit Profile
								</Button>
							</div>
						</div>
					</div>
				</header>

				<main className="container mx-auto px-4 py-8 max-w-6xl">
					<Tabs defaultValue="overview" className="w-full">
						<TabsList className="grid w-full grid-cols-5">
							<TabsTrigger value="overview">Overview</TabsTrigger>
							<TabsTrigger value="music">Music</TabsTrigger>
							<TabsTrigger value="technical">
								Technical
							</TabsTrigger>
							<TabsTrigger value="gallery">Gallery</TabsTrigger>
							<TabsTrigger value="event">
								Event Details
							</TabsTrigger>
						</TabsList>

						{/* Overview Tab */}
						<TabsContent value="overview" className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Basic Information */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<User className="h-5 w-5" />
											Basic Information
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<p className="text-sm text-muted-foreground">
												Artist Name
											</p>
											<p className="font-medium">
												{profile.artistName}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Real Name
											</p>
											<p className="font-medium">
												{profile.realName}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">
												{profile.email}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm">
												{profile.phone}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Performance Style
											</p>
											<p className="font-medium">
												{profile.style}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Performance Type
											</p>
											<p className="font-medium">
												{profile.performanceType}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Duration
											</p>
											<p className="font-medium">
												{profile.performanceDuration}{" "}
												minutes
											</p>
										</div>
									</CardContent>
								</Card>

								{/* Biography */}
								<Card>
									<CardHeader>
										<CardTitle>Biography</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm leading-relaxed">
											{profile.biography}
										</p>
									</CardContent>
								</Card>
							</div>

							{/* Social Media Links */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Globe className="h-5 w-5" />
										Social Media & Links
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
										{profile.socialMedia.instagram && (
											<a
												href={
													profile.socialMedia
														.instagram
												}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
											>
												<Instagram className="h-4 w-4 text-pink-600" />
												<span className="text-sm">
													Instagram
												</span>
											</a>
										)}
										{profile.socialMedia.facebook && (
											<a
												href={
													profile.socialMedia.facebook
												}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
											>
												<Facebook className="h-4 w-4 text-blue-600" />
												<span className="text-sm">
													Facebook
												</span>
											</a>
										)}
										{profile.socialMedia.youtube && (
											<a
												href={
													profile.socialMedia.youtube
												}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
											>
												<Youtube className="h-4 w-4 text-red-600" />
												<span className="text-sm">
													YouTube
												</span>
											</a>
										)}
										{profile.socialMedia.website && (
											<a
												href={
													profile.socialMedia.website
												}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
											>
												<Globe className="h-4 w-4 text-green-600" />
												<span className="text-sm">
													Website
												</span>
											</a>
										)}
										{profile.showLink && (
											<a
												href={profile.showLink}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted transition-colors"
											>
												<Play className="h-4 w-4 text-purple-600" />
												<span className="text-sm">
													Demo Video
												</span>
											</a>
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Music Tab */}
						<TabsContent value="music" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Music className="h-5 w-5" />
										Music Tracks
									</CardTitle>
									<CardDescription>
										Your uploaded music tracks for the
										performance
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{profile.musicTracks.map(
											(track, index) => (
												<div
													key={index}
													className="border rounded-lg p-4 space-y-3"
												>
													<div className="flex items-center justify-between">
														<div>
															<h4 className="font-medium">
																{
																	track.song_title
																}
															</h4>
															<p className="text-sm text-muted-foreground">
																Duration:{" "}
																{formatDuration(
																	track.duration
																)}{" "}
																• Tempo:{" "}
																{track.tempo}
															</p>
														</div>
														<div className="flex items-center gap-2">
															{track.is_main_track && (
																<Badge variant="secondary">
																	Main Track
																</Badge>
															)}
															{track.file_url && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		handlePlayPause(
																			track.file_url
																		)
																	}
																>
																	{currentlyPlaying ===
																	track.file_url ? (
																		<Pause className="h-4 w-4" />
																	) : (
																		<Play className="h-4 w-4" />
																	)}
																</Button>
															)}
														</div>
													</div>
													{track.notes && (
														<div>
															<p className="text-sm text-muted-foreground">
																DJ Notes:
															</p>
															<p className="text-sm">
																{track.notes}
															</p>
														</div>
													)}
													{track.file_url &&
														currentlyPlaying ===
															track.file_url && (
															<audio
																controls
																autoPlay
																className="w-full"
																onEnded={() =>
																	setCurrentlyPlaying(
																		null
																	)
																}
															>
																<source
																	src={
																		track.file_url
																	}
																	type="audio/mpeg"
																/>
																Your browser
																does not support
																the audio
																element.
															</audio>
														)}
												</div>
											)
										)}
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						{/* Technical Tab */}
						<TabsContent value="technical" className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Costume & Lighting */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Palette className="h-5 w-5" />
											Costume & Lighting
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<p className="text-sm text-muted-foreground">
												Costume Color
											</p>
											<div className="flex items-center gap-2">
												<div
													className="w-6 h-6 rounded border-2 border-muted-foreground/20"
													style={{
														backgroundColor:
															getColorStyle(
																profile.costumeColor
															),
													}}
												></div>
												<p className="font-medium capitalize">
													{profile.costumeColor}
												</p>
											</div>
											{profile.customCostumeColor && (
												<p className="text-sm text-muted-foreground mt-1">
													Custom:{" "}
													{profile.customCostumeColor}
												</p>
											)}
										</div>
										<div>
											<p className="text-sm text-muted-foreground mb-2">
												Lighting Colors
											</p>
											<div className="space-y-2">
												<div className="flex items-center gap-2">
													<div
														className="w-4 h-4 rounded border border-muted-foreground/20"
														style={{
															backgroundColor:
																getColorStyle(
																	profile.lightColorSingle
																),
														}}
													></div>
													<span className="text-sm">
														Primary:{" "}
														{
															profile.lightColorSingle
														}
													</span>
												</div>
												{profile.lightColorTwo !==
													"none" && (
													<div className="flex items-center gap-2">
														<div
															className="w-4 h-4 rounded border border-muted-foreground/20"
															style={{
																backgroundColor:
																	getColorStyle(
																		profile.lightColorTwo
																	),
															}}
														></div>
														<span className="text-sm">
															Secondary:{" "}
															{
																profile.lightColorTwo
															}
														</span>
													</div>
												)}
												{profile.lightColorThree !==
													"none" && (
													<div className="flex items-center gap-2">
														<div
															className="w-4 h-4 rounded border border-muted-foreground/20"
															style={{
																backgroundColor:
																	getColorStyle(
																		profile.lightColorThree
																	),
															}}
														></div>
														<span className="text-sm">
															Third:{" "}
															{
																profile.lightColorThree
															}
														</span>
													</div>
												)}
											</div>
										</div>
										{profile.lightRequests && (
											<div>
												<p className="text-sm text-muted-foreground">
													Special Lighting Requests
												</p>
												<p className="text-sm">
													{profile.lightRequests}
												</p>
											</div>
										)}
									</CardContent>
								</Card>

								{/* Stage Positioning */}
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Navigation className="h-5 w-5" />
											Stage Positioning
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div>
											<p className="text-sm text-muted-foreground">
												Starting Position
											</p>
											<p className="font-medium capitalize">
												{profile.stagePositionStart.replace(
													"-",
													" "
												)}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Ending Position
											</p>
											<p className="font-medium capitalize">
												{profile.stagePositionEnd.replace(
													"-",
													" "
												)}
											</p>
										</div>
										{profile.customStagePosition && (
											<div>
												<p className="text-sm text-muted-foreground">
													Custom Position Details
												</p>
												<p className="text-sm">
													{
														profile.customStagePosition
													}
												</p>
											</div>
										)}
									</CardContent>
								</Card>
							</div>

							{/* Notes */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Card>
									<CardHeader>
										<CardTitle>MC Notes</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm">
											{profile.mcNotes ||
												"No special notes for MC"}
										</p>
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>
											Stage Manager Notes
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm">
											{profile.stageManagerNotes ||
												"No special notes for stage manager"}
										</p>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						{/* Gallery Tab */}
						<TabsContent value="gallery" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Image className="h-5 w-5" />
										Media Gallery
									</CardTitle>
									<CardDescription>
										Your uploaded images and videos
									</CardDescription>
								</CardHeader>
								<CardContent>
									{profile.galleryFiles.length > 0 ? (
										<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
											{profile.galleryFiles.map(
												(file, index) => (
													<div
														key={index}
														className="relative group"
													>
														<div className="aspect-square rounded-lg overflow-hidden bg-muted">
															{file.type ===
															"image" ? (
																<img
																	src={
																		file.url
																	}
																	alt={
																		file.name
																	}
																	className="w-full h-full object-cover"
																/>
															) : (
																<video
																	src={
																		file.url
																	}
																	className="w-full h-full object-cover"
																	controls
																/>
															)}
														</div>
														<p className="text-xs text-muted-foreground mt-1 truncate">
															{file.name}
														</p>
													</div>
												)
											)}
										</div>
									) : (
										<p className="text-center text-muted-foreground py-8">
											No media files uploaded yet
										</p>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						{/* Event Details Tab */}
						<TabsContent value="event" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5" />
										Event Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div>
										<p className="text-sm text-muted-foreground">
											Event Name
										</p>
										<p className="font-medium text-lg">
											{profile.eventName}
										</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Registration Status
										</p>
										<Badge
											variant={getStatusBadgeVariant(
												profile.status
											)}
											className="mt-1"
										>
											{profile.status
												.charAt(0)
												.toUpperCase() +
												profile.status.slice(1)}
										</Badge>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											Registration Date
										</p>
										<p className="font-medium">
											{new Date(
												profile.createdAt
											).toLocaleDateString("en-US", {
												year: "numeric",
												month: "long",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
									</div>
									<div className="pt-4">
										<Button
											onClick={() =>
												router.push(
													`/artist-register/${profile.eventId}?artistId=${profile.id}`
												)
											}
											className="w-full"
										>
											<Edit className="h-4 w-4 mr-2" />
											Edit Registration
										</Button>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</main>
			</div>
		</NotificationProvider>
	);
}

// Show Order Display Component
function ShowOrderDisplay({
	eventId,
	artistId,
}: {
	eventId: string;
	artistId: string;
}) {
	const [showOrder, setShowOrder] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchShowOrder();
	}, [eventId]);

	const fetchShowOrder = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/show-order`);
			if (response.ok) {
				const data = await response.json();
				setShowOrder(data);
			}
		} catch (error) {
			console.error("Error fetching show order:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Show Order</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="animate-pulse">
						<div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
						<div className="h-4 bg-muted rounded w-1/2"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!showOrder) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Show Order</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						Show order not yet published
					</p>
				</CardContent>
			</Card>
		);
	}

	const artistItem = showOrder.items?.find(
		(item: any) => item.artistId === artistId
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Music className="h-5 w-5" />
					Show Order
				</CardTitle>
			</CardHeader>
			<CardContent>
				{artistItem ? (
					<div className="space-y-4">
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
							<h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
								Your Performance Slot
							</h4>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground">
										Position
									</p>
									<p className="font-medium">
										#{artistItem.position}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">
										Time
									</p>
									<p className="font-medium">
										{artistItem.startTime} -{" "}
										{artistItem.endTime}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">
										Date
									</p>
									<p className="font-medium">
										{new Date(
											showOrder.showDate
										).toLocaleDateString()}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">
										Setup Time
									</p>
									<p className="font-medium">
										{artistItem.setupTime} minutes
									</p>
								</div>
							</div>
						</div>

						<div>
							<h5 className="font-medium mb-2">
								Full Show Order
							</h5>
							<div className="space-y-2">
								{showOrder.items.map((item: any) => (
									<div
										key={item.id}
										className={`p-3 rounded-lg border ${
											item.artistId === artistId
												? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
												: "bg-muted/50"
										}`}
									>
										<div className="flex justify-between items-center">
											<div>
												<p className="font-medium">
													{item.position}.{" "}
													{item.artist.artistName}
													{item.artistId ===
														artistId && " (You)"}
												</p>
												<p className="text-sm text-muted-foreground">
													{item.artist.style}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-medium">
													{item.startTime} -{" "}
													{item.endTime}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				) : (
					<p className="text-muted-foreground">
						You are not currently scheduled in the show order
					</p>
				)}
			</CardContent>
		</Card>
	);
}
