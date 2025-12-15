import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Layers, Users, FileText, Settings,
    LogOut, Menu, ChevronLeft, Bell, Search
} from 'lucide-react';
import { Logo } from '../ui/Logo';

export const AdminGlassLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Mock user for now - in real app get from context
    const user = { email: 'admin@deriv.com', role: 'admin' };

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', to: '/admin/dashboard' },
        { icon: <Layers size={20} />, label: 'Sessions', to: '/admin/sessions' },
        { icon: <Users size={20} />, label: 'Users', to: '/admin/users' },
        { icon: <FileText size={20} />, label: 'Reports', to: '/admin/reports' },
        { icon: <Settings size={20} />, label: 'Settings', to: '/admin/settings' },
    ];

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('accessToken');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#05070a] text-white flex overflow-hidden selection:bg-liquid-accent/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
            </div>

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-[#05070a]/90 backdrop-blur-xl border-r border-white/5 transition-all duration-300
                    flex flex-col justify-between
                    ${collapsed ? 'w-20' : 'w-64'}
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
                    <div className={`flex items-center gap-3 overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
                        <Logo className="h-8 w-8" />
                        <span className="font-bold text-lg tracking-tight">TraderMind</span>
                    </div>
                    {collapsed && <Logo className="h-8 w-8 mx-auto" />}

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors absolute -right-3 top-6 bg-[#05070a] border border-white/10"
                    >
                        <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-2 text-gray-400 hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-gradient-to-r from-liquid-accent/10 to-transparent text-liquid-accent border-l-2 border-liquid-accent'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className="relative z-10">{item.icon}</span>
                                    {!collapsed && <span className="relative z-10 font-medium text-sm">{item.label}</span>}

                                    {/* Glow Line for active state */}
                                    {isActive && <div className="absolute inset-0 bg-liquid-accent/5 rounded-xl blur-sm" />}

                                    {/* Tooltip */}
                                    {collapsed && (
                                        <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1a1f2e] border border-white/10 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                            {item.label}
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer User */}
                <div className="p-4 border-t border-white/5">
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-sm shadow-lg ring-2 ring-black">
                            A
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">Admin User</p>
                                <p className="text-xs text-gray-500 truncate">Super Admin</p>
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main
                className={`
                    flex-1 flex flex-col min-h-screen transition-all duration-300 relative z-10
                    ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}
                `}
            >
                {/* Top Bar glass */}
                <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-[#05070a]/80 backdrop-blur-xl flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden p-2 text-gray-400 hover:text-white"
                        >
                            <Menu size={20} />
                        </button>

                        {/* Breadcrumbs or Title could go here */}
                        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
                            <span>Admin</span>
                            <span className="text-gray-600">/</span>
                            <span className="text-white">Dashboard</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="hidden md:flex relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all w-64"
                            />
                        </div>

                        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full blur-[1px]" />
                        </button>
                    </div>
                </header>

                <div className="p-6">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </div>
    );
};
