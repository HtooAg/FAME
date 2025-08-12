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
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	Calendar,
	Clock,
	Users,
	Plus,
	Edit,
	Trash2,
	CheckCircle,
	AlertCircle,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface RehearsalSession {
	id: string;
	artistId: string;
	artistName: string;
	date: string;
	startTime: string;
	endTime: string;
	status: "scheduled" | "completed" | "cancelled";
	notes?: string;
}

export default function RehearsalManagement() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();
	const eventId = params.eventId as string;

	const [rehearsals, setRehearsals] = useState<RehearsalSession[]>([]);
	const [artists, setArtists] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRehearsal, setEditingRehearsal] =
		useState<RehearsalSession | null>(null);
	const [formData, setFormData] = useState({
		artistId: "",
		date: "",
		startTime: "",
		endTime: "",
		notes: "",
	});

	useEffect(() => {
		fetchData();
	}, [eventId]);

	const fetchData = async () => {
		try {
			// Fetch rehearsals
			const rehearsalResponse = await fetch(
				`/api/events/${eventId}/rehearsals`
			);
			if (rehearsalResponse.ok) {
				const rehearsalData = await rehearsalResponse.json();
				setRehearsals(rehearsalData.rehearsals || []);
			}

			// Fetch artists
			const artistResponse = await fetch(
				`/api/events/${eventId}/artists`
			);
			if (artistResponse.ok) {
				const artistData = await artistResponse.json();
				setArtists(artistData.artists || []);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to load rehearsal data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const method = editingRehearsal ? "PATCH" : "POST";
			const url = editingRehearsal
				? `/api/events/${eventId}/rehearsals`
				: `/api/events/${eventId}/rehearsals`;

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					rehearsalId: editingRehearsal?.id,
				}),
			});

			if (response.ok) {
				toast({
					title: "Success",
					description: editingRehearsal
						? "Rehearsal updated successfully"
						: "Rehearsal scheduled successfully",
				});
				setIsDialogOpen(false);
				setEditingRehearsal(null);
				setFormData({
					artistId: "",
					date: "",
					startTime: "",
					endTime: "",
					notes: "",
				});
				fetchData();
			} else {
				throw new Error("Failed to save rehearsal");
			}
		} catch (error) {
			console.error("Error saving rehearsal:", error);
			toast({
				title: "Error",
				description: "Failed to save rehearsal",
				variant: "destructive",
			});
		}
	};

	const handleEdit = (rehearsal: RehearsalSession) => {
		setEditingRehearsal(rehearsal);
		setFormData({
			artistId: rehearsal.artistId,
			date: rehearsal.date,
			startTime: rehearsal.startTime,
			endTime: rehearsal.endTime,
			notes: rehearsal.notes || "",
		});
		setIsDialogOpen(true);
	};

	const handleDelete = async (rehearsalId: string) => {
		try {
			const response = await fetch(`/api/events/${eventId}/rehearsals`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ rehearsalId }),
			});

			if (response.ok) {
				toast({
					title: "Success",
					description: "Rehearsal deleted successfully",
				});
				fetchData();
			} else {
				throw new Error("Failed to delete rehearsal");
			}
		} catch (error) {
			console.error("Error deleting rehearsal:", error);
			toast({
				title: "Error",
				description: "Failed to delete rehearsal",
				variant: "destructive",
			});
		}
	};

	const updateStatus = async (rehearsalId: string, status: string) => {
		try {
			const response = await fetch(`/api/events/${eventId}/rehearsals`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ rehearsalId, status }),
			});

			if (response.ok) {
				toast({
					title: "Success",
					description: `Rehearsal marked as ${status}`,
				});
				fetchData();
			} else {
				throw new Error("Failed to update status");
			}
		} catch (error) {
			console.error("Error updating status:", error);
			toast({
				title: "Error",
				description: "Failed to update rehearsal status",
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

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading rehearsal data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
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
									Schedule and manage rehearsal sessions
								</p>
							</div>
						</div>
						<Dialog
							open={isDialogOpen}
							onOpenChange={setIsDialogOpen}
						>
							<DialogTrigger asChild>
								<Button className="bg-blue-600 hover:bg-blue-700">
									<Plus className="h-4 w-4 mr-2" />
									Schedule Rehearsal
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										{editingRehearsal
											? "Edit Rehearsal"
											: "Schedule New Rehearsal"}
									</DialogTitle>
									<DialogDescription>
										Set up a rehearsal session for an artist
									</DialogDescription>
								</DialogHeader>
								<form
									onSubmit={handleSubmit}
									className="space-y-4"
								>
									<div className="space-y-2">
										<Label htmlFor="artistId">Artist</Label>
										<select
											id="artistId"
											value={formData.artistId}
											onChange={(e) =>
												setFormData({
													...formData,
													artistId: e.target.value,
												})
											}
											className="w-full p-2 border rounded-md"
											required
										>
											<option value="">
												Select an artist
											</option>
											{artists.map((artist) => (
												<option
													key={artist.id}
													value={artist.id}
												>
													{artist.artistName}
												</option>
											))}
										</select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="date">Date</Label>
										<Input
											id="date"
											type="date"
											value={formData.date}
											onChange={(e) =>
												setFormData({
													...formData,
													date: e.target.value,
												})
											}
											required
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="startTime">
												Start Time
											</Label>
											<Input
												id="startTime"
												type="time"
												value={formData.startTime}
												onChange={(e) =>
													setFormData({
														...formData,
														startTime:
															e.target.value,
													})
												}
												required
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="endTime">
												End Time
											</Label>
											<Input
												id="endTime"
												type="time"
												value={formData.endTime}
												onChange={(e) =>
													setFormData({
														...formData,
														endTime: e.target.value,
													})
												}
												required
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="notes">
											Notes (Optional)
										</Label>
										<Input
											id="notes"
											value={formData.notes}
											onChange={(e) =>
												setFormData({
													...formData,
													notes: e.target.value,
												})
											}
											placeholder="Any special notes or requirements"
										/>
									</div>
									<div className="flex gap-2 pt-4">
										<Button
											type="submit"
											className="flex-1"
										>
											{editingRehearsal
												? "Update Rehearsal"
												: "Schedule Rehearsal"}
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setIsDialogOpen(false);
												setEditingRehearsal(null);
												setFormData({
													artistId: "",
													date: "",
													startTime: "",
													endTime: "",
													notes: "",
												});
											}}
										>
											Cancel
										</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>
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
								<Calendar className="h-8 w-8 text-blue-600" />
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
								<Clock className="h-8 w-8 text-yellow-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										Scheduled
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{
											rehearsals.filter(
												(r) => r.status === "scheduled"
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
												(r) => r.status === "completed"
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
								<Users className="h-8 w-8 text-purple-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										Artists
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{artists.length}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* Rehearsals Table */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<Card>
						<CardHeader>
							<CardTitle>Rehearsal Schedule</CardTitle>
							<CardDescription>
								Manage all rehearsal sessions for your event
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Artist</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Time</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Notes</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rehearsals.map((rehearsal) => (
										<TableRow key={rehearsal.id}>
											<TableCell className="font-medium">
												{rehearsal.artistName}
											</TableCell>
											<TableCell>
												{new Date(
													rehearsal.date
												).toLocaleDateString()}
											</TableCell>
											<TableCell>
												{rehearsal.startTime} -{" "}
												{rehearsal.endTime}
											</TableCell>
											<TableCell>
												{getStatusBadge(
													rehearsal.status
												)}
											</TableCell>
											<TableCell className="max-w-xs truncate">
												{rehearsal.notes || "-"}
											</TableCell>
											<TableCell>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															handleEdit(
																rehearsal
															)
														}
													>
														<Edit className="h-4 w-4" />
													</Button>
													{rehearsal.status ===
														"scheduled" && (
														<Button
															variant="outline"
															size="sm"
															onClick={() =>
																updateStatus(
																	rehearsal.id,
																	"completed"
																)
															}
															className="text-green-600 hover:text-green-700"
														>
															<CheckCircle className="h-4 w-4" />
														</Button>
													)}
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															handleDelete(
																rehearsal.id
															)
														}
														className="text-red-600 hover:text-red-700"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{rehearsals.length === 0 && (
								<div className="text-center py-8">
									<Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
									<h3 className="text-lg font-medium text-gray-900 mb-2">
										No rehearsals scheduled
									</h3>
									<p className="text-gray-500">
										Schedule your first rehearsal session to
										get started
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</div>
	);
}
