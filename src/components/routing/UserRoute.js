import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * UserRoute - Protects user routes (requires authentication)
 * Both regular users and admins can access user routes
 */
const UserRoute = ({ children }) => {
    const location = useLocation();
    const [checking, setChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const accessToken = sessionStorage.getItem('accessToken');
            setIsAuthenticated(!!accessToken);
            setChecking(false);
        };

        checkAuth();
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

export default UserRoute;
