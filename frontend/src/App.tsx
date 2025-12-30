import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveSession from './pages/LiveSession';
import Landing from './pages/Landing';
import Sessions from './pages/Sessions';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import { DerivCallback } from './features/auth/DerivCallback';
import DashboardLayout from './layouts/DashboardLayout';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'admin' | 'user' }) {
    const { user, loading, isAdmin } = useAuthStore();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (role === 'admin' && !isAdmin) {
        return <Navigate to="/" replace />; // unauthorized
    }

    return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuthStore();

    if (loading) return null; // Avoid flicker

    // If user is already logged in, send them to dashboard
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

function App() {
    const { initialize } = useAuthStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <Router>
            <Routes>
                {/* Public Landing Route */}
                <Route path="/" element={
                    <PublicRoute>
                        <Landing />
                    </PublicRoute>
                } />

                <Route path="/auth/callback" element={<DerivCallback />} />

                {/* Secure SPA Routes */}
                <Route element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/settings" element={<Settings />} />

                    {/* Maintain legacy/admin routes if needed, or refactor later */}
                    <Route path="/live-session/:sessionId" element={<LiveSession />} />
                </Route>

                {/* Admin Specific Route (Separated or integrated based on future need) */}
                <Route path="/admin" element={
                    <ProtectedRoute role="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
