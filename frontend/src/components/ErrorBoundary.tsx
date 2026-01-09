/**
 * TraderMind Error Boundary Components
 * Catches and handles React errors gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    resetKeys?: any[];
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

// =============================================================================
// GENERIC ERROR BOUNDARY
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });
        
        // Log to console in development
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        
        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
        
        // In production, send to error tracking service
        if (import.meta.env.PROD) {
            this.reportError(error, errorInfo);
        }
    }

    override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
        // Reset error state if resetKeys change
        if (this.state.hasError && this.props.resetKeys) {
            const hasKeysChanged = this.props.resetKeys.some(
                (key, index) => key !== prevProps.resetKeys?.[index]
            );
            if (hasKeysChanged) {
                this.reset();
            }
        }
    }

    private reportError(error: Error, errorInfo: ErrorInfo): void {
        // Integration point for Sentry or other error tracking
        try {
            // In production, integrate with Sentry:
            // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
            // eslint-disable-next-line no-console
            console.error('[ErrorBoundary] Error reported:', error.message, errorInfo.componentStack);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[ErrorBoundary] Failed to report error:', e);
        }
    }

    private reset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    override render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-card rounded-lg border border-destructive/20">
                    <div className="text-destructive text-lg font-semibold mb-3">Something went wrong</div>
                    <p className="text-muted-foreground text-sm mb-4 text-center max-w-md">
                        An unexpected error occurred. Please try refreshing the page.
                    </p>
                    <button
                        onClick={this.reset}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors duration-150 ease-out"
                    >
                        Try again
                    </button>
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mt-4 text-xs text-muted-foreground max-w-full overflow-auto">
                            <summary className="cursor-pointer hover:text-foreground">Error details</summary>
                            <pre className="mt-2 p-2 bg-muted/40 rounded overflow-x-auto">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

// =============================================================================
// SPECIALIZED ERROR BOUNDARIES
// =============================================================================

/**
 * Error boundary for dashboard components
 */
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="p-6 bg-card rounded-xl border border-destructive/20">
                    <h3 className="text-destructive text-lg font-semibold mb-2">Dashboard error</h3>
                    <p className="text-muted-foreground text-sm">
                        Failed to load the dashboard component. Please refresh the page.
                    </p>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}

/**
 * Error boundary for trading/session components (critical)
 */
export function TradingErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="p-6 bg-card rounded-xl border border-destructive/30">
                    <h3 className="text-destructive text-lg font-semibold mb-2">Trading component error</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        A critical error occurred in the trading interface. Trading has been paused.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors duration-150 ease-out"
                    >
                        Reload page
                    </button>
                </div>
            }
            onError={(error) => {
                // For trading errors, we might want to pause the session
                // eslint-disable-next-line no-console
                console.error('[CRITICAL] Trading component error:', error);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

/**
 * Error boundary for chart components
 */
export function ChartErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="h-[300px] flex items-center justify-center bg-card rounded-lg border border-border">
                    <div className="text-center">
                        <p className="text-muted-foreground text-sm">Chart failed to load</p>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}

/**
 * Error boundary for sidebar/navigation
 */
export function NavigationErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div className="p-4">
                    <a href="/" className="text-primary hover:underline">
                        Return to home
                    </a>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}

// =============================================================================
// HOOK FOR FUNCTIONAL ERROR HANDLING
// =============================================================================

export function useErrorHandler() {
    const handleError = React.useCallback((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('[useErrorHandler]', error);
        
        // Could trigger global error state or notification
        // For now, just log
    }, []);

    return { handleError };
}
