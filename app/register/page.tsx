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

import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export default function RegisterPage() {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		eventName: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const { register } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		if (formData.password !== formData.confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		if (formData.password.length < 6) {
			setError("Password must be at least 6 characters");
			setLoading(false);
			return;
		}

		const ok = await register({
			name: formData.name,
			email: formData.email,
			password: formData.password,
			eventName: formData.eventName,
		});

		if (ok) {
			setSuccess(true);
		} else {
			setError("Registration failed. Please try again.");
		}
		setLoading(false);
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	if (success) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">
							<CheckCircle className="h-16 w-16 text-green-500" />
						</div>
						<CardTitle className="text-2xl font-bold text-green-600">
							Registration Submitted!
						</CardTitle>
						<CardDescription>
							Your registration has been submitted successfully
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center space-y-4">
						<div className="p-4 bg-green-50 rounded-lg">
							<p className="text-sm text-green-800">
								<strong>What happens next?</strong>
							</p>
							<ul className="text-sm text-green-700 mt-2 space-y-1">
								<li>
									{"•"} Our admin team will review your
									application
								</li>
								<li>
									{"•"} You'll receive an email notification
									once approved
								</li>
								<li>
									{"•"} Your free trial will begin upon
									approval
								</li>
							</ul>
						</div>
						<div className="space-y-2">
							<p className="text-sm text-gray-600">
								You can now try to login. If your account is
								still pending approval, you'll be redirected to
								a pending page where you can wait for admin
								approval.
							</p>
							<div className="flex space-x-2 justify-center">
								<Link
									href="/login"
									className="text-purple-600 hover:underline"
								>
									Try Login Now
								</Link>
							</div>
						</div>
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
						<Image
							src="/fame-logo.png"
							alt="FAME Logo"
							width={80}
							height={80}
						/>
					</div>
					<CardTitle className="text-2xl font-bold">
						Join FAME
					</CardTitle>
					<CardDescription>
						Register as a Stage Manager
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								type="text"
								value={formData.name}
								onChange={(e) =>
									handleInputChange("name", e.target.value)
								}
								required
								placeholder="Enter your full name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email Address</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									handleInputChange("email", e.target.value)
								}
								required
								placeholder="Enter your email"
							/>
						</div>
						{/* <div className="space-y-2">
							<Label htmlFor="eventName">
								Event/Organization Name
							</Label>
							<Input
								id="eventName"
								type="text"
								value={formData.eventName}
								onChange={(e) =>
									handleInputChange(
										"eventName",
										e.target.value
									)
								}
								required
								placeholder="e.g., Summer Music Festival 2024"
							/>
						</div> */}
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									value={formData.password}
									onChange={(e) =>
										handleInputChange(
											"password",
											e.target.value
										)
									}
									required
									placeholder="Create a password (min 6 characters)"
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
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">
								Confirm Password
							</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={
										showConfirmPassword
											? "text"
											: "password"
									}
									value={formData.confirmPassword}
									onChange={(e) =>
										handleInputChange(
											"confirmPassword",
											e.target.value
										)
									}
									required
									placeholder="Confirm your password"
									className="pr-10"
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									onClick={() =>
										setShowConfirmPassword(
											!showConfirmPassword
										)
									}
								>
									{showConfirmPassword ? (
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
									Submitting Registration...
								</>
							) : (
								"Register"
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
