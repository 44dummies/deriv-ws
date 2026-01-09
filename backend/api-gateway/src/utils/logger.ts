/**
 * TraderMind Structured Logger
 * Production-ready logging utility to replace console.* calls
 * 
 * Usage:
 *   import { logger } from './utils/logger.js';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to process trade', { error, tradeId });
 */

// =============================================================================
// LOG LEVELS
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    service: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string | undefined;
    };
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SERVICE_NAME = process.env['SERVICE_NAME'] ?? 'api-gateway';
const LOG_LEVEL = (process.env['LOG_LEVEL'] ?? 'info') as LogLevel;
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

// Sensitive keys to mask in logs
const SENSITIVE_KEYS = [
    'password',
    'token',
    'deriv_token',
    'secret',
    'key',
    'authorization',
    'session_secret',
    'api_key',
    'credit_card',
    'ssn',
];

// =============================================================================
// HELPERS
// =============================================================================

function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function maskSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(maskSensitiveData);

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();
        if (SENSITIVE_KEYS.some(sk => keyLower.includes(sk))) {
            masked[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitiveData(value);
        } else {
            masked[key] = value;
        }
    }
    return masked;
}

function formatError(err: Error): NonNullable<LogEntry['error']> {
    const result: NonNullable<LogEntry['error']> = {
        name: err.name,
        message: err.message,
    };
    if (!IS_PRODUCTION && err.stack) {
        result.stack = err.stack;
    }
    return result;
}

function write(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        service: SERVICE_NAME,
    };

    if (context && Object.keys(context).length > 0) {
        entry.context = maskSensitiveData(context) as LogContext;
    }

    if (error) {
        entry.error = formatError(error);
    }

    // In production, output JSON for log aggregators (Datadog, Splunk, etc.)
    // In development, output readable format
    const output = IS_PRODUCTION
        ? JSON.stringify(entry)
        : formatForDevelopment(entry);

    // Use appropriate console method (this is intentional, not caught by ESLint)
     
    switch (level) {
        case 'debug':
        case 'info':
            process.stdout.write(output + '\n');
            break;
        case 'warn':
            process.stderr.write(output + '\n');
            break;
        case 'error':
        case 'fatal':
            process.stderr.write(output + '\n');
            break;
    }
}

function formatForDevelopment(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
        fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}`;

    if (entry.context) {
        output += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
        output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
            output += `\n${entry.error.stack}`;
        }
    }

    return output;
}

// =============================================================================
// LOGGER INTERFACE
// =============================================================================

interface Logger {
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext, error?: Error): void;
    error(message: string, context?: LogContext, error?: Error): void;
    fatal(message: string, context?: LogContext, error?: Error): void;
    child(baseContext: LogContext): Logger;
}

export const logger: Logger = {
    debug(message: string, context?: LogContext): void {
        write('debug', message, context);
    },

    info(message: string, context?: LogContext): void {
        write('info', message, context);
    },

    warn(message: string, context?: LogContext, error?: Error): void {
        write('warn', message, context, error);
    },

    error(message: string, context?: LogContext, error?: Error): void {
        write('error', message, context, error);
    },

    fatal(message: string, context?: LogContext, error?: Error): void {
        write('fatal', message, context, error);
    },

    /**
     * Create a child logger with preset context
     */
    child(baseContext: LogContext): Logger {
        return {
            debug: (msg: string, ctx?: LogContext) => 
                write('debug', msg, { ...baseContext, ...ctx }),
            info: (msg: string, ctx?: LogContext) => 
                write('info', msg, { ...baseContext, ...ctx }),
            warn: (msg: string, ctx?: LogContext, err?: Error) => 
                write('warn', msg, { ...baseContext, ...ctx }, err),
            error: (msg: string, ctx?: LogContext, err?: Error) => 
                write('error', msg, { ...baseContext, ...ctx }, err),
            fatal: (msg: string, ctx?: LogContext, err?: Error) => 
                write('fatal', msg, { ...baseContext, ...ctx }, err),
            child: (moreContext: LogContext) => 
                logger.child({ ...baseContext, ...moreContext }),
        };
    },
};

export default logger;
