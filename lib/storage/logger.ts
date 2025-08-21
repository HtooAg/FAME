/**
 * Logging utility for storage operations and authentication
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: Record<string, any>;
	source?: string;
	operation?: string;
}

export class Logger {
	private static instance: Logger;
	private logLevel: LogLevel;

	private constructor() {
		// Set log level from environment or default to INFO
		const envLevel = process.env.LOG_LEVEL?.toUpperCase();
		this.logLevel =
			LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
	}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.logLevel;
	}

	private formatMessage(entry: LogEntry): string {
		const levelName = LogLevel[entry.level];
		const contextStr = entry.context
			? ` | Context: ${JSON.stringify(entry.context)}`
			: "";
		const sourceStr = entry.source ? ` | Source: ${entry.source}` : "";
		const operationStr = entry.operation
			? ` | Operation: ${entry.operation}`
			: "";

		return `[${entry.timestamp}] ${levelName}: ${entry.message}${sourceStr}${operationStr}${contextStr}`;
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, any>,
		source?: string,
		operation?: string
	) {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context,
			source,
			operation,
		};

		const formattedMessage = this.formatMessage(entry);

		switch (level) {
			case LogLevel.DEBUG:
				console.debug(formattedMessage);
				break;
			case LogLevel.INFO:
				console.info(formattedMessage);
				break;
			case LogLevel.WARN:
				console.warn(formattedMessage);
				break;
			case LogLevel.ERROR:
				console.error(formattedMessage);
				break;
		}
	}

	debug(
		message: string,
		context?: Record<string, any>,
		source?: string,
		operation?: string
	) {
		this.log(LogLevel.DEBUG, message, context, source, operation);
	}

	info(
		message: string,
		context?: Record<string, any>,
		source?: string,
		operation?: string
	) {
		this.log(LogLevel.INFO, message, context, source, operation);
	}

	warn(
		message: string,
		context?: Record<string, any>,
		source?: string,
		operation?: string
	) {
		this.log(LogLevel.WARN, message, context, source, operation);
	}

	error(
		message: string,
		context?: Record<string, any>,
		source?: string,
		operation?: string
	) {
		this.log(LogLevel.ERROR, message, context, source, operation);
	}

	// Specialized logging methods for common operations
	storageOperation(
		operation: string,
		source: "gcs" | "local" | "manager",
		success: boolean,
		context?: Record<string, any>
	) {
		const message = `Storage operation ${operation} ${
			success ? "succeeded" : "failed"
		}`;
		const level = success ? LogLevel.INFO : LogLevel.ERROR;
		this.log(level, message, context, source, operation);
	}

	authenticationAttempt(
		email: string,
		success: boolean,
		reason?: string,
		context?: Record<string, any>
	) {
		const message = `Authentication attempt for ${email} ${
			success ? "succeeded" : "failed"
		}${reason ? `: ${reason}` : ""}`;
		const level = success ? LogLevel.INFO : LogLevel.WARN;
		this.log(level, message, { ...context, email }, "auth", "login");
	}

	registrationAttempt(
		email: string,
		success: boolean,
		reason?: string,
		context?: Record<string, any>
	) {
		const message = `Registration attempt for ${email} ${
			success ? "succeeded" : "failed"
		}${reason ? `: ${reason}` : ""}`;
		const level = success ? LogLevel.INFO : LogLevel.WARN;
		this.log(level, message, { ...context, email }, "auth", "register");
	}

	fallbackActivated(
		from: string,
		to: string,
		reason: string,
		context?: Record<string, any>
	) {
		const message = `Storage fallback activated: ${from} -> ${to} (${reason})`;
		this.log(
			LogLevel.WARN,
			message,
			context,
			"storage-manager",
			"fallback"
		);
	}

	healthCheck(
		component: string,
		healthy: boolean,
		details?: Record<string, any>
	) {
		const message = `Health check for ${component}: ${
			healthy ? "healthy" : "unhealthy"
		}`;
		const level = healthy ? LogLevel.INFO : LogLevel.ERROR;
		this.log(level, message, details, "health", "check");
	}
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions for common logging patterns
export const logStorageOperation = (
	operation: string,
	source: "gcs" | "local" | "manager",
	success: boolean,
	context?: Record<string, any>
) => {
	logger.storageOperation(operation, source, success, context);
};

export const logAuthAttempt = (
	email: string,
	success: boolean,
	reason?: string,
	context?: Record<string, any>
) => {
	logger.authenticationAttempt(email, success, reason, context);
};

export const logRegistration = (
	email: string,
	success: boolean,
	reason?: string,
	context?: Record<string, any>
) => {
	logger.registrationAttempt(email, success, reason, context);
};

export const logFallback = (
	from: string,
	to: string,
	reason: string,
	context?: Record<string, any>
) => {
	logger.fallbackActivated(from, to, reason, context);
};

export const logHealth = (
	component: string,
	healthy: boolean,
	details?: Record<string, any>
) => {
	logger.healthCheck(component, healthy, details);
};
