import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/mobile.css";
import { AuthProvider } from "@/components/auth-provider";
import { AuthStateHandler } from "@/components/auth-state-handler";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "FAME - Event Management System",
	description:
		"Comprehensive event management application for stage managers",
	generator: "v0.dev",
	viewport: {
		width: "device-width",
		initialScale: 1,
		maximumScale: 1,
		userScalable: false,
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<AuthProvider>
					<AuthStateHandler>{children}</AuthStateHandler>
					<Toaster />
				</AuthProvider>
			</body>
		</html>
	);
}
