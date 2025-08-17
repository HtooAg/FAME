/**
 * Enhanced logging utility for build processes
 * Provides structured logging with context awareness
 */

import { BuildContext } from "./build-context";

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	context: string;
	message: string;
	data?: any;
	buildContext?: any;
}

export class BuildLogger {
	private static instance: BuildLogger | null = null;
	private logs: LogEntry[] = [];
	private minLevel: LogLevel = LogLevel.INFO;

	private constructor() {
		// Set log level based on environment
		if (process.env.NODE_ENV === "development") {
			this.minLevel = LogLevel.DEBUG;
		} else if (process.env.NEXT_BUILD_VERBOSE === "true") {
			this.minLevel = LogLevel.DEBUG;
		}
	}

	static getInstance(): BuildLogger {
		if (!this.instance) {
			this.instance = new BuildLogger();
		}
		return this.instance;
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.minLevel;
	}

	private createLogEntry(
		level: LogLevel,
		context: string,
		message: string,
		data?: any
	): LogEntry {
		return {
			timestamp: new Date().toISOString(),
			level,
			context,
			message,
			data,
			buildContext: BuildContext.getEnvironmentInfo(),
		};
	}

	private formatMessage(entry: LogEntry): string {
		const levelNames = ["DEBUG", "INFO", "WARN", "ERROR"];
		const levelName = levelNames[entry.level];
		const buildStatus = entry.buildContext?.isBuilding
			? "[BUILD]"
			: "[RUNTIME]";

		let message = `${entry.timestamp} ${buildStatus} ${levelName} [${entry.context}] ${entry.message}`;

		if (entry.data) {
			message += ` ${JSON.stringify(entry.data)}`;
		}

		return message;
	}

	private log(
		level: LogLevel,
		context: string,
		message: string,
		data?: any
	): void {
		if (!this.shouldLog(level)) {
			return;
		}

		const entry = this.createLogEntry(level, context, message, data);
		this.logs.push(entry);

		const formattedMessage = this.formatMessage(entry);

		// Output to console based on level
		switch (level) {
			case LogLevel.DEBUG:
				console.debug(formattedMessage);
				break;
			case LogLevel.INFO:
				console.log(formattedMessage);
				break;
			case LogLevel.WARN:
				console.warn(formattedMessage);
				break;
			case LogLevel.ERROR:
				console.error(formattedMessage);
				break;
		}
	}

	debug(context: string, message: string, data?: any): void {
		this.log(LogLevel.DEBUG, context, message, data);
	}

	info(context: string, message: string, data?: any): void {
		this.log(LogLevel.INFO, context, message, data);
	}

	warn(context: string, message: string, data?: any): void {
		this.log(LogLevel.WARN, context, message, data);
	}

	error(context: string, message: string, data?: any): void {
		this.log(LogLevel.ERROR, context, message, data);
	}

	// Specialized logging methods for build processes
	buildStep(step: string, message: string, data?: any): void {
		this.info("BUILD-STEP", `${step}: ${message}`, data);
	}

	serviceStatus(
		service: string,
		status: "enabled" | "disabled" | "error",
		message?: string,
		data?: any
	): void {
		const level = status === "error" ? LogLevel.ERROR : LogLevel.INFO;
		this.log(
			level,
			"SERVICE",
			`${service} is ${status}${message ? `: ${message}` : ""}`,
			data
		);
	}

	routeStatus(
		route: string,
		type: "static" | "dynamic",
		message?: string
	): void {
		this.info(
			"ROUTE",
			`${route} configured as ${type}${message ? `: ${message}` : ""}`
		);
	}

	performanceMetric(metric: string, value: number, unit: string): void {
		this.info("PERFORMANCE", `${metric}: ${value}${unit}`);
	}

	// Get logs for analysis
	getLogs(level?: LogLevel): LogEntry[] {
		if (level !== undefined) {
			return this.logs.filter((log) => log.level >= level);
		}
		return [...this.logs];
	}

	// Get build summary
	getBuildSummary(): {
		totalLogs: number;
		errorCount: number;
		warningCount: number;
		buildContext: any;
		duration?: number;
	} {
		const errorCount = this.logs.filter(
			(log) => log.level === LogLevel.ERROR
		).length;
		const warningCount = this.logs.filter(
			(log) => log.level === LogLevel.WARN
		).length;

		return {
			totalLogs: this.logs.length,
			errorCount,
			warningCount,
			buildContext: BuildContext.getEnvironmentInfo(),
		};
	}

	// Clear logs (useful for testing)
	clear(): void {
		this.logs = [];
	}
}

// Export singleton instance
export const buildLogger = BuildLogger.getInstance();
