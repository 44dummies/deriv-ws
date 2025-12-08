/**
 * Admin Layout Component
 * Modern sidebar navigation with glassmorphism design
 */

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Activity, Settings, LogOut,
    ChevronLeft, Bell, RefreshCw, Shield, BarChart3,
    FileText, Menu, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
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
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isDarkMode = themeId !== 'light';

    // Get user info from session
    const userInfoStr = sessionStorage.getItem('userInfo');
    const userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
    const userName = userInfo.fullname || userInfo.loginid || 'Admin';
    const userInitials = userName.slice(0, 2).toUpperCase();

    const mainNav: NavItem[] = [
        { icon: <LayoutDashboard />, label: 'Dashboard', path: '/admin/dashboard' },
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
        <div className={`admin-layout ${!isDarkMode ? 'light-theme' : ''}`}>
            {/* Sidebar */}
            <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Shield />
                    </div>
                    <div className="sidebar-header-text">
                        <h1>TraderMind</h1>
                        <p>Admin Console</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-title">Main Menu</div>
                        {mainNav.map((item) => (
                            <div
                                key={item.path}
                                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
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
                                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => handleNavClick(item.path)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </nav>

                {/* User Section */}
                <div className="sidebar-user">
                    <div className="user-avatar">{userInitials}</div>
                    <div className="user-info">
                        <p className="user-name">{userName}</p>
                        <p className="user-role">Administrator</p>
                    </div>
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={handleLogout}
                        title="Logout"
                        style={{ marginLeft: 'auto' }}
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {/* Header */}
                <header className="admin-header">
                    <div className="header-left">
                        <button
                            className="toggle-sidebar"
                            onClick={() => {
                                if (window.innerWidth <= 1024) {
                                    setMobileOpen(!mobileOpen);
                                } else {
                                    setCollapsed(!collapsed);
                                }
                            }}
                        >
                            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                        </button>
                        <h1 className="page-title">
                            {mainNav.find(n => isActive(n.path))?.label ||
                                systemNav.find(n => isActive(n.path))?.label ||
                                'Dashboard'}
                        </h1>
                    </div>

                    <div className="header-right">
                        {/* Theme Toggle */}
                        <button
                            className="header-btn"
                            onClick={toggleTheme}
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            className="header-btn has-notification"
                            onClick={() => navigate('/admin/notifications')}
                        >
                            <Bell size={20} />
                        </button>
                        <button className="header-btn" onClick={() => window.location.reload()}>
                            <RefreshCw size={20} />
                        </button>
                        <div className="system-status">
                            <span className="status-dot active"></span>
                            <span className="status-text">System Online</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="admin-content">
                    <Outlet />
                </div>
            </main>

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

