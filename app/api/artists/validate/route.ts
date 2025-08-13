import { NextRequest, NextResponse } from "next/server";
import { ArtistValidator } from "@/lib/validation/artist-validation";
import { ValidationMiddleware } from "@/lib/validation/validation-middleware";
import { DataIntegrityChecker } from "@/lib/validation/data-integrity";
import { InputSanitizer } from "@/lib/validation/input-sanitizer";

/**
 * POST /api/artists/validate
 * Comprehensive artist data validation endpoint
 */
export async function POST(request: NextRequest) {
	try {
		// Apply validation middleware
		const validation = await ValidationMiddleware.validateRequest(
			request,
			"artist-create",
			{
				allowedMethods: ["POST"],
				rateLimitKey: ValidationMiddleware.getClientIP(request),
				maxRequestSize: 5 * 1024 * 1024, // 5MB
			}
		);

		if (!validation.isValid) {
			return (
				validation.response ||
				ValidationMiddleware.createErrorResponse(
					"Validation failed",
					400,
					validation.errors
				)
			);
		}

		const artistData = validation.data;

		// Perform comprehensive validation
		const artistValidation =
			ArtistValidator.validateArtistDataWithSchema(artistData);

		if (!artistValidation.isValid) {
			return ValidationMiddleware.createErrorResponse(
				"Artist data validation failed",
				400,
				artistValidation.errors
			);
		}

		// Perform data integrity check
		const integrityCheck = DataIntegrityChecker.checkArtistProfileIntegrity(
			artistValidation.sanitizedData
		);

		// Check profile completeness
		const completenessCheck = ArtistValidator.checkProfileCompleteness(
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

		return ValidationMiddleware.createSuccessResponse(
			response,
			"Artist data validation completed"
		);
	} catch (error) {
		console.error("Artist validation error:", error);
		return ValidationMiddleware.createErrorResponse(
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
		const validation = await ValidationMiddleware.validateRequest(
			request,
			"artist-create",
			{
				allowedMethods: ["PUT"],
				rateLimitKey: ValidationMiddleware.getClientIP(request),
				maxRequestSize: 25 * 1024 * 1024, // 25MB for batch
			}
		);

		if (!validation.isValid) {
			return (
				validation.response ||
				ValidationMiddleware.createErrorResponse(
					"Validation failed",
					400,
					validation.errors
				)
			);
		}

		const { artists } = validation.data;

		if (!Array.isArray(artists)) {
			return ValidationMiddleware.createErrorResponse(
				"Artists data must be an array",
				400
			);
		}

		if (artists.length > 50) {
			return ValidationMiddleware.createErrorResponse(
				"Batch size cannot exceed 50 artists",
				400
			);
		}

		// Validate each artist
		const batchValidation =
			ArtistValidator.validateBatchArtistData(artists);

		// Check cross-profile integrity
		const crossIntegrity = DataIntegrityChecker.checkBatchIntegrity(
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

		return ValidationMiddleware.createSuccessResponse(
			response,
			"Batch artist validation completed"
		);
	} catch (error) {
		console.error("Batch validation error:", error);
		return ValidationMiddleware.createErrorResponse(
			"Internal validation error",
			500
		);
	}
}
