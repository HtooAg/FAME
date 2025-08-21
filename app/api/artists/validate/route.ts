import { NextRequest, NextResponse } from "next/server";
import {
	ServerSafeValidationMiddleware,
	ServerSafeArtistValidator,
	ServerSafeDataIntegrityChecker,
} from "@/lib/validation/server-safe-validation";

/**
 * POST /api/artists/validate
 * Comprehensive artist data validation endpoint
 */
export async function POST(request: NextRequest) {
	try {
		// Apply validation middleware
		const validation = await ServerSafeValidationMiddleware.validateRequest(
			request,
			"artist-create",
			{
				allowedMethods: ["POST"],
				rateLimitKey:
					ServerSafeValidationMiddleware.getClientIP(request),
				maxRequestSize: 5 * 1024 * 1024, // 5MB
			}
		);

		if (!validation.isValid) {
			return (
				validation.response ||
				ServerSafeValidationMiddleware.createErrorResponse(
					"Validation failed",
					400,
					validation.errors
				)
			);
		}

		const artistData = validation.data;

		// Perform comprehensive validation
		const artistValidation =
			ServerSafeArtistValidator.validateArtistDataWithSchema(artistData);

		if (!artistValidation.isValid) {
			return ServerSafeValidationMiddleware.createErrorResponse(
				"Artist data validation failed",
				400,
				artistValidation.errors
			);
		}

		// Perform data integrity check
		const integrityCheck =
			ServerSafeDataIntegrityChecker.checkArtistProfileIntegrity(
				artistValidation.sanitizedData
			);

		// Check profile completeness
		const completenessCheck =
			ServerSafeArtistValidator.checkProfileCompleteness(
				artistValidation.sanitizedData
			);

		// Prepare response
		const response = {
			validation: {
				isValid: artistValidation.isValid,
				errors: artistValidation.errors,
			},
			integrity: {
				isValid: integrityCheck.isValid,
				score: integrityCheck.score,
				issues: integrityCheck.issues,
				warnings: integrityCheck.warnings,
			},
			completeness: {
				percentage: completenessCheck.completeness,
				missingFields: completenessCheck.missingFields,
				recommendations: completenessCheck.recommendations,
			},
			sanitizedData: artistValidation.sanitizedData,
		};

		return ServerSafeValidationMiddleware.createSuccessResponse(
			response,
			"Artist data validation completed"
		);
	} catch (error) {
		console.error("Artist validation error:", error);
		return ServerSafeValidationMiddleware.createErrorResponse(
			"Internal validation error",
			500
		);
	}
}

/**
 * POST /api/artists/validate/batch
 * Batch validation for multiple artists
 */
export async function PUT(request: NextRequest) {
	try {
		const validation = await ServerSafeValidationMiddleware.validateRequest(
			request,
			"artist-create",
			{
				allowedMethods: ["PUT"],
				rateLimitKey:
					ServerSafeValidationMiddleware.getClientIP(request),
				maxRequestSize: 25 * 1024 * 1024, // 25MB for batch
			}
		);

		if (!validation.isValid) {
			return (
				validation.response ||
				ServerSafeValidationMiddleware.createErrorResponse(
					"Validation failed",
					400,
					validation.errors
				)
			);
		}

		const { artists } = validation.data;

		if (!Array.isArray(artists)) {
			return ServerSafeValidationMiddleware.createErrorResponse(
				"Artists data must be an array",
				400
			);
		}

		if (artists.length > 50) {
			return ServerSafeValidationMiddleware.createErrorResponse(
				"Batch size cannot exceed 50 artists",
				400
			);
		}

		// Validate each artist
		const batchValidation =
			ServerSafeArtistValidator.validateBatchArtistData(artists);

		// Check cross-profile integrity
		const crossIntegrity =
			ServerSafeDataIntegrityChecker.checkBatchIntegrity(
				batchValidation.validArtists
			);

		// Prepare response
		const response = {
			summary: {
				total: artists.length,
				valid: batchValidation.validArtists.length,
				invalid: batchValidation.errors.length,
			},
			validation: {
				validArtists: batchValidation.validArtists,
				errors: batchValidation.errors,
				warnings: batchValidation.warnings || [],
			},
			crossValidation: {
				duplicateEmails: crossIntegrity.duplicateEmails,
				duplicateArtistNames: crossIntegrity.duplicateArtistNames,
				duplicatePhones: crossIntegrity.duplicatePhones,
				conflictingPerformanceDates:
					crossIntegrity.conflictingPerformanceDates,
			},
		};

		return ServerSafeValidationMiddleware.createSuccessResponse(
			response,
			"Batch artist validation completed"
		);
	} catch (error) {
		console.error("Batch validation error:", error);
		return ServerSafeValidationMiddleware.createErrorResponse(
			"Internal validation error",
			500
		);
	}
}
