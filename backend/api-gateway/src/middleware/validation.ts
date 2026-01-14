/**
 * Request Validation Middleware using Zod
 * Provides type-safe validation for all API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Trade Execution Schema
 * Validates manual trade execution requests
 */
export const executeTradeSchema = z.object({
    market: z.string()
        .regex(/^(R_|frx|1HZ|CRASH|BOOM|JD|STEP)\w+$/, 'Invalid market symbol')
        .max(50),
    contractType: z.enum(['CALL', 'PUT', 'DIGITOVER', 'DIGITUNDER'], {
        errorMap: () => ({ message: 'Contract type must be CALL, PUT, DIGITOVER, or DIGITUNDER' })
    }),
    stake: z.number()
        .min(1, 'Stake must be at least 1')
        .max(10000, 'Stake cannot exceed 10000')
        .positive(),
    duration: z.number()
        .int('Duration must be an integer')
        .min(1, 'Duration must be at least 1')
        .max(1440, 'Duration cannot exceed 1440 minutes'),
    durationUnit: z.enum(['m', 's', 'h', 'd', 't']).optional().default('m')
});

/**
 * Session Creation Schema
 */
export const createSessionSchema = z.object({
    config: z.object({
        risk_profile: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
        max_stake: z.number().min(1).max(10000).optional(),
        max_trades_per_hour: z.number().int().min(1).max(100).optional(),
        allowed_markets: z.array(z.string()).optional()
    }).optional()
});

/**
 * Session Update Schema
 */
export const updateSessionSchema = z.object({
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
    config: z.object({
        risk_profile: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
        max_stake: z.number().min(1).max(10000).optional()
    }).optional()
});

/**
 * User Profile Update Schema
 */
export const updateUserSchema = z.object({
    fullname: z.string().min(1).max(100).optional(),
    active_account_id: z.string().max(50).optional()
});

/**
 * Account Switch Schema
 */
export const switchAccountSchema = z.object({
    account_id: z.string()
        .min(1, 'Account ID required')
        .max(50, 'Account ID too long')
});

/**
 * Pagination Schema
 */
export const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
    session_id: z.string().uuid().optional()
});

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Creates a validation middleware for a Zod schema
 * @param schema Zod schema to validate against
 * @param source Which part of the request to validate (body, query, params)
 */
export function validateRequest<T extends z.ZodTypeAny>(
    schema: T,
    source: ValidationSource = 'body'
) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Get the data to validate
            const data = source === 'body' ? req.body 
                       : source === 'query' ? req.query
                       : req.params;

            // Validate and parse
            const parsed = await schema.parseAsync(data);

            // Replace original data with validated/parsed data
            if (source === 'body') {
                req.body = parsed;
            } else if (source === 'query') {
                req.query = parsed as any;
            } else {
                req.params = parsed as any;
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                logger.warn('Request validation failed', {
                    source,
                    errors,
                    path: req.path,
                    method: req.method
                });

                res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
                return;
            }

            // Unexpected error
            logger.error('Validation middleware error', { error });
            res.status(500).json({ error: 'Internal validation error' });
        }
    };
}

// =============================================================================
// PRE-CONFIGURED VALIDATORS
// =============================================================================

export const validateTradeExecution = validateRequest(executeTradeSchema, 'body');
export const validateSessionCreation = validateRequest(createSessionSchema, 'body');
export const validateSessionUpdate = validateRequest(updateSessionSchema, 'body');
export const validateUserUpdate = validateRequest(updateUserSchema, 'body');
export const validateAccountSwitch = validateRequest(switchAccountSchema, 'body');
export const validatePagination = validateRequest(paginationSchema, 'query');

// =============================================================================
// SANITIZATION HELPERS
// =============================================================================

/**
 * Sanitizes user input to prevent XSS attacks
 * Strips HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
    return input
        .replace(/[<>'"&]/g, '') // Remove dangerous HTML chars
        .trim()
        .slice(0, 1000); // Max length
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
