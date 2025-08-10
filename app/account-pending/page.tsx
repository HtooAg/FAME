"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Clock,
	Mail,
	Phone,
	Home,
	CheckCircle,
	X,
	Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function AccountPendingPage() {
	const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
		"pending"
	);
	const [isChecking, setIsChecking] = useState(false);
	const router = useRouter();
    const { toast } = useToast();

	const checkStatus = async () => {
		setIsChecking(true);
		try {
			const res = await fetch("/api/auth/me", { cache: "no-store" });
			if (res.ok) {
				const data = await res.json();
				if (data.accountStatus === "active") {
					setStatus("approved");
                        toast({
                            title: "Approved",
                            description: "Your account has been approved",
                        });
					setTimeout(() => {
						router.push("/stage-manager");
					}, 2000);
				} else if (data.accountStatus === "rejected") {
					setStatus("rejected");
                        toast({
                            title: "Registration Rejected",
                            description: "Please contact support for help.",
                            variant: "destructive",
                        });
				}
			}
		} catch (error) {
			console.error("Error checking status:", error);
		} finally {
			setIsChecking(false);
		}
	};

	// Auto-check status every 30 seconds
    useEffect(() => {
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    // Real-time status updates via WebSocket
    useEffect(() => {
        let ws: WebSocket | null = null;
        // Ensure WS server is initialized
        fetch("/api/websocket")
            .then(() => {
                ws = new WebSocket("ws://localhost:8080");
                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === "account_status") {
                            const s = String(msg.status || "");
                            if (s === "approved" || s === "active") {
                                setStatus("approved");
                                toast({
                                    title: "Approved",
                                    description: msg.message || "Your account has been approved",
                                });
                                setTimeout(() => router.push("/stage-manager"), 1500);
                            } else if (s === "rejected") {
                                setStatus("rejected");
                                toast({
                                    title: "Registration Rejected",
                                    description: msg.message || "Please contact support for help.",
                                    variant: "destructive",
                                });
                            } else if (s === "subscription_updated") {
                                toast({
                                    title: "Subscription Updated",
                                    description: msg.message || "Your subscription has been updated",
                                });
                            }
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                };
            })
            .catch(() => {});

        return () => {
            try {
                ws?.close();
            } catch {}
        };
    }, []);

	if (status === "approved") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 p-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
						<CardTitle className="text-2xl font-bold text-green-600">
							Account Approved!
						</CardTitle>
						<CardDescription>
							Redirecting to your dashboard...
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (status === "rejected") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-400 to-red-600 p-4">
				<Card className="max-w-md w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
							<X className="h-8 w-8 text-red-600" />
						</div>
						<CardTitle className="text-2xl font-bold text-red-600">
							Account Rejected
						</CardTitle>
						<CardDescription>
							Your registration was not approved
						</CardDescription>
					</CardHeader>
					<CardContent className="text-center space-y-4">
						<p className="text-sm text-gray-600">
							Please contact support for more information.
						</p>
						<Link href="/login" className="w-full">
							<Button variant="outline" className="w-full">
								Back to Login
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
						<Clock className="h-8 w-8 text-yellow-600 animate-pulse" />
					</div>
					<CardTitle className="text-2xl font-bold text-gray-900">
						Account Pending Approval
					</CardTitle>
					<CardDescription className="text-gray-600">
						Your registration is being reviewed by our team
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="text-center">
						<p className="text-gray-700 mb-4">
							Thank you for registering! Your account is currently
							under review by our administrators.
						</p>
						<p className="text-sm text-gray-600 mb-4">
							This page will automatically update when your status
							changes.
						</p>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
							<div className="flex items-center justify-center space-x-2 text-blue-800">
								<CheckCircle className="h-5 w-5" />
								<span className="font-medium">
									What happens next?
								</span>
							</div>
							<ul className="text-sm text-blue-700 mt-2 space-y-1">
								<li>
									• Our team will review your registration
								</li>
								<li>• This page will update automatically</li>
								<li>
									• Once approved, you'll be redirected to
									your dashboard
								</li>
							</ul>
						</div>
					</div>

					<div className="space-y-4">
						<Button
							onClick={checkStatus}
							disabled={isChecking}
							className="w-full bg-yellow-600 hover:bg-yellow-700"
						>
							{isChecking ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Checking Status...
								</>
							) : (
								"Check Status Now"
							)}
						</Button>

						<div className="space-y-3">
							<p className="text-sm text-gray-600 text-center font-medium">
								Questions about your application?
							</p>
							<div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
								<Mail className="h-4 w-4" />
								<span>support@fame-platform.com</span>
							</div>
						</div>

						<div className="pt-4 border-t">
							<Link href="/" className="w-full">
								<Button variant="outline" className="w-full">
									<Home className="h-4 w-4 mr-2" />
									Return to Home
								</Button>
							</Link>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
