/**
 * Conflict Notification System
 *
 * React component for displaying conflict notifications and
 * allowing users to resolve conflicts manually.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	X,
	RefreshCw,
	AlertCircle,
	Wifi,
	WifiOff,
} from "lucide-react";
import {
	conflictResolutionService,
	type ConflictNotification,
} from "@/lib/conflict-resolution-service";
import {
	errorRecoveryService,
	type RecoveryOperation,
} from "@/lib/error-recovery-service";

interface ConflictNotificationSystemProps {
	eventId: string;
	performanceDate: string;
	onConflictResolved?: (conflict: ConflictNotification) => void;
	onRecoveryCompleted?: (operation: RecoveryOperation) => void;
}

export function ConflictNotificationSystem({
	eventId,
	performanceDate,
	onConflictResolved,
	onRecoveryCompleted,
}: ConflictNotificationSystemProps) {
	const [conflicts, setConflicts] = useState<ConflictNotification[]>([]);
	const [recoveryOperations, setRecoveryOperations] = useState<
		RecoveryOperation[]
	>([]);
	const [selectedConflict, setSelectedConflict] =
		useState<ConflictNotification | null>(null);
	const [showConflictDialog, setShowConflictDialog] = useState(false);
	const [networkStatus, setNetworkStatus] = useState<"online" | "offline">(
		"online"
	);
	const { toast } = useToast();

	// Monitor conflicts and recovery operations
	useEffect(() => {
		const handleConflict = (conflict: ConflictNotification) => {
			if (conflict.eventId === eventId) {
				setConflicts((prev) => {
					const existing = prev.find((c) => c.id === conflict.id);
					if (existing) {
						return prev.map((c) =>
							c.id === conflict.id ? conflict : c
						);
					}
					return [...prev, conflict];
				});

				// Show toast notification for new conflicts
				if (!conflict.resolved) {
					toast({
						title: "Conflict Detected",
						description:
							conflictResolutionService.formatConflictMessage(
								conflict
							),
						variant: "destructive",
					});
				}
			}
		};

		const handleRecoveryOperation = (operation: RecoveryOperation) => {
			if (operation.eventId === eventId) {
				setRecoveryOperations((prev) => {
					const existing = prev.find((op) => op.id === operation.id);
					if (existing) {
						return prev.map((op) =>
							op.id === operation.id ? operation : op
						);
					}
					return [...prev, operation];
				});

				// Notify parent component
				if (operation.status === "completed" && onRecoveryCompleted) {
					onRecoveryCompleted(operation);
				}

				// Show toast for recovery operations
				if (operation.status === "completed") {
					toast({
						title: "Recovery Completed",
						description: `${operation.type.replace(
							"_",
							" "
						)} recovery successful`,
					});
				} else if (operation.status === "failed") {
					toast({
						title: "Recovery Failed",
						description: `${operation.type.replace(
							"_",
							" "
						)} recovery failed: ${operation.error}`,
						variant: "destructive",
					});
				}
			}
		};

		// Register listeners
		conflictResolutionService.onConflict(handleConflict);
		errorRecoveryService.onRecoveryOperation(handleRecoveryOperation);

		// Load existing conflicts
		const existingConflicts =
			conflictResolutionService.getUnresolvedConflicts(eventId);
		setConflicts(existingConflicts);

		// Monitor network status
		const handleOnline = () => setNetworkStatus("online");
		const handleOffline = () => setNetworkStatus("offline");

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			conflictResolutionService.offConflict(handleConflict);
			errorRecoveryService.offRecoveryOperation(handleRecoveryOperation);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [eventId, onRecoveryCompleted, toast]);

	const handleResolveConflict = async (
		conflict: ConflictNotification,
		useLocal: boolean
	) => {
		try {
			const resolvedValue = useLocal
				? conflict.localValue
				: conflict.remoteValue;

			const success = await conflictResolutionService.resolveConflict(
				conflict.id,
				resolvedValue,
				"user" // Indicate manual resolution
			);

			if (success) {
				setConflicts((prev) =>
					prev.filter((c) => c.id !== conflict.id)
				);
				setShowConflictDialog(false);
				setSelectedConflict(null);

				if (onConflictResolved) {
					onConflictResolved(conflict);
				}

				toast({
					title: "Conflict Resolved",
					description: `Conflict resolved using ${
						useLocal ? "local" : "remote"
					} value`,
				});
			}
		} catch (error) {
			toast({
				title: "Error Resolving Conflict",
				description:
					error instanceof Error
						? error.message
						: "Failed to resolve conflict",
				variant: "destructive",
			});
		}
	};

	const handleTriggerRecovery = async (type: RecoveryOperation["type"]) => {
		try {
			const success = await errorRecoveryService.autoRecover(
				type,
				eventId,
				performanceDate
			);

			if (!success) {
				toast({
					title: "Recovery Failed",
					description: `Failed to start ${type.replace(
						"_",
						" "
					)} recovery`,
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Recovery Error",
				description:
					error instanceof Error ? error.message : "Recovery failed",
				variant: "destructive",
			});
		}
	};

	const unresolvedConflicts = conflicts.filter((c) => !c.resolved);
	const activeRecoveryOperations = recoveryOperations.filter(
		(op) => op.status === "in_progress"
	);

	if (
		unresolvedConflicts.length === 0 &&
		activeRecoveryOperations.length === 0 &&
		networkStatus === "online"
	) {
		return null; // No notifications to show
	}

	return (
		<>
			{/* Network Status Indicator */}
			{networkStatus === "offline" && (
				<Alert className="mb-4 border-orange-200 bg-orange-50">
					<WifiOff className="h-4 w-4" />
					<AlertTitle>Network Offline</AlertTitle>
					<AlertDescription>
						You're currently offline. Changes will be synced when
						connection is restored.
						<Button
							variant="outline"
							size="sm"
							className="ml-2"
							onClick={() =>
								handleTriggerRecovery("network_failure")
							}
						>
							<RefreshCw className="h-4 w-4 mr-1" />
							Retry Connection
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Active Recovery Operations */}
			{activeRecoveryOperations.length > 0 && (
				<Alert className="mb-4 border-blue-200 bg-blue-50">
					<RefreshCw className="h-4 w-4 animate-spin" />
					<AlertTitle>Recovery in Progress</AlertTitle>
					<AlertDescription>
						{activeRecoveryOperations.map((op) => (
							<div
								key={op.id}
								className="flex items-center gap-2 mt-1"
							>
								<span className="text-sm">
									{op.type.replace("_", " ")} recovery...
								</span>
								{op.retryCount > 0 && (
									<Badge
										variant="secondary"
										className="text-xs"
									>
										Retry {op.retryCount}/{op.maxRetries}
									</Badge>
								)}
							</div>
						))}
					</AlertDescription>
				</Alert>
			)}

			{/* Unresolved Conflicts */}
			{unresolvedConflicts.length > 0 && (
				<Alert className="mb-4 border-red-200 bg-red-50">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>
						Conflicts Detected ({unresolvedConflicts.length})
					</AlertTitle>
					<AlertDescription>
						<div className="mt-2 space-y-2">
							{unresolvedConflicts.slice(0, 3).map((conflict) => (
								<div
									key={conflict.id}
									className="flex items-center justify-between"
								>
									<span className="text-sm">
										{conflict.artistName}:{" "}
										{conflict.conflictType} conflict
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setSelectedConflict(conflict);
											setShowConflictDialog(true);
										}}
									>
										Resolve
									</Button>
								</div>
							))}
							{unresolvedConflicts.length > 3 && (
								<div className="text-sm text-muted-foreground">
									+{unresolvedConflicts.length - 3} more
									conflicts
								</div>
							)}
						</div>
					</AlertDescription>
				</Alert>
			)}

			{/* Recovery Action Buttons */}
			<div className="flex gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					onClick={() => handleTriggerRecovery("cache_corruption")}
				>
					<RefreshCw className="h-4 w-4 mr-1" />
					Reset Cache
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => handleTriggerRecovery("data_inconsistency")}
				>
					<CheckCircle className="h-4 w-4 mr-1" />
					Sync Data
				</Button>
			</div>

			{/* Conflict Resolution Dialog */}
			<Dialog
				open={showConflictDialog}
				onOpenChange={setShowConflictDialog}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Resolve Conflict</DialogTitle>
						<DialogDescription>
							Choose which version to keep for this conflict.
						</DialogDescription>
					</DialogHeader>

					{selectedConflict && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								{/* Local Version */}
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">
											Your Changes (Local)
										</CardTitle>
										<CardDescription>
											<Clock className="h-4 w-4 inline mr-1" />
											{new Date(
												selectedConflict.localValue
													.timestamp ||
													selectedConflict.timestamp
											).toLocaleString()}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											{selectedConflict.conflictType ===
												"status" && (
												<>
													<div>
														<span className="font-medium">
															Status:
														</span>{" "}
														{
															selectedConflict
																.localValue
																.status
														}
													</div>
													<div>
														<span className="font-medium">
															Order:
														</span>{" "}
														{
															selectedConflict
																.localValue
																.order
														}
													</div>
												</>
											)}
											{selectedConflict.conflictType ===
												"order" && (
												<div>
													<span className="font-medium">
														Position:
													</span>{" "}
													{
														selectedConflict
															.localValue.order
													}
												</div>
											)}
										</div>
										<Button
											className="w-full mt-4"
											onClick={() =>
												handleResolveConflict(
													selectedConflict,
													true
												)
											}
										>
											Use Local Version
										</Button>
									</CardContent>
								</Card>

								{/* Remote Version */}
								<Card>
									<CardHeader>
										<CardTitle className="text-sm">
											Other User's Changes (Remote)
										</CardTitle>
										<CardDescription>
											<Clock className="h-4 w-4 inline mr-1" />
											{new Date(
												selectedConflict.remoteValue
													.timestamp ||
													selectedConflict.timestamp
											).toLocaleString()}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											{selectedConflict.conflictType ===
												"status" && (
												<>
													<div>
														<span className="font-medium">
															Status:
														</span>{" "}
														{
															selectedConflict
																.remoteValue
																.status
														}
													</div>
													<div>
														<span className="font-medium">
															Order:
														</span>{" "}
														{
															selectedConflict
																.remoteValue
																.order
														}
													</div>
												</>
											)}
											{selectedConflict.conflictType ===
												"order" && (
												<div>
													<span className="font-medium">
														Position:
													</span>{" "}
													{
														selectedConflict
															.remoteValue.order
													}
												</div>
											)}
										</div>
										<Button
											className="w-full mt-4"
											variant="outline"
											onClick={() =>
												handleResolveConflict(
													selectedConflict,
													false
												)
											}
										>
											Use Remote Version
										</Button>
									</CardContent>
								</Card>
							</div>

							<Separator />

							<div className="text-sm text-muted-foreground">
								<strong>Conflict Details:</strong>
								<br />
								{conflictResolutionService.formatConflictMessage(
									selectedConflict
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
