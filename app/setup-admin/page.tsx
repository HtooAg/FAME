"use client";

import { useState } from "react";
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
import { Loader2, Shield, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";

export default function SetupAdminPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		// Validate passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		// Validate password strength
		if (password.length < 8) {
			setError("Password must be at least 8 characters long");
			setLoading(false);
			return;
		}

		try {
			const response = await fetch("/api/admin/create-super-admin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name, email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				setSuccess(true);
				setName("");
				setEmail("");
				setPassword("");
				setConfirmPassword("");
			} else {
				setError(data.error || "Failed to create super admin account");
			}
		} catch (error) {
			setError("Network error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
						<CardTitle className="text-2xl font-bold text-gray-900">
							Success!
						</CardTitle>
						<CardDescription>
							Super admin account has been created successfully
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-center">
							<p className="text-gray-700 mb-4">
								Your super admin account is now ready to use.
							</p>
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
								<p className="text-sm text-blue-800 font-medium">
									Next Steps:
								</p>
								<ul className="text-sm text-blue-700 mt-2 space-y-1">
									<li>• Go to the login page</li>
									<li>
										• Use your email and password to sign in
									</li>
									<li>
										• You'll be redirected to the super
										admin dashboard
									</li>
								</ul>
							</div>
						</div>
						<Button
							onClick={() => (window.location.href = "/login")}
							className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
						>
							Go to Login
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
							<Shield className="h-8 w-8 text-purple-600" />
						</div>
					</div>
					<CardTitle className="text-2xl font-bold">
						Setup Super Admin
					</CardTitle>
					<CardDescription>
						Create the initial super admin account for FAME
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								placeholder="Enter your full name"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="Enter your email address"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								placeholder="Enter a strong password (min 8 characters)"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">
								Confirm Password
							</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								required
								placeholder="Confirm your password"
							/>
						</div>

						{error && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<Button
							type="submit"
							className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating Account...
								</>
							) : (
								"Create Super Admin Account"
							)}
						</Button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Already have an account?{" "}
							<a
								href="/login"
								className="text-purple-600 hover:underline"
							>
								Sign in here
							</a>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
