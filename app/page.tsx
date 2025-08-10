"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function HomePage() {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		console.log("HomePage useEffect - loading:", loading, "user:", user); // Debug log

		// Add a small delay to avoid conflicts with login redirects
		const redirectTimer = setTimeout(() => {
			if (!loading && user) {
				if (
					user.accountStatus === "suspended" ||
					user.accountStatus === "deactivated"
				) {
					router.push("/account-suspended");
					return;
				}
				switch (user.role) {
					case "super_admin":
						window.location.href = "/super-admin";
						break;
					case "stage_manager":
						if (user.accountStatus === "active") {
							window.location.href = "/stage-manager";
						} else if (user.accountStatus === "pending") {
							window.location.href = "/account-pending";
						} else if (user.accountStatus === "suspended") {
							window.location.href = "/account-suspended";
						}
						break;
					case "artist":
						window.location.href = "/artist";
						break;
					case "dj":
						window.location.href = "/dj";
						break;
					default:
						window.location.href = "/login";
				}
			} else if (!loading && !user) {
				console.log("No user found, staying on landing page"); // Debug log
			}
		}, 200); // Small delay to avoid conflicts

		return () => clearTimeout(redirectTimer);
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
				<Card className="w-96">
					<CardContent className="flex flex-col items-center justify-center p-8">
						<Image
							src="/fame-logo.png"
							alt="FAME Logo"
							width={120}
							height={120}
							className="mb-4"
						/>
						<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
						<p className="mt-4 text-gray-600">Loading FAME...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white overflow-hidden">
			{/* Animated Background */}
			<div className="absolute inset-0">
				<div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
				<motion.div
					className="absolute top-20 left-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl"
					animate={{
						x: [0, 100, 0],
						y: [0, -50, 0],
						scale: [1, 1.2, 1],
					}}
					transition={{
						duration: 8,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute bottom-20 right-20 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl"
					animate={{
						x: [0, -80, 0],
						y: [0, 60, 0],
						scale: [1, 0.8, 1],
					}}
					transition={{
						duration: 10,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"
					animate={{
						x: [-50, 50, -50],
						y: [-30, 30, -30],
						rotate: [0, 180, 360],
					}}
					transition={{
						duration: 12,
						repeat: Infinity,
						ease: "linear",
					}}
				/>
			</div>

			{/* Hero Section */}
			<div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
				<motion.div
					initial={{ opacity: 0, scale: 0.5 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					className="mb-8"
				>
					<div className="relative">
						<motion.div
							className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-30"
							animate={{
								scale: [1, 1.1, 1],
								opacity: [0.3, 0.5, 0.3],
							}}
							transition={{
								duration: 3,
								repeat: Infinity,
								ease: "easeInOut",
							}}
						/>
						<Image
							src="/fame-logo.png"
							alt="FAME Logo"
							width={200}
							height={200}
							className="relative z-10 drop-shadow-2xl"
							priority
						/>
					</div>
				</motion.div>

				<motion.h1
					className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
					initial={{ opacity: 0, y: 50 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.3 }}
				>
					Welcome to FAME
				</motion.h1>

				<motion.p
					className="text-xl sm:text-2xl md:text-3xl mb-12 max-w-4xl px-4 text-gray-300 leading-relaxed"
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.5 }}
				>
					Your Ultimate Event Management Platform for Stage Managers
					and Artists
				</motion.p>

				<motion.div
					className="flex flex-col sm:flex-row gap-6 items-center"
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.7 }}
				>
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Button
							size="lg"
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl px-10 py-6 rounded-full shadow-2xl border-0 font-semibold tracking-wide"
							onClick={() => router.push("/register")}
						>
							Get Started
						</Button>
					</motion.div>

					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						<Button
							size="lg"
							variant="outline"
							className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl px-10 py-6 rounded-full shadow-2xl border-0 font-semibold tracking-wide"
							onClick={() => router.push("/register")}
						>
							Create Free Account
						</Button>
					</motion.div>
				</motion.div>

				<motion.div
					className="mt-12"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.9 }}
				>
					<p className="text-gray-400 text-lg mb-4">
						Already have an account?
					</p>
					<motion.button
						onClick={() => router.push("/login")}
						className="text-purple-400 hover:text-purple-300 text-xl font-semibold underline decoration-2 underline-offset-4 transition-all duration-300"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						Sign in
					</motion.button>
				</motion.div>

				{/* Floating particles */}
				{[...Array(20)].map((_, i) => (
					<motion.div
						key={i}
						className="absolute w-2 h-2 bg-white/20 rounded-full"
						style={{
							left: `${Math.random() * 100}%`,
							top: `${Math.random() * 100}%`,
						}}
						animate={{
							y: [0, -100, 0],
							opacity: [0, 1, 0],
						}}
						transition={{
							duration: 3 + Math.random() * 2,
							repeat: Infinity,
							delay: Math.random() * 2,
							ease: "easeInOut",
						}}
					/>
				))}
			</div>
		</div>
	);
}
