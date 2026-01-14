import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

/**
 * TraderMind Frontend Application
 * React 18 + TypeScript + Vite
 */
import App from './App';
import './index.css';

// =============================================================================
// SENTRY INITIALIZATION (Error tracking for production)
// =============================================================================
if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        
        // Performance monitoring
        tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
        
        // Session replay for debugging (optional, adjust sample rates)
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        // Don't send errors in development unless DSN is explicitly set
        enabled: import.meta.env.MODE === 'production' || !!import.meta.env.VITE_SENTRY_DSN,
    });
}

// Error fallback component for Sentry ErrorBoundary
function ErrorFallback({ error, componentStack, resetError }: { error: unknown; componentStack: string; eventId: string; resetError: () => void }) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                <p className="text-gray-400 mb-4">We've been notified and are looking into it.</p>
                <button 
                    onClick={resetError} 
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 mr-2"
                >
                    Try Again
                </button>
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                >
                    Reload Page
                </button>
                {import.meta.env.DEV && (
                    <pre className="mt-4 text-left text-red-400 text-sm overflow-auto max-w-lg">
                        {errorMessage}
                        {componentStack && `\n\n${componentStack}`}
                    </pre>
                )}
            </div>
        </div>
    );
}

// Initialize React Query Client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            staleTime: 1000 * 60, // 1 minute
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Sentry.ErrorBoundary fallback={ErrorFallback}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </Sentry.ErrorBoundary>
    </React.StrictMode>
);
