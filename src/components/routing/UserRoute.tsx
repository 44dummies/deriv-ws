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
    const { isAuthenticated, isLoading } = useAuth();

    // OPTIMIZATION: If already authenticated, show content immediately.
    // This bypasses the spinner delta during login->redirect flow.
    if (isAuthenticated) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <LoadingSpinner />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
);

export default UserRoute;
