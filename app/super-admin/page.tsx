"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
	Check,
	X,
	Shield,
	LogOut,
	UserCheck,
	UserX,
	UserMinus,
	Clock,
	AlertCircle,
	CheckCircle,
	Music,
	Mic,
	Users,
} from "lucide-react";
import Image from "next/image";
import {
	SuperAdminData,
	User,
	StageManagerRegistration,
} from "@/lib/types/user";

interface Artist {
	id: string;
	artistName: string;
	realName?: string;
	email: string;
	phone?: string;
	style: string;
	eventId: string;
	eventName: string;
	status: "active" | "inactive";
	createdAt: string;
	lastLogin?: string;
}

interface NotificationState {
	show: boolean;
	message: string;
	type: "success" | "error" | "info";
}

export default function SuperAdminPage() {
	const { user, logout } = useAuth();
	const { toast } = useToast();
	const [data, setData] = useState<SuperAdminData | null>(null);
	const [artistsData, setArtistsData] = useState<{
		allArtists: Artist[];
		totalArtists: number;
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [eventId, setEventId] = useState("");
	const [subEnd, setSubEnd] = useState("2025-12-31");

	useEffect(() => {
		(async () => {
			// Fetch stage managers data
			const res = await fetch("/api/super-admin/stage-managers", {
				cache: "no-store",
			});
			if (res.ok) setData(await res.json());

			// Fetch artists data
			const artistsRes = await fetch("/api/super-admin/artists", {
				cache: "no-store",
			});
			if (artistsRes.ok) setArtistsData(await artistsRes.json());

			setLoading(false);
		})();
	}, []);

	const refresh = async () => {
		try {
			const res = await fetch("/api/super-admin/stage-managers", {
				cache: "no-store",
			});
			if (res.ok) {
				setData(await res.json());
			} else {
				toast({
					title: "Error",
					description: "Failed to fetch stage managers data",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Network error occurred",
				variant: "destructive",
			});
		}
	};

	const act = async (action: string, stageManagerId: string) => {
		setActionLoading(stageManagerId);
		try {
			const res = await fetch("/api/super-admin/stage-managers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					stageManagerId,
					eventId,
					subscriptionEndDate: subEnd,
				}),
			});

			if (res.ok) {
				const result = await res.json();
				toast({
					title: "Success",
					description:
						result.message ||
						`Action ${action} completed successfully`,
					variant: "default",
				});
				await refresh();
			} else {
				const error = await res.json();
				toast({
					title: "Error",
					description:
						error.error || `Failed to ${action} stage manager`,
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Network error occurred",
				variant: "destructive",
			});
		} finally {
			setActionLoading(null);
		}
	};

	const updateArtistStatus = async (artistId: string, status: string) => {
		setActionLoading(artistId);
		try {
			const res = await fetch("/api/super-admin/artists", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "updateStatus",
					artistId,
					status,
				}),
			});

			if (res.ok) {
				const result = await res.json();
				toast({
					title: "Success",
					description:
						result.message || `Artist status updated to ${status}`,
					variant: "default",
				});

				// Refresh artists data
				const artistsRes = await fetch("/api/super-admin/artists", {
					cache: "no-store",
				});
				if (artistsRes.ok) {
					setArtistsData(await artistsRes.json());
				}
			} else {
				const error = await res.json();
				toast({
					title: "Error",
					description:
						error.error || `Failed to update artist status`,
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error",
				description: "Network error occurred",
				variant: "destructive",
			});
		} finally {
			setActionLoading(null);
		}
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
									Super Admin
								</h1>
								<p className="text-sm text-gray-500">
									{user?.name}
								</p>
							</div>
						</div>
						<Button variant="outline" onClick={logout}>
							<LogOut className="h-4 w-4 mr-2" />
							Logout
						</Button>
					</div>
				</div>
			</header>

			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
				{/* Statistics Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<Clock className="h-8 w-8 text-yellow-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										Pending
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{data?.pendingRegistrations?.length ||
											0}
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
										Active
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{data?.activeStageManagers?.length || 0}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<AlertCircle className="h-8 w-8 text-red-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										Suspended
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{data?.suspendedStageManagers?.length ||
											0}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<UserCheck className="h-8 w-8 text-blue-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										Total SM
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{data?.allStageManagers?.length || 0}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center">
								<Music className="h-8 w-8 text-purple-600" />
								<div className="ml-4">
									<p className="text-sm font-medium text-gray-600">
										Artists
									</p>
									<p className="text-2xl font-bold text-gray-900">
										{artistsData?.totalArtists || 0}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Tabs for Stage Managers and Artists */}
				<Tabs defaultValue="stage-managers" className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger
							value="stage-managers"
							className="flex items-center gap-2"
						>
							<Users className="h-4 w-4" />
							Stage Managers
						</TabsTrigger>
						<TabsTrigger
							value="artists"
							className="flex items-center gap-2"
						>
							<Music className="h-4 w-4" />
							Artists
						</TabsTrigger>
					</TabsList>

					<TabsContent value="stage-managers" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Pending Registrations</CardTitle>
								<CardDescription>
									Approve or reject new Stage Managers
								</CardDescription>
							</CardHeader>
							<CardContent>
								{loading ? (
									<div>Loading...</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Name</TableHead>
												<TableHead>Email</TableHead>
												<TableHead>Event</TableHead>
												<TableHead>
													Registered
												</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(
												data?.pendingRegistrations || []
											).map((r: any, idx: number) => (
												<TableRow
													key={`reg-${String(
														r.id
													)}-${idx}`}
												>
													<TableCell>
														{r.name}
													</TableCell>
													<TableCell>
														{r.email}
													</TableCell>
													<TableCell>
														{r.eventName || "-"}
													</TableCell>
													<TableCell className="text-sm text-gray-600">
														{r.createdAt
															? new Date(
																	r.createdAt
															  ).toLocaleDateString()
															: "-"}
													</TableCell>
													<TableCell>
														<Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit">
															<Clock className="h-3 w-3" />
															Pending
														</Badge>
													</TableCell>
													<TableCell className="space-x-2">
														<Button
															size="sm"
															onClick={() =>
																act(
																	"approve",
																	r.id
																)
															}
															disabled={
																actionLoading ===
																r.id
															}
															className="bg-green-600 hover:bg-green-700"
														>
															{actionLoading ===
															r.id ? (
																<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
															) : (
																<UserCheck className="h-4 w-4 mr-1" />
															)}
															Approve
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																act(
																	"reject",
																	r.id
																)
															}
															disabled={
																actionLoading ===
																r.id
															}
															className="border-red-300 text-red-700 hover:bg-red-50"
														>
															{actionLoading ===
															r.id ? (
																<div className="h-4 w-4 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
															) : (
																<UserX className="h-4 w-4 mr-1" />
															)}
															Reject
														</Button>
													</TableCell>
												</TableRow>
											))}
											{(!data ||
												data.pendingRegistrations
													?.length === 0) && (
												<TableRow>
													<TableCell
														colSpan={6}
														className="text-center text-sm text-gray-500"
													>
														No pending registrations
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Stage Managers</CardTitle>
								<CardDescription>
									Manage account status
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Email</TableHead>
											<TableHead>Event</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Last Updated</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(data?.allStageManagers || []).map(
											(u: any, idx: number) => (
												<TableRow
													key={`user-${String(
														u.id
													)}-${idx}`}
												>
													<TableCell className="font-medium">
														{u.name}
													</TableCell>
													<TableCell>
														{u.email}
													</TableCell>
													<TableCell>
														{u.eventId || "-"}
													</TableCell>
													<TableCell>
														<Badge
															className={`flex items-center gap-1 w-fit ${
																u.accountStatus ===
																"active"
																	? "bg-green-100 text-green-800"
																	: u.accountStatus ===
																	  "suspended"
																	? "bg-red-100 text-red-800"
																	: u.accountStatus ===
																	  "deactivated"
																	? "bg-gray-100 text-gray-800"
																	: "bg-blue-100 text-blue-800"
															}`}
														>
															{u.accountStatus ===
																"active" && (
																<CheckCircle className="h-3 w-3" />
															)}
															{u.accountStatus ===
																"suspended" && (
																<AlertCircle className="h-3 w-3" />
															)}
															{u.accountStatus ===
																"deactivated" && (
																<UserMinus className="h-3 w-3" />
															)}
															{u.accountStatus}
														</Badge>
													</TableCell>
													<TableCell className="text-sm text-gray-600">
														{u.statusUpdatedAt
															? new Date(
																	u.statusUpdatedAt
															  ).toLocaleDateString()
															: u.approvedAt
															? new Date(
																	u.approvedAt
															  ).toLocaleDateString()
															: u.createdAt
															? new Date(
																	u.createdAt
															  ).toLocaleDateString()
															: "-"}
													</TableCell>
													<TableCell className="space-x-2">
														{u.accountStatus !==
															"active" && (
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	act(
																		"activate",
																		u.id
																	)
																}
																disabled={
																	actionLoading ===
																	u.id
																}
																className="border-green-300 text-green-700 hover:bg-green-50"
															>
																{actionLoading ===
																u.id ? (
																	<div className="h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
																) : (
																	<UserCheck className="h-4 w-4 mr-1" />
																)}
																Activate
															</Button>
														)}
														{u.accountStatus !==
															"suspended" && (
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	act(
																		"suspend",
																		u.id
																	)
																}
																disabled={
																	actionLoading ===
																	u.id
																}
																className="border-red-300 text-red-700 hover:bg-red-50"
															>
																{actionLoading ===
																u.id ? (
																	<div className="h-4 w-4 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
																) : (
																	<AlertCircle className="h-4 w-4 mr-1" />
																)}
																Suspend
															</Button>
														)}
														{u.accountStatus !==
															"deactivated" && (
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	act(
																		"deactivate",
																		u.id
																	)
																}
																disabled={
																	actionLoading ===
																	u.id
																}
																className="border-gray-400 text-gray-700 hover:bg-gray-50"
															>
																{actionLoading ===
																u.id ? (
																	<div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
																) : (
																	<UserMinus className="h-4 w-4 mr-1" />
																)}
																Deactivate
															</Button>
														)}
													</TableCell>
												</TableRow>
											)
										)}
										{(!data ||
											data.allStageManagers?.length ===
												0) && (
											<TableRow>
												<TableCell
													colSpan={6}
													className="text-center text-sm text-gray-500"
												>
													No stage managers
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="artists" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>All Artists</CardTitle>
								<CardDescription>
									Manage artist accounts across all events
								</CardDescription>
							</CardHeader>
							<CardContent>
								{loading ? (
									<div>Loading...</div>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>
													Artist Name
												</TableHead>
												<TableHead>Real Name</TableHead>
												<TableHead>Email</TableHead>
												<TableHead>Style</TableHead>
												<TableHead>Event</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>
													Registered
												</TableHead>
												<TableHead>Actions</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(
												artistsData?.allArtists || []
											).map(
												(artist: any, idx: number) => (
													<TableRow
														key={`artist-${String(
															artist.id
														)}-${idx}`}
													>
														<TableCell className="font-medium">
															{artist.artistName}
														</TableCell>
														<TableCell>
															{artist.realName}
														</TableCell>
														<TableCell>
															{artist.email}
														</TableCell>
														<TableCell>
															<Badge variant="secondary">
																{artist.style}
															</Badge>
														</TableCell>
														<TableCell>
															{artist.eventName ||
																artist.eventId}
														</TableCell>
														<TableCell>
															<Badge
																className={`flex items-center gap-1 w-fit ${
																	artist.status ===
																	"active"
																		? "bg-green-100 text-green-800"
																		: artist.status ===
																		  "approved"
																		? "bg-blue-100 text-blue-800"
																		: artist.status ===
																		  "pending"
																		? "bg-yellow-100 text-yellow-800"
																		: artist.status ===
																		  "rejected"
																		? "bg-red-100 text-red-800"
																		: "bg-gray-100 text-gray-800"
																}`}
															>
																{artist.status ===
																	"active" && (
																	<CheckCircle className="h-3 w-3" />
																)}
																{artist.status ===
																	"approved" && (
																	<CheckCircle className="h-3 w-3" />
																)}
																{artist.status ===
																	"pending" && (
																	<Clock className="h-3 w-3" />
																)}
																{artist.status ===
																	"rejected" && (
																	<AlertCircle className="h-3 w-3" />
																)}
																{artist.status ===
																	"inactive" && (
																	<AlertCircle className="h-3 w-3" />
																)}
																{artist.status}
															</Badge>
														</TableCell>
														<TableCell className="text-sm text-gray-600">
															{artist.createdAt
																? new Date(
																		artist.createdAt
																  ).toLocaleDateString()
																: "-"}
														</TableCell>
														<TableCell className="space-x-2">
															{artist.status !==
																"active" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		updateArtistStatus(
																			artist.id,
																			"active"
																		)
																	}
																	disabled={
																		actionLoading ===
																		artist.id
																	}
																	className="border-green-300 text-green-700 hover:bg-green-50"
																>
																	{actionLoading ===
																	artist.id ? (
																		<div className="h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
																	) : (
																		<CheckCircle className="h-4 w-4 mr-1" />
																	)}
																	Activate
																</Button>
															)}
															{artist.status !==
																"inactive" && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		updateArtistStatus(
																			artist.id,
																			"inactive"
																		)
																	}
																	disabled={
																		actionLoading ===
																		artist.id
																	}
																	className="border-red-300 text-red-700 hover:bg-red-50"
																>
																	{actionLoading ===
																	artist.id ? (
																		<div className="h-4 w-4 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
																	) : (
																		<AlertCircle className="h-4 w-4 mr-1" />
																	)}
																	Deactivate
																</Button>
															)}
														</TableCell>
													</TableRow>
												)
											)}
											{(!artistsData ||
												artistsData.allArtists
													?.length === 0) && (
												<TableRow>
													<TableCell
														colSpan={8}
														className="text-center text-sm text-gray-500"
													>
														No artists found
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
