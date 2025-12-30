import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveSession from './pages/LiveSession';
import { Loader2 } from 'lucide-react';
import { DerivCallback } from './features/auth/DerivCallback';

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
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (role === 'admin' && !isAdmin) {
        return <Navigate to="/" replace />; // unauthorized
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
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<DerivCallback />} />

                <Route path="/admin" element={
                    <ProtectedRoute role="admin">
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                <Route path="/" element={
                    <ProtectedRoute>
                        <Dashboard />
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
