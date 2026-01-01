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
            console.error('[ErrorBoundary] Error reported:', error.message, errorInfo.componentStack);
        } catch (e) {
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
                <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-red-900/20 rounded-lg border border-red-500/30">
                    <div className="text-red-400 text-xl mb-4">Something went wrong</div>
                    <p className="text-gray-400 text-sm mb-4 text-center max-w-md">
                        An unexpected error occurred. Please try refreshing the page.
                    </p>
                    <button
                        onClick={this.reset}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                    >
                        Try Again
                    </button>
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mt-4 text-xs text-gray-500 max-w-full overflow-auto">
                            <summary className="cursor-pointer hover:text-gray-400">Error Details</summary>
                            <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto">
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
                <div className="p-6 bg-[#0d1421] rounded-xl border border-red-500/30">
                    <h3 className="text-red-400 text-lg font-semibold mb-2">Dashboard Error</h3>
                    <p className="text-gray-400 text-sm">
                        Failed to load dashboard component. Please refresh the page.
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
                <div className="p-6 bg-red-900/30 rounded-xl border-2 border-red-500">
                    <h3 className="text-red-400 text-lg font-bold mb-2">⚠️ Trading Component Error</h3>
                    <p className="text-gray-300 text-sm mb-4">
                        A critical error occurred in the trading interface. 
                        Trading has been paused for safety.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
                    >
                        Reload Page
                    </button>
                </div>
            }
            onError={(error) => {
                // For trading errors, we might want to pause the session
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
                <div className="h-[300px] flex items-center justify-center bg-[#0d1421] rounded-lg border border-gray-700">
                    <div className="text-center">
                        <div className="text-gray-400 mb-2">📊</div>
                        <p className="text-gray-500 text-sm">Chart failed to load</p>
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
                    <a href="/" className="text-blue-400 hover:underline">
                        Return to Home
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
        console.error('[useErrorHandler]', error);
        
        // Could trigger global error state or notification
        // For now, just log
    }, []);

    return { handleError };
}
