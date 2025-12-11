
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Layers,
    Activity,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Users
} from 'lucide-react';
import { GlassButton } from '../ui/glass/GlassButton';

interface SidebarItem {
    icon: React.ReactNode;
    label: string;
    to: string;
    roles: ('admin' | 'user')[];
}

interface ModernSidebarProps {
    isAdmin?: boolean;
    userEmail?: string;
    onLogout?: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({
    isAdmin = false,
    userEmail = 'admin@deriv.com',
    onLogout
}) => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();

    const menuItems: SidebarItem[] = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', to: isAdmin ? '/admin/dashboard' : '/user/dashboard', roles: ['admin', 'user'] },
        { icon: <Layers size={20} />, label: 'Sessions', to: isAdmin ? '/admin/sessions' : '/user/sessions', roles: ['admin', 'user'] },
        { icon: <Activity size={20} />, label: 'Trading', to: isAdmin ? '/admin/trading' : '/user/trading', roles: ['admin', 'user'] },
        { icon: <Users size={20} />, label: 'Users', to: '/admin/users', roles: ['admin'] },
        { icon: <FileText size={20} />, label: 'Reports', to: isAdmin ? '/admin/reports' : '/user/reports', roles: ['admin', 'user'] },
        { icon: <Settings size={20} />, label: 'Settings', to: isAdmin ? '/admin/settings' : '/user/settings', roles: ['admin', 'user'] },
    ];

    const filteredMenu = menuItems.filter(item => item.roles.includes(isAdmin ? 'admin' : 'user'));

    return (
        <aside
            className={`
                fixed left-0 top-0 h-screen 
                bg-white/5 backdrop-blur-2xl 
                border-r border-white/10 
                transition-all duration-300 z-50
                flex flex-col justify-between
                ${collapsed ? 'w-20' : 'w-64'}
            `}
        >
            {/* Header / Logo */}
            <div className="p-6 flex items-center justify-between">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                            D
                        </div>
                        <span className="font-bold text-lg text-white tracking-wide">Deriv<span className="text-emerald-400">Bot</span></span>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                    {collapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                {filteredMenu.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `
                            flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group
                            ${isActive
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
                        `}
                    >
                        <div className={`p-1 ${collapsed ? 'mx-auto' : ''}`}>
                            {item.icon}
                        </div>
                        {!collapsed && (
                            <span className="font-medium text-sm">{item.label}</span>
                        )}

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                ))}
            </nav>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {userEmail.charAt(0).toUpperCase()}
                    </div>

                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{userEmail}</p>
                            <p className="text-xs text-slate-500 truncate">{isAdmin ? 'Administrator' : 'Trader'}</p>
                        </div>
                    )}
                </div>

                {!collapsed && (
                    <button
                        onClick={onLogout}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/10"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                )}
            </div>
        </aside>
    );
};
