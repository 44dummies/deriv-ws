import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveSession from './pages/LiveSession';
import { Loader2 } from 'lucide-react';
import { DerivCallback } from './features/auth/DerivCallback';
import Landing from './pages/Landing';

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

                {/* Secure Dashboard Route */}
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />

                <Route path="/admin" element={
                    <ProtectedRoute role="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/session/:sessionId" element={
                    <ProtectedRoute>
                        <LiveSession />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
