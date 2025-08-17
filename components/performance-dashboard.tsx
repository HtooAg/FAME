/**
 * Performance Dashboard Component
 *
 * Displays real-time performance metrics and alerts for the caching system.
 */

"use client";

import { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Activity,
	AlertTriangle,
	CheckCircle,
	Clock,
	Database,
	Download,
	MemoryStick,
	Network,
	TrendingUp,
	Zap,
} from "lucide-react";
import {
	performanceMonitor,
	type PerformanceAlert,
	type PerformanceReport,
} from "@/lib/performance-monitor";

interface PerformanceDashboardProps {
	eventId: string;
	refreshInterval?: number;
}

export function PerformanceDashboard({
	eventId,
	refreshInterval = 5000,
}: PerformanceDashboardProps) {
	const [stats, setStats] = useState<any>(null);
	const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
	const [report, setReport] = useState<PerformanceReport | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Refresh performance data
	const refreshData = async () => {
		try {
			const currentStats = performanceMonitor.getStats();
			const currentAlerts = performanceMonitor.getAlerts();
			const currentReport = performanceMonitor.generateReport(
				30 * 60 * 1000
			); // Last 30 minutes

			setStats(currentStats);
			setAlerts(currentAlerts);
			setReport(currentReport);
			setIsLoading(false);
		} catch (error) {
			console.error("Error refreshing performance data:", error);
		}
	};

	// Auto-refresh data
	useEffect(() => {
		refreshData();
		const interval = setInterval(refreshData, refreshInterval);
		return () => clearInterval(interval);
	}, [refreshInterval]);

	// Export performance data
	const handleExport = (format: "json" | "csv") => {
		const data = performanceMonitor.exportMetrics(format);
		const blob = new Blob([data], {
			type: format === "json" ? "application/json" : "text/csv",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `performance-metrics-${
			new Date().toISOString().split("T")[0]
		}.${format}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const formatDuration = (ms: number) => {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	};

	const getAlertIcon = (level: PerformanceAlert["level"]) => {
		switch (level) {
			case "critical":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
			case "info":
				return <CheckCircle className="h-4 w-4 text-blue-500" />;
			default:
				return <Activity className="h-4 w-4" />;
		}
	};

	const getAlertBadgeVariant = (level: PerformanceAlert["level"]) => {
		switch (level) {
			case "critical":
				return "destructive";
			case "warning":
				return "secondary";
			case "info":
				return "default";
			default:
				return "outline";
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				<span className="ml-2">Loading performance data...</span>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">
						Performance Dashboard
					</h2>
					<p className="text-muted-foreground">
						Real-time monitoring for event {eventId}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={refreshData}>
						<Activity className="h-4 w-4 mr-1" />
						Refresh
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleExport("json")}
					>
						<Download className="h-4 w-4 mr-1" />
						Export JSON
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleExport("csv")}
					>
						<Download className="h-4 w-4 mr-1" />
						Export CSV
					</Button>
				</div>
			</div>

			{/* Alerts */}
			{alerts.length > 0 && (
				<Alert className="border-yellow-200 bg-yellow-50">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>
						Performance Alerts ({alerts.length})
					</AlertTitle>
					<AlertDescription>
						<div className="mt-2 space-y-1">
							{alerts.slice(0, 3).map((alert, index) => (
								<div
									key={index}
									className="flex items-center gap-2"
								>
									{getAlertIcon(alert.level)}
									<span className="text-sm">
										{alert.message}
									</span>
									<Badge
										variant={getAlertBadgeVariant(
											alert.level
										)}
										className="text-xs"
									>
										{alert.level}
									</Badge>
								</div>
							))}
							{alerts.length > 3 && (
								<p className="text-sm text-muted-foreground">
									+{alerts.length - 3} more alerts
								</p>
							)}
						</div>
					</AlertDescription>
				</Alert>
			)}

			{/* Performance Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Cache Performance */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Cache Hit Rate
						</CardTitle>
						<Zap className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats?.cache?.averageValue
								? `${Math.round(stats.cache.averageValue)}%`
								: "N/A"}
						</div>
						<Progress
							value={stats?.cache?.averageValue || 0}
							className="mt-2"
						/>
						<p className="text-xs text-muted-foreground mt-1">
							{stats?.cache?.count || 0} operations
						</p>
					</CardContent>
				</Card>

				{/* Network Latency */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Network Latency
						</CardTitle>
						<Network className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats?.network?.averageDuration
								? formatDuration(stats.network.averageDuration)
								: "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							Min:{" "}
							{stats?.network?.minValue
								? formatDuration(stats.network.minValue)
								: "N/A"}{" "}
							| Max:{" "}
							{stats?.network?.maxValue
								? formatDuration(stats.network.maxValue)
								: "N/A"}
						</p>
					</CardContent>
				</Card>

				{/* Storage Performance */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Storage Ops
						</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats?.storage?.averageDuration
								? formatDuration(stats.storage.averageDuration)
								: "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							{stats?.storage?.count || 0} operations
						</p>
					</CardContent>
				</Card>

				{/* Memory Usage */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Memory Usage
						</CardTitle>
						<MemoryStick className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{stats?.memory?.averageValue
								? formatBytes(stats.memory.averageValue)
								: "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">
							Peak:{" "}
							{stats?.memory?.maxValue
								? formatBytes(stats.memory.maxValue)
								: "N/A"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Detailed Metrics */}
			<Tabs defaultValue="cache" className="space-y-4">
				<TabsList>
					<TabsTrigger value="cache">Cache</TabsTrigger>
					<TabsTrigger value="network">Network</TabsTrigger>
					<TabsTrigger value="storage">Storage</TabsTrigger>
					<TabsTrigger value="memory">Memory</TabsTrigger>
					<TabsTrigger value="alerts">Alerts</TabsTrigger>
				</TabsList>

				<TabsContent value="cache" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Cache Performance</CardTitle>
							<CardDescription>
								Detailed cache operation metrics and statistics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<h4 className="font-medium mb-2">
										Operations
									</h4>
									<div className="space-y-1 text-sm">
										{stats?.cache?.operations &&
											Object.entries(
												stats.cache.operations
											).map(([op, count]) => (
												<div
													key={op}
													className="flex justify-between"
												>
													<span>{op}:</span>
													<span>
														{count as number}
													</span>
												</div>
											))}
									</div>
								</div>
								<div>
									<h4 className="font-medium mb-2">
										Performance
									</h4>
									<div className="space-y-1 text-sm">
										<div className="flex justify-between">
											<span>Average Duration:</span>
											<span>
												{stats?.cache?.averageDuration
													? formatDuration(
															stats.cache
																.averageDuration
													  )
													: "N/A"}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Min Duration:</span>
											<span>
												{stats?.cache?.minValue
													? formatDuration(
															stats.cache.minValue
													  )
													: "N/A"}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Max Duration:</span>
											<span>
												{stats?.cache?.maxValue
													? formatDuration(
															stats.cache.maxValue
													  )
													: "N/A"}
											</span>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="network" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Network Performance</CardTitle>
							<CardDescription>
								WebSocket and API request performance metrics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="grid grid-cols-3 gap-4 text-center">
									<div>
										<div className="text-2xl font-bold">
											{stats?.network?.averageDuration
												? formatDuration(
														stats.network
															.averageDuration
												  )
												: "N/A"}
										</div>
										<p className="text-sm text-muted-foreground">
											Average Latency
										</p>
									</div>
									<div>
										<div className="text-2xl font-bold">
											{stats?.network?.count || 0}
										</div>
										<p className="text-sm text-muted-foreground">
											Total Requests
										</p>
									</div>
									<div>
										<div className="text-2xl font-bold">
											{stats?.network?.maxValue
												? formatDuration(
														stats.network.maxValue
												  )
												: "N/A"}
										</div>
										<p className="text-sm text-muted-foreground">
											Peak Latency
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="storage" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Storage Performance</CardTitle>
							<CardDescription>
								GCS operations and data persistence metrics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<h4 className="font-medium mb-2">
										Operations
									</h4>
									<div className="space-y-1 text-sm">
										{stats?.storage?.operations &&
											Object.entries(
												stats.storage.operations
											).map(([op, count]) => (
												<div
													key={op}
													className="flex justify-between"
												>
													<span>{op}:</span>
													<span>
														{count as number}
													</span>
												</div>
											))}
									</div>
								</div>
								<div>
									<h4 className="font-medium mb-2">
										Performance
									</h4>
									<div className="space-y-1 text-sm">
										<div className="flex justify-between">
											<span>Average Duration:</span>
											<span>
												{stats?.storage?.averageDuration
													? formatDuration(
															stats.storage
																.averageDuration
													  )
													: "N/A"}
											</span>
										</div>
										<div className="flex justify-between">
											<span>Total Operations:</span>
											<span>
												{stats?.storage?.count || 0}
											</span>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="memory" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Memory Usage</CardTitle>
							<CardDescription>
								Application memory consumption and cache size
								metrics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-3 gap-4 text-center">
								<div>
									<div className="text-2xl font-bold">
										{stats?.memory?.averageValue
											? formatBytes(
													stats.memory.averageValue
											  )
											: "N/A"}
									</div>
									<p className="text-sm text-muted-foreground">
										Average Usage
									</p>
								</div>
								<div>
									<div className="text-2xl font-bold">
										{stats?.memory?.maxValue
											? formatBytes(stats.memory.maxValue)
											: "N/A"}
									</div>
									<p className="text-sm text-muted-foreground">
										Peak Usage
									</p>
								</div>
								<div>
									<div className="text-2xl font-bold">
										{stats?.memory?.minValue
											? formatBytes(stats.memory.minValue)
											: "N/A"}
									</div>
									<p className="text-sm text-muted-foreground">
										Minimum Usage
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="alerts" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Performance Alerts</CardTitle>
							<CardDescription>
								Recent performance issues and recommendations
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-96">
								<div className="space-y-3">
									{alerts.length === 0 ? (
										<div className="text-center py-8 text-muted-foreground">
											<CheckCircle className="h-8 w-8 mx-auto mb-2" />
											No performance alerts
										</div>
									) : (
										alerts.map((alert, index) => (
											<div
												key={index}
												className="flex items-start gap-3 p-3 border rounded-lg"
											>
												{getAlertIcon(alert.level)}
												<div className="flex-1">
													<div className="flex items-center gap-2 mb-1">
														<Badge
															variant={getAlertBadgeVariant(
																alert.level
															)}
															className="text-xs"
														>
															{alert.level}
														</Badge>
														<span className="text-sm font-medium">
															{alert.metric}
														</span>
													</div>
													<p className="text-sm text-muted-foreground">
														{alert.message}
													</p>
													<p className="text-xs text-muted-foreground mt-1">
														{new Date(
															alert.timestamp
														).toLocaleString()}
													</p>
												</div>
											</div>
										))
									)}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>

					{/* Recommendations */}
					{report?.recommendations &&
						report.recommendations.length > 0 && (
							<Card>
								<CardHeader>
									<CardTitle>
										Optimization Recommendations
									</CardTitle>
									<CardDescription>
										Suggested improvements based on current
										performance
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{report.recommendations.map(
											(recommendation, index) => (
												<div
													key={index}
													className="flex items-start gap-2"
												>
													<TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
													<p className="text-sm">
														{recommendation}
													</p>
												</div>
											)
										)}
									</div>
								</CardContent>
							</Card>
						)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
