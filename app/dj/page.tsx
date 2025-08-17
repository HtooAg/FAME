"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Headphones,
	Music,
	Play,
	Pause,
	SkipForward,
	LogOut,
	AlertTriangle,
} from "lucide-react";
import Image from "next/image";

interface DJArtist {
	id: string;
	stageName: string;
	style: string;
	music: string[];
	performanceOrder?: number;
}

interface EmergencyCode {
	code: "red" | "blue" | "green";
	message: string;
}

type EmergencyActive = EmergencyCode | null;

interface PlaylistTrack {
	id: string;
	title: string;
	artist: string;
	genre: string;
	duration: string;
	bpm: number;
	url: string;
}

interface PerformanceSlot {
	id: string;
	artistId: string;
	artistName: string;
	style: string;
	order: number;
	status: "pending" | "active" | "completed";
	performanceDate?: string;
	duration: number;
	musicTracks?: Array<{
		id?: string;
		song_title: string;
		duration: number;
		tempo?: number;
		file_url: string;
	}>;
}

type ShowStatus = "not_started" | "started" | "paused" | "completed";

export default function DJDashboard() {
	const { user, logout } = useAuth();
	const eventId = user?.eventId;
	const [artists, setArtists] = useState<DJArtist[]>([]);
	const [emergency, setEmergency] = useState<EmergencyActive>(null);
	const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
	const [currentTrack, setCurrentTrack] = useState<string | null>(null);

	const [wsConnected, setWsConnected] = useState<boolean>(false);
	const [performanceOrder, setPerformanceOrder] = useState<PerformanceSlot[]>(
		[]
	);
	const [showStatus, setShowStatus] = useState<ShowStatus>("not_started");
	const [currentPerformanceId, setCurrentPerformanceId] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (!eventId) return;

		fetchData();
		initializeWebSocket();
	}, [eventId]);

	const fetchData = async () => {
		try {
			const [perfRes, eRes] = await Promise.all([
				fetch(`/api/events/${eventId}/performance-order-gcs`, {
					cache: "no-store",
				}),
				fetch(`/api/events/${eventId}/emergency?active=1`, {
					cache: "no-store",
				}),
			]);

			if (perfRes.ok) {
				const perfData = await perfRes.json();
				if (perfData.success) {
					setPerformanceOrder(perfData.data.performanceOrder || []);
					setShowStatus(perfData.data.showStatus || "not_started");
					setCurrentPerformanceId(
						perfData.data.currentPerformanceId || null
					);

					// Extract playlist from performance order
					const allTracks: PlaylistTrack[] =
						perfData.data.performanceOrder.flatMap(
							(slot: PerformanceSlot) =>
								(slot.musicTracks || []).map((track) => ({
									id:
										track.id ||
										`${slot.artistId}_${track.song_title}`,
									title: track.song_title,
									artist: slot.artistName,
									genre: slot.style,
									duration: formatDuration(track.duration),
									bpm: track.tempo || 120,
									url: track.file_url,
								}))
						);
					setPlaylist(allTracks);
				}
			}

			if (eRes.ok) setEmergency(await eRes.json());
		} catch (error) {
			console.error("Error fetching DJ dashboard data:", error);
		}
	};

	const initializeWebSocket = () => {
		try {
			// First initialize the WebSocket server
			fetch("/api/websocket").then(() => {
				console.log("WebSocket server initialized for DJ dashboard");

				// Then establish client connection
				const ws = new WebSocket("ws://localhost:8080");

				ws.onopen = () => {
					console.log("DJ WebSocket connected");
					setWsConnected(true);

					// Subscribe to performance order updates for this event
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
						console.log("DJ WebSocket message received:", message);

						if (message.type === "performance_order_updated") {
							// Update performance order
							setPerformanceOrder(
								message.data.performanceOrder || []
							);

							// Update playlist from new performance order
							const allTracks: PlaylistTrack[] =
								message.data.performanceOrder.flatMap(
									(slot: PerformanceSlot) =>
										(slot.musicTracks || []).map(
											(track) => ({
												id:
													track.id ||
													`${slot.artistId}_${track.song_title}`,
												title: track.song_title,
												artist: slot.artistName,
												genre: slot.style,
												duration: formatDuration(
													track.duration
												),
												bpm: track.tempo || 120,
												url: track.file_url,
											})
										)
								);
							setPlaylist(allTracks);

							console.log(
								"DJ dashboard updated with new performance order"
							);
						} else if (message.type === "show_status_updated") {
							// Update show status
							setShowStatus(message.data.status);
							setCurrentPerformanceId(
								message.data.currentPerformanceId || null
							);

							console.log(
								`DJ dashboard show status updated: ${message.data.status}`
							);
						}
					} catch (error) {
						console.error(
							"Error parsing DJ WebSocket message:",
							error
						);
					}
				};

				ws.onclose = () => {
					console.log("DJ WebSocket disconnected");
					setWsConnected(false);

					// Attempt to reconnect after 3 seconds
					setTimeout(() => {
						console.log("Attempting to reconnect DJ WebSocket...");
						initializeWebSocket();
					}, 3000);
				};

				ws.onerror = (error) => {
					console.error("DJ WebSocket error:", error);
					setWsConnected(false);
				};
			});
		} catch (error) {
			console.error("Failed to initialize DJ WebSocket:", error);
		}
	};

	const formatDuration = (seconds: number | null) => {
		if (!seconds) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const ordered = useMemo(
		() =>
			performanceOrder
				.slice()
				.sort((a, b) => (a.order || 0) - (b.order || 0)),
		[performanceOrder]
	);

	const getBPMColor = (bpm: number) => {
		if (bpm < 80) return "bg-blue-100 text-blue-800";
		if (bpm < 120) return "bg-green-100 text-green-800";
		if (bpm < 140) return "bg-yellow-100 text-yellow-800";
		return "bg-red-100 text-red-800";
	};

	const togglePlay = (trackId: string) => {
		setCurrentTrack(currentTrack === trackId ? null : trackId);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Image
								src="/fame-logo.png"
								alt="FAME Logo"
								width={40}
								height={40}
								className="mr-3"
							/>
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									DJ Control Center
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name} • Event {eventId}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-4">
							{emergency && emergency.code && (
								<Badge className="bg-red-500 text-white">
									<AlertTriangle className="h-3 w-3 mr-1" />
									{emergency.code.toUpperCase()}:{" "}
									{emergency.message}
								</Badge>
							)}
							<div className="flex items-center gap-2">
								<div
									className={`w-2 h-2 rounded-full ${
										wsConnected
											? "bg-green-500"
											: "bg-red-500"
									}`}
								></div>
								<span className="text-xs text-gray-500">
									{wsConnected
										? "Live sync active"
										: "Connecting..."}
								</span>
							</div>
							<Badge
								variant={
									showStatus === "started"
										? "default"
										: "secondary"
								}
							>
								Show:{" "}
								{showStatus.replace("_", " ").toUpperCase()}
							</Badge>
							<Button variant="outline" onClick={logout}>
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</Button>
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Tracks
							</CardTitle>
							<Music className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{playlist.length}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Artists
							</CardTitle>
							<Headphones className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{performanceOrder.length}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Duration
							</CardTitle>
							<Music className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">32:15</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Now Playing
							</CardTitle>
							<Music className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{currentTrack ? "🎵" : "⏸️"}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Main Content */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Headphones className="h-5 w-5 mr-2" />
								Performance Queue
							</CardTitle>
							<CardDescription>
								Ordered list from the Stage Manager
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Order</TableHead>
										<TableHead>Artist</TableHead>
										<TableHead>Style</TableHead>
										<TableHead>Tracks</TableHead>
										<TableHead>Controls</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{ordered.map((slot) => (
										<TableRow
											key={slot.id}
											className={
												currentPerformanceId === slot.id
													? "bg-yellow-50 border-yellow-200"
													: slot.status ===
													  "completed"
													? "bg-gray-50 opacity-60"
													: ""
											}
										>
											<TableCell className="font-bold">
												#{slot.order}
												{currentPerformanceId ===
													slot.id && (
													<Badge className="ml-2 bg-yellow-500">
														LIVE
													</Badge>
												)}
											</TableCell>
											<TableCell className="font-medium">
												{slot.artistName}
											</TableCell>
											<TableCell>{slot.style}</TableCell>
											<TableCell>
												{(slot.musicTracks || [])
													.map(
														(track) =>
															track.song_title
													)
													.join(", ") || "No tracks"}
											</TableCell>
											<TableCell className="space-x-2">
												<Button
													size="sm"
													disabled={
														slot.status ===
														"completed"
													}
												>
													<Play className="h-4 w-4 mr-1" />
													Cue
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={
														slot.status ===
														"completed"
													}
												>
													<SkipForward className="h-4 w-4 mr-1" />
													Next
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Music className="h-5 w-5 mr-2" />
								Master Playlist
							</CardTitle>
							<CardDescription>
								All artist tracks with technical details
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Track</TableHead>
										<TableHead>Artist</TableHead>
										<TableHead>Genre</TableHead>
										<TableHead>Duration</TableHead>
										<TableHead>BPM</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{playlist.map((track) => (
										<TableRow key={track.id}>
											<TableCell>
												<div className="font-medium">
													{track.title}
												</div>
											</TableCell>
											<TableCell>
												{track.artist}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{track.genre}
												</Badge>
											</TableCell>
											<TableCell>
												{track.duration}
											</TableCell>
											<TableCell>
												<Badge
													className={getBPMColor(
														track.bpm
													)}
												>
													{track.bpm} BPM
												</Badge>
											</TableCell>
											<TableCell>
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														togglePlay(track.id)
													}
												>
													{currentTrack ===
													track.id ? (
														<Pause className="h-4 w-4" />
													) : (
														<Play className="h-4 w-4" />
													)}
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
