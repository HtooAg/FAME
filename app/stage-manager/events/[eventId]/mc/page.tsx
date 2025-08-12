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
import { Textarea } from "@/components/ui/textarea";
import {
	ArrowLeft,
	Mic,
	Users,
	Clock,
	FileText,
	Star,
	Volume2,
	Eye,
	Edit,
	Save,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

interface PerformanceSlot {
	id: string;
	artistName: string;
	realName: string;
	style: string;
	startTime: string;
	endTime: string;
	duration: number;
	biography: string;
	experience: string;
	specialRequirements?: string;
	status: "upcoming" | "current" | "completed";
	mcNotes?: string;
	introduction?: string;
}

interface Announcement {
	id: string;
	type: "general" | "intermission" | "closing";
	title: string;
	content: string;
	timing: string;
}

export default function MCDashboard() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [performanceOrder, setPerformanceOrder] = useState<PerformanceSlot[]>(
		[]
	);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [selectedArtist, setSelectedArtist] =
		useState<PerformanceSlot | null>(null);
	const [loading, setLoading] = useState(true);
	const [editingIntro, setEditingIntro] = useState<string | null>(null);
	const [introText, setIntroText] = useState("");

	useEffect(() => {
		fetchData();
	}, [eventId]);

	const fetchData = async () => {
		try {
			const response = await fetch(`/api/events/${eventId}/mc-dashboard`);
			if (response.ok) {
				const data = await response.json();
				setPerformanceOrder(data.performanceOrder || []);
				setAnnouncements(data.announcements || []);
			}
		} catch (error) {
			console.error("Error fetching MC data:", error);
			toast({
				title: "Error",
				description: "Failed to load MC dashboard data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const saveIntroduction = async (artistId: string, introduction: string) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/mc-dashboard`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						artistId,
						introduction,
					}),
				}
			);

			if (response.ok) {
				toast({
					title: "Success",
					description: "Introduction saved successfully",
				});
				setEditingIntro(null);
				fetchData();
			} else {
				throw new Error("Failed to save introduction");
			}
		} catch (error) {
			console.error("Error saving introduction:", error);
			toast({
				title: "Error",
				description: "Failed to save introduction",
				variant: "destructive",
			});
		}
	};

	const getCurrentPerformance = () => {
		return performanceOrder.find((slot) => slot.status === "current");
	};

	const getUpcomingPerformances = () => {
		return performanceOrder
			.filter((slot) => slot.status === "upcoming")
			.slice(0, 3);
	};

	const getDefaultIntroduction = (artist: PerformanceSlot) => {
		return `Ladies and gentlemen, please welcome to the stage ${artist.artistName}! ${artist.artistName} is a talented ${artist.style} who brings ${artist.duration} minutes of incredible entertainment. Let's give them a warm welcome!`;
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading MC dashboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 py-8">
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
									MC Dashboard
								</h1>
								<p className="text-gray-600">
									Manage introductions and announcements
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className="text-yellow-600 border-yellow-600"
							>
								<Mic className="w-3 h-3 mr-1" />
								MC MODE
							</Badge>
						</div>
					</div>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Current Performance */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
					>
						<Card className="mb-6">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Star className="h-5 w-5" />
									Current Performance
								</CardTitle>
							</CardHeader>
							<CardContent>
								{getCurrentPerformance() ? (
									<div className="text-center">
										<div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
											<Mic className="h-8 w-8 text-yellow-600" />
										</div>
										<h3 className="text-lg font-semibold mb-1">
											{
												getCurrentPerformance()
													?.artistName
											}
										</h3>
										<p className="text-sm text-gray-600 mb-3">
											{getCurrentPerformance()?.realName}
										</p>
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
										<Button
											className="mt-4 w-full"
											onClick={() =>
												setSelectedArtist(
													getCurrentPerformance()!
												)
											}
										>
											<Eye className="h-4 w-4 mr-2" />
											View Details
										</Button>
									</div>
								) : (
									<div className="text-center text-gray-500">
										<Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
										<p>No current performance</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Quick Announcements */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Volume2 className="h-5 w-5" />
									Quick Announcements
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{announcements.map((announcement) => (
									<Button
										key={announcement.id}
										variant="outline"
										className="w-full justify-start text-left h-auto p-3"
									>
										<div>
											<p className="font-medium">
												{announcement.title}
											</p>
											<p className="text-xs text-gray-500 mt-1">
												{announcement.timing}
											</p>
										</div>
									</Button>
								))}
								<Button variant="outline" className="w-full">
									<FileText className="h-4 w-4 mr-2" />
									Custom Announcement
								</Button>
							</CardContent>
						</Card>
					</motion.div>

					{/* Performance Schedule */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="lg:col-span-2"
					>
						<Card>
							<CardHeader>
								<CardTitle>Performance Schedule</CardTitle>
								<CardDescription>
									Artist lineup with introduction notes
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{performanceOrder.map(
										(performance, index) => (
											<div
												key={performance.id}
												className={`p-4 border rounded-lg transition-colors ${
													performance.status ===
													"current"
														? "bg-yellow-50 border-yellow-200"
														: performance.status ===
														  "completed"
														? "bg-gray-50 border-gray-200"
														: "bg-white hover:bg-gray-50"
												}`}
											>
												<div className="flex items-start justify-between">
													<div className="flex items-start gap-4">
														<div
															className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
																performance.status ===
																"current"
																	? "bg-yellow-200 text-yellow-800"
																	: performance.status ===
																	  "completed"
																	? "bg-gray-200 text-gray-600"
																	: "bg-blue-100 text-blue-800"
															}`}
														>
															{index + 1}
														</div>
														<div className="flex-1">
															<div className="flex items-center gap-3 mb-2">
																<h3 className="font-semibold">
																	{
																		performance.artistName
																	}
																</h3>
																<Badge variant="secondary">
																	{
																		performance.style
																	}
																</Badge>
																<span className="text-sm text-gray-500">
																	{
																		performance.startTime
																	}{" "}
																	-{" "}
																	{
																		performance.endTime
																	}
																</span>
															</div>
															<p className="text-sm text-gray-600 mb-2">
																{
																	performance.realName
																}
															</p>

															{/* Introduction Preview */}
															<div className="bg-gray-50 rounded p-3 mb-3">
																<div className="flex items-center justify-between mb-2">
																	<span className="text-sm font-medium text-gray-700">
																		Introduction:
																	</span>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => {
																			setEditingIntro(
																				performance.id
																			);
																			setIntroText(
																				performance.introduction ||
																					getDefaultIntroduction(
																						performance
																					)
																			);
																		}}
																	>
																		<Edit className="h-3 w-3" />
																	</Button>
																</div>
																{editingIntro ===
																performance.id ? (
																	<div className="space-y-2">
																		<Textarea
																			value={
																				introText
																			}
																			onChange={(
																				e
																			) =>
																				setIntroText(
																					e
																						.target
																						.value
																				)
																			}
																			rows={
																				3
																			}
																			className="text-sm"
																		/>
																		<div className="flex gap-2">
																			<Button
																				size="sm"
																				onClick={() =>
																					saveIntroduction(
																						performance.id,
																						introText
																					)
																				}
																			>
																				<Save className="h-3 w-3 mr-1" />
																				Save
																			</Button>
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={() =>
																					setEditingIntro(
																						null
																					)
																				}
																			>
																				Cancel
																			</Button>
																		</div>
																	</div>
																) : (
																	<p className="text-sm text-gray-600">
																		{performance.introduction ||
																			getDefaultIntroduction(
																				performance
																			)}
																	</p>
																)}
															</div>

															{performance.specialRequirements && (
																<div className="text-sm">
																	<span className="font-medium text-amber-700">
																		Special
																		Requirements:
																	</span>
																	<p className="text-amber-600 mt-1">
																		{
																			performance.specialRequirements
																		}
																	</p>
																</div>
															)}
														</div>
													</div>
													<div className="flex gap-2">
														<Dialog>
															<DialogTrigger
																asChild
															>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() =>
																		setSelectedArtist(
																			performance
																		)
																	}
																>
																	<Eye className="h-4 w-4" />
																</Button>
															</DialogTrigger>
															<DialogContent className="max-w-2xl">
																<DialogHeader>
																	<DialogTitle className="flex items-center gap-2">
																		<Users className="h-5 w-5" />
																		{
																			selectedArtist?.artistName
																		}
																	</DialogTitle>
																	<DialogDescription>
																		Artist
																		information
																		and
																		performance
																		details
																	</DialogDescription>
																</DialogHeader>
																{selectedArtist && (
																	<div className="space-y-4">
																		<div className="grid grid-cols-2 gap-4">
																			<div>
																				<h4 className="font-medium text-gray-700">
																					Stage
																					Name
																				</h4>
																				<p>
																					{
																						selectedArtist.artistName
																					}
																				</p>
																			</div>
																			<div>
																				<h4 className="font-medium text-gray-700">
																					Real
																					Name
																				</h4>
																				<p>
																					{
																						selectedArtist.realName
																					}
																				</p>
																			</div>
																			<div>
																				<h4 className="font-medium text-gray-700">
																					Performance
																					Style
																				</h4>
																				<Badge>
																					{
																						selectedArtist.style
																					}
																				</Badge>
																			</div>
																			<div>
																				<h4 className="font-medium text-gray-700">
																					Duration
																				</h4>
																				<p>
																					{
																						selectedArtist.duration
																					}{" "}
																					minutes
																				</p>
																			</div>
																		</div>

																		<div>
																			<h4 className="font-medium text-gray-700 mb-2">
																				Biography
																			</h4>
																			<p className="text-sm text-gray-600">
																				{
																					selectedArtist.biography
																				}
																			</p>
																		</div>

																		<div>
																			<h4 className="font-medium text-gray-700 mb-2">
																				Experience
																			</h4>
																			<p className="text-sm text-gray-600">
																				{
																					selectedArtist.experience
																				}
																			</p>
																		</div>

																		{selectedArtist.specialRequirements && (
																			<div>
																				<h4 className="font-medium text-amber-700 mb-2">
																					Special
																					Requirements
																				</h4>
																				<p className="text-sm text-amber-600">
																					{
																						selectedArtist.specialRequirements
																					}
																				</p>
																			</div>
																		)}
																	</div>
																)}
															</DialogContent>
														</Dialog>
													</div>
												</div>
											</div>
										)
									)}
								</div>

								{performanceOrder.length === 0 && (
									<div className="text-center py-8 text-gray-500">
										<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
										<h3 className="text-lg font-medium mb-2">
											No performances scheduled
										</h3>
										<p>
											The performance schedule will appear
											here once artists are added
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
