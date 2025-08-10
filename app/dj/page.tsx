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
	SkipForward,
	LogOut,
	AlertTriangle,
} from "lucide-react";
import Image from "next/image";

type Artist = {
	id: string;
	stageName: string;
	style: string;
	music: string[];
	performanceOrder?: number;
};
type EmergencyActive = {
	code: "red" | "blue" | "green";
	message: string;
} | null;

export default function DJDashboard() {
	const { user, logout } = useAuth();
	const eventId = user?.eventId;
	const [artists, setArtists] = useState<Artist[]>([]);
	const [emergency, setEmergency] = useState<EmergencyActive>(null);
	const [playlist, setPlaylist] = useState<any[]>([]);
	const [currentTrack, setCurrentTrack] = useState<string | null>(null);

	useEffect(() => {
		if (!eventId) return;
		(async () => {
			const [aRes, eRes, pRes] = await Promise.all([
				fetch(`/api/events/${eventId}/artists`, { cache: "no-store" }),
				fetch(`/api/events/${eventId}/emergency?active=1`, {
					cache: "no-store",
				}),
				fetch(`/api/events/${eventId}/playlist`, { cache: "no-store" }),
			]);
			if (aRes.ok) setArtists(await aRes.json());
			if (eRes.ok) setEmergency(await eRes.json());
			if (pRes.ok) setPlaylist(await pRes.json());
		})();
	}, [eventId]);

	const ordered = useMemo(
		() =>
			artists
				.slice()
				.sort(
					(a, b) =>
						(a.performanceOrder || 0) - (b.performanceOrder || 0)
				),
		[artists]
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
								{artists.length}
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
									{ordered.map((a) => (
										<TableRow key={a.id}>
											<TableCell className="font-bold">
												#{a.performanceOrder}
											</TableCell>
											<TableCell className="font-medium">
												{a.stageName}
											</TableCell>
											<TableCell>{a.style}</TableCell>
											<TableCell>
												{(a.music || []).join(", ")}
											</TableCell>
											<TableCell className="space-x-2">
												<Button size="sm">
													<Play className="h-4 w-4 mr-1" />
													Cue
												</Button>
												<Button
													size="sm"
													variant="outline"
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
