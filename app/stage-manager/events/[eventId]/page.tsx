"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
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
	Calendar,
	Users,
	Music,
	Settings,
	ExternalLink,
	Copy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Event } from "@/lib/types/event";
import { motion } from "framer-motion";

export default function EventManagementPage() {
	const { user } = useAuth();
	const params = useParams();
	const eventId = params.eventId as string;

	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchEvent();
	}, [eventId]);

	const fetchEvent = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/events/${eventId}`, {
				cache: "no-store",
			});

			if (response.ok) {
				const result = await response.json();
				setEvent(result.data);
			} else {
				console.error("Failed to fetch event");
			}
		} catch (error) {
			console.error("Error fetching event:", error);
		} finally {
			setLoading(false);
		}
	};

	const copyLink = (url: string) => {
		navigator.clipboard.writeText(url);
		// TODO: Show toast notification
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading event...</p>
				</div>
			</div>
		);
	}

	if (!event) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600">Event not found</p>
				</div>
			</div>
		);
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

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<Link href="/stage-manager/events" className="mr-4">
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Back to Events
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
									Event Management
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name} • Stage Manager
								</p>
							</div>
						</div>
						<Badge className={getStatusColor(event.status)}>
							{event.status.charAt(0).toUpperCase() +
								event.status.slice(1)}
						</Badge>
					</div>
				</div>
			</header>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="space-y-8"
				>
					{/* Event Header */}
					<Card className="shadow-lg">
						<CardHeader>
							<div className="flex justify-between items-start">
								<div>
									<CardTitle className="text-3xl font-bold text-gray-900 mb-2">
										{event.name}
									</CardTitle>
									<CardDescription className="text-lg text-gray-600">
										{event.venueName}
									</CardDescription>
									<div className="flex items-center text-sm text-gray-500 mt-2">
										<Calendar className="h-4 w-4 mr-2" />
										{format(
											parseISO(event.startDate),
											"PPP"
										)}{" "}
										-{" "}
										{format(parseISO(event.endDate), "PPP")}
									</div>
								</div>
								<Link
									href={`/stage-manager/events/${eventId}/edit`}
								>
									<Button variant="outline">
										<Settings className="h-4 w-4 mr-2" />
										Edit Event
									</Button>
								</Link>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-gray-700 mb-4">
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
						</CardContent>
					</Card>

					{/* Management Dashboard Grid - Based on uploaded image */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* Artist Portal */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
						>
							<Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
								<CardHeader>
									<div className="flex items-center">
										<Users className="h-6 w-6 text-purple-600 mr-3" />
										<CardTitle className="text-lg">
											Artist Portal
										</CardTitle>
									</div>
									<CardDescription>
										Share links with artists and manage
										submissions
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="p-2 bg-muted rounded-md text-sm break-all">
										{typeof window !== "undefined"
											? `${window.location.origin}/artist-register/${eventId}`
											: `https://fame.com/artist-register/${eventId}`}
									</div>
									<Link
										href={`/stage-manager/events/${eventId}/artists`}
									>
										<Button className="w-full bg-purple-600 hover:bg-purple-700">
											<ExternalLink className="h-4 w-4 mr-2" />
											Manage Artists
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>

						{/* Rehearsal Schedule */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
						>
							<Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
								<CardHeader>
									<div className="flex items-center">
										<Calendar className="h-6 w-6 text-blue-600 mr-3" />
										<CardTitle className="text-lg">
											Rehearsal Schedule
										</CardTitle>
									</div>
									<CardDescription>
										Plan and organize rehearsal times
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={`/stage-manager/events/${eventId}/rehearsal`}
									>
										<Button className="w-full bg-blue-600 hover:bg-blue-700">
											<Calendar className="h-4 w-4 mr-2" />
											Start Rehearsal
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>

						{/* Stage Manager Dashboard */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
						>
							<Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
								<CardHeader>
									<div className="flex items-center">
										<Settings className="h-6 w-6 text-pink-600 mr-3" />
										<CardTitle className="text-lg">
											Stage Manager Dashboard
										</CardTitle>
									</div>
									<CardDescription>
										Set performance order and timing
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={`/stage-manager/events/${eventId}/performance-order`}
									>
										<Button className="w-full bg-pink-600 hover:bg-pink-700">
											<Settings className="h-4 w-4 mr-2" />
											Manage Show Order
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>

						{/* DJ Dashboard */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.4 }}
						>
							<Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
								<CardHeader>
									<div className="flex items-center">
										<Music className="h-6 w-6 text-green-600 mr-3" />
										<CardTitle className="text-lg">
											DJ Dashboard
										</CardTitle>
									</div>
									<CardDescription>
										Access music tracks and performance
										order
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={`/stage-manager/events/${eventId}/dj`}
									>
										<Button className="w-full bg-green-600 hover:bg-green-700">
											<Music className="h-4 w-4 mr-2" />
											Open DJ Dashboard
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>

						{/* MC Dashboard */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.5 }}
						>
							<Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
								<CardHeader>
									<div className="flex items-center">
										<Users className="h-6 w-6 text-yellow-600 mr-3" />
										<CardTitle className="text-lg">
											MC Dashboard
										</CardTitle>
									</div>
									<CardDescription>
										View artist info and announcements
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={`/stage-manager/events/${eventId}/mc`}
									>
										<Button className="w-full bg-yellow-600 hover:bg-yellow-700">
											<Users className="h-4 w-4 mr-2" />
											Open MC Dashboard
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>

						{/* Backstage Live Performance Board */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.6 }}
						>
							<Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105">
								<CardHeader>
									<div className="flex items-center">
										<Settings className="h-6 w-6 text-red-600 mr-3" />
										<CardTitle className="text-lg">
											Backstage Live Performance Board
										</CardTitle>
									</div>
									<CardDescription>
										Real-time performance monitoring and
										display
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Link
										href={`/stage-manager/events/${eventId}/live-board`}
									>
										<Button className="w-full bg-red-600 hover:bg-red-700">
											<ExternalLink className="h-4 w-4 mr-2" />
											Open Live Board
										</Button>
									</Link>
								</CardContent>
							</Card>
						</motion.div>
					</div>

					{/* Show Dates Section */}
					{event.showDates.length > 0 && (
						<Card className="shadow-lg">
							<CardHeader>
								<CardTitle className="text-xl font-bold">
									Scheduled Show Dates
								</CardTitle>
								<CardDescription>
									Manage your event's show schedule
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{event.showDates.map(
										(dateString, index) => (
											<div
												key={dateString}
												className="p-4 bg-purple-50 rounded-lg border"
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center">
														<Calendar className="h-4 w-4 mr-2 text-purple-600" />
														<span className="font-medium">
															{format(
																parseISO(
																	dateString
																),
																"PPP"
															)}
														</span>
													</div>
													<Badge variant="secondary">
														Show #{index + 1}
													</Badge>
												</div>
											</div>
										)
									)}
								</div>
								<div className="mt-4">
									<Link
										href={`/stage-manager/events/${eventId}/show-dates`}
									>
										<Button variant="outline">
											<Calendar className="h-4 w-4 mr-2" />
											Modify Show Dates
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					)}
				</motion.div>
			</div>
		</div>
	);
}
