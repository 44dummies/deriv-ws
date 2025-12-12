import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import TradingDashboard from './pages/admin/TradingDashboard';
import SessionManagement from './pages/admin/SessionManagement';
import AdminReportsPage from './pages/admin/AdminReportsPage';

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
              <Route path="users" element={<UsersPage />} />
              <Route path="users/:userId" element={<UserDetailsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              {/* New Pro Trading Dashboard */}
              <Route path="trading" element={<TradingDashboard />} />
              {/* Advanced Session Management */}
              <Route path="manage" element={<SessionManagement />} />
              {/* Reports */}
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>
          </Route>

          {/* User routes - Use full Dashboard with community tab */}
          <Route
            path="/user/dashboard"
            element={
              <UserRoute>
                <Dashboard />
              </UserRoute>
            }
          />
          <Route
            path="/user/*"
            element={
              <UserRoute>
                <Dashboard />
              </UserRoute>
            }
          />

          {/* Legacy routes - Keep for backwards compatibility */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={<Navigate to="/user/dashboard?tab=community" replace />}
          />
          <Route
            path="/trading"
            element={<Navigate to="/user/dashboard?tab=trading" replace />}
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
