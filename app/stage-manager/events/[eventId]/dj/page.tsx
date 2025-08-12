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
	ArrowLeft,
	Music,
	Play,
	Pause,
	SkipForward,
	SkipBack,
	Volume2,
	VolumeX,
	Headphones,
	Clock,
	Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface Track {
	id: string;
	title: string;
	artist: string;
	duration: number;
	url?: string;
	isPlaying?: boolean;
}

interface PerformanceSlot {
	id: string;
	artistName: string;
	style: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: "upcoming" | "current" | "completed";
	tracks?: Track[];
}

export default function DJDashboard() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [performanceOrder, setPerformanceOrder] = useState<PerformanceSlot[]>(
		[]
	);
	const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [volume, setVolume] = useState([75]);
	const [isMuted, setIsMuted] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchData();
		// Update current time every second
		const interval = setInterval(() => {
			setCurrentTime((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [eventId]);

	const fetchData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/dj-dashboard`);
			if (response.ok) {
				const data = await response.json();
				setPerformanceOrder(data.performanceOrder || []);
			}
		} catch (error) {
			console.error("Error fetching DJ data:", error);
			toast({
				title: "Error",
				description: "Failed to load DJ dashboard data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const playTrack = (track: Track) => {
		setCurrentTrack(track);
		setIsPlaying(true);
		setCurrentTime(0);
		toast({
			title: "Now Playing",
			description: `${track.title} by ${track.artist}`,
		});
	};

	const togglePlayPause = () => {
		setIsPlaying(!isPlaying);
	};

	const toggleMute = () => {
		setIsMuted(!isMuted);
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const getCurrentPerformance = () => {
		return performanceOrder.find((slot) => slot.status === "current");
	};

	const getUpcomingPerformances = () => {
		return performanceOrder
			.filter((slot) => slot.status === "upcoming")
			.slice(0, 3);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading DJ dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-8"
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="outline"
								onClick={() => router.back()}
								className="flex items-center gap-2"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Event
							</Button>
							<div>
								<h1 className="text-3xl font-bold text-gray-900">
									DJ Dashboard
								</h1>
								<p className="text-gray-600">
									Control music and audio for performances
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className="text-green-600 border-green-600"
							>
								<div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
								LIVE
							</Badge>
						</div>
					</div>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Audio Controls */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="lg:col-span-2"
					>
						<Card className="mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Headphones className="h-5 w-5" />
									Audio Control Center
								</CardTitle>
							</CardHeader>
							<CardContent>
								{/* Now Playing */}
								<div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-6 mb-6">
									<div className="flex items-center justify-between mb-4">
										<div>
											<h3 className="text-lg font-semibold">
												{currentTrack
													? currentTrack.title
													: "No track selected"}
											</h3>
											<p className="text-gray-600">
												{currentTrack
													? currentTrack.artist
													: "Select a track to play"}
											</p>
										</div>
										<div className="text-right">
											<p className="text-sm text-gray-500">
												{formatTime(currentTime)} /{" "}
												{currentTrack
													? formatTime(
															currentTrack.duration
													  )
													: "0:00"}
											</p>
										</div>
									</div>

									{/* Progress Bar */}
									<div className="w-full bg-gray-200 rounded-full h-2 mb-4">
										<div
											className="bg-orange-600 h-2 rounded-full transition-all duration-1000"
											style={{
												width: currentTrack
													? `${
															(currentTime /
																currentTrack.duration) *
															100
													  }%`
													: "0%",
											}}
										></div>
									</div>

									{/* Playback Controls */}
									<div className="flex items-center justify-center gap-4">
										<Button variant="outline" size="sm">
											<SkipBack className="h-4 w-4" />
										</Button>
										<Button
											onClick={togglePlayPause}
											className="bg-orange-600 hover:bg-orange-700"
											disabled={!currentTrack}
										>
											{isPlaying ? (
												<Pause className="h-5 w-5" />
											) : (
												<Play className="h-5 w-5" />
											)}
										</Button>
										<Button variant="outline" size="sm">
											<SkipForward className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{/* Volume Control */}
								<div className="flex items-center gap-4 mb-6">
									<Button
										variant="outline"
										size="sm"
										onClick={toggleMute}
									>
										{isMuted ? (
											<VolumeX className="h-4 w-4" />
										) : (
											<Volume2 className="h-4 w-4" />
										)}
									</Button>
									<div className="flex-1">
										<Slider
											value={isMuted ? [0] : volume}
											onValueChange={setVolume}
											max={100}
											step={1}
											className="w-full"
										/>
									</div>
									<span className="text-sm text-gray-500 w-12">
										{isMuted ? 0 : volume[0]}%
									</span>
								</div>

								{/* Quick Actions */}
								<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
									<Button
										variant="outline"
										className="flex flex-col items-center p-4 h-auto"
									>
										<Music className="h-6 w-6 mb-2" />
										<span className="text-xs">
											Intro Music
										</span>
									</Button>
									<Button
										variant="outline"
										className="flex flex-col items-center p-4 h-auto"
									>
										<Play className="h-6 w-6 mb-2" />
										<span className="text-xs">
											Applause
										</span>
									</Button>
									<Button
										variant="outline"
										className="flex flex-col items-center p-4 h-auto"
									>
										<Pause className="h-6 w-6 mb-2" />
										<span className="text-xs">Silence</span>
									</Button>
									<Button
										variant="outline"
										className="flex flex-col items-center p-4 h-auto"
									>
										<Volume2 className="h-6 w-6 mb-2" />
										<span className="text-xs">Ambient</span>
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Track Library */}
						<Card>
							<CardHeader>
								<CardTitle>Track Library</CardTitle>
								<CardDescription>
									Available music tracks
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{[
										{
											id: "1",
											title: "Upbeat Intro",
											artist: "DJ Mix",
											duration: 180,
										},
										{
											id: "2",
											title: "Smooth Jazz",
											artist: "Background",
											duration: 240,
										},
										{
											id: "3",
											title: "Rock Anthem",
											artist: "High Energy",
											duration: 210,
										},
										{
											id: "4",
											title: "Acoustic Chill",
											artist: "Relaxed",
											duration: 195,
										},
										{
											id: "5",
											title: "Electronic Beat",
											artist: "Modern",
											duration: 220,
										},
									].map((track) => (
										<div
											key={track.id}
											className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
											onClick={() => playTrack(track)}
										>
											<div className="flex items-center gap-3">
												<Button
													variant="ghost"
													size="sm"
													className="p-1"
												>
													<Play className="h-4 w-4" />
												</Button>
												<div>
													<p className="font-medium">
														{track.title}
													</p>
													<p className="text-sm text-gray-500">
														{track.artist}
													</p>
												</div>
											</div>
											<span className="text-sm text-gray-500">
												{formatTime(track.duration)}
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</motion.div>

					{/* Performance Schedule */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
					>
						{/* Current Performance */}
						<Card className="mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									Current Performance
								</CardTitle>
							</CardHeader>
							<CardContent>
								{getCurrentPerformance() ? (
									<div className="text-center">
										<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
											<Music className="h-8 w-8 text-orange-600" />
										</div>
										<h3 className="text-lg font-semibold mb-2">
											{
												getCurrentPerformance()
													?.artistName
											}
										</h3>
										<Badge className="mb-3">
											{getCurrentPerformance()?.style}
										</Badge>
										<div className="text-sm text-gray-500">
											<p className="flex items-center justify-center gap-1">
												<Clock className="h-3 w-3" />
												{
													getCurrentPerformance()
														?.startTime
												}{" "}
												-{" "}
												{
													getCurrentPerformance()
														?.endTime
												}
											</p>
										</div>
									</div>
								) : (
									<div className="text-center text-gray-500">
										<Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No current performance</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Upcoming Performances */}
						<Card>
							<CardHeader>
								<CardTitle>Up Next</CardTitle>
								<CardDescription>
									Upcoming performances
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{getUpcomingPerformances().map(
										(performance, index) => (
											<div
												key={performance.id}
												className="flex items-center gap-3 p-3 border rounded-lg"
											>
												<div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
													{index + 1}
												</div>
												<div className="flex-1">
													<p className="font-medium text-sm">
														{performance.artistName}
													</p>
													<div className="flex items-center gap-2 text-xs text-gray-500">
														<Badge
															variant="secondary"
															className="text-xs"
														>
															{performance.style}
														</Badge>
														<span>
															{
																performance.startTime
															}
														</span>
													</div>
												</div>
											</div>
										)
									)}
									{getUpcomingPerformances().length === 0 && (
										<div className="text-center text-gray-500 py-4">
											<Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
											<p className="text-sm">
												No upcoming performances
											</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Audio Levels */}
						<Card className="mt-6">
							<CardHeader>
								<CardTitle>Audio Levels</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<div className="flex justify-between text-sm mb-1">
											<span>Main Output</span>
											<span>-12 dB</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-green-500 h-2 rounded-full"
												style={{ width: "70%" }}
											></div>
										</div>
									</div>
									<div>
										<div className="flex justify-between text-sm mb-1">
											<span>Monitor</span>
											<span>-18 dB</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-yellow-500 h-2 rounded-full"
												style={{ width: "55%" }}
											></div>
										</div>
									</div>
									<div>
										<div className="flex justify-between text-sm mb-1">
											<span>Microphone</span>
											<span>-6 dB</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className="bg-orange-500 h-2 rounded-full"
												style={{ width: "85%" }}
											></div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
