import React, { useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface UserRouteProps {
    children: ReactNode;
}

/**
 * UserRoute - Protects user routes (requires authentication)
 * Both regular users and admins can access user routes
 */
const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
    const location = useLocation();
    const [checking, setChecking] = useState<boolean>(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const checkAuth = (): void => {
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

    return <>{children}</>;
};

export default UserRoute;
