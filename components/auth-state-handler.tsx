"use client";

import { useAuth } from "./auth-provider";
import { LoadingScreen } from "./loading-screen";

export function AuthStateHandler({ children }: { children: React.ReactNode }) {
	const { loading } = useAuth();

	if (loading) {
		return <LoadingScreen />;
	}

	return <>{children}</>;
}
