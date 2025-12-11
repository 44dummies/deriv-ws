import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * TradingDashboard - Redirects to Live Sessions Page
 * 
 * This page previously used deprecated V2 endpoints.
 * Now redirects to the unified Live Sessions view.
 */
export default function TradingDashboard() {
    return <Navigate to="/admin/sessions" replace />;
}
