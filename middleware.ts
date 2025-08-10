import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip middleware for public routes and API routes
	if (
		pathname.startsWith("/api/") ||
		pathname === "/" ||
		pathname === "/login" ||
		pathname === "/register" ||
		pathname === "/setup-admin" ||
		pathname === "/account-suspended" ||
		pathname === "/account-pending" ||
		pathname.startsWith("/_next/") ||
		pathname.startsWith("/public/") ||
		pathname.includes(".")
	) {
		return NextResponse.next();
	}

	const token = request.cookies.get("auth-token")?.value;

	if (!token) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	try {
		const secret = new TextEncoder().encode(JWT_SECRET);
		const { payload: decoded } = await jwtVerify(token, secret);

		// Check if user is trying to access super admin routes
		if (
			pathname.startsWith("/super-admin") &&
			decoded.role !== "super_admin"
		) {
			return NextResponse.redirect(new URL("/", request.url));
		}

		// Check if user is trying to access stage manager routes
		if (
			pathname.startsWith("/stage-manager") &&
			decoded.role !== "stage_manager"
		) {
			return NextResponse.redirect(new URL("/", request.url));
		}

		return NextResponse.next();
	} catch (error) {
		// Invalid token, redirect to login
		return NextResponse.redirect(new URL("/login", request.url));
	}
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
