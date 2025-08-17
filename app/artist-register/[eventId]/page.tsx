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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	ArrowLeft,
	Upload,
	Music,
	Image,
	User,
	Lightbulb,
	FileText,
	CheckCircle,
	Plus,
} from "lucide-react";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { validateMediaFile } from "@/lib/media-validation";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";

interface Event {
	id: string;
	name: string;
	venue: string;
	start_date: string;
	end_date: string;
}

// Helper function to get color for preview
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
	};
	return colorMap[colorValue] || "#888888";
};
// Helper function to get gradient style for multiple colors
const getGradientStyle = (colorCombo: string) => {
	const colors = colorCombo.split("-").map((color) => getColorStyle(color));
	if (colors.length === 2) {
		return `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
	} else if (colors.length === 3) {
		return `linear-gradient(90deg, ${colors[0]} 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66%)`;
	}
	return colors[0] || "#888888";
};

function ArtistRegistrationForm() {
	const { eventId } = useParams();
	const router = useRouter();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [existingProfile, setExistingProfile] = useState<any>(null);
	const { toast } = useToast();

	const [artistData, setArtistData] = useState({
		artist_name: "",
		real_name: "",
		email: "",
		phone: "",
		style: "",
		performance_type: "",
		biography: "",
		notes: "",
		props_needed: "",
		performance_duration: 5,
		costume_color: "",
		custom_costume_color: "",
		light_color_single: "trust",
		light_color_two: "none",
		light_color_three: "none",
		light_requests: "",
		show_link: "",
		stage_position_start: "",
		stage_position_end: "",
		custom_stage_position: "",
		mc_notes: "",
		stage_manager_notes: "",
		instagram_link: "",
		facebook_link: "",
		tiktok_link: "",
		youtube_link: "",
		website_link: "",
	});

	const [musicTracks, setMusicTracks] = useState([
		{
			song_title: "",
			duration: 0,
			notes: "",
			is_main_track: true,
			tempo: "",
			file_url: "",
			file_path: "",
		},
	]);

	const [galleryFiles, setGalleryFiles] = useState<
		{
			url: string;
			type: "image" | "video";
			name: string;
			file_path?: string;
			size?: number;
			uploadedAt?: string;
			contentType?: string;
		}[]
	>([]);
	const [showSuccessDialog, setShowSuccessDialog] = useState(false);
	const [registeredArtistId, setRegisteredArtistId] = useState<string | null>(
		null
	);

	useEffect(() => {
		if (eventId) {
			fetchEvent();
			fetchExistingProfile();
		}
	}, [eventId]);

	const fetchEvent = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}`);
			if (response.ok) {
				const data = await response.json();
				setEvent(data.data || data);
			} else {
				throw new Error("Failed to fetch event");
			}
		} catch (error) {
			toast({
				title: "Error fetching event",
				description: "Failed to load event details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchExistingProfile = async () => {
		try {
			// Check if there's an existing profile for this event
			const urlParams = new URLSearchParams(window.location.search);
			const artistId = urlParams.get("artistId");

			if (artistId) {
				// Editing existing profile
				const response = await fetch(
					`/api/events/${eventId}/artists/${artistId}`
				);
				if (response.ok) {
					const data = await response.json();
					if (data.artist) {
						setExistingProfile(data.artist);
						// Pre-fill form with existing data for editing
						setArtistData({
							artist_name: data.artist.artistName || "",
							real_name: data.artist.realName || "",
							email: data.artist.email || "",
							phone: data.artist.phone || "",
							style: data.artist.style || "",
							performance_type: data.artist.performanceType || "",
							biography: data.artist.biography || "",
							notes: data.artist.notes || "",
							props_needed: data.artist.equipment || "",
							performance_duration:
								data.artist.performanceDuration || 5,
							costume_color: data.artist.costumeColor || "",
							custom_costume_color:
								data.artist.customCostumeColor || "",
							light_color_single:
								data.artist.lightColorSingle || "trust",
							light_color_two:
								data.artist.lightColorTwo || "none",
							light_color_three:
								data.artist.lightColorThree || "none",
							light_requests: data.artist.lightRequests || "",
							show_link: data.artist.showLink || "",
							stage_position_start:
								data.artist.stagePositionStart || "",
							stage_position_end:
								data.artist.stagePositionEnd || "",
							custom_stage_position:
								data.artist.customStagePosition || "",
							mc_notes: data.artist.mcNotes || "",
							stage_manager_notes:
								data.artist.stageManagerNotes || "",
							instagram_link:
								data.artist.socialMedia?.instagram || "",
							facebook_link:
								data.artist.socialMedia?.facebook || "",
							tiktok_link: data.artist.socialMedia?.tiktok || "",
							youtube_link:
								data.artist.socialMedia?.youtube || "",
							website_link:
								data.artist.socialMedia?.website || "",
						});

						if (data.artist.musicTracks) {
							setMusicTracks(data.artist.musicTracks);
						}

						if (data.artist.galleryFiles) {
							setGalleryFiles(data.artist.galleryFiles);
						}
					}
				}
			}
			// If no artistId, form stays empty for new registration
		} catch (error) {
			console.error("Error fetching existing profile:", error);
		}
	};

	const handleInputChange = (field: string, value: string | number) => {
		setArtistData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const addMusicTrack = () => {
		setMusicTracks((prev) => [
			...prev,
			{
				song_title: "",
				duration: 0,
				notes: "",
				is_main_track: false,
				tempo: "",
				file_url: "",
				file_path: "",
			},
		]);
	};

	const updateMusicTrack = (
		index: number,
		field: string,
		value: string | number | boolean
	) => {
		setMusicTracks((prev) =>
			prev.map((track, i) =>
				i === index ? { ...track, [field]: value } : track
			)
		);
	};

	const removeMusicTrack = (index: number) => {
		if (musicTracks.length > 1) {
			setMusicTracks((prev) => prev.filter((_, i) => i !== index));
		}
	};
	const handleMusicUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = e.target.files;
		if (!files) return;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			// Validate file before upload
			const validation = validateMediaFile(
				{
					name: file.name,
					size: file.size,
					type: file.type,
				},
				"audio"
			);

			if (!validation.isValid) {
				toast({
					title: "Invalid file",
					description: validation.error,
					variant: "destructive",
				});
				continue;
			}

			// Get corresponding track for this file
			const trackIndex = Math.min(i, musicTracks.length - 1);
			const track = musicTracks[trackIndex];

			// Detect audio duration automatically
			const detectDuration = (file: File): Promise<number> => {
				return new Promise((resolve) => {
					const audio = new Audio();
					const url = URL.createObjectURL(file);
					audio.addEventListener("loadedmetadata", () => {
						const durationInSeconds = Math.round(audio.duration);
						URL.revokeObjectURL(url);
						resolve(durationInSeconds);
					});
					audio.addEventListener("error", () => {
						URL.revokeObjectURL(url);
						resolve(0); // Default to 0 if detection fails
					});
					audio.src = url;
				});
			};

			try {
				// Detect duration before upload
				const duration = await detectDuration(file);

				// Upload to Google Cloud Storage
				const uploadFormData = new FormData();
				uploadFormData.append("file", file);
				uploadFormData.append(
					"eventId",
					Array.isArray(eventId) ? eventId[0] : eventId
				);
				uploadFormData.append(
					"artistId",
					registeredArtistId ||
						new URLSearchParams(window.location.search).get(
							"artistId"
						) ||
						artistData.artist_name.replace(/[^a-zA-Z0-9]/g, "_") ||
						"temp"
				);
				uploadFormData.append("fileType", "music");

				const uploadResponse = await fetch("/api/gcs/upload", {
					method: "POST",
					body: uploadFormData,
				});

				if (!uploadResponse.ok) {
					const errorData = await uploadResponse
						.json()
						.catch(() => ({}));
					throw new Error(
						errorData.error ||
							`Music upload failed with status ${uploadResponse.status}`
					);
				}

				const uploadResult = await uploadResponse.json();
				console.log("Music upload result:", uploadResult);

				setMusicTracks((prev) =>
					prev.map((track, index) =>
						index === trackIndex
							? {
									...track,
									file_url: uploadResult.url,
									file_path: uploadResult.fileName,
									duration: duration,
									uploadedAt: new Date().toISOString(),
									fileSize: file.size,
									contentType: file.type,
							  }
							: track
					)
				);

				const minutes = Math.floor(duration / 60);
				const seconds = duration % 60;
				toast({
					title: "Upload successful",
					description: `${
						file.name
					} uploaded successfully - Duration: ${minutes}:${seconds
						.toString()
						.padStart(2, "0")}`,
				});
			} catch (error) {
				console.error("Upload error:", error);
				toast({
					title: "Upload failed",
					description: `Failed to upload ${file.name}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
					variant: "destructive",
				});
			}
		}
	};

	const handleDeleteMusic = async (index: number) => {
		const track = musicTracks[index];
		if (!track.file_url) return;

		try {
			// Remove file_url from track
			setMusicTracks((prev) =>
				prev.map((track, i) =>
					i === index ? { ...track, file_url: "" } : track
				)
			);

			toast({
				title: "File deleted",
				description: "Music file has been removed successfully",
			});
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Delete failed",
				description: "Failed to delete the music file",
				variant: "destructive",
			});
		}
	};

	const handleGalleryUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = e.target.files;
		if (!files) return;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			// Validate file before upload
			const mediaType = file.type.startsWith("image/")
				? "image"
				: "video";
			const validation = validateMediaFile(
				{
					name: file.name,
					size: file.size,
					type: file.type,
				},
				mediaType
			);

			if (!validation.isValid) {
				toast({
					title: "Invalid file",
					description: validation.error,
					variant: "destructive",
				});
				continue;
			}

			try {
				// Upload to Google Cloud Storage
				const formData = new FormData();
				formData.append("file", file);
				formData.append(
					"eventId",
					Array.isArray(eventId) ? eventId[0] : eventId
				);
				formData.append(
					"artistId",
					registeredArtistId ||
						new URLSearchParams(window.location.search).get(
							"artistId"
						) ||
						artistData.artist_name.replace(/[^a-zA-Z0-9]/g, "_") ||
						"temp"
				);
				formData.append(
					"fileType",
					file.type.startsWith("image/") ? "images" : "videos"
				);

				const uploadResponse = await fetch("/api/gcs/upload", {
					method: "POST",
					body: formData,
				});

				if (!uploadResponse.ok) {
					const errorData = await uploadResponse
						.json()
						.catch(() => ({}));
					throw new Error(
						errorData.error ||
							`Gallery upload failed with status ${uploadResponse.status}`
					);
				}

				const uploadResult = await uploadResponse.json();
				console.log("Gallery upload result:", uploadResult);

				const fileType = file.type.startsWith("image/")
					? "image"
					: "video";

				setGalleryFiles((prev) => [
					...prev,
					{
						url: uploadResult.url,
						file_url: uploadResult.url,
						file_path: uploadResult.fileName,
						type: fileType,
						name: file.name,
						size: file.size,
						uploadedAt: new Date().toISOString(),
						contentType: file.type,
					},
				]);

				toast({
					title: "Upload successful",
					description: `${file.name} uploaded successfully`,
				});
			} catch (error) {
				console.error("Upload error:", error);
				toast({
					title: "Upload failed",
					description: `Failed to upload ${file.name}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
					variant: "destructive",
				});
			}
		}
	};

	const handleDeleteGalleryFile = async (index: number) => {
		try {
			setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
			toast({
				title: "File deleted",
				description: "Gallery file has been removed successfully",
			});
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Delete failed",
				description: "Failed to delete the gallery file",
				variant: "destructive",
			});
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate required fields
		if (!artistData.artist_name.trim()) {
			toast({
				title: "Validation Error",
				description: "Artist/Stage Name is required",
				variant: "destructive",
			});
			return;
		}

		if (!artistData.costume_color) {
			toast({
				title: "Validation Error",
				description: "Costume Color is required",
				variant: "destructive",
			});
			return;
		}

		// Validate that at least one music track has a song title
		const validTracks = musicTracks.filter((track) =>
			track.song_title.trim()
		);
		if (validTracks.length === 0) {
			toast({
				title: "Validation Error",
				description: "At least one track with a song title is required",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);

		try {
			console.log("Submitting artist data:", artistData);
			console.log("Music tracks:", validTracks);
			console.log("Gallery files:", galleryFiles);

			const urlParams = new URLSearchParams(window.location.search);
			const artistId = urlParams.get("artistId");

			let response;

			if (existingProfile && artistId) {
				// Update existing artist
				response = await fetch(
					`/api/events/${eventId}/artists/${artistId}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							artistName: artistData.artist_name,
							realName: artistData.real_name,
							email: artistData.email,
							phone: artistData.phone,
							style: artistData.style,
							performanceType: artistData.performance_type,
							performanceDuration:
								artistData.performance_duration,
							biography: artistData.biography,
							costumeColor: artistData.costume_color,
							customCostumeColor: artistData.custom_costume_color,
							lightColorSingle: artistData.light_color_single,
							lightColorTwo: artistData.light_color_two,
							lightColorThree: artistData.light_color_three,
							lightRequests: artistData.light_requests,
							stagePositionStart: artistData.stage_position_start,
							stagePositionEnd: artistData.stage_position_end,
							customStagePosition:
								artistData.custom_stage_position,
							equipment: artistData.props_needed,
							showLink: artistData.show_link,
							socialMedia: {
								instagram: artistData.instagram_link,
								facebook: artistData.facebook_link,
								youtube: artistData.youtube_link,
								tiktok: artistData.tiktok_link,
								website: artistData.website_link,
							},
							mcNotes: artistData.mc_notes,
							stageManagerNotes: artistData.stage_manager_notes,
							notes: artistData.notes,
							eventName: event?.name || "",
							musicTracks: validTracks,
							galleryFiles: galleryFiles,
						}),
					}
				);
			} else {
				// Create new artist
				response = await fetch(`/api/events/${eventId}/artists`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistName: artistData.artist_name,
						realName: artistData.real_name,
						email: artistData.email,
						phone: artistData.phone,
						style: artistData.style,
						performanceType: artistData.performance_type,
						performanceDuration: artistData.performance_duration,
						biography: artistData.biography,
						costumeColor: artistData.costume_color,
						customCostumeColor: artistData.custom_costume_color,
						lightColorSingle: artistData.light_color_single,
						lightColorTwo: artistData.light_color_two,
						lightColorThree: artistData.light_color_three,
						lightRequests: artistData.light_requests,
						stagePositionStart: artistData.stage_position_start,
						stagePositionEnd: artistData.stage_position_end,
						customStagePosition: artistData.custom_stage_position,
						equipment: artistData.props_needed,
						showLink: artistData.show_link,
						socialMedia: {
							instagram: artistData.instagram_link,
							facebook: artistData.facebook_link,
							youtube: artistData.youtube_link,
							tiktok: artistData.tiktok_link,
							website: artistData.website_link,
						},
						mcNotes: artistData.mc_notes,
						stageManagerNotes: artistData.stage_manager_notes,
						notes: artistData.notes,
						eventName: event?.name || "",
						musicTracks: validTracks,
						galleryFiles: galleryFiles,
					}),
				});
			}

			if (response.ok) {
				const result = await response.json();
				console.log("Registration result:", result);

				// Store the artist ID for redirect
				const artistId =
					result.data?.id || result.artist?.id || result.id;
				if (artistId) {
					setRegisteredArtistId(artistId);
					// Update the URL to include the artist ID
					const newUrl = `${window.location.pathname}?artistId=${artistId}`;
					window.history.replaceState({}, "", newUrl);
				}

				setShowSuccessDialog(true);
			} else {
				const errorData = await response.json();
				throw new Error(
					errorData.error?.message || "Registration failed"
				);
			}
		} catch (error) {
			console.error("Full error:", error);
			toast({
				title: existingProfile
					? "Update failed"
					: "Registration failed",
				description: `Failed to ${
					existingProfile ? "update" : "register"
				} artist. Please try again.`,
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
					<p className="mt-2 text-muted-foreground">
						Loading event...
					</p>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">
						Event not found
					</h2>
					<Button onClick={() => router.push("/")}>
						Back to Home
					</Button>
				</div>
			</div>
		);
	}
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4">
						{/* <Button
							variant="outline"
							size="sm"
							onClick={() => router.back()}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Home
						</Button> */}
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								{existingProfile
									? "Edit Artist Profile"
									: "Artist Registration"}
							</h1>
							<p className="text-muted-foreground">
								{event.name} - {event.venue}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8 max-w-4xl">
				<form onSubmit={handleSubmit} className="space-y-8">
					<Accordion
						type="single"
						defaultValue="basic-info"
						collapsible
						className="w-full"
					>
						{/* 1. Basic Information */}
						<AccordionItem value="basic-info">
							<AccordionTrigger className="text-lg font-semibold">
								<div className="flex items-center gap-2">
									<User className="h-5 w-5" />
									Basic Information
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<Card>
									<CardContent className="space-y-4 pt-6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="artist_name">
													Artist/Stage Name *
												</Label>
												<Input
													id="artist_name"
													value={
														artistData.artist_name
													}
													onChange={(e) =>
														handleInputChange(
															"artist_name",
															e.target.value
														)
													}
													placeholder="Enter your stage name"
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="real_name">
													Real Name
												</Label>
												<Input
													id="real_name"
													value={artistData.real_name}
													onChange={(e) =>
														handleInputChange(
															"real_name",
															e.target.value
														)
													}
													placeholder="Enter your real name"
												/>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="email">
													Email
												</Label>
												<Input
													id="email"
													type="email"
													value={artistData.email}
													onChange={(e) =>
														handleInputChange(
															"email",
															e.target.value
														)
													}
													placeholder="Enter your email"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="phone">
													Phone
												</Label>
												<Input
													id="phone"
													value={artistData.phone}
													onChange={(e) =>
														handleInputChange(
															"phone",
															e.target.value
														)
													}
													placeholder="Enter your phone number"
												/>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label htmlFor="style">
													Performance Style
												</Label>
												<Input
													id="style"
													value={artistData.style}
													onChange={(e) =>
														handleInputChange(
															"style",
															e.target.value
														)
													}
													placeholder="e.g., Hip-hop, Jazz, Comedy, etc."
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="performance_type">
													Performance Type
												</Label>
												<Select
													value={
														artistData.performance_type
													}
													onValueChange={(value) =>
														handleInputChange(
															"performance_type",
															value
														)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select performance type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="solo">
															Solo Performance
														</SelectItem>
														<SelectItem value="duo">
															Duo
														</SelectItem>
														<SelectItem value="trio">
															Trio
														</SelectItem>
														<SelectItem value="group">
															Group (4+)
														</SelectItem>
														<SelectItem value="band">
															Band
														</SelectItem>
														<SelectItem value="other">
															Other
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="biography">
												Artist Biography
											</Label>
											<Textarea
												id="biography"
												value={artistData.biography}
												onChange={(e) =>
													handleInputChange(
														"biography",
														e.target.value
													)
												}
												placeholder="Tell us about yourself and your performance"
												className="min-h-[100px]"
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* 2. Music Information */}
						<AccordionItem value="music-info">
							<AccordionTrigger className="text-lg font-semibold">
								<div className="flex items-center gap-2">
									<Music className="h-5 w-5" />
									Music Information
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<Card>
									<CardContent className="space-y-4 pt-6">
										<div className="space-y-4">
											<div>
												<Label className="text-base font-medium">
													Performance Tracks
												</Label>
											</div>
											<div className="space-y-4">
												{musicTracks.map(
													(track, index) => (
														<div
															key={index}
															className="border rounded-lg p-4 space-y-4"
														>
															<div className="flex justify-between items-center">
																<h4 className="font-medium">
																	Track{" "}
																	{index + 1}
																</h4>
																{musicTracks.length >
																	1 && (
																	<Button
																		type="button"
																		onClick={() =>
																			removeMusicTrack(
																				index
																			)
																		}
																		variant="destructive"
																		size="sm"
																	>
																		Remove
																	</Button>
																)}
															</div>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																<div className="space-y-2">
																	<Label>
																		Song
																		Title
																	</Label>
																	<Input
																		value={
																			track.song_title
																		}
																		onChange={(
																			e
																		) =>
																			updateMusicTrack(
																				index,
																				"song_title",
																				e
																					.target
																					.value
																			)
																		}
																		placeholder="Enter song title"
																	/>
																</div>
																<div className="space-y-2">
																	<Label>
																		Duration
																		(mm:ss)
																	</Label>
																	<Input
																		type="text"
																		value={
																			track.duration
																				? `${Math.floor(
																						track.duration /
																							60
																				  )}:${(
																						track.duration %
																						60
																				  )
																						.toString()
																						.padStart(
																							2,
																							"0"
																						)}`
																				: "0:00"
																		}
																		readOnly
																		placeholder="Auto-detected from upload"
																		className="bg-muted cursor-not-allowed"
																	/>
																</div>
															</div>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																<div className="space-y-2">
																	<Label>
																		What is
																		the
																		tempo of
																		your
																		show?
																	</Label>
																	<Select
																		value={
																			track.tempo
																		}
																		onValueChange={(
																			value
																		) =>
																			updateMusicTrack(
																				index,
																				"tempo",
																				value
																			)
																		}
																	>
																		<SelectTrigger>
																			<SelectValue placeholder="Select tempo" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value="slow">
																				Slow
																			</SelectItem>
																			<SelectItem value="medium">
																				Medium
																			</SelectItem>
																			<SelectItem value="fast">
																				Fast
																			</SelectItem>
																		</SelectContent>
																	</Select>
																</div>
															</div>
															<div className="space-y-2">
																<Label>
																	Notes for
																	the DJ
																</Label>
																<Textarea
																	value={
																		track.notes
																	}
																	onChange={(
																		e
																	) =>
																		updateMusicTrack(
																			index,
																			"notes",
																			e
																				.target
																				.value
																		)
																	}
																	placeholder="Any special notes about this track"
																	rows={2}
																/>
															</div>
															<div className="flex items-center space-x-2">
																<input
																	type="checkbox"
																	id={`main-track-${index}`}
																	checked={
																		track.is_main_track
																	}
																	onChange={(
																		e
																	) =>
																		updateMusicTrack(
																			index,
																			"is_main_track",
																			e
																				.target
																				.checked
																		)
																	}
																	className="rounded"
																/>
																<Label
																	htmlFor={`main-track-${index}`}
																>
																	NOTE: You
																	are
																	responsible
																	in double
																	checking you
																	have
																	uploaded and
																	send us the
																	right music
																	- always
																	during the
																	show and
																	rehearsal
																	bring a
																	backup
																</Label>
															</div>
															{track.file_url && (
																<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
																	<div className="flex justify-between items-center mb-2">
																		<p className="text-green-800 dark:text-green-200 text-sm">
																			✓ "
																			{
																				track.song_title
																			}
																			" by{" "}
																			{
																				artistData.artist_name
																			}
																		</p>
																		<Button
																			type="button"
																			variant="destructive"
																			size="sm"
																			onClick={() =>
																				handleDeleteMusic(
																					index
																				)
																			}
																			className="h-6 px-2 text-xs"
																		>
																			Delete
																		</Button>
																	</div>
																	<AudioPlayer
																		track={{
																			song_title:
																				track.song_title ||
																				"Unknown Track",
																			duration:
																				track.duration ||
																				0,
																			notes:
																				track.notes ||
																				"",
																			is_main_track:
																				track.is_main_track ||
																				false,
																			tempo:
																				track.tempo ||
																				"medium",
																			file_url:
																				track.file_url,
																			file_path:
																				track.file_path,
																		}}
																		onError={(
																			error
																		) => {
																			console.error(
																				"Audio playback error:",
																				error
																			);
																			toast(
																				{
																					title: "Audio Error",
																					description:
																						"Failed to play audio file. Please check the file format.",
																					variant:
																						"destructive",
																				}
																			);
																		}}
																	/>
																</div>
															)}
														</div>
													)
												)}
											</div>
											<div className="space-y-4">
												<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
													<div className="text-center space-y-2">
														<Upload className="h-8 w-8 mx-auto text-muted-foreground" />
														<Label
															htmlFor="music-upload"
															className="text-sm font-medium cursor-pointer"
														>
															Upload Music Files
														</Label>
														<Input
															id="music-upload"
															type="file"
															multiple
															accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.wma"
															onChange={
																handleMusicUpload
															}
															className="hidden"
														/>
														<p className="text-xs text-muted-foreground">
															Drag and drop or
															click to upload
															audio files (Max
															10MB each)
														</p>
													</div>
												</div>
												{/* <div className="flex justify-center">
													<Button
														type="button"
														variant="outline"
														onClick={addMusicTrack}
														className="flex items-center gap-2"
													>
														<Plus className="h-4 w-4" />
														Add Another Track
													</Button>
												</div> */}
											</div>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>

						{/* 3. Technical Show Director Information */}
						<AccordionItem value="technical-info">
							<AccordionTrigger className="text-lg font-semibold">
								<div className="flex items-center gap-2">
									<Lightbulb className="h-5 w-5" />
									Technical Show Director Information
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<Card>
									<CardContent className="space-y-6 pt-6">
										<div className="space-y-4">
											<div className="space-y-2">
												<Label htmlFor="costume_color">
													Costume Color *
												</Label>
												<Select
													value={
														artistData.costume_color
													}
													onValueChange={(value) =>
														handleInputChange(
															"costume_color",
															value
														)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select your main costume color" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="black">
															Black
														</SelectItem>
														<SelectItem value="white">
															White
														</SelectItem>
														<SelectItem value="red">
															Red
														</SelectItem>
														<SelectItem value="blue">
															Blue
														</SelectItem>
														<SelectItem value="green">
															Green
														</SelectItem>
														<SelectItem value="yellow">
															Yellow
														</SelectItem>
														<SelectItem value="purple">
															Purple
														</SelectItem>
														<SelectItem value="pink">
															Pink
														</SelectItem>
														<SelectItem value="orange">
															Orange
														</SelectItem>
														<SelectItem value="gold">
															Gold
														</SelectItem>
														<SelectItem value="silver">
															Silver
														</SelectItem>
														<SelectItem value="multicolor">
															Multicolor
														</SelectItem>
														<SelectItem value="custom">
															Custom Color
														</SelectItem>
													</SelectContent>
												</Select>
												{artistData.costume_color ===
													"custom" && (
													<div className="space-y-2">
														<Label htmlFor="custom_costume_color">
															Custom Costume Color
														</Label>
														<Input
															id="custom_costume_color"
															value={
																artistData.custom_costume_color
															}
															onChange={(e) =>
																handleInputChange(
																	"custom_costume_color",
																	e.target
																		.value
																)
															}
															placeholder="Describe your custom costume color"
														/>
													</div>
												)}
											</div>
										</div>
										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Lighting Preferences
											</h3>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
												<div className="space-y-2">
													<Label htmlFor="light_color_single">
														Primary Light Color
													</Label>
													<Select
														value={
															artistData.light_color_single
														}
														onValueChange={(
															value
														) =>
															handleInputChange(
																"light_color_single",
																value
															)
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="trust">
																Trust the
																Lighting
																Designer
															</SelectItem>
															<SelectItem value="red">
																Red
															</SelectItem>
															<SelectItem value="blue">
																Blue
															</SelectItem>
															<SelectItem value="green">
																Green
															</SelectItem>
															<SelectItem value="amber">
																Amber
															</SelectItem>
															<SelectItem value="magenta">
																Magenta
															</SelectItem>
															<SelectItem value="cyan">
																Cyan
															</SelectItem>
															<SelectItem value="purple">
																Purple
															</SelectItem>
															<SelectItem value="yellow">
																Yellow
															</SelectItem>
															<SelectItem value="white">
																White
															</SelectItem>
															<SelectItem value="warm-white">
																Warm White
															</SelectItem>
															<SelectItem value="cold-blue">
																Cold Blue
															</SelectItem>
															<SelectItem value="uv">
																UV
															</SelectItem>
															<SelectItem value="rose">
																Rose
															</SelectItem>
															<SelectItem value="orange">
																Orange
															</SelectItem>
															<SelectItem value="pink">
																Pink
															</SelectItem>
															<SelectItem value="teal">
																Teal
															</SelectItem>
															<SelectItem value="lavender">
																Lavender
															</SelectItem>
															<SelectItem value="gold">
																Gold
															</SelectItem>
															<SelectItem value="turquoise">
																Turquoise
															</SelectItem>
														</SelectContent>
													</Select>
													<div
														className="w-full h-8 rounded border-2 border-muted-foreground/20"
														style={{
															background:
																getColorStyle(
																	artistData.light_color_single
																),
														}}
													></div>
												</div>
												<div className="space-y-2">
													<Label htmlFor="light_color_two">
														Secondary Light Color
													</Label>
													<Select
														value={
															artistData.light_color_two
														}
														onValueChange={(
															value
														) =>
															handleInputChange(
																"light_color_two",
																value
															)
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">
																None
															</SelectItem>
															<SelectItem value="red">
																Red
															</SelectItem>
															<SelectItem value="blue">
																Blue
															</SelectItem>
															<SelectItem value="green">
																Green
															</SelectItem>
															<SelectItem value="amber">
																Amber
															</SelectItem>
															<SelectItem value="magenta">
																Magenta
															</SelectItem>
															<SelectItem value="cyan">
																Cyan
															</SelectItem>
															<SelectItem value="purple">
																Purple
															</SelectItem>
															<SelectItem value="yellow">
																Yellow
															</SelectItem>
															<SelectItem value="white">
																White
															</SelectItem>
															<SelectItem value="warm-white">
																Warm White
															</SelectItem>
															<SelectItem value="cold-blue">
																Cold Blue
															</SelectItem>
															<SelectItem value="uv">
																UV
															</SelectItem>
															<SelectItem value="rose">
																Rose
															</SelectItem>
															<SelectItem value="orange">
																Orange
															</SelectItem>
															<SelectItem value="pink">
																Pink
															</SelectItem>
															<SelectItem value="teal">
																Teal
															</SelectItem>
															<SelectItem value="lavender">
																Lavender
															</SelectItem>
															<SelectItem value="gold">
																Gold
															</SelectItem>
															<SelectItem value="turquoise">
																Turquoise
															</SelectItem>
														</SelectContent>
													</Select>
													{artistData.light_color_two !==
														"none" && (
														<div
															className="w-full h-8 rounded border-2 border-muted-foreground/20"
															style={{
																background:
																	getColorStyle(
																		artistData.light_color_two
																	),
															}}
														></div>
													)}
												</div>
												<div className="space-y-2">
													<Label htmlFor="light_color_three">
														Third Light Color
													</Label>
													<Select
														value={
															artistData.light_color_three
														}
														onValueChange={(
															value
														) =>
															handleInputChange(
																"light_color_three",
																value
															)
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">
																None
															</SelectItem>
															<SelectItem value="red">
																Red
															</SelectItem>
															<SelectItem value="blue">
																Blue
															</SelectItem>
															<SelectItem value="green">
																Green
															</SelectItem>
															<SelectItem value="amber">
																Amber
															</SelectItem>
															<SelectItem value="magenta">
																Magenta
															</SelectItem>
															<SelectItem value="cyan">
																Cyan
															</SelectItem>
															<SelectItem value="purple">
																Purple
															</SelectItem>
															<SelectItem value="yellow">
																Yellow
															</SelectItem>
															<SelectItem value="white">
																White
															</SelectItem>
															<SelectItem value="warm-white">
																Warm White
															</SelectItem>
															<SelectItem value="cold-blue">
																Cold Blue
															</SelectItem>
															<SelectItem value="uv">
																UV
															</SelectItem>
															<SelectItem value="rose">
																Rose
															</SelectItem>
															<SelectItem value="orange">
																Orange
															</SelectItem>
															<SelectItem value="pink">
																Pink
															</SelectItem>
															<SelectItem value="teal">
																Teal
															</SelectItem>
															<SelectItem value="lavender">
																Lavender
															</SelectItem>
															<SelectItem value="gold">
																Gold
															</SelectItem>
															<SelectItem value="turquoise">
																Turquoise
															</SelectItem>
														</SelectContent>
													</Select>
													{artistData.light_color_three !==
														"none" && (
														<div
															className="w-full h-8 rounded border-2 border-muted-foreground/20"
															style={{
																background:
																	getColorStyle(
																		artistData.light_color_three
																	),
															}}
														></div>
													)}
												</div>
											</div>
											{/* Combined Colors Preview */}
											{(artistData.light_color_two !==
												"none" ||
												artistData.light_color_three !==
													"none") && (
												<div className="space-y-2">
													<Label>
														Combined Colors Preview
													</Label>
													<div
														className="w-full h-8 rounded border-2 border-muted-foreground/20"
														style={{
															background:
																getGradientStyle(
																	[
																		artistData.light_color_single,
																		artistData.light_color_two !==
																		"none"
																			? artistData.light_color_two
																			: null,
																		artistData.light_color_three !==
																		"none"
																			? artistData.light_color_three
																			: null,
																	]
																		.filter(
																			Boolean
																		)
																		.join(
																			"-"
																		)
																),
														}}
													></div>
												</div>
											)}
											<div className="space-y-2">
												<Label htmlFor="light_requests">
													Special Lighting Requests
												</Label>
												<Textarea
													id="light_requests"
													value={
														artistData.light_requests
													}
													onChange={(e) =>
														handleInputChange(
															"light_requests",
															e.target.value
														)
													}
													placeholder="Any specific lighting effects, movements, or special requests"
													rows={3}
												/>
											</div>
										</div>
										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Stage Positioning
											</h3>
											{/* Visual Stage Preview */}
											<StagePositionPreview
												startPosition={
													artistData.stage_position_start
												}
												endPosition={
													artistData.stage_position_end
												}
												className="mb-4"
											/>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="stage_position_start">
														Starting Position
													</Label>
													<Select
														value={
															artistData.stage_position_start
														}
														onValueChange={(
															value
														) =>
															handleInputChange(
																"stage_position_start",
																value
															)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select starting position" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="upstage-left">
																Upstage Left
															</SelectItem>
															<SelectItem value="upstage">
																Upstage Center
															</SelectItem>
															<SelectItem value="upstage-right">
																Upstage Right
															</SelectItem>
															<SelectItem value="left">
																Center Left
															</SelectItem>
															<SelectItem value="center">
																Center
															</SelectItem>
															<SelectItem value="right">
																Center Right
															</SelectItem>
															<SelectItem value="downstage-left">
																Downstage Left
															</SelectItem>
															<SelectItem value="downstage">
																Downstage Center
															</SelectItem>
															<SelectItem value="downstage-right">
																Downstage Right
															</SelectItem>
															<SelectItem value="custom">
																Custom Position
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div className="space-y-2">
													<Label htmlFor="stage_position_end">
														Ending Position
													</Label>
													<Select
														value={
															artistData.stage_position_end
														}
														onValueChange={(
															value
														) =>
															handleInputChange(
																"stage_position_end",
																value
															)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select ending position" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="upstage-left">
																Upstage Left
															</SelectItem>
															<SelectItem value="upstage">
																Upstage Center
															</SelectItem>
															<SelectItem value="upstage-right">
																Upstage Right
															</SelectItem>
															<SelectItem value="left">
																Center Left
															</SelectItem>
															<SelectItem value="center">
																Center
															</SelectItem>
															<SelectItem value="right">
																Center Right
															</SelectItem>
															<SelectItem value="downstage-left">
																Downstage Left
															</SelectItem>
															<SelectItem value="downstage">
																Downstage Center
															</SelectItem>
															<SelectItem value="downstage-right">
																Downstage Right
															</SelectItem>
															<SelectItem value="custom">
																Custom Position
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>
											{(artistData.stage_position_start ===
												"custom" ||
												artistData.stage_position_end ===
													"custom") && (
												<div className="space-y-2">
													<Label htmlFor="custom_stage_position">
														Custom Stage Position
														Details
													</Label>
													<Textarea
														id="custom_stage_position"
														value={
															artistData.custom_stage_position
														}
														onChange={(e) =>
															handleInputChange(
																"custom_stage_position",
																e.target.value
															)
														}
														placeholder="Describe your custom stage positioning requirements"
														rows={3}
													/>
												</div>
											)}
										</div>
										<div className="space-y-2">
											<Label htmlFor="props_needed">
												Props and Equipment Needed
											</Label>
											<Textarea
												id="props_needed"
												value={artistData.props_needed}
												onChange={(e) =>
													handleInputChange(
														"props_needed",
														e.target.value
													)
												}
												placeholder="List any props, equipment, or special items you need for your performance"
												rows={3}
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>
						{/* 4. Stage Visual Manager Information */}
						<AccordionItem value="visual-info">
							<AccordionTrigger className="text-lg font-semibold">
								<div className="flex items-center gap-2">
									<Image className="h-5 w-5" />
									Stage Visual Manager Information
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<Card>
									<CardContent className="space-y-6 pt-6">
										{/* Performance Video Link */}
										<div className="space-y-2">
											<Label htmlFor="show_link">
												Performance Video/Demo Link
											</Label>
											<Input
												id="show_link"
												type="url"
												value={artistData.show_link}
												onChange={(e) =>
													handleInputChange(
														"show_link",
														e.target.value
													)
												}
												placeholder="YouTube, Vimeo, or other video link"
											/>
										</div>

										{/* Social Media Links */}
										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Social Media Links
											</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="instagram_link">
														Instagram
													</Label>
													<Input
														id="instagram_link"
														type="url"
														value={
															artistData.instagram_link
														}
														onChange={(e) =>
															handleInputChange(
																"instagram_link",
																e.target.value
															)
														}
														placeholder="https://instagram.com/username"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="facebook_link">
														Facebook
													</Label>
													<Input
														id="facebook_link"
														type="url"
														value={
															artistData.facebook_link
														}
														onChange={(e) =>
															handleInputChange(
																"facebook_link",
																e.target.value
															)
														}
														placeholder="https://facebook.com/username"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="tiktok_link">
														TikTok
													</Label>
													<Input
														id="tiktok_link"
														type="url"
														value={
															artistData.tiktok_link
														}
														onChange={(e) =>
															handleInputChange(
																"tiktok_link",
																e.target.value
															)
														}
														placeholder="https://tiktok.com/@username"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="youtube_link">
														YouTube
													</Label>
													<Input
														id="youtube_link"
														type="url"
														value={
															artistData.youtube_link
														}
														onChange={(e) =>
															handleInputChange(
																"youtube_link",
																e.target.value
															)
														}
														placeholder="https://youtube.com/channel/..."
													/>
												</div>
												<div className="space-y-2 md:col-span-2">
													<Label htmlFor="website_link">
														Website
													</Label>
													<Input
														id="website_link"
														type="url"
														value={
															artistData.website_link
														}
														onChange={(e) =>
															handleInputChange(
																"website_link",
																e.target.value
															)
														}
														placeholder="https://yourwebsite.com"
													/>
												</div>
											</div>
										</div>
										{/* Gallery Upload */}
										<div className="space-y-4">
											<h3 className="text-lg font-semibold">
												Image & Video Gallery
											</h3>
											{/* Upload Area */}
											<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
												<div className="text-center space-y-2">
													<Upload className="h-8 w-8 mx-auto text-muted-foreground" />
													<Label
														htmlFor="gallery-upload"
														className="text-sm font-medium cursor-pointer"
													>
														Upload Images & Videos
													</Label>
													<Input
														id="gallery-upload"
														type="file"
														multiple
														accept="image/*,video/*"
														onChange={
															handleGalleryUpload
														}
														className="hidden"
													/>
													<p className="text-xs text-muted-foreground">
														Upload photos and videos
														of your performance (Max
														50MB each)
													</p>
												</div>
											</div>
											{/* Gallery Preview */}
											{galleryFiles.length > 0 && (
												<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
													{galleryFiles.map(
														(file, index) => (
															<div
																key={index}
																className="relative group"
															>
																{file.type ===
																"image" ? (
																	<ImageViewer
																		file={{
																			name: file.name,
																			type: "image",
																			url: file.url,
																			file_path:
																				file.file_path,
																			size:
																				file.size ||
																				0,
																			uploadedAt:
																				file.uploadedAt,
																			contentType:
																				file.contentType,
																		}}
																		onError={(
																			error
																		) => {
																			console.error(
																				"Image viewer error:",
																				error
																			);
																			toast(
																				{
																					title: "Image Error",
																					description:
																						"Failed to load image file. Please check the file format.",
																					variant:
																						"destructive",
																				}
																			);
																		}}
																		className="aspect-square"
																	/>
																) : (
																	<VideoPlayer
																		file={{
																			name: file.name,
																			type: "video",
																			url: file.url,
																			file_path:
																				file.file_path,
																			size:
																				file.size ||
																				0,
																			uploadedAt:
																				file.uploadedAt,
																			contentType:
																				file.contentType,
																		}}
																		onError={(
																			error
																		) => {
																			console.error(
																				"Video player error:",
																				error
																			);
																			toast(
																				{
																					title: "Video Error",
																					description:
																						"Failed to play video file. Please check the file format.",
																					variant:
																						"destructive",
																				}
																			);
																		}}
																		className="aspect-square"
																	/>
																)}
																<Button
																	type="button"
																	variant="destructive"
																	size="sm"
																	onClick={() =>
																		handleDeleteGalleryFile(
																			index
																		)
																	}
																	className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
																>
																	×
																</Button>
																<p className="text-xs text-muted-foreground mt-1 truncate">
																	{file.name}
																</p>
															</div>
														)
													)}
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>
						{/* 5. Additional Information */}
						<AccordionItem value="additional-info">
							<AccordionTrigger className="text-lg font-semibold">
								<div className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Additional Information
								</div>
							</AccordionTrigger>
							<AccordionContent>
								<Card>
									<CardContent className="space-y-4 pt-6">
										<div className="space-y-2">
											<Label htmlFor="mc_notes">
												MC Notes
											</Label>
											<Textarea
												id="mc_notes"
												value={artistData.mc_notes}
												onChange={(e) =>
													handleInputChange(
														"mc_notes",
														e.target.value
													)
												}
												placeholder="Information for the MC to announce before your performance"
												className="min-h-[100px]"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="stage_manager_notes">
												Stage Manager Notes
											</Label>
											<Textarea
												id="stage_manager_notes"
												value={
													artistData.stage_manager_notes
												}
												onChange={(e) =>
													handleInputChange(
														"stage_manager_notes",
														e.target.value
													)
												}
												placeholder="Notes for the stage manager about props and performance requirements"
												className="min-h-[100px]"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="notes">
												Additional Notes
											</Label>
											<Textarea
												id="notes"
												value={artistData.notes}
												onChange={(e) =>
													handleInputChange(
														"notes",
														e.target.value
													)
												}
												placeholder="Any additional information, special requirements, or notes for the event organizers"
												className="min-h-[100px]"
											/>
										</div>
									</CardContent>
								</Card>
							</AccordionContent>
						</AccordionItem>
					</Accordion>

					<div className="flex gap-4">
						<Button
							type="submit"
							disabled={submitting}
							className="flex-1"
						>
							{submitting
								? "Registering..."
								: "Register for Event"}
						</Button>
					</div>
				</form>
			</main>

			<Dialog
				open={showSuccessDialog}
				onOpenChange={setShowSuccessDialog}
			>
				<DialogContent className="max-w-md">
					<DialogHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
						<DialogTitle className="text-xl font-semibold">
							Registration Successful!
						</DialogTitle>
						<DialogDescription className="text-center mt-2">
							{artistData.artist_name} has been registered for{" "}
							{event?.name}
						</DialogDescription>
						{registeredArtistId && (
							<div className="text-xs text-muted-foreground mt-2 text-center">
								Artist ID: {registeredArtistId}
							</div>
						)}
					</DialogHeader>
					<div className="mt-6">
						<Button
							onClick={() => {
								// Use the stored artist ID first, then fallback to URL params
								const artistId =
									registeredArtistId ||
									new URLSearchParams(
										window.location.search
									).get("artistId");
								console.log(
									"Redirecting to dashboard with artistId:",
									artistId
								);

								if (artistId) {
									router.push(
										`/artist-dashboard/${artistId}`
									);
								} else {
									console.error(
										"No artist ID found for redirect"
									);
									router.push("/artist-dashboard");
								}
							}}
							className="w-full"
						>
							Go to Dashboard
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default function ArtistRegistration() {
	return <ArtistRegistrationForm />;
}
