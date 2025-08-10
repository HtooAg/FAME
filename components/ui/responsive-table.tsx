"use client";

import { ReactNode } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface ResponsiveTableProps {
	children: ReactNode;
	className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
	return (
		<div className="w-full overflow-x-auto">
			<div className="min-w-full inline-block align-middle">
				<div className="overflow-hidden border border-gray-200 md:rounded-lg">
					<Table className={className}>{children}</Table>
				</div>
			</div>
		</div>
	);
}

interface MobileCardProps {
	children: ReactNode;
	className?: string;
}

export function MobileCard({ children, className }: MobileCardProps) {
	return (
		<div
			className={`block md:hidden bg-white border border-gray-200 rounded-lg p-4 mb-4 ${
				className || ""
			}`}
		>
			{children}
		</div>
	);
}

interface DesktopTableProps {
	children: ReactNode;
	className?: string;
}

export function DesktopTable({ children, className }: DesktopTableProps) {
	return (
		<div className={`hidden md:block ${className || ""}`}>
			<ResponsiveTable>{children}</ResponsiveTable>
		</div>
	);
}
