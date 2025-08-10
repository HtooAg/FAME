"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Phone, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AccountSuspendedPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<Card className="max-w-md w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
						<AlertTriangle className="h-8 w-8 text-red-600" />
					</div>
					<CardTitle className="text-2xl font-bold text-gray-900">
						Account Suspended
					</CardTitle>
					<CardDescription className="text-gray-600">
						Your account has been suspended by an administrator
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="text-center">
						<p className="text-gray-700 mb-4">
							Your account access has been temporarily restricted.
							This may be due to policy violations or
							administrative review.
						</p>
						<p className="text-sm text-gray-600">
							Please contact support for assistance with
							reactivating your account.
						</p>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
							<Mail className="h-4 w-4" />
							<span>support@fame-platform.com</span>
						</div>
						<div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
							<Phone className="h-4 w-4" />
							<span>+1 (555) 123-4567</span>
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
				</CardContent>
			</Card>
		</div>
	);
}
