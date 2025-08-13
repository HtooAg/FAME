"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useWebSocket } from "@/hooks/useWebSocket";
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
	Calendar,
	Plus,
	Settings,
	Edit,
	Trash2,
	ArrowLeft,
	AlertTriangle,
	Loader2,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { Event } from "@/lib/types/event";
import { motion } from "framer-motion";

export default function EventsManagementPage() {
	const { user } = useAuth();
	const { events, loading, isConnected, requestEvents } = useWebSocket();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Check if user is authorized to access this page
	if (user && user.accountStatus !== "active") {
		if (user.accountStatus === "pending") {
			window.location.href = "/account-pending";
		} else if (user.accountStatus === "suspended") {
			window.location.href = "/account-suspended";
		}
		return null;
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "draft":
				return "bg-gray-100 text-gray-800";
			case "active":
				return "bg-green-100 text-green-800";
			case "completed":
				return "bg-blue-100 text-blue-800";
			case "cancelled":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const handleDeleteClick = (event: Event) => {
		setEventToDelete(event);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!eventToDelete) return;

		try {
			setDeleting(true);
			const response = await fetch(`/api/events/${eventToDelete.id}`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Refresh the events list via WebSocket
				requestEvents();
				setDeleteDialogOpen(false);
				setEventToDelete(null);
			} else {
				console.error("Failed to delete event");
				// TODO: Show error toast
			}
		} catch (error) {
			console.error("Error deleting event:", error);
			// TODO: Show error toast
		} finally {
			setDeleting(false);
		}
	};

	const handleDeleteCancel = () => {
		setDeleteDialogOpen(false);
		setEventToDelete(null);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading events...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-4 sm:py-0 gap-4 sm:gap-0">
						<div className="flex items-center">
							<Link href="/stage-manager" className="mr-4">
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Dashboard
								</Button>
							</Link>
							<Image
								src="/fame-logo.png"
								alt="FAME Logo"
								width={40}
								height={40}
								className="mr-3"
							/>
							<div>
								<h1 className="text-xl font-semibold text-gray-900">
									Events Management
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name} • Stage Manager
								</p>
							</div>
						</div>
						<div className="flex flex-col sm:flex-row gap-2">
							<Button
								variant="outline"
								onClick={requestEvents}
								disabled={loading || !isConnected}
							>
								{loading ? "Loading..." : "Refresh"}
							</Button>
							<Link href="/stage-manager/profile">
								<Button variant="outline">
									<Settings className="h-4 w-4 mr-2" />
									Profile Settings
								</Button>
							</Link>
							<Link href="/stage-manager/events/create">
								<Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
									<Plus className="h-4 w-4 mr-2" />
									Create Event
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</header>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{events.length === 0 ? (
					<motion.div
						className="text-center py-16"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<div className="bg-white rounded-lg shadow-sm p-12 max-w-md mx-auto">
							<Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								No Events Yet
							</h2>
							<p className="text-gray-600 mb-8">
								Create your first event to get started with
								managing shows and performances.
							</p>
							<Link href="/stage-manager/events/create">
								<Button
									size="lg"
									className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
								>
									<Plus className="h-5 w-5 mr-2" />
									Create Your First Event
								</Button>
							</Link>
						</div>
					</motion.div>
				) : (
					<motion.div
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
						initial="hidden"
						animate="visible"
						variants={{
							hidden: {},
							visible: {
								transition: {
									staggerChildren: 0.1,
								},
							},
						}}
					>
						{events.map((event) => (
							<motion.div
								key={event.id}
								variants={{
									hidden: { opacity: 0, y: 20 },
									visible: {
										opacity: 1,
										y: 0,
										transition: { duration: 0.5 },
									},
								}}
							>
								<Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
									<CardHeader>
										<div className="flex justify-between items-start">
											<div className="flex-1">
												<CardTitle className="text-lg font-bold text-gray-900 mb-2">
													{event.name}
												</CardTitle>
												<CardDescription className="text-gray-600">
													{event.venueName}
												</CardDescription>
											</div>
											<Badge
												className={getStatusColor(
													event.status
												)}
											>
												{event.status
													.charAt(0)
													.toUpperCase() +
													event.status.slice(1)}
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											<div className="flex items-center text-sm text-gray-600">
												<Calendar className="h-4 w-4 mr-2" />
												{formatDate(event.startDate)} -{" "}
												{formatDate(event.endDate)}
											</div>

											<p className="text-sm text-gray-700 line-clamp-2">
												{event.description}
											</p>

											{event.showDates.length > 0 && (
												<div className="text-sm text-gray-600">
													<span className="font-medium">
														{event.showDates.length}
													</span>{" "}
													show dates scheduled
												</div>
											)}

											<div className="flex flex-col gap-2 pt-4">
												<Link
													href={`/stage-manager/events/${event.id}`}
												>
													<Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
														<Settings className="h-4 w-4 mr-2" />
														Manage
													</Button>
												</Link>

												<div className="flex flex-col sm:flex-row gap-2">
													<Link
														href={`/stage-manager/events/${event.id}/edit`}
														className="flex-1"
													>
														<Button
															variant="outline"
															className="w-full"
															size="sm"
														>
															<Edit className="h-4 w-4 mr-2" />
															Edit
														</Button>
													</Link>
													<Button
														variant="outline"
														size="sm"
														className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
														onClick={() =>
															handleDeleteClick(
																event
															)
														}
													>
														<Trash2 className="h-4 w-4 mr-2" />
														Delete
													</Button>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</motion.div>
				)}
			</div>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center">
							<AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
							Delete Event
						</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "
							{eventToDelete?.name}"? This action cannot be undone
							and will remove all associated show dates and data.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={handleDeleteCancel}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							disabled={deleting}
						>
							{deleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete Event
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
