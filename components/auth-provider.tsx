"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
	id: string;
	email: string;
	role: "super_admin" | "stage_manager" | "artist" | "dj" | "mc" | "graphics";
	name: string;
	eventId?: string;
	accountStatus?: string;
	subscriptionStatus?: string;
	subscriptionEndDate?: string;
}

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string) => Promise<boolean>;
	logout: () => void;
	register: (userData: any) => Promise<{ success: boolean; error?: string }>;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const router = useRouter();

	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		try {
			const res = await fetch("/api/auth/me", { cache: "no-store" });
			if (res.ok) {
				const data = await res.json();
				setUser(data);
			} else if (res.status === 403) {
				// Handle account status issues
				const errorData = await res.json();
				if (errorData.accountStatus === "suspended") {
					router.push("/account-suspended");
				} else if (errorData.accountStatus === "pending") {
					router.push("/account-pending");
				} else {
					setUser(null);
				}
			} else {
				setUser(null);
			}
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	const login = async (email: string, password: string) => {
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			if (res.ok) {
				const data = await res.json();
				setUser(data);

				// Use Next.js router with a small delay to ensure cookie is set
				setTimeout(() => {
					if (data.role === "super_admin") {
						router.push("/super-admin");
					} else if (data.role === "stage_manager") {
						if (data.accountStatus === "active") {
							router.push("/stage-manager");
						} else if (data.accountStatus === "pending") {
							router.push("/account-pending");
						} else if (data.accountStatus === "suspended") {
							router.push("/account-suspended");
						}
					} else if (data.role === "artist") {
						router.push("/artist");
					} else if (data.role === "dj") {
						router.push("/dj");
					}
				}, 500);

				return true;
			} else if (res.status === 403) {
				// Handle account status issues during login
				const errorData = await res.json();
				if (errorData.accountStatus === "suspended") {
					router.push("/account-suspended");
				} else if (errorData.accountStatus === "pending") {
					router.push("/account-pending");
				} else if (errorData.accountStatus === "deactivated") {
					router.push("/account-suspended");
				}
				return false;
			}
			return false;
		} catch (error) {
			return false;
		}
	};

	const register = async (userData: any) => {
		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(userData),
			});

			if (res.ok) {
				return { success: true };
			} else {
				// Try to get the error message from the response
				try {
					const errorData = await res.json();
					return {
						success: false,
						error:
							errorData.message ||
							"Registration failed. Please try again.",
					};
				} catch {
					return {
						success: false,
						error: "Registration failed. Please try again.",
					};
				}
			}
		} catch {
			return {
				success: false,
				error: "Network error. Please check your connection and try again.",
			};
		}
	};

	const logout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			setUser(null);
			router.push("/login");
		} catch {}
	};

	return (
		<AuthContext.Provider
			value={{ user, login, logout, register, loading }}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
	return ctx;
}
