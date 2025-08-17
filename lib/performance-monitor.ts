/**
 * Performance Monitor
 *
 * Collects and analyzes performance metrics for the artist status caching system.
 * Provides insights for optimization and monitoring.
 */

export interface PerformanceMetric {
	name: string;
	value: number;
	unit: "ms" | "bytes" | "count" | "percentage";
	timestamp: string;
	category: "cache" | "network" | "storage" | "ui" | "memory";
	tags?: Record<string, string>;
}

export interface PerformanceBenchmark {
	name: string;
	target: number;
	warning: number;
	critical: number;
	unit: string;
}

export interface PerformanceReport {
	timestamp: string;
	duration: string;
	metrics: PerformanceMetric[];
	benchmarks: PerformanceBenchmark[];
	alerts: PerformanceAlert[];
	recommendations: string[];
}

export interface PerformanceAlert {
	level: "info" | "warning" | "critical";
	metric: string;
	value: number;
	threshold: number;
	message: string;
	timestamp: string;
}

export class PerformanceMonitor {
	private metrics: PerformanceMetric[] = [];
	private benchmarks: PerformanceBenchmark[] = [];
	private alerts: PerformanceAlert[] = [];
	private timers = new Map<string, number>();
	private counters = new Map<string, number>();
	private maxMetricsHistory = 1000;

	constructor() {
		this.initializeBenchmarks();
		this.startMemoryMonitoring();
	}

	/**
	 * Start timing an operation
	 */
	startTimer(name: string, tags?: Record<string, string>): void {
		this.timers.set(name, performance.now());
		this.recordMetric({
			name: `${name}_started`,
			value: 1,
			unit: "count",
			category: "cache",
			tags,
		});
	}

	/**
	 * End timing an operation and record the duration
	 */
	endTimer(
		name: string,
		category: PerformanceMetric["category"] = "cache",
		tags?: Record<string, string>
	): number {
		const startTime = this.timers.get(name);
		if (!startTime) {
			console.warn(`Timer ${name} was not started`);
			return 0;
		}

		const duration = performance.now() - startTime;
		this.timers.delete(name);

		this.recordMetric({
			name: `${name}_duration`,
			value: duration,
			unit: "ms",
			category,
			tags,
		});

		return duration;
	}

	/**
	 * Increment a counter
	 */
	incrementCounter(
		name: string,
		value: number = 1,
		category: PerformanceMetric["category"] = "cache",
		tags?: Record<string, string>
	): void {
		const currentValue = this.counters.get(name) || 0;
		const newValue = currentValue + value;
		this.counters.set(name, newValue);

		this.recordMetric({
			name,
			value: newValue,
			unit: "count",
			category,
			tags,
		});
	}

	/**
	 * Record a custom metric
	 */
	recordMetric(metric: Omit<PerformanceMetric, "timestamp">): void {
		const fullMetric: PerformanceMetric = {
			...metric,
			timestamp: new Date().toISOString(),
		};

		this.metrics.push(fullMetric);

		// Maintain metrics history limit
		if (this.metrics.length > this.maxMetricsHistory) {
			this.metrics = this.metrics.slice(-this.maxMetricsHistory);
		}

		// Check against benchmarks
		this.checkBenchmarks(fullMetric);
	}

	/**
	 * Record cache hit rate
	 */
	recordCacheHitRate(hits: number, misses: number): void {
		const total = hits + misses;
		const hitRate = total > 0 ? (hits / total) * 100 : 0;

		this.recordMetric({
			name: "cache_hit_rate",
			value: hitRate,
			unit: "percentage",
			category: "cache",
		});
	}

	/**
	 * Record memory usage
	 */
	recordMemoryUsage(): void {
		if (typeof process !== "undefined" && process.memoryUsage) {
			const memory = process.memoryUsage();

			this.recordMetric({
				name: "memory_heap_used",
				value: memory.heapUsed,
				unit: "bytes",
				category: "memory",
			});

			this.recordMetric({
				name: "memory_heap_total",
				value: memory.heapTotal,
				unit: "bytes",
				category: "memory",
			});

			this.recordMetric({
				name: "memory_external",
				value: memory.external,
				unit: "bytes",
				category: "memory",
			});
		}
	}

	/**
	 * Record network latency
	 */
	recordNetworkLatency(operation: string, latency: number): void {
		this.recordMetric({
			name: "network_latency",
			value: latency,
			unit: "ms",
			category: "network",
			tags: { operation },
		});
	}

