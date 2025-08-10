"use client";

import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DebugAuthPage() {
	const { user, loading } = useAuth();

	const checkMe = async () => {
		try {
			const res = await fetch("/api/auth/me", { cache: "no-store" });
			const data = await res.json();
			console.log("Auth /me response:", { status: res.status, data });
			alert(
				`Status: ${res.status}\nData: ${JSON.stringify(data, null, 2)}`
			);
		} catch (error) {
			console.error("Auth check error:", error);
			alert(`Error: ${error}`);
		}
	};

	const checkCookies = () => {
		const cookies = document.cookie;
		console.log("Cookies:", cookies);
		alert(`Cookies: ${cookies}`);
	};

	const checkAuthStatus = async () => {
		try {
			const res = await fetch("/api/debug/auth-status");
			const data = await res.json();
			console.log("Auth status:", data);
			alert(`Auth Status:\n${JSON.stringify(data, null, 2)}`);
		} catch (error) {
			console.error("Auth status error:", error);
			alert(`Error: ${error}`);
		}
	};

	const testLogin = async () => {
		const email = prompt("Enter email:");
		const password = prompt("Enter password:");
		if (!email || !password) return;

		try {
			const res = await fetch("/api/debug/test-login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			console.log("Test login result:", data);
			alert(`Test Login Result:\n${JSON.stringify(data, null, 2)}`);
		} catch (error) {
			console.error("Test login error:", error);
			alert(`Error: ${error}`);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-2xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Authentication Debug</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h3 className="font-semibold mb-2">
								Current Auth State:
							</h3>
							<pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
								{JSON.stringify({ user, loading }, null, 2)}
							</pre>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<Button onClick={checkMe}>
								Check /api/auth/me
							</Button>
							<Button onClick={checkCookies} variant="outline">
								Check Cookies
							</Button>
							<Button
								onClick={checkAuthStatus}
								variant="secondary"
							>
								Check Auth Status
							</Button>
							<Button onClick={testLogin} variant="destructive">
								Test Login
							</Button>
						</div>

						<div>
							<h3 className="font-semibold mb-2">
								Expected Behavior:
							</h3>
							<ul className="list-disc list-inside text-sm space-y-1">
								<li>
									If user.role === 'super_admin', should
									redirect to /super-admin
								</li>
								<li>
									If user.role === 'stage_manager', should
									redirect to /stage-manager
								</li>
								<li>If no user, should show landing page</li>
							</ul>
						</div>

						<div>
							<h3 className="font-semibold mb-2">
								Current User Role:
							</h3>
							<p className="text-lg font-mono bg-yellow-100 p-2 rounded">
								{user?.role || "No user logged in"}
							</p>
						</div>

						<div>
							<h3 className="font-semibold mb-2">
								Account Status:
							</h3>
							<p className="text-lg font-mono bg-blue-100 p-2 rounded">
								{user?.accountStatus || "No status"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
