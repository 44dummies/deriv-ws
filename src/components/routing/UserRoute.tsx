import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface UserRouteProps {
    children: ReactNode;
}

/**
 * UserRoute - Protects user routes (requires authentication)
 * Both regular users and admins can access user routes
 */
import { useAuth } from '../../contexts/AuthContext';

/**
 * UserRoute - Protects user routes (requires authentication)
 * Both regular users and admins can access user routes
 */
const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
    const location = useLocation();
    const { isAuthenticated, isAuthenticating } = useAuth();
    // We need a specific "isLoading" state from context, but isAuthenticating might be for callback?
    // Let's assume initialized state. 
    // Actually, AuthContext doesn't expose "isLoading" properly yet. Use a workaround or rely on isAuthenticated + token presence.
    // Better: Rely on the simple fact that if we have a token in memory, we are good.
    // If we are "refreshing", isAuthenticated might be false briefly?

    // CHANGE: The AuthContext should really expose an `isLoading` or `isInitialized` flag.
    // For now, let's trust the context's isAuthenticated which is updated on mount.

    // PROBLEM: AuthContext's `tryRefresh` is async. We need to know when it's DONE.
    // I will add `loading` to AuthContext in the next step. For now, let's just switch to useAuth.

    // Temporary Hack until I update AuthContext:
    // If no token in context, but token in storage, wait.
    const hasStorageToken = !!sessionStorage.getItem('accessToken');

    if (!isAuthenticated && hasStorageToken) {
        // Context hasn't picked it up yet/is refreshing
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner />
            </div>
        );
    }

    if (!isAuthenticated && !hasStorageToken) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
);

export default UserRoute;
