"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	NotificationProvider,
	NotificationBell,
} from "@/components/NotificationProvider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	ArrowLeft,
	Clock,
	Music,
	User,
	Star,
	Calendar,
	Plus,
	Edit,
	Eye,
	CheckCircle,
	AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Artist {
	id: string;
	artistName: string;
	realName: string;
	style: string;
	performanceDuration: number;
	status: string;
}

interface Rehearsal {
	id: string;
	eventId: string;
	artistId: string;
	artist: Artist;
	scheduledDate: string;
	scheduledTime: string;
	duration: number;
	status: "scheduled" | "completed" | "cancelled" | "no-show";
	rating: number; // 1-5 stars
	notes: string;
	feedback: string;
	createdAt: string;
	updatedAt: string;
}

export default function RehearsalManagement() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [artists, setArtists] = useState<Artist[]>([]);
	const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedRehearsal, setSelectedRehearsal] =
		useState<Rehearsal | null>(null);
	const [showScheduleDialog, setShowScheduleDialog] = useState(false);
	const [scheduleForm, setScheduleForm] = useState({
		artistId: "",
		scheduledDate: "",
		scheduledTime: "",
		duration: 15,
		notes: "",
	});

	useEffect(() => {
		fetchData();
	}, [eventId]);

	const fetchRehearsals = async () => {
		try {
			const rehearsalsResponse = await fetch(
				`/api/events/${eventId}/rehearsals`
			);
			if (rehearsalsResponse.ok) {
				const rehearsalsData = await rehearsalsResponse.json();
				// Handle the new API response format
				const rehearsalsArray =
					rehearsalsData.data || rehearsalsData.rehearsals || [];
				setRehearsals(rehearsalsArray);
			}
		} catch (error) {
			console.error("Error fetching rehearsals:", error);
		}
	};

	const fetchData = async () => {
		try {
			// Fetch approved artists
			const artistsResponse = await fetch(
				`/api/events/${eventId}/artists`
			);
			if (artistsResponse.ok) {
				const artistsData = await artistsResponse.json();
				const approvedArtists = artistsData.artists.filter(
					(artist: Artist) => artist.status === "approved"
				);
				setArtists(approvedArtists);
			}

			// Fetch rehearsals using the dedicated function
			await fetchRehearsals();
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to load data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const scheduleRehearsal = async () => {
		if (
			!scheduleForm.artistId ||
			!scheduleForm.scheduledDate ||
			!scheduleForm.scheduledTime
		) {
			toast({
				title: "Validation Error",
				description: "Please fill in all required fields",
				variant: "destructive",
			});
			return;
		}

		try {
			const artist = artists.find((a) => a.id === scheduleForm.artistId);
			if (!artist) return;

			const newRehearsal: Rehearsal = {
				id: `rehearsal_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`,
				eventId,
				artistId: scheduleForm.artistId,
				artist,
				scheduledDate: scheduleForm.scheduledDate,
				scheduledTime: scheduleForm.scheduledTime,
				duration: scheduleForm.duration,
				status: "scheduled",
				rating: 0,
				notes: scheduleForm.notes,
				feedback: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			// Calculate end time based on start time and duration
			const calculateEndTime = (
				startTime: string,
				durationMinutes: number
			): string => {
				const [hours, minutes] = startTime.split(":").map(Number);
				const startDate = new Date();
				startDate.setHours(hours, minutes, 0, 0);

				const endDate = new Date(
					startDate.getTime() + durationMinutes * 60000
				);
				const endHours = endDate.getHours().toString().padStart(2, "0");
				const endMinutes = endDate
					.getMinutes()
					.toString()
					.padStart(2, "0");

				return `${endHours}:${endMinutes}`;
			};

			const endTime = calculateEndTime(
				scheduleForm.scheduledTime,
				scheduleForm.duration
			);

			const response = await fetch(`/api/events/${eventId}/rehearsals`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					artistId: scheduleForm.artistId,
					date: scheduleForm.scheduledDate,
					startTime: scheduleForm.scheduledTime,
					endTime: endTime,
					notes: scheduleForm.notes,
				}),
			});

			const data = await response.json();

			if (data.success) {
				// Immediately fetch updated rehearsals from GCS
				await fetchRehearsals();

				setShowScheduleDialog(false);
				setScheduleForm({
					artistId: "",
					scheduledDate: "",
					scheduledTime: "",
					duration: 15,
					notes: "",
				});
				toast({
					title: "Success",
					description: "Rehearsal scheduled successfully",
				});
				// Auto-dismiss success message after 3 seconds
				setTimeout(() => {
					// Toast will auto-dismiss
				}, 3000);
			} else {
				// Handle specific error codes
				let errorMessage = "Failed to schedule rehearsal";

				if (data.error?.code === "VALIDATION_ERROR") {
					errorMessage =
						data.error.message ||
						"Please check your input and try again";
				} else if (data.error?.code === "MISSING_PARAMETERS") {
					errorMessage = "Required information is missing";
				} else if (data.error?.code === "NOT_FOUND") {
					errorMessage = "Artist not found";
				} else if (data.error?.code === "INTERNAL_ERROR") {
					errorMessage =
						"Server error - please try again or contact support";
				} else if (!response.ok) {
					errorMessage =
						"Network error - please check your connection and try again";
				}

				toast({
					title: "Error",
					description: errorMessage,
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error scheduling rehearsal:", error);
			toast({
				title: "Error",
				description:
					"Network error - please check your connection and try again",
				variant: "destructive",
			});
		}
	};

	const updateRehearsalRating = async (
		rehearsalId: string,
		rating: number,
		feedback: string
	) => {
		try {
			const response = await fetch(
				`/api/events/${eventId}/rehearsals/${rehearsalId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						rating,
						feedback,
						status: "completed",
						updatedAt: new Date().toISOString(),
					}),
				}
			);

			if (response.ok) {
				setRehearsals(
					rehearsals.map((r) =>
						r.id === rehearsalId
							? {
									...r,
									rating,
									feedback,
									status: "completed" as const,
									updatedAt: new Date().toISOString(),
							  }
							: r
					)
				);
				toast({
					title: "Success",
					description: "Rehearsal rating updated successfully",
				});
			}
		} catch (error) {
			console.error("Error updating rehearsal:", error);
			toast({
				title: "Error",
				description: "Failed to update rehearsal rating",
				variant: "destructive",
			});
		}
	};

	const getStatusBadge = (status: string) => {
		const statusConfig = {
			scheduled: { color: "bg-blue-100 text-blue-800", icon: Clock },
			completed: {
				color: "bg-green-100 text-green-800",
				icon: CheckCircle,
			},
			cancelled: { color: "bg-red-100 text-red-800", icon: AlertCircle },
			"no-show": {
				color: "bg-gray-100 text-gray-800",
				icon: AlertCircle,
			},
		};

		const config =
			statusConfig[status as keyof typeof statusConfig] ||
			statusConfig.scheduled;
		const Icon = config.icon;

		return (
			<Badge className={`${config.color} flex items-center gap-1 w-fit`}>
				<Icon className="h-3 w-3" />
				{status.charAt(0).toUpperCase() + status.slice(1)}
			</Badge>
		);
	};

	const StarRating = ({
		rating,
		onRatingChange,
		readonly = false,
	}: {
		rating: number;
		onRatingChange?: (rating: number) => void;
		readonly?: boolean;
	}) => {
		return (
			<div className="flex gap-1">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						key={star}
						type="button"
						onClick={() => !readonly && onRatingChange?.(star)}
						disabled={readonly}
						className={`${
							star <= rating ? "text-yellow-400" : "text-gray-300"
						} ${
							!readonly
								? "hover:text-yellow-400 cursor-pointer"
								: "cursor-default"
						}`}
					>
						<Star className="h-5 w-5 fill-current" />
					</button>
				))}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading rehearsals...</p>
				</div>
			</div>
		);
	}

	return (
		<NotificationProvider userRole="stage-manager">
			<div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8">
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
										Rehearsal Management
									</h1>
									<p className="text-gray-600">
										Schedule and rate artist rehearsals
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<NotificationBell />
								<Button
									onClick={() => setShowScheduleDialog(true)}
								>
									<Plus className="h-4 w-4 mr-2" />
									Schedule Rehearsal
								</Button>
							</div>
						</div>
					</motion.div>

					{/* Stats Cards */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
					>
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center">
									<Calendar className="h-8 w-8 text-purple-600" />
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">
											Total Rehearsals
										</p>
										<p className="text-2xl font-bold text-gray-900">
											{rehearsals.length}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center">
									<Clock className="h-8 w-8 text-blue-600" />
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">
											Scheduled
										</p>
										<p className="text-2xl font-bold text-gray-900">
											{
												rehearsals.filter(
													(r) =>
														r.status === "scheduled"
												).length
											}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center">
									<CheckCircle className="h-8 w-8 text-green-600" />
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">
											Completed
										</p>
										<p className="text-2xl font-bold text-gray-900">
											{
												rehearsals.filter(
													(r) =>
														r.status === "completed"
												).length
											}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center">
									<Star className="h-8 w-8 text-yellow-600" />
									<div className="ml-4">
										<p className="text-sm font-medium text-gray-600">
											Avg Rating
										</p>
										<p className="text-2xl font-bold text-gray-900">
											{rehearsals.filter(
												(r) => r.rating > 0
											).length > 0
												? (
														rehearsals.reduce(
															(sum, r) =>
																sum + r.rating,
															0
														) /
														rehearsals.filter(
															(r) => r.rating > 0
														).length
												  ).toFixed(1)
												: "N/A"}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					{/* Rehearsals List */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
					>
						{rehearsals.map((rehearsal) => (
							<Card
								key={rehearsal.id}
								className="hover:shadow-lg transition-shadow"
							>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="text-lg">
												{rehearsal.artist.artistName}
											</CardTitle>
											<p className="text-sm text-muted-foreground">
												{rehearsal.artist.style}
											</p>
										</div>
										{getStatusBadge(rehearsal.status)}
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<p className="text-muted-foreground">
												Date
											</p>
											<p className="font-medium">
												{new Date(
													rehearsal.scheduledDate
												).toLocaleDateString()}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">
												Time
											</p>
											<p className="font-medium">
												{rehearsal.scheduledTime}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">
												Duration
											</p>
											<p className="font-medium">
												{rehearsal.duration} min
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">
												Rating
											</p>
											{rehearsal.rating > 0 ? (
												<StarRating
													rating={rehearsal.rating}
													readonly
												/>
											) : (
												<p className="text-muted-foreground">
													Not rated
												</p>
											)}
										</div>
									</div>

									{rehearsal.notes && (
										<div>
											<p className="text-sm text-muted-foreground">
												Notes
											</p>
											<p className="text-sm">
												{rehearsal.notes}
											</p>
										</div>
									)}

									<div className="flex gap-2">
										<Dialog>
											<DialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setSelectedRehearsal(
															rehearsal
														)
													}
												>
													<Eye className="h-4 w-4 mr-1" />
													View
												</Button>
											</DialogTrigger>
											<DialogContent className="max-w-2xl">
												<DialogHeader>
													<DialogTitle>
														Rehearsal Details
													</DialogTitle>
													<DialogDescription>
														{
															selectedRehearsal
																?.artist
																.artistName
														}{" "}
														-{" "}
														{
															selectedRehearsal
																?.artist.style
														}
													</DialogDescription>
												</DialogHeader>
												{selectedRehearsal && (
													<RehearsalDetailsDialog
														rehearsal={
															selectedRehearsal
														}
														onRatingUpdate={
															updateRehearsalRating
														}
													/>
												)}
											</DialogContent>
										</Dialog>
									</div>
								</CardContent>
							</Card>
						))}
					</motion.div>

					{rehearsals.length === 0 && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="text-center py-12"
						>
							<Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">
								No rehearsals scheduled
							</h3>
							<p className="text-gray-500 mb-4">
								Schedule rehearsals for your approved artists
							</p>
							<Button onClick={() => setShowScheduleDialog(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Schedule First Rehearsal
							</Button>
						</motion.div>
					)}

					{/* Schedule Rehearsal Dialog */}
					<Dialog
						open={showScheduleDialog}
						onOpenChange={setShowScheduleDialog}
					>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Schedule Rehearsal</DialogTitle>
								<DialogDescription>
									Schedule a rehearsal session for an artist
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="artist">Artist</Label>
									<Select
										value={scheduleForm.artistId}
										onValueChange={(value) =>
											setScheduleForm({
												...scheduleForm,
												artistId: value,
											})
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select an artist" />
										</SelectTrigger>
										<SelectContent>
											{artists.map((artist) => (
												<SelectItem
													key={artist.id}
													value={artist.id}
												>
													{artist.artistName} -{" "}
													{artist.style}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="date">Date</Label>
										<Input
											id="date"
											type="date"
											value={scheduleForm.scheduledDate}
											onChange={(e) =>
												setScheduleForm({
													...scheduleForm,
													scheduledDate:
														e.target.value,
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="time">Time</Label>
										<Input
											id="time"
											type="time"
											value={scheduleForm.scheduledTime}
											onChange={(e) =>
												setScheduleForm({
													...scheduleForm,
													scheduledTime:
														e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="duration">
										Duration (minutes)
									</Label>
									<Input
										id="duration"
										type="number"
										min="5"
										max="60"
										value={scheduleForm.duration}
										onChange={(e) =>
											setScheduleForm({
												...scheduleForm,
												duration:
													parseInt(e.target.value) ||
													15,
											})
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="notes">Notes</Label>
									<Textarea
										id="notes"
										placeholder="Any special notes for the rehearsal..."
										value={scheduleForm.notes}
										onChange={(e) =>
											setScheduleForm({
												...scheduleForm,
												notes: e.target.value,
											})
										}
									/>
								</div>
								<div className="flex gap-2">
									<Button
										onClick={scheduleRehearsal}
										className="flex-1"
									>
										Schedule Rehearsal
									</Button>
									<Button
										variant="outline"
										onClick={() =>
											setShowScheduleDialog(false)
										}
									>
										Cancel
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</NotificationProvider>
	);
}

// Rehearsal Details Dialog Component
function RehearsalDetailsDialog({
	rehearsal,
	onRatingUpdate,
}: {
	rehearsal: Rehearsal;
	onRatingUpdate: (
		rehearsalId: string,
		rating: number,
		feedback: string
	) => void;
}) {
	const [rating, setRating] = useState(rehearsal.rating);
	const [feedback, setFeedback] = useState(rehearsal.feedback);

	const StarRating = ({
		rating,
		onRatingChange,
	}: {
		rating: number;
		onRatingChange: (rating: number) => void;
	}) => {
		return (
			<div className="flex gap-1">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						key={star}
						type="button"
						onClick={() => onRatingChange(star)}
						className={`${
							star <= rating ? "text-yellow-400" : "text-gray-300"
						} hover:text-yellow-400 cursor-pointer`}
					>
						<Star className="h-6 w-6 fill-current" />
					</button>
				))}
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label className="text-sm text-muted-foreground">
						Artist
					</Label>
					<p className="font-medium">{rehearsal.artist.artistName}</p>
				</div>
				<div>
					<Label className="text-sm text-muted-foreground">
						Style
					</Label>
					<p className="font-medium">{rehearsal.artist.style}</p>
				</div>
				<div>
					<Label className="text-sm text-muted-foreground">
						Date
					</Label>
					<p className="font-medium">
						{new Date(rehearsal.scheduledDate).toLocaleDateString()}
					</p>
				</div>
				<div>
					<Label className="text-sm text-muted-foreground">
						Time
					</Label>
					<p className="font-medium">{rehearsal.scheduledTime}</p>
				</div>
				<div>
					<Label className="text-sm text-muted-foreground">
						Duration
					</Label>
					<p className="font-medium">{rehearsal.duration} minutes</p>
				</div>
				<div>
					<Label className="text-sm text-muted-foreground">
						Status
					</Label>
					<div className="mt-1">
						<Badge
							variant={
								rehearsal.status === "completed"
									? "default"
									: "secondary"
							}
						>
							{rehearsal.status}
						</Badge>
					</div>
				</div>
			</div>

			{rehearsal.notes && (
				<div>
					<Label className="text-sm text-muted-foreground">
						Notes
					</Label>
					<p className="text-sm mt-1">{rehearsal.notes}</p>
				</div>
			)}

			<div className="space-y-4">
				<div>
					<Label className="text-sm font-medium">
						Performance Rating
					</Label>
					<div className="mt-2">
						<StarRating
							rating={rating}
							onRatingChange={setRating}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="feedback">Feedback</Label>
					<Textarea
						id="feedback"
						placeholder="Provide feedback on the rehearsal performance..."
						value={feedback}
						onChange={(e) => setFeedback(e.target.value)}
						rows={4}
					/>
				</div>

				<Button
					onClick={() =>
						onRatingUpdate(rehearsal.id, rating, feedback)
					}
					className="w-full"
					disabled={rating === 0}
				>
					Save Rating & Feedback
				</Button>
			</div>
		</div>
	);
}
