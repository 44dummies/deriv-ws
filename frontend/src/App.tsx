import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { ErrorBoundary, TradingErrorBoundary, DashboardErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import LiveSession from './pages/LiveSession';
import Landing from './pages/Landing';
import Sessions from './pages/Sessions';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import { Chat } from './pages/Chat';
import { DerivCallback } from './features/auth/DerivCallback';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminSessions from './pages/admin/AdminSessions';
import AdminCommissions from './pages/admin/AdminCommissions';
import AdminLogs from './pages/admin/AdminLogs';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAIMonitor from './pages/admin/AdminAIMonitor';
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    // If user is already logged in, send them to dashboard based on role
    if (user) {
        if (user.role === 'ADMIN') {
            return <Navigate to="/admin/overview" replace />;
        }
        return <Navigate to="/user/dashboard" replace />;
    }

    return <>{children}</>;
}

function App() {
    const { initialize } = useAuthStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <ErrorBoundary>
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
                    <Route path="/user" element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }>
                        <Route path="dashboard" element={
                            <DashboardErrorBoundary>
                                <Dashboard />
                            </DashboardErrorBoundary>
                        } />
                        <Route path="sessions" element={
                            <DashboardErrorBoundary>
                                <Sessions />
                            </DashboardErrorBoundary>
                        } />
                        <Route path="stats" element={
                            <DashboardErrorBoundary>
                                <Statistics />
                            </DashboardErrorBoundary>
                        } />
                        <Route path="chat" element={<Chat />} />
                        <Route path="settings" element={<Settings />} />

                        {/* Trading session with specialized error boundary */}
                        <Route path="live-session/:sessionId" element={
                            <TradingErrorBoundary>
                                <LiveSession />
                            </TradingErrorBoundary>
                        } />
                    </Route>

                    {/* Admin Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={
                            <DashboardErrorBoundary>
                                <AdminDashboard />
                            </DashboardErrorBoundary>
                        } />
                        <Route path="sessions" element={
                            <DashboardErrorBoundary>
                                <AdminSessions />
                            </DashboardErrorBoundary>
                        } />
                        <Route path="ai-monitor" element={
                            <DashboardErrorBoundary>
                                <AdminAIMonitor />
                            </DashboardErrorBoundary>
                        } />
                        <Route path="logs" element={<AdminLogs />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="commissions" element={<AdminCommissions />} />
                        <Route path="chat" element={<Chat />} />
                    </Route>

                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
