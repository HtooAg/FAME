/**
 * Performance Integration
 *
 * Integrates performance monitoring into the caching system components.
 */

import { performanceMonitor } from "./performance-monitor";
import { statusCacheManager } from "./status-cache-manager";

/**
 * Initialize performance monitoring for the caching system
 */
export function initializePerformanceMonitoring(): void {
	// Monitor cache operations
	const originalGetArtistStatus = statusCacheManager.getArtistStatus;
	statusCacheManager.getArtistStatus = async function (
		artistId: string,
		eventId: string
	) {
		performanceMonitor.startTimer("get_artist_status", {
			artistId,
			eventId,
		});

		try {
			const result = await originalGetArtistStatus.call(
				this,
				artistId,
				eventId
			);

			if (result) {
				performanceMonitor.incrementCounter("cache_hits");
			} else {
				performanceMonitor.incrementCounter("cache_misses");
			}

			performanceMonitor.endTimer("get_artist_status", "cache");
			return result;
		} catch (error) {
			performanceMonitor.incrementCounter("get_artist_status_errors");
			performanceMonitor.endTimer("get_artist_status", "cache");
			throw error;
		}
	};

	// Monitor update operations
	const originalUpdateArtistStatus = statusCacheManager.updateArtistStatus;
	statusCacheManager.updateArtistStatus = async function (
		artistId: string,
		eventId: string,
		updates: any,
		userId?: string
	) {
		performanceMonitor.startTimer("update_artist_status", {
			artistId,
			eventId,
		});

		try {
			const result = await originalUpdateArtistStatus.call(
				this,
				artistId,
				eventId,
				updates,
				userId
			);

			if (result) {
				performanceMonitor.incrementCounter("successful_updates");
				if (result.conflicts.length > 0) {
					performanceMonitor.incrementCounter("conflicts_detected");
				}
			} else {
				performanceMonitor.incrementCounter("update_failures");
			}

			performanceMonitor.endTimer("update_artist_status", "cache");
			return result;
		} catch (error) {
			performanceMonitor.incrementCounter("update_errors");
			performanceMonitor.endTimer("update_artist_status", "cache");
			throw error;
		}
	};

	// Monitor sync operations
	const originalSyncToStorage = statusCacheManager.syncToStorage;
	statusCacheManager.syncToStorage = async function (
		eventId: string,
		performanceDate: string
	) {
		performanceMonitor.startTimer("sync_to_storage", {
			eventId,
			performanceDate,
		});

		try {
			const result = await originalSyncToStorage.call(
				this,
				eventId,
				performanceDate
			);

			if (result) {
				performanceMonitor.incrementCounter("successful_syncs");
			} else {
				performanceMonitor.incrementCounter("sync_errors");
			}

			performanceMonitor.endTimer("sync_to_storage", "storage");
			return result;
		} catch (error) {
			performanceMonitor.incrementCounter("sync_errors");
			performanceMonitor.endTimer("sync_to_storage", "storage");
			throw error;
		}
	};

	// Start periodic performance reporting
	setInterval(() => {
		const stats = performanceMonitor.getStats();
		console.log("Performance Stats:", {
			cache: stats.cache,
			network: stats.network,
			storage: stats.storage,
			memory: stats.memory,
		});

		// Record cache hit rate
		if (stats.cache.count > 0) {
			performanceMonitor.recordCacheHitRate(
				stats.cache.operations?.cache_hits || 0,
				stats.cache.operations?.cache_misses || 0
			);
		}

		// Check for performance alerts
		const alerts = performanceMonitor.getAlerts("critical");
		if (alerts.length > 0) {
			console.warn("Critical Performance Alerts:", alerts);
		}
	}, 60000); // Every minute

	console.log("Performance monitoring initialized for caching system");
}

/**
 * Get performance dashboard data
 */
export async function getPerformanceDashboardData() {
	const stats = performanceMonitor.getStats();
	const alerts = performanceMonitor.getAlerts();
	const report = performanceMonitor.generateReport();

	return {
		stats,
		alerts,
		report,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Export performance metrics
 */
export function exportPerformanceMetrics(
	format: "json" | "csv" = "json"
): string {
	return performanceMonitor.exportMetrics(format);
}

/**
 * Clear performance data
 */
export function clearPerformanceData(): void {
	performanceMonitor.clearOldAlerts(0); // Clear all alerts
	console.log("Performance data cleared");
}
