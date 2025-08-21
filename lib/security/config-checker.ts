import { JWTSecurity } from "./jwt";
import { logger } from "../storage/logger";

/**
 * Security configuration checker
 */

export interface SecurityCheckResult {
	category: string;
	check: string;
	status: "pass" | "warn" | "fail";
	message: string;
	recommendation?: string;
}

export class SecurityConfigChecker {
	/**
	 * Run all security checks
	 */
	static runAllChecks(): SecurityCheckResult[] {
		const results: SecurityCheckResult[] = [];

		// JWT Security checks
		results.push(...this.checkJWTSecurity());

		// Environment checks
		results.push(...this.checkEnvironmentSecurity());

		// File system checks
		results.push(...this.checkFileSystemSecurity());

		// HTTPS checks
		results.push(...this.checkHTTPSSecurity());

		return results;
	}

	/**
	 * Check JWT security configuration
	 */
	private static checkJWTSecurity(): SecurityCheckResult[] {
		const results: SecurityCheckResult[] = [];
		const jwtValidation = JWTSecurity.validateSecretStrength();

		if (jwtValidation.valid) {
			results.push({
				category: "JWT",
				check: "Secret Strength",
				status: "pass",
				message: "JWT secret meets security requirements",
			});
		} else {
			results.push({
				category: "JWT",
				check: "Secret Strength",
				status: "fail",
				message: `JWT secret is weak: ${jwtValidation.warnings.join(
					", "
				)}`,
				recommendation:
					"Set a strong JWT_SECRET environment variable with at least 32 characters including uppercase, lowercase, numbers, and special characters",
			});
		}

		return results;
	}

	/**
	 * Check environment security
	 */
	private static checkEnvironmentSecurity(): SecurityCheckResult[] {
		const results: SecurityCheckResult[] = [];

		// Check NODE_ENV
		const nodeEnv = process.env.NODE_ENV;
		if (nodeEnv === "production") {
			results.push({
				category: "Environment",
				check: "NODE_ENV",
				status: "pass",
				message: "NODE_ENV is set to production",
			});
		} else {
			results.push({
				category: "Environment",
				check: "NODE_ENV",
				status: "warn",
				message: `NODE_ENV is set to '${nodeEnv}', not 'production'`,
				recommendation:
					"Set NODE_ENV=production for production deployments",
			});
		}

		// Check BCRYPT_ROUNDS
		const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "10");
		if (bcryptRounds >= 12) {
			results.push({
				category: "Environment",
				check: "BCRYPT_ROUNDS",
				status: "pass",
				message: `BCRYPT_ROUNDS is set to ${bcryptRounds}`,
			});
		} else if (bcryptRounds >= 10) {
			results.push({
				category: "Environment",
				check: "BCRYPT_ROUNDS",
				status: "warn",
				message: `BCRYPT_ROUNDS is set to ${bcryptRounds}, consider increasing for better security`,
				recommendation:
					"Set BCRYPT_ROUNDS to 12 or higher for production",
			});
		} else {
			results.push({
				category: "Environment",
				check: "BCRYPT_ROUNDS",
				status: "fail",
				message: `BCRYPT_ROUNDS is set to ${bcryptRounds}, which is too low`,
				recommendation:
					"Set BCRYPT_ROUNDS to at least 10, preferably 12 or higher",
			});
		}

		return results;
	}

	/**
	 * Check file system security
	 */
	private static checkFileSystemSecurity(): SecurityCheckResult[] {
		const results: SecurityCheckResult[] = [];

		// Check if local storage path is secure
		const localDataPath = process.env.LOCAL_DATA_PATH || "./data";
		if (localDataPath.startsWith("./") || localDataPath.startsWith("../")) {
			results.push({
				category: "File System",
				check: "Local Storage Path",
				status: "warn",
				message: "Local storage path uses relative path",
				recommendation:
					"Use absolute path for LOCAL_DATA_PATH in production",
			});
		} else {
			results.push({
				category: "File System",
				check: "Local Storage Path",
				status: "pass",
				message: "Local storage path is configured properly",
			});
		}

		return results;
	}

	/**
	 * Check HTTPS security
	 */
	private static checkHTTPSSecurity(): SecurityCheckResult[] {
		const results: SecurityCheckResult[] = [];

		const isProduction = process.env.NODE_ENV === "production";
		const hasHTTPS =
			process.env.HTTPS === "true" ||
			process.env.NODE_ENV === "production";

		if (isProduction && hasHTTPS) {
			results.push({
				category: "HTTPS",
				check: "Secure Transport",
				status: "pass",
				message: "HTTPS is enabled for production",
			});
		} else if (isProduction && !hasHTTPS) {
			results.push({
				category: "HTTPS",
				check: "Secure Transport",
				status: "fail",
				message: "HTTPS is not enabled in production",
				recommendation: "Enable HTTPS for all production traffic",
			});
		} else {
			results.push({
				category: "HTTPS",
				check: "Secure Transport",
				status: "warn",
				message: "Not in production mode - HTTPS check skipped",
			});
		}

		return results;
	}

	/**
	 * Log security check results
	 */
	static logSecurityStatus(): void {
		const results = this.runAllChecks();

		const passed = results.filter((r) => r.status === "pass").length;
		const warnings = results.filter((r) => r.status === "warn").length;
		const failed = results.filter((r) => r.status === "fail").length;

		logger.info(
			`Security check completed: ${passed} passed, ${warnings} warnings, ${failed} failed`,
			{
				passed,
				warnings,
				failed,
				total: results.length,
			},
			"security",
			"config-check"
		);

		// Log failures and warnings
		results.forEach((result) => {
			if (result.status === "fail") {
				logger.error(
					`Security check failed: ${result.category} - ${result.check}`,
					{
						message: result.message,
						recommendation: result.recommendation,
					},
					"security",
					"config-check"
				);
			} else if (result.status === "warn") {
				logger.warn(
					`Security warning: ${result.category} - ${result.check}`,
					{
						message: result.message,
						recommendation: result.recommendation,
					},
					"security",
					"config-check"
				);
			}
		});
	}

	/**
	 * Get security score (0-100)
	 */
	static getSecurityScore(): number {
		const results = this.runAllChecks();
		const totalChecks = results.length;

		if (totalChecks === 0) return 100;

		const passedChecks = results.filter((r) => r.status === "pass").length;
		const warningChecks = results.filter((r) => r.status === "warn").length;

		// Pass = 1 point, Warning = 0.5 points, Fail = 0 points
		const score =
			((passedChecks + warningChecks * 0.5) / totalChecks) * 100;

		return Math.round(score);
	}
}

// Run security checks on module load in production
if (process.env.NODE_ENV === "production") {
	setTimeout(() => {
		SecurityConfigChecker.logSecurityStatus();
	}, 1000); // Delay to ensure logger is initialized
}
