"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Calendar, Shield, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ProfilePage() {
	const { user, logout } = useAuth();
	const [profileData, setProfileData] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (user) {
			// Set profile data from user context
			setProfileData({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				accountStatus: user.accountStatus,
				subscriptionStatus: user.subscriptionStatus,
				subscriptionEndDate: user.subscriptionEndDate,
				eventId: user.eventId,
			});
			setLoading(false);
		}
	}, [user]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800";
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			case "suspended":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "Not set";
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading profile...</p>
				</div>
			</div>
		);
	}

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
									Profile Settings
								</h1>
								<p className="text-sm text-gray-500">
									Manage your account information
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

			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Profile Overview */}
					<div className="lg:col-span-1">
						<Card>
							<CardHeader className="text-center">
								<div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
									<User className="h-10 w-10 text-white" />
								</div>
								<CardTitle className="text-xl">
									{profileData?.name}
								</CardTitle>
								<CardDescription>Stage Manager</CardDescription>
								<div className="mt-4">
									<Badge
										className={getStatusColor(
											profileData?.accountStatus
										)}
									>
										{profileData?.accountStatus
											?.charAt(0)
											.toUpperCase() +
											profileData?.accountStatus?.slice(
												1
											)}
									</Badge>
								</div>
							</CardHeader>
						</Card>
					</div>

					{/* Profile Details */}
					<div className="lg:col-span-2 space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center">
									<User className="h-5 w-5 mr-2" />
									Personal Information
								</CardTitle>
								<CardDescription>
									Your basic account information
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<Label htmlFor="name">Full Name</Label>
										<Input
											id="name"
											value={profileData?.name || ""}
											disabled
											className="bg-gray-50"
										/>
									</div>
									<div>
										<Label htmlFor="email">
											Email Address
										</Label>
										<Input
											id="email"
											value={profileData?.email || ""}
											disabled
											className="bg-gray-50"
										/>
									</div>
								</div>
								<div>
									<Label htmlFor="userId">User ID</Label>
									<Input
										id="userId"
										value={profileData?.id || ""}
										disabled
										className="bg-gray-50 font-mono text-sm"
									/>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center">
									<Shield className="h-5 w-5 mr-2" />
									Account Status
								</CardTitle>
								<CardDescription>
									Your account and subscription details
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<Label>Account Status</Label>
										<div className="mt-1">
											<Badge
												className={getStatusColor(
													profileData?.accountStatus
												)}
											>
												{profileData?.accountStatus
													?.charAt(0)
													.toUpperCase() +
													profileData?.accountStatus?.slice(
														1
													)}
											</Badge>
										</div>
									</div>
									<div>
										<Label>Subscription Status</Label>
										<div className="mt-1">
											<Badge className="bg-blue-100 text-blue-800">
												{profileData?.subscriptionStatus
													?.charAt(0)
													.toUpperCase() +
													profileData?.subscriptionStatus?.slice(
														1
													) || "Trial"}
											</Badge>
										</div>
									</div>
								</div>
								<div>
									<Label>Subscription End Date</Label>
									<Input
										value={formatDate(
											profileData?.subscriptionEndDate
										)}
										disabled
										className="bg-gray-50"
									/>
								</div>
								{profileData?.eventId && (
									<div>
										<Label>Assigned Event ID</Label>
										<Input
											value={profileData.eventId}
											disabled
											className="bg-gray-50 font-mono text-sm"
										/>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center">
									<Calendar className="h-5 w-5 mr-2" />
									Registration Details
								</CardTitle>
								<CardDescription>
									Information about your account registration
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="p-4 bg-blue-50 rounded-lg">
									<p className="text-sm text-blue-800 mb-2">
										<strong>Account Information:</strong>
									</p>
									<ul className="text-sm text-blue-700 space-y-1">
										<li>• Role: Stage Manager</li>
										<li>• Account Type: Professional</li>
										<li>
											• Registration Method: Web Interface
										</li>
										<li>
											• Approval Status:{" "}
											{profileData?.accountStatus ===
											"active"
												? "Approved by Admin"
												: "Pending Admin Review"}
										</li>
									</ul>
								</div>

								{profileData?.accountStatus === "pending" && (
									<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
										<p className="text-sm text-yellow-800">
											<strong>Pending Approval:</strong>{" "}
											Your account is currently being
											reviewed by our admin team. You'll
											receive full access once approved.
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
