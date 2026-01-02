/**
 * TraderMind Shared Utilities
 * Common utility functions used across the monorepo
 */

import { createHash, randomBytes } from 'crypto';

// Re-export trading core utilities (consolidated services)
export * from './trading-core.js';
export {
    TechnicalIndicators,
    RiskValidator,
    RegimeDetector,
    IdempotencyHelper
} from './trading-core.js';

/**
 * Generate idempotency key for trade execution (SR-003)
 */
export function generateIdempotencyKey(
    sessionId: string,
    userId: string,
    timestamp: number
): string {
    const payload = `${sessionId}:${userId}:${timestamp}`;
    return createHash('sha256').update(payload).digest('hex');
}

/**
 * Deduplicate WebSocket ticks by timestamp hash (Edge Case: Duplicate WebSocket ticks)
 */
export function generateTickHash(market: string, timestamp: number, quote: number): string {
    return createHash('md5').update(`${market}:${timestamp}:${quote}`).digest('hex');
}

/**
 * Generate secure random session ID
 */
export function generateSessionId(): string {
    return randomBytes(16).toString('hex');
}

/**
 * Validate confidence score within bounds
 */
export function isValidConfidence(confidence: number): boolean {
    return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
}
