"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	Save,
	Plus,
	Undo2,
	Redo2,
	Trash2,
	Download,
} from "lucide-react";
import { StagePositionPreview } from "@/components/StagePositionPreview";
import { useToast } from "@/hooks/use-toast";
import { validateMediaFile } from "@/lib/media-validation";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer, ImageViewer } from "@/components/ui/video-player";

interface ArtistProfile {
	id: string;
	artistName: string;
	realName: string;
	email: string;
	phone: string;
	style: string;
	performanceType: string;
	biography: string;
	notes: string;
	equipment: string;
	performanceDuration: number;
	costumeColor: string;
	customCostumeColor: string;
	lightColorSingle: string;
	lightColorTwo: string;
	lightColorThree: string;
	lightRequests: string;
	showLink: string;
	stagePositionStart: string;
	stagePositionEnd: string;
	customStagePosition: string;
	mcNotes: string;
	stageManagerNotes: string;
	socialMedia: {
		instagram: string;
		facebook: string;
		tiktok: string;
		youtube: string;
		website: string;
	};
	musicTracks: any[];
	galleryFiles: any[];
	eventId: string;
	eventName: string;
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
export default function ArtistEditPage() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const artistId = params.artistId as string;

	const [profile, setProfile] = useState<ArtistProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

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

	const [musicTracks, setMusicTracks] = useState<any[]>([]);
	const [galleryFiles, setGalleryFiles] = useState<any[]>([]);

	// Undo/Redo state for music tracks
	const [musicHistory, setMusicHistory] = useState<any[][]>([]);
	const [musicHistoryIndex, setMusicHistoryIndex] = useState(-1);

	// Undo/Redo state for gallery files
	const [galleryHistory, setGalleryHistory] = useState<any[][]>([]);
	const [galleryHistoryIndex, setGalleryHistoryIndex] = useState(-1);

	// Upload states
	const [uploadingMusic, setUploadingMusic] = useState(false);
	const [uploadingGallery, setUploadingGallery] = useState(false);

	useEffect(() => {
		if (artistId) {
			fetchArtistProfile();
		}
	}, [artistId]);

