import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Community from './pages/Community';

import UserTrading from './pages/UserTrading';

// New modern admin dashboard
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import SessionsPage from './pages/admin/SessionsPage';
import UsersPage from './pages/admin/UsersPage';
import LogsPage from './pages/admin/LogsPage';
import SettingsPage from './pages/admin/SettingsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import NotificationsPage from './pages/admin/NotificationsPage';
import UserDetailsPage from './pages/admin/UserDetailsPage';
// TradingDashboard removed per user request
import AdminReportsPage from './pages/admin/AdminReportsPage';
import RiskManagement from './pages/admin/RiskManagement';

// Legacy imports


// Route guards
import UserRoute from './components/routing/UserRoute';
import AdminProtected from './components/routing/AdminProtected';

import { TokenService } from './services/tokenService';
import { ThemeProvider } from './context/ThemeContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = TokenService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

function App(): React.ReactElement {
  // Global Auth Error Handler - Prevents Auth Loops
  useEffect(() => {
    const handleAuthError = () => {
      console.log('Global auth error caught - clearing session');
      TokenService.clearTokens();
      // Force reload to clear any in-memory state and reset router
      window.location.href = '/';
    };

    // Register handler
    import('./services/apiClient').then(({ apiClient }) => {
      apiClient.onAuthenticationError(handleAuthError);
    });

    // Cleanup not strictly necessary for singleton but good practice if architected differently
    return () => {
      import('./services/apiClient').then(({ apiClient }) => {
        apiClient.onAuthenticationError(() => { });
      });
    };
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/callback" element={<Callback />} />

          {/* Admin routes - Uses AdminProtected + AdminLayout */}
          <Route path="/admin" element={<AdminProtected />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="sessions/new" element={<SessionsPage />} />
              <Route path="sessions/live" element={<SessionsPage />} />
              <Route path="risk" element={<RiskManagement />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:userId" element={<UserDetailsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              {/* Trading dashboard removed */}
              {/* Reports */}
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>
          </Route>

          {/* User routes - Use full Dashboard with community tab */}
          {/* User routes - Use MainLayout */}
          <Route element={<MainLayout />}>
            <Route
              path="/user/dashboard"
              element={
                <UserRoute>
                  <Dashboard />
                </UserRoute>
              }
            />
            {/* Redirects for SPA architecture */}
            <Route
              path="/user/trading"
              element={<Navigate to="/user/dashboard?tab=trading" replace />}
            />
            <Route
              path="/user/community"
              element={<Navigate to="/user/dashboard?tab=community" replace />}
            />
            <Route
              path="/user/settings"
              element={<Navigate to="/user/dashboard?tab=settings" replace />}
            />
            {/* Fallback for /user/* */}
            <Route path="/user/*" element={<Navigate to="/user/dashboard" replace />} />
          </Route>

          {/* Legacy routes - Keep for backwards compatibility */}
          <Route
            path="/dashboard"
            element={<Navigate to="/user/dashboard" replace />}
          />
          <Route
            path="/settings"
            element={<Navigate to="/user/dashboard?tab=settings" replace />}
          />
          <Route
            path="/community"
            element={<Navigate to="/user/dashboard?tab=community" replace />}
          />
          <Route
            path="/trading"
            element={<Navigate to="/user/trading" replace />}
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
