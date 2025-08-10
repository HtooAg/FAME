"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const { login, user } = useAuth();
	const router = useRouter();

	// If already authenticated, redirect away from login
	useEffect(() => {
		if (!user) return;
		// Keep UX consistent with middleware and auth-provider
		if (user.role === "super_admin") {
			router.replace("/super-admin");
		} else if (user.role === "stage_manager") {
			router.replace("/stage-manager");
		} else if (user.role === "artist") {
			router.replace("/artist");
		} else if (user.role === "dj") {
			router.replace("/dj");
		}
	}, [user, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			console.log("LoginPage: Attempting login for", email);
			const success = await login(email, password);
			console.log("LoginPage: Login result:", success);
			if (!success) {
				setError(
					"Invalid email or password, or account access restricted"
				);
				setLoading(false);
			} else {
				console.log(
					"LoginPage: Login successful, auth provider should handle redirect"
				);
				// Keep loading state true while redirect happens
				// Don't set loading to false on success
			}
			// If successful, the auth provider will handle the redirect
		} catch (error) {
			console.error("LoginPage: Login error:", error);
			setError("Network error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 p-4">
			<Card className="w-full max-w-md mx-4">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<Image
							src="/fame-logo.png"
							alt="FAME Logo"
							width={80}
							height={80}
						/>
					</div>
					<CardTitle className="text-2xl font-bold">
						Welcome to FAME
					</CardTitle>
					<CardDescription>
						Sign in to your event management account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="Enter your email"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									required
									placeholder="Enter your password"
									className="pr-10"
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									onClick={() =>
										setShowPassword(!showPassword)
									}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
									) : (
										<Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
									)}
								</button>
							</div>
						</div>
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<Button
							type="submit"
							className="w-full"
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Signing in...
								</>
							) : (
								"Sign In"
							)}
						</Button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Need an account?{" "}
							<Link
								href="/register"
								className="text-purple-600 hover:underline"
							>
								Register as Stage Manager
							</Link>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
