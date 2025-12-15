import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Layers, Users, FileText, Settings,
    LogOut, Menu, ChevronLeft, Bell, Search, Shield, Activity, Zap
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
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard', to: '/admin/dashboard' },
        { icon: <Layers size={18} />, label: 'Sessions', to: '/admin/sessions' },
        { icon: <Shield size={18} />, label: 'Risk & Signals', to: '/admin/risk' },
        { icon: <Users size={18} />, label: 'Users', to: '/admin/users' },
        { icon: <FileText size={18} />, label: 'Reports', to: '/admin/reports' },
        { icon: <Settings size={18} />, label: 'Settings', to: '/admin/settings' },
    ];

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('accessToken');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white flex overflow-hidden selection:bg-brand-red/30 font-inter">
            {/* Background Ambience - Clean Technical */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-grid opacity-10"></div>
            </div>

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 bg-brand-card/90 backdrop-blur-xl border-r border-white/5 transition-all duration-300
                    flex flex-col justify-between
                    ${collapsed ? 'w-16' : 'w-60'}
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Header */}
                <div className="h-14 flex items-center justify-between px-3 border-b border-white/5">
                    <div className={`flex items-center gap-2 overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
                        <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center shrink-0">
                            <Logo className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-sm tracking-tight text-white uppercase">TraderMind</span>
                    </div>
                    {collapsed && (
                        <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center mx-auto">
                            <Logo className="h-5 w-5 text-white" />
                        </div>
                    )}

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden lg:flex p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors absolute -right-3 top-5 bg-brand-dark border border-white/10"
                    >
                        <ChevronLeft size={12} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-2 text-gray-400 hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-brand-red/10 text-brand-red'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className="relative z-10">{item.icon}</span>
                                    {!collapsed && <span className="relative z-10 font-medium text-xs tracking-wide">{item.label}</span>}

                                    {/* Tooltip */}
                                    {collapsed && (
                                        <div className="absolute left-full ml-4 px-2 py-1 bg-brand-card border border-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
                                            {item.label}
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer User */}
                <div className="p-3 border-t border-white/5">
                    <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                            ADM
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">Administrator</p>
                                <p className="text-[10px] text-brand-red truncate uppercase tracking-wider">System Access</p>
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={handleLogout}
                                className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-brand-red/10 rounded-lg transition-colors"
                            >
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main
                className={`
                    flex-1 flex flex-col min-h-screen transition-all duration-300 relative z-10 content-security-policy
                    ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}
                `}
            >
                {/* Top Bar glass - High Density */}
                <header className="sticky top-0 z-40 h-14 border-b border-white/5 bg-brand-card/80 backdrop-blur-xl flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden p-2 text-gray-400 hover:text-white"
                        >
                            <Menu size={20} />
                        </button>

                        <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>SYSTEM ONLINE</span>
                            </div>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2 text-gray-400">
                                <Zap size={12} />
                                <span>LATENCY: 45ms</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="hidden md:flex relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-red transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Command Search..."
                                className="bg-brand-dark border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/50 focus:bg-brand-dark/50 transition-all w-64"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                <span className="text-[10px] bg-white/5 px-1.5 rounded text-gray-500 border border-white/5">⌘</span>
                                <span className="text-[10px] bg-white/5 px-1.5 rounded text-gray-500 border border-white/5">K</span>
                            </div>
                        </div>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-red rounded-full" />
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
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}
        </div>
    );
};
