import * as Sentry from '@sentry/react';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private context: LogContext = {};

    constructor(context: LogContext = {}) {
        this.context = context;
    }

    info(message: string, data?: any) {
        if (import.meta.env.DEV) {
            console.log(`[INFO] ${message}`, data || '');
        }
        Sentry.addBreadcrumb({
            category: 'info',
            message: message,
            data: data,
            level: 'info',
        });
    }

    warn(message: string, data?: any) {
        console.warn(`[WARN] ${message}`, data || '');
        Sentry.addBreadcrumb({
            category: 'warn',
            message: message,
            data: data,
            level: 'warning',
        });
    }

    error(message: string, error?: any, data?: any) {
        console.error(`[ERROR] ${message}`, error || '', data || '');
        Sentry.captureException(error instanceof Error ? error : new Error(message), {
            extra: { ...data, ...this.context }
        });
    }

    debug(message: string, data?: any) {
        if (import.meta.env.DEV) {
            console.debug(`[DEBUG] ${message}`, data || '');
        }
    }
}

export const logger = new Logger();
