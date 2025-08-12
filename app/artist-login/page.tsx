"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock } from "lucide-react";

export default function ArtistLogin() {
	const router = useRouter();
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		email: "",
		artistName: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			// In a real app, this would authenticate the artist
			// For now, we'll simulate finding the artist by email and name
			const response = await fetch(`/api/artists/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			if (response.ok) {
				const data = await response.json();
				// Store artist session (in a real app, use proper authentication)
				localStorage.setItem(
					"artistSession",
					JSON.stringify(data.artist)
				);

				toast({
					title: "Login Successful",
					description:
						"Welcome back! Redirecting to your dashboard...",
				});

				// Redirect to artist dashboard
				router.push("/artist-dashboard");
			} else {
				throw new Error("Artist not found");
			}
		} catch (error) {
			console.error("Login error:", error);
			toast({
				title: "Login Failed",
				description:
					"Artist not found. Please check your email and artist name.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
						<User className="h-8 w-8 text-purple-600" />
					</div>
					<CardTitle className="text-2xl font-bold">
						Artist Login
					</CardTitle>
					<p className="text-muted-foreground">
						Access your artist dashboard and manage your profile
					</p>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email Address</Label>
							<div className="relative">
								<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="email"
									type="email"
									placeholder="Enter your email"
									value={formData.email}
									onChange={(e) =>
										setFormData({
											...formData,
											email: e.target.value,
										})
									}
									className="pl-10"
									required
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="artistName">
								Artist/Stage Name
							</Label>
							<div className="relative">
								<User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="artistName"
									placeholder="Enter your artist name"
									value={formData.artistName}
									onChange={(e) =>
										setFormData({
											...formData,
											artistName: e.target.value,
										})
									}
									className="pl-10"
									required
								/>
							</div>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={loading}
						>
							{loading ? "Signing In..." : "Sign In"}
						</Button>
					</form>
					<div className="mt-6 text-center">
						<p className="text-sm text-muted-foreground">
							Don't have an account?{" "}
							<Button
								variant="link"
								className="p-0 h-auto"
								onClick={() => router.push("/")}
							>
								Register for an event
							</Button>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
