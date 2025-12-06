import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * AdminRoute - Protects admin-only routes
 * Redirects non-admins to user dashboard
 */
const AdminRoute = ({ children }) => {
    const location = useLocation();
    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminStatus = () => {
            // Check session storage for user info
            const userInfo = sessionStorage.getItem('userInfo');
            const accessToken = sessionStorage.getItem('accessToken');

            if (!accessToken) {
                setChecking(false);
                return;
            }

            if (userInfo) {
                try {
                    const parsed = JSON.parse(userInfo);
                    setIsAdmin(parsed.is_admin === true || parsed.role === 'admin');
                } catch (e) {
                    setIsAdmin(false);
                }
            }

            setChecking(false);
        };

        checkAdminStatus();
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white">Checking permissions...</div>
            </div>
        );
    }

    // Not logged in
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Not admin
    if (!isAdmin) {
        return <Navigate to="/user/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;