	/**
	 * Record storage operation performance
	 */
	recordStorageOperation(
		operation: "read" | "write" | "delete",
		duration: number,
		size?: number
	): void {
		this.recordMetric({
			name: "storage_operation_duration",
			value: duration,
			unit: "ms",
			category: "storage",
			tags: { operation },
		});

		if (size !== undefined) {
			this.recordMetric({
				name: "storage_operation_size",
				value: size,
				unit: "bytes",
				category: "storage",
				tags: { operation },
			});
		}
	}

	/**
	 * Get performance statistics for a time period
	 */
	getStats(timeRangeMs: number = 5 * 60 * 1000): {
		cache: any;
		network: any;
		storage: any;
		memory: any;
		ui: any;
	} {
		const cutoffTime = Date.now() - timeRangeMs;
		const recentMetrics = this.metrics.filter(
			(m) => new Date(m.timestamp).getTime() > cutoffTime
		);

		return {
			cache: this.getCategoryStats(recentMetrics, "cache"),
			network: this.getCategoryStats(recentMetrics, "network"),
			storage: this.getCategoryStats(recentMetrics, "storage"),
			memory: this.getCategoryStats(recentMetrics, "memory"),
			ui: this.getCategoryStats(recentMetrics, "ui"),
		};
	}

	/**
	 * Generate performance report
	 */
	generateReport(timeRangeMs: number = 60 * 60 * 1000): PerformanceReport {
		const endTime = new Date();
		const startTime = new Date(endTime.getTime() - timeRangeMs);

		const recentMetrics = this.metrics.filter(
			(m) => new Date(m.timestamp).getTime() > startTime.getTime()
		);

		const recentAlerts = this.alerts.filter(
			(a) => new Date(a.timestamp).getTime() > startTime.getTime()
		);

		return {
			timestamp: endTime.toISOString(),
			duration: `${Math.round(timeRangeMs / 1000 / 60)} minutes`,
			metrics: recentMetrics,
			benchmarks: this.benchmarks,
			alerts: recentAlerts,
			recommendations: this.generateRecommendations(
				recentMetrics,
				recentAlerts
			),
		};
	}

	/**
	 * Get current alerts
	 */
	getAlerts(level?: PerformanceAlert["level"]): PerformanceAlert[] {
		return level
			? this.alerts.filter((a) => a.level === level)
			: [...this.alerts];
	}

	/**
	 * Clear old alerts
	 */
	clearOldAlerts(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
		const cutoffTime = Date.now() - maxAgeMs;
		this.alerts = this.alerts.filter(
			(a) => new Date(a.timestamp).getTime() > cutoffTime
		);
	}

	/**
	 * Export metrics for external analysis
	 */
	exportMetrics(format: "json" | "csv" = "json"): string {
		if (format === "csv") {
			const headers = [
				"timestamp",
				"name",
				"value",
				"unit",
				"category",
				"tags",
			];
			const rows = this.metrics.map((m) => [
				m.timestamp,
				m.name,
				m.value.toString(),
				m.unit,
				m.category,
				JSON.stringify(m.tags || {}),
			]);

			return [headers, ...rows].map((row) => row.join(",")).join("\n");
		}

		return JSON.stringify(
			{
				exportTime: new Date().toISOString(),
				metrics: this.metrics,
				benchmarks: this.benchmarks,
				alerts: this.alerts,
			},
			null,
			2
		);
	}

	/**
	 * Initialize performance benchmarks
	 */
	private initializeBenchmarks(): void {
		this.benchmarks = [
			{
				name: "cache_hit_rate",
				target: 90,
				warning: 70,
				critical: 50,
				unit: "percentage",
			},
			{
				name: "cache_operation_duration",
				target: 10,
				warning: 50,
				critical: 100,
				unit: "ms",
			},
			{
				name: "network_latency",
				target: 100,
				warning: 500,
				critical: 1000,
				unit: "ms",
			},
			{
				name: "storage_operation_duration",
				target: 200,
				warning: 1000,
				critical: 3000,
				unit: "ms",
			},
			{
				name: "memory_heap_used",
				target: 100 * 1024 * 1024, // 100MB
				warning: 500 * 1024 * 1024, // 500MB
				critical: 1024 * 1024 * 1024, // 1GB
				unit: "bytes",
			},
		];
	}

	/**
	 * Start automatic memory monitoring
	 */
	private startMemoryMonitoring(): void {
		// Record memory usage every 30 seconds
		setInterval(() => {
			this.recordMemoryUsage();
		}, 30000);
	}

