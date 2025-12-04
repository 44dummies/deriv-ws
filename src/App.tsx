import React, { ReactNode, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Community from './pages/Community';
import { TokenService } from './services/tokenService';

const THEMES: Record<string, { primary: string; bg: string; accent: string }> = {
  dark: { primary: '#6366f1', bg: '#0a0a0f', accent: '#22d3ee' },
  midnight: { primary: '#3b82f6', bg: '#0f172a', accent: '#60a5fa' },
  emerald: { primary: '#10b981', bg: '#0a0f0a', accent: '#34d399' },
  rose: { primary: '#f43f5e', bg: '#0f0a0a', accent: '#fb7185' },
  amber: { primary: '#f59e0b', bg: '#0f0d0a', accent: '#fbbf24' },
  violet: { primary: '#8b5cf6', bg: '#0d0a0f', accent: '#a78bfa' },
  cyan: { primary: '#06b6d4', bg: '#0a0f0f', accent: '#22d3ee' },
  crimson: { primary: '#dc2626', bg: '#0a0505', accent: '#ef4444' }
};

const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isAuthenticated = TokenService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('tradermind_theme') || 'dark';
    const theme = THEMES[savedTheme] || THEMES.dark;
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-bg', theme.bg);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
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
          element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