	const fetchArtistProfile = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/artists/${artistId}`);

			if (!response.ok) {
				throw new Error("Failed to fetch artist profile");
			}

			const data = await response.json();
			console.log("Fetched artist data:", data);

			if (data.success && data.data) {
				const artist = data.data;
				setProfile(artist);

				// Pre-fill form with existing data
				setArtistData({
					artist_name: artist.artistName || "",
					real_name: artist.realName || "",
					email: artist.email || "",
					phone: artist.phone || "",
					style: artist.style || "",
					performance_type: artist.performanceType || "",
					biography: artist.biography || "",
					notes: artist.notes || "",
					props_needed: artist.equipment || "",
					performance_duration: artist.performanceDuration || 5,
					costume_color: artist.costumeColor || "",
					custom_costume_color: artist.customCostumeColor || "",
					light_color_single: artist.lightColorSingle || "trust",
					light_color_two: artist.lightColorTwo || "none",
					light_color_three: artist.lightColorThree || "none",
					light_requests: artist.lightRequests || "",
					show_link: artist.showLink || "",
					stage_position_start: artist.stagePositionStart || "",
					stage_position_end: artist.stagePositionEnd || "",
					custom_stage_position: artist.customStagePosition || "",
					mc_notes: artist.mcNotes || "",
					stage_manager_notes: artist.stageManagerNotes || "",
					instagram_link: artist.socialMedia?.instagram || "",
					facebook_link: artist.socialMedia?.facebook || "",
					tiktok_link: artist.socialMedia?.tiktok || "",
					youtube_link: artist.socialMedia?.youtube || "",
					website_link: artist.socialMedia?.website || "",
				});

				const tracks = artist.musicTracks || [];
				const files = artist.galleryFiles || [];

				setMusicTracks(tracks);
				setGalleryFiles(files);

				// Initialize history with current state
				setMusicHistory([tracks]);
				setMusicHistoryIndex(0);
				setGalleryHistory([files]);
				setGalleryHistoryIndex(0);
			} else {
				throw new Error("Invalid response format");
			}
		} catch (error) {
			console.error("Error fetching artist profile:", error);
			toast({
				title: "Error",
				description: "Failed to load artist profile",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};
	const handleInputChange = (field: string, value: string | number) => {
		setArtistData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Music tracks management
	const saveMusicToHistory = (tracks: any[]) => {
		const newHistory = musicHistory.slice(0, musicHistoryIndex + 1);
		newHistory.push([...tracks]);
		setMusicHistory(newHistory);
		setMusicHistoryIndex(newHistory.length - 1);
	};

	const undoMusicChanges = () => {
		if (musicHistoryIndex > 0) {
			setMusicHistoryIndex(musicHistoryIndex - 1);
			setMusicTracks([...musicHistory[musicHistoryIndex - 1]]);
		}
	};

	const redoMusicChanges = () => {
		if (musicHistoryIndex < musicHistory.length - 1) {
			setMusicHistoryIndex(musicHistoryIndex + 1);
			setMusicTracks([...musicHistory[musicHistoryIndex + 1]]);
		}
	};

	const handleDeleteMusicTrack = (index: number) => {
		saveMusicToHistory(musicTracks);
		const newTracks = musicTracks.filter((_, i) => i !== index);
		setMusicTracks(newTracks);
	};

	// Gallery files management
	const saveGalleryToHistory = (files: any[]) => {
		const newHistory = galleryHistory.slice(0, galleryHistoryIndex + 1);
		newHistory.push([...files]);
		setGalleryHistory(newHistory);
		setGalleryHistoryIndex(newHistory.length - 1);
	};

	const undoGalleryChanges = () => {
		if (galleryHistoryIndex > 0) {
			setGalleryHistoryIndex(galleryHistoryIndex - 1);
			setGalleryFiles([...galleryHistory[galleryHistoryIndex - 1]]);
		}
	};

	const redoGalleryChanges = () => {
		if (galleryHistoryIndex < galleryHistory.length - 1) {
			setGalleryHistoryIndex(galleryHistoryIndex + 1);
			setGalleryFiles([...galleryHistory[galleryHistoryIndex + 1]]);
		}
	};

	const handleDeleteGalleryFile = (index: number) => {
		saveGalleryToHistory(galleryFiles);
		const newFiles = galleryFiles.filter((_, i) => i !== index);
		setGalleryFiles(newFiles);
	};

	// File upload handlers
	const handleMusicUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		setUploadingMusic(true);
		saveMusicToHistory(musicTracks);

		try {
			const newTracks = [];
			for (const file of Array.from(files)) {
				// Validate file
				const validation = validateMediaFile(
					{
						name: file.name,
						size: file.size,
						type: file.type,
						lastModified: file.lastModified,
					},
					"audio"
				);
				if (!validation.isValid) {
					toast({
						title: "Invalid File",
						description: validation.error,
						variant: "destructive",
					});
					continue;
				}

				// Upload file
				const formData = new FormData();
				formData.append("file", file);
				formData.append("eventId", profile?.eventId || "");
				formData.append("artistId", artistId);
				formData.append("fileType", "music");

				const response = await fetch("/api/gcs/upload", {
					method: "POST",
					body: formData,
				});

				if (response.ok) {
					const result = await response.json();
					newTracks.push({
						song_title: file.name.replace(/\.[^/.]+$/, ""),
						duration: 0, // Will be updated when metadata is loaded
						notes: "",
						is_main_track: false,
						tempo: "medium",
						file_url: result.url,
						file_path: result.gcsPath,
					});
				} else {
					throw new Error("Upload failed");
				}
			}

			setMusicTracks([...musicTracks, ...newTracks]);
			toast({
				title: "Upload Successful",
				description: `${newTracks.length} music track(s) uploaded successfully`,
			});
		} catch (error) {
			console.error("Music upload error:", error);
			toast({
				title: "Upload Failed",
				description: "Failed to upload music files. Please try again.",
				variant: "destructive",
			});
		} finally {
			setUploadingMusic(false);
			// Reset file input
			event.target.value = "";
		}
	};

	const handleGalleryUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		setUploadingGallery(true);
		saveGalleryToHistory(galleryFiles);

		try {
			const newFiles = [];
			for (const file of Array.from(files)) {
				// Determine file type
				const fileType = file.type.startsWith("image/")
					? "images"
					: "videos";

				// Validate file
				const mediaType = file.type.startsWith("image/")
					? "image"
					: "video";
				const validation = validateMediaFile(
					{
						name: file.name,
						size: file.size,
						type: file.type,
						lastModified: file.lastModified,
					},
					mediaType as "image" | "video"
				);
				if (!validation.isValid) {
					toast({
						title: "Invalid File",
						description: validation.error,
						variant: "destructive",
					});
					continue;
				}

				// Upload file
				const formData = new FormData();
				formData.append("file", file);
				formData.append("eventId", profile?.eventId || "");
				formData.append("artistId", artistId);
				formData.append("fileType", fileType);

				const response = await fetch("/api/gcs/upload", {
					method: "POST",
					body: formData,
				});

				if (response.ok) {
					const result = await response.json();
					newFiles.push({
						name: file.name,
						type: file.type.startsWith("image/")
							? "image"
							: "video",
						url: result.url,
						file_path: result.gcsPath,
						size: file.size,
						contentType: file.type,
						uploadedAt: new Date().toISOString(),
					});
				} else {
					throw new Error("Upload failed");
				}
			}

			setGalleryFiles([...galleryFiles, ...newFiles]);
			toast({
				title: "Upload Successful",
				description: `${newFiles.length} file(s) uploaded successfully`,
			});
		} catch (error) {
			console.error("Gallery upload error:", error);
			toast({
				title: "Upload Failed",
				description:
					"Failed to upload gallery files. Please try again.",
				variant: "destructive",
			});
		} finally {
			setUploadingGallery(false);
			// Reset file input
			event.target.value = "";
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);

		try {
			const response = await fetch(`/api/artists/${artistId}`, {
				method: "PATCH",
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
					musicTracks: musicTracks,
					galleryFiles: galleryFiles,
				}),
			});

			if (response.ok) {
				toast({
					title: "Profile Updated",
					description:
						"Your artist profile has been updated successfully",
				});
				router.push(`/artist-dashboard/${artistId}`);
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || "Update failed");
			}
		} catch (error) {
			console.error("Update error:", error);
			toast({
				title: "Update failed",
				description: "Failed to update profile. Please try again.",
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
						Loading profile...
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
						Profile not found
					</h2>
					<Button onClick={() => router.push("/artist-dashboard")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
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
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								router.push(`/artist-dashboard/${artistId}`)
							}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							Back to Dashboard
						</Button>
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								Edit Artist Profile
							</h1>
							<p className="text-muted-foreground">
								{profile.artistName} - {profile.eventName}
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
											<div className="flex items-center justify-between">
												<Label className="text-base font-medium">
													Performance Tracks
												</Label>
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={
															undoMusicChanges
														}
														disabled={
															musicHistoryIndex <=
															0
														}
														className="flex items-center gap-1"
													>
														<Undo2 className="h-3 w-3" />
														Undo
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={
															redoMusicChanges
														}
														disabled={
															musicHistoryIndex >=
															musicHistory.length -
																1
														}
														className="flex items-center gap-1"
													>
														<Redo2 className="h-3 w-3" />
														Redo
													</Button>
													<div className="relative">
														<input
															type="file"
															accept="audio/*"
															multiple
															onChange={
																handleMusicUpload
															}
															className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
															disabled={
																uploadingMusic
															}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={
																uploadingMusic
															}
															className="flex items-center gap-1"
														>
															<Upload className="h-3 w-3" />
															{uploadingMusic
																? "Uploading..."
																: "Import Music"}
														</Button>
													</div>
												</div>
											</div>
											{musicTracks.length > 0 ? (
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
																		{index +
																			1}
																	</h4>
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleDeleteMusicTrack(
																				index
																			)
																		}
																		className="flex items-center gap-1 text-destructive hover:text-destructive"
																	>
																		<Trash2 className="h-3 w-3" />
																		Delete
																	</Button>
																</div>
																<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
																	<div className="space-y-2">
																		<Label>
																			Song
																			Title
																		</Label>
																		<Input
																			value={
																				track.song_title ||
																				track.songTitle ||
																				""
																			}
																			readOnly
																			className="bg-muted"
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
																			className="bg-muted"
																		/>
																	</div>
																</div>
																{track.file_url && (
																	<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
																		<div className="flex justify-between items-center mb-2">
																			<p className="text-green-800 dark:text-green-200 text-sm">
																				✓
																				"
																				{track.song_title ||
																					track.songTitle}

																				"
																				by{" "}
																				{
																					artistData.artist_name
																				}
																			</p>
																		</div>
																		<AudioPlayer
																			track={{
																				song_title:
																					track.song_title ||
																					track.songTitle ||
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
																							"Failed to play audio file.",
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
											) : (
												<p className="text-center text-muted-foreground py-8">
													No music tracks uploaded yet
												</p>
											)}
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
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<h3 className="text-lg font-semibold">
													Media Gallery
												</h3>
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={
															undoGalleryChanges
														}
														disabled={
															galleryHistoryIndex <=
															0
														}
														className="flex items-center gap-1"
													>
														<Undo2 className="h-3 w-3" />
														Undo
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={
															redoGalleryChanges
														}
														disabled={
															galleryHistoryIndex >=
															galleryHistory.length -
																1
														}
														className="flex items-center gap-1"
													>
														<Redo2 className="h-3 w-3" />
														Redo
													</Button>
													<div className="relative">
														<input
															type="file"
															accept="image/*,video/*"
															multiple
															onChange={
																handleGalleryUpload
															}
															className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
															disabled={
																uploadingGallery
															}
														/>
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={
																uploadingGallery
															}
															className="flex items-center gap-1"
														>
															<Upload className="h-3 w-3" />
															{uploadingGallery
																? "Uploading..."
																: "Import Media"}
														</Button>
													</div>
												</div>
											</div>
											{galleryFiles.length > 0 ? (
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
																						"Failed to load image file.",
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
																						"Failed to play video file.",
																					variant:
																						"destructive",
																				}
																			);
																		}}
																		className="aspect-square"
																	/>
																)}
																<div className="flex items-center justify-between mt-2">
																	<p className="text-xs text-muted-foreground truncate flex-1">
																		{
																			file.name
																		}
																	</p>
																	<Button
																		type="button"
																		variant="outline"
																		size="sm"
																		onClick={() =>
																			handleDeleteGalleryFile(
																				index
																			)
																		}
																		className="ml-2 h-6 px-2 text-xs text-destructive hover:text-destructive"
																	>
																		<Trash2 className="h-3 w-3" />
																	</Button>
																</div>
															</div>
														)
													)}
												</div>
											) : (
												<p className="text-center text-muted-foreground py-8">
													No media files uploaded yet
												</p>
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
							type="button"
							variant="outline"
							onClick={() =>
								router.push(`/artist-dashboard/${artistId}`)
							}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={submitting}
							className="flex-1"
						>
							{submitting ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
									Saving...
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-2" />
									Save Changes
								</>
							)}
						</Button>
					</div>
				</form>
			</main>
		</div>
	);
}
