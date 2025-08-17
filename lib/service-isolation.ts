/**
 * Service isolation utility for build-time vs runtime separation
 * Prevents external services from being initialized during static generation
 */

import { BuildContext } from "./build-context";

export interface ServiceConfig {
	name: string;
	enabled: boolean;
	buildTimeEnabled: boolean;
	runtimeEnabled: boolean;
}

export class ServiceIsolation {
	private static services = new Map<string, ServiceConfig>();

	/**
	 * Register a service with its configuration
	 */
	static registerService(name: string, config: Partial<ServiceConfig> = {}) {
		const serviceConfig: ServiceConfig = {
			name,
			enabled: true,
			buildTimeEnabled: false,
			runtimeEnabled: true,
			...config,
		};

		this.services.set(name, serviceConfig);
		return serviceConfig;
	}

	/**
	 * Check if a service should be enabled in the current context
	 */
	static isServiceEnabled(serviceName: string): boolean {
		const service = this.services.get(serviceName);
		if (!service || !service.enabled) {
			return false;
		}

		const isBuilding = BuildContext.isBuilding();

		if (isBuilding) {
			return service.buildTimeEnabled;
		} else {
			return service.runtimeEnabled;
		}
	}

	/**
	 * Get service configuration
	 */
	static getServiceConfig(serviceName: string): ServiceConfig | undefined {
		return this.services.get(serviceName);
	}

	/**
	 * List all registered services
	 */
	static getAllServices(): ServiceConfig[] {
		return Array.from(this.services.values());
	}

	/**
	 * Create a service wrapper that respects build-time isolation
	 */
	static createServiceWrapper<T>(
		serviceName: string,
		serviceFactory: () => T,
		mockFactory?: () => Partial<T>
	): () => T | Partial<T> {
		return () => {
			if (this.isServiceEnabled(serviceName)) {
				return serviceFactory();
			} else {
				console.log(
					`Service '${serviceName}' is disabled in current context (build: ${BuildContext.isBuilding()})`
				);
				return mockFactory ? mockFactory() : ({} as T);
			}
		};
	}

	/**
	 * Execute a function only if the service is enabled
	 */
	static executeIfEnabled<T>(
		serviceName: string,
		fn: () => T,
		fallback?: () => T
	): T | undefined {
		if (this.isServiceEnabled(serviceName)) {
			return fn();
		} else {
			console.log(
				`Skipping execution for service '${serviceName}' (disabled in current context)`
			);
			return fallback ? fallback() : undefined;
		}
	}

	/**
	 * Create a mock implementation for build-time use
	 */
	static createBuildTimeMock<T extends Record<string, any>>(
		serviceName: string,
		methods: (keyof T)[]
	): Partial<T> {
		const mock = {} as Partial<T>;

		for (const method of methods) {
			(mock as any)[method] = (...args: any[]) => {
				console.log(
					`Mock call to ${serviceName}.${String(method)}(${
						args.length
					} args) during build`
				);
				return Promise.resolve(null);
			};
		}

		return mock;
	}

	/**
	 * Initialize service isolation with default configurations
	 */
	static initialize() {
		// Register Google Cloud Storage service
		this.registerService("google-cloud-storage", {
			buildTimeEnabled: false,
			runtimeEnabled: true,
		});

		// Register WebSocket service
		this.registerService("websocket", {
			buildTimeEnabled: false,
			runtimeEnabled: true,
		});

		// Register external API services
		this.registerService("external-apis", {
			buildTimeEnabled: false,
			runtimeEnabled: true,
		});

		// Register file system operations (allowed during build)
		this.registerService("file-system", {
			buildTimeEnabled: true,
			runtimeEnabled: true,
		});

		console.log(
			`Service isolation initialized with ${this.services.size} services`
		);
	}

	/**
	 * Get environment information for debugging
	 */
	static getEnvironmentInfo() {
		return {
			buildContext: BuildContext.getEnvironmentInfo(),
			services: Object.fromEntries(
				Array.from(this.services.entries()).map(([name, config]) => [
					name,
					{
						...config,
						currentlyEnabled: this.isServiceEnabled(name),
					},
				])
			),
		};
	}
}

// Initialize service isolation on module load
ServiceIsolation.initialize();
