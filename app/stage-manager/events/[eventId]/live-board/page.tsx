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
	Monitor,
	Users,
	Clock,
	Play,
	Pause,
	SkipForward,
	AlertTriangle,
	CheckCircle,
	Timer,
	Mic,
	Volume2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface PerformanceSlot {
	id: string;
	artistName: string;
	style: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: "waiting" | "ready" | "on-stage" | "completed";
	actualStartTime?: string;
	actualEndTime?: string;
	notes?: string;
}

interface SystemStatus {
	audio: "good" | "warning" | "error";
	lighting: "good" | "warning" | "error";
	stage: "clear" | "setup" | "performance";
	microphones: number;
	activeMics: number;
}

export default function LiveBoard() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [performanceOrder, setPerformanceOrder] = useState<PerformanceSlot[]>(
		[]
	);
	const [systemStatus, setSystemStatus] = useState<SystemStatus>({
		audio: "good",
		lighting: "good",
		stage: "clear",
		microphones: 4,
		activeMics: 0,
	});
	const [currentTime, setCurrentTime] = useState(new Date());
	const [loading, setLoading] = useState(true);
	const [isLive, setIsLive] = useState(false);

	useEffect(() => {
		fetchData();

		// Update current time every second
		const timeInterval = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		// Simulate system status updates
		const statusInterval = setInterval(() => {
			setSystemStatus((prev) => ({
				...prev,
				activeMics: Math.floor(Math.random() * (prev.microphones + 1)),
			}));
		}, 5000);

		return () => {
			clearInterval(timeInterval);
			clearInterval(statusInterval);
		};
	}, [eventId]);

	const fetchData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/live-board`);
			if (response.ok) {
				const data = await response.json();
				setPerformanceOrder(data.performanceOrder || []);
				setIsLive(data.isLive || false);
			}
		} catch (error) {
			console.error("Error fetching live board data:", error);
			toast({
				title: "Error",
				description: "Failed to load live board data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const updatePerformanceStatus = async (
		performanceId: string,
		status: string
	) => {
		try {
			const response = await fetch(`/api/events/${eventId}/live-board`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					performanceId,
					status,
					timestamp: new Date().toISOString(),
				}),
			});

			if (response.ok) {
				toast({
					title: "Status Updated",
					description: `Performance marked as ${status}`,
				});
				fetchData();
			} else {
				throw new Error("Failed to update status");
			}
		} catch (error) {
			console.error("Error updating status:", error);
			toast({
				title: "Error",
				description: "Failed to update performance status",
				variant: "destructive",
			});
		}
	};

	const getCurrentPerformance = () => {
		return performanceOrder.find((slot) => slot.status === "on-stage");
	};

	const getNextPerformance = () => {
		return performanceOrder.find(
			(slot) => slot.status === "ready" || slot.status === "waiting"
		);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "waiting":
				return "bg-gray-100 text-gray-800";
			case "ready":
				return "bg-blue-100 text-blue-800";
			case "on-stage":
				return "bg-green-100 text-green-800";
			case "completed":
				return "bg-purple-100 text-purple-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getSystemStatusColor = (status: string) => {
		switch (status) {
			case "good":
				return "text-green-600";
			case "warning":
				return "text-yellow-600";
			case "error":
				return "text-red-600";
			default:
				return "text-gray-600";
		}
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading live board...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 py-8">
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
									Live Performance Board
								</h1>
								<p className="text-gray-600">
									Real-time performance monitoring and control
								</p>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="text-right">
								<p className="text-2xl font-bold text-gray-900">
									{formatTime(currentTime)}
								</p>
								<p className="text-sm text-gray-500">
									{currentTime.toLocaleDateString()}
								</p>
							</div>
							<Badge
								variant="outline"
								className={`${
									isLive
										? "text-red-600 border-red-600"
										: "text-gray-600 border-gray-600"
								}`}
							>
								<div
									className={`w-2 h-2 rounded-full mr-2 ${
										isLive
											? "bg-red-600 animate-pulse"
											: "bg-gray-600"
									}`}
								></div>
								{isLive ? "LIVE" : "OFFLINE"}
							</Badge>
						</div>
					</div>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					{/* Current Performance */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<Card className="mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Play className="h-5 w-5" />
									On Stage Now
								</CardTitle>
							</CardHeader>
							<CardContent>
								{getCurrentPerformance() ? (
									<div className="text-center">
										<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
											<Monitor className="h-8 w-8 text-red-600" />
										</div>
										<h3 className="text-lg font-semibold mb-2">
											{
												getCurrentPerformance()
													?.artistName
											}
										</h3>
										<Badge className="mb-3 bg-green-100 text-green-800">
											{getCurrentPerformance()?.style}
										</Badge>
										<div className="text-sm text-gray-500 space-y-1">
											<p className="flex items-center justify-center gap-1">
												<Clock className="h-3 w-3" />
												Started:{" "}
												{getCurrentPerformance()
													?.actualStartTime ||
													getCurrentPerformance()
														?.startTime}
											</p>
											<p className="flex items-center justify-center gap-1">
												<Timer className="h-3 w-3" />
												Duration:{" "}
												{
													getCurrentPerformance()
														?.duration
												}{" "}
												min
											</p>
										</div>
										<div className="flex gap-2 mt-4">
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													updatePerformanceStatus(
														getCurrentPerformance()!
															.id,
														"completed"
													)
												}
												className="flex-1"
											>
												<CheckCircle className="h-3 w-3 mr-1" />
												Complete
											</Button>
										</div>
									</div>
								) : (
									<div className="text-center text-gray-500">
										<Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No performance on stage</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Next Up */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<SkipForward className="h-5 w-5" />
									Next Up
								</CardTitle>
							</CardHeader>
							<CardContent>
								{getNextPerformance() ? (
									<div className="text-center">
										<h3 className="font-semibold mb-2">
											{getNextPerformance()?.artistName}
										</h3>
										<Badge
											variant="secondary"
											className="mb-3"
										>
											{getNextPerformance()?.style}
										</Badge>
										<p className="text-sm text-gray-500 mb-4">
											Scheduled:{" "}
											{getNextPerformance()?.startTime}
										</p>
										<div className="flex gap-2">
											<Button
												size="sm"
												onClick={() =>
													updatePerformanceStatus(
														getNextPerformance()!
															.id,
														"ready"
													)
												}
												className="flex-1 bg-blue-600 hover:bg-blue-700"
											>
												Mark Ready
											</Button>
											<Button
												size="sm"
												onClick={() =>
													updatePerformanceStatus(
														getNextPerformance()!
															.id,
														"on-stage"
													)
												}
												className="flex-1 bg-green-600 hover:bg-green-700"
											>
												Start
											</Button>
										</div>
									</div>
								) : (
									<div className="text-center text-gray-500">
										<Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
										<p className="text-sm">
											No upcoming performances
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</motion.div>

					{/* Performance Queue */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="lg:col-span-2"
					>
						<Card>
							<CardHeader>
								<CardTitle>Performance Queue</CardTitle>
								<CardDescription>
									Real-time status of all performances
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{performanceOrder.map(
										(performance, index) => (
											<div
												key={performance.id}
												className={`p-4 border rounded-lg transition-all ${
													performance.status ===
													"on-stage"
														? "bg-green-50 border-green-200 shadow-md"
														: performance.status ===
														  "ready"
														? "bg-blue-50 border-blue-200"
														: performance.status ===
														  "completed"
														? "bg-gray-50 border-gray-200 opacity-75"
														: "bg-white hover:bg-gray-50"
												}`}
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-4">
														<div
															className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
																performance.status ===
																"on-stage"
																	? "bg-green-200 text-green-800"
																	: performance.status ===
																	  "ready"
																	? "bg-blue-200 text-blue-800"
																	: performance.status ===
																	  "completed"
																	? "bg-gray-200 text-gray-600"
																	: "bg-yellow-100 text-yellow-800"
															}`}
														>
															{index + 1}
														</div>
														<div>
															<h3 className="font-semibold">
																{
																	performance.artistName
																}
															</h3>
															<div className="flex items-center gap-3 text-sm text-gray-500">
																<Badge variant="secondary">
																	{
																		performance.style
																	}
																</Badge>
																<span>
																	{
																		performance.startTime
																	}{" "}
																	-{" "}
																	{
																		performance.endTime
																	}
																</span>
																<span>
																	{
																		performance.duration
																	}{" "}
																	min
																</span>
															</div>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															className={getStatusColor(
																performance.status
															)}
														>
															{performance.status
																.replace(
																	"-",
																	" "
																)
																.toUpperCase()}
														</Badge>
														<div className="flex gap-1">
															{performance.status ===
																"waiting" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		updatePerformanceStatus(
																			performance.id,
																			"ready"
																		)
																	}
																>
																	Ready
																</Button>
															)}
															{performance.status ===
																"ready" && (
																<Button
																	size="sm"
																	onClick={() =>
																		updatePerformanceStatus(
																			performance.id,
																			"on-stage"
																		)
																	}
																	className="bg-green-600 hover:bg-green-700"
																>
																	Start
																</Button>
															)}
															{performance.status ===
																"on-stage" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		updatePerformanceStatus(
																			performance.id,
																			"completed"
																		)
																	}
																>
																	Complete
																</Button>
															)}
														</div>
													</div>
												</div>
											</div>
										)
									)}
								</div>

								{performanceOrder.length === 0 && (
									<div className="text-center py-8 text-gray-500">
										<Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<h3 className="text-lg font-medium mb-2">
											No performances scheduled
										</h3>
										<p>
											The performance queue will appear
											here once the show begins
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</motion.div>

					{/* System Status */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						<Card className="mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<AlertTriangle className="h-5 w-5" />
									System Status
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Audio System
									</span>
									<div
										className={`flex items-center gap-1 ${getSystemStatusColor(
											systemStatus.audio
										)}`}
									>
										<Volume2 className="h-4 w-4" />
										<span className="text-sm capitalize">
											{systemStatus.audio}
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Lighting
									</span>
									<div
										className={`flex items-center gap-1 ${getSystemStatusColor(
											systemStatus.lighting
										)}`}
									>
										<div className="w-4 h-4 rounded-full bg-current opacity-20"></div>
										<span className="text-sm capitalize">
											{systemStatus.lighting}
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Stage
									</span>
									<div
										className={`flex items-center gap-1 ${getSystemStatusColor(
											systemStatus.stage === "clear"
												? "good"
												: "warning"
										)}`}
									>
										<Monitor className="h-4 w-4" />
										<span className="text-sm capitalize">
											{systemStatus.stage}
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Microphones
									</span>
									<div className="flex items-center gap-1 text-blue-600">
										<Mic className="h-4 w-4" />
										<span className="text-sm">
											{systemStatus.activeMics}/
											{systemStatus.microphones}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Quick Actions */}
						<Card>
							<CardHeader>
								<CardTitle>Quick Actions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button
									variant="outline"
									className="w-full justify-start"
									onClick={() => setIsLive(!isLive)}
								>
									<div
										className={`w-3 h-3 rounded-full mr-2 ${
											isLive
												? "bg-red-600"
												: "bg-gray-400"
										}`}
									></div>
									{isLive ? "Go Offline" : "Go Live"}
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<Pause className="h-4 w-4 mr-2" />
									Emergency Stop
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<Volume2 className="h-4 w-4 mr-2" />
									Audio Check
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<AlertTriangle className="h-4 w-4 mr-2" />
									System Alert
								</Button>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