	/**
	 * Check metric against benchmarks and create alerts
	 */
	private checkBenchmarks(metric: PerformanceMetric): void {
		const benchmark = this.benchmarks.find(
			(b) => metric.name.includes(b.name) || b.name.includes(metric.name)
		);

		if (!benchmark) return;

		let level: PerformanceAlert["level"] | null = null;
		let threshold = 0;

		if (metric.value >= benchmark.critical) {
			level = "critical";
			threshold = benchmark.critical;
		} else if (metric.value >= benchmark.warning) {
			level = "warning";
			threshold = benchmark.warning;
		} else if (metric.value < benchmark.target) {
			// For metrics where lower is better (like latency)
			if (
				benchmark.name.includes("duration") ||
				benchmark.name.includes("latency")
			) {
				level = "info";
				threshold = benchmark.target;
			}
		}

		if (level) {
			const alert: PerformanceAlert = {
				level,
				metric: metric.name,
				value: metric.value,
				threshold,
				message: this.generateAlertMessage(metric, benchmark, level),
				timestamp: metric.timestamp,
			};

			this.alerts.push(alert);

			// Limit alerts history
			if (this.alerts.length > 100) {
				this.alerts = this.alerts.slice(-100);
			}
		}
	}

	/**
	 * Generate alert message
	 */
	private generateAlertMessage(
		metric: PerformanceMetric,
		benchmark: PerformanceBenchmark,
		level: PerformanceAlert["level"]
	): string {
		const value =
			metric.unit === "bytes"
				? `${Math.round(metric.value / 1024 / 1024)}MB`
				: `${metric.value}${metric.unit}`;

		switch (level) {
			case "critical":
				return `CRITICAL: ${metric.name} is ${value}, exceeding critical threshold of ${benchmark.critical}${benchmark.unit}`;
			case "warning":
				return `WARNING: ${metric.name} is ${value}, exceeding warning threshold of ${benchmark.warning}${benchmark.unit}`;
			case "info":
				return `INFO: ${metric.name} is performing well at ${value}`;
			default:
				return `${metric.name}: ${value}`;
		}
	}

	/**
	 * Get statistics for a specific category
	 */
	private getCategoryStats(
		metrics: PerformanceMetric[],
		category: PerformanceMetric["category"]
	): any {
		const categoryMetrics = metrics.filter((m) => m.category === category);

		if (categoryMetrics.length === 0) {
			return { count: 0 };
		}

		const values = categoryMetrics.map((m) => m.value);
		const durations = categoryMetrics
			.filter((m) => m.name.includes("duration"))
			.map((m) => m.value);

		return {
			count: categoryMetrics.length,
			averageValue: values.reduce((sum, v) => sum + v, 0) / values.length,
			minValue: Math.min(...values),
			maxValue: Math.max(...values),
			averageDuration:
				durations.length > 0
					? durations.reduce((sum, d) => sum + d, 0) /
					  durations.length
					: 0,
			operations: categoryMetrics.reduce((acc, m) => {
				acc[m.name] = (acc[m.name] || 0) + 1;
				return acc;
			}, {} as Record<string, number>),
		};
	}

	/**
	 * Generate optimization recommendations
	 */
	private generateRecommendations(
		metrics: PerformanceMetric[],
		alerts: PerformanceAlert[]
	): string[] {
		const recommendations: string[] = [];

		// Cache performance recommendations
		const cacheHitRate = metrics
			.filter((m) => m.name === "cache_hit_rate")
			.slice(-1)[0];

		if (cacheHitRate && cacheHitRate.value < 80) {
			recommendations.push(
				"Consider increasing cache TTL or warming up cache more frequently"
			);
		}

		// Memory recommendations
		const memoryAlerts = alerts.filter((a) => a.metric.includes("memory"));
		if (memoryAlerts.length > 0) {
			recommendations.push(
				"High memory usage detected. Consider implementing cache size limits or more aggressive cleanup"
			);
		}

		// Network recommendations
		const networkLatency = metrics
			.filter((m) => m.name === "network_latency")
			.slice(-10); // Last 10 measurements

		if (networkLatency.length > 0) {
			const avgLatency =
				networkLatency.reduce((sum, m) => sum + m.value, 0) /
				networkLatency.length;
			if (avgLatency > 500) {
				recommendations.push(
					"High network latency detected. Consider implementing request batching or local caching"
				);
			}
		}

		// Storage recommendations
		const storageOperations = metrics.filter(
			(m) => m.name === "storage_operation_duration"
		);
		if (storageOperations.length > 0) {
			const avgDuration =
				storageOperations.reduce((sum, m) => sum + m.value, 0) /
				storageOperations.length;
			if (avgDuration > 1000) {
				recommendations.push(
					"Slow storage operations detected. Consider optimizing queries or implementing connection pooling"
				);
			}
		}

		// General recommendations
		const criticalAlerts = alerts.filter((a) => a.level === "critical");
		if (criticalAlerts.length > 5) {
			recommendations.push(
				"Multiple critical performance issues detected. Consider reviewing system architecture"
			);
		}

		return recommendations;
	}
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
