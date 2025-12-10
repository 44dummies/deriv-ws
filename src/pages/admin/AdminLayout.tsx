/**
 * Admin Layout Component
 * Modern sidebar navigation with glassmorphism design
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Activity, Settings, LogOut,
    Bell, RefreshCw, Shield, BarChart3,
    FileText, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import MobileNavigation from '../../components/layout/MobileNavigation';
import './admin.css';

interface NavItem {
    icon: React.ReactNode;
    label: string;
    path: string;
    badge?: number;
}

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { themeId, setTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isDarkMode = themeId !== 'light';

    // Get user info from session
    const userInfoStr = sessionStorage.getItem('userInfo');
    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
    const userName = userInfo.fullname || userInfo.loginid || 'Admin';
    const userInitials = userName.slice(0, 2).toUpperCase();

    const mainNav: NavItem[] = [
        { icon: <LayoutDashboard />, label: 'Overview', path: '/admin/dashboard' },
        { icon: <Activity />, label: 'Sessions', path: '/admin/sessions' },
        { icon: <Users />, label: 'Users', path: '/admin/users' },
        { icon: <BarChart3 />, label: 'Analytics', path: '/admin/analytics' },
        { icon: <Bell />, label: 'Notifications', path: '/admin/notifications' },
        { icon: <FileText />, label: 'Activity Logs', path: '/admin/logs' },
    ];

    const systemNav: NavItem[] = [
        { icon: <Settings />, label: 'Settings', path: '/admin/settings' },
    ];

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/');
    };

    const handleNavClick = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
    };

    return (
        <div className={`admin-layout sidebar-right ${!isDarkMode ? 'light-theme' : ''}`}>

            {/* Liquid Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#3b82f6]/15 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#8b5cf6]/15 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
            </div>

            {/* Main Content */}
            <main className="admin-main">
                {/* Header */}
                <header className="admin-header glass-card border-x-0 border-t-0 rounded-none">
                    <div className="header-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#3b82f6]/30">
                                <Shield size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                    TraderMind
                                </h1>
                                <p className="text-xs text-gray-500 -mt-0.5">Admin Dashboard</p>
                            </div>
                        </div>
                    </div>

                    <div className="header-right">
                        {/* Theme Toggle */}
                        <button
                            className="header-btn glossy-btn"
                            onClick={toggleTheme}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            className="header-btn glossy-btn has-notification"
                            onClick={() => navigate('/admin/notifications')}
                        >
                            <Bell size={20} />
                        </button>
                        <button className="header-btn glossy-btn" onClick={() => window.location.reload()}>
                            <RefreshCw size={20} />
                        </button>
                        <div className="system-status glass-card px-3 py-1.5 rounded-full hidden sm:flex">
                            <span className="status-dot active"></span>
                            <span className="status-text text-xs">System Online</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="admin-content pb-[80px] lg:pb-0">
                    <Outlet />
                </div>
            </main>

            {/* Sidebar - Right Side */}
            <aside className={`admin-sidebar sidebar-right ${mobileOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="sidebar-header">
                    <div className="user-avatar-large">{userInitials}</div>
                    <div className="sidebar-header-text">
                        <h1>{userName}</h1>
                        <p>Administrator</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-title">Navigation</div>
                        {mainNav.map((item) => (
                            <div
                                key={item.path}
                                className={`nav-item glass-card-hover ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => handleNavClick(item.path)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                                {item.badge && <span className="nav-badge">{item.badge}</span>}
                            </div>
                        ))}
                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">System</div>
                        {systemNav.map((item) => (
                            <div
                                key={item.path}
                                className={`nav-item glass-card-hover ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => handleNavClick(item.path)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </nav>

                {/* Logout Button */}
                <div className="sidebar-footer">
                    <button
                        className="btn btn-logout glass-card w-full flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Navigation */}
            <MobileNavigation
                items={[...mainNav, ...systemNav]}
                onMoreClick={() => setMobileOpen(true)}
            />

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 99,
                    }}
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;


