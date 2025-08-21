/**
 * Custom error classes for storage operations
 */

export class StorageError extends Error {
	constructor(
		message: string,
		public source: "gcs" | "local" | "manager",
		public operation?: string,
		public originalError?: Error
	) {
		super(message);
		this.name = "StorageError";
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			source: this.source,
			operation: this.operation,
			originalError: this.originalError?.message,
		};
	}
}

export class GCSError extends StorageError {
	constructor(
		message: string,
		public code?: string,
		operation?: string,
		originalError?: Error
	) {
		super(message, "gcs", operation, originalError);
		this.name = "GCSError";
	}
}

export class LocalStorageError extends StorageError {
	constructor(
		message: string,
		public path?: string,
		operation?: string,
		originalError?: Error
	) {
		super(message, "local", operation, originalError);
		this.name = "LocalStorageError";
	}
}

export class AuthenticationError extends Error {
	constructor(
		message: string,
		public code:
			| "INVALID_CREDENTIALS"
			| "ACCOUNT_SUSPENDED"
			| "ACCOUNT_REJECTED"
			| "ACCOUNT_DEACTIVATED"
			| "SERVICE_UNAVAILABLE",
		public statusCode: number = 401
	) {
		super(message);
		this.name = "AuthenticationError";
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
		};
	}
}

export class ValidationError extends Error {
	constructor(message: string, public field?: string, public value?: any) {
		super(message);
		this.name = "ValidationError";
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			field: this.field,
			value: this.value,
		};
	}
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
	/**
	 * Convert storage errors to user-friendly messages
	 */
	static getStorageErrorMessage(error: StorageError): string {
		switch (error.source) {
			case "gcs":
				return "Cloud storage is temporarily unavailable. Please try again later.";
			case "local":
				return "Local storage error occurred. Please contact support if this persists.";
			case "manager":
				return "Storage service is temporarily unavailable. Please try again later.";
			default:
				return "A storage error occurred. Please try again later.";
		}
	}

	/**
	 * Convert authentication errors to user-friendly messages
	 */
	static getAuthErrorMessage(error: AuthenticationError): string {
		switch (error.code) {
			case "INVALID_CREDENTIALS":
				return "Invalid email or password. Please check your credentials and try again.";
			case "ACCOUNT_SUSPENDED":
				return "Your account has been suspended. Please contact support for assistance.";
			case "ACCOUNT_REJECTED":
				return "Your account registration was rejected. Please contact support for more information.";
			case "ACCOUNT_DEACTIVATED":
				return "Your account has been deactivated. Please contact support to reactivate.";
			case "SERVICE_UNAVAILABLE":
				return "Authentication service is temporarily unavailable. Please try again later.";
			default:
				return "Authentication failed. Please try again.";
		}
	}

	/**
	 * Log error with appropriate level and context
	 */
	static logError(error: Error, context: Record<string, any> = {}) {
		const errorInfo = {
			name: error.name,
			message: error.message,
			stack: error.stack,
			context,
			timestamp: new Date().toISOString(),
		};

		if (error instanceof StorageError) {
			console.error("Storage Error:", {
				...errorInfo,
				source: error.source,
				operation: error.operation,
				originalError: error.originalError?.message,
			});
		} else if (error instanceof AuthenticationError) {
			console.error("Authentication Error:", {
				...errorInfo,
				code: error.code,
				statusCode: error.statusCode,
			});
		} else if (error instanceof ValidationError) {
			console.error("Validation Error:", {
				...errorInfo,
				field: error.field,
				value: error.value,
			});
		} else {
			console.error("Unexpected Error:", errorInfo);
		}
	}

	/**
	 * Create a safe error response for APIs
	 */
	static createErrorResponse(error: Error, includeStack: boolean = false) {
		const baseResponse = {
			error: true,
			timestamp: new Date().toISOString(),
		};

		if (error instanceof StorageError) {
			return {
				...baseResponse,
				message: this.getStorageErrorMessage(error),
				type: "storage_error",
				source: error.source,
				...(includeStack && { stack: error.stack }),
			};
		}

		if (error instanceof AuthenticationError) {
			return {
				...baseResponse,
				message: this.getAuthErrorMessage(error),
				type: "authentication_error",
				code: error.code,
				...(includeStack && { stack: error.stack }),
			};
		}

		if (error instanceof ValidationError) {
			return {
				...baseResponse,
				message: error.message,
				type: "validation_error",
				field: error.field,
				...(includeStack && { stack: error.stack }),
			};
		}

		// Generic error
		return {
			...baseResponse,
			message: "An unexpected error occurred. Please try again later.",
			type: "internal_error",
			...(includeStack && { stack: error.stack }),
		};
	}
}

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	context: Record<string, any> = {}
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		ErrorHandler.logError(
			error instanceof Error ? error : new Error(String(error)),
			context
		);
		throw error;
	}
}
