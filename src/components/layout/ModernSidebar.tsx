
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
    Users,
    ChevronLeft
} from 'lucide-react';

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
    const [collapsed, setCollapsed] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Detect screen size
    useEffect(() => {
        const checkScreenSize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            // On desktop, start expanded; on mobile, stay collapsed
            if (!mobile) {
                setCollapsed(false);
            } else {
                setCollapsed(true);
                setMobileOpen(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Close mobile sidebar when route changes
    useEffect(() => {
        if (isMobile) {
            setMobileOpen(false);
        }
    }, [location.pathname, isMobile]);

    // Close mobile sidebar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMobile && mobileOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setMobileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, mobileOpen]);

    const menuItems: SidebarItem[] = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', to: isAdmin ? '/admin/dashboard' : '/user/dashboard', roles: ['admin', 'user'] },
        { icon: <Layers size={20} />, label: 'Sessions', to: isAdmin ? '/admin/sessions' : '/user/trading', roles: ['admin', 'user'] },
        { icon: <Users size={20} />, label: 'Users', to: '/admin/users', roles: ['admin'] },
        { icon: <FileText size={20} />, label: 'Reports', to: isAdmin ? '/admin/reports' : '/user/reports', roles: ['admin', 'user'] },
        { icon: <Settings size={20} />, label: 'Settings', to: isAdmin ? '/admin/settings' : '/user/settings', roles: ['admin', 'user'] },
    ];

    const filteredMenu = menuItems.filter(item => item.roles.includes(isAdmin ? 'admin' : 'user'));

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('accessToken');
        if (onLogout) onLogout();
        navigate('/login');
    };

    // Determine if sidebar is showing
    const isOpen = isMobile ? mobileOpen : !collapsed;
    const sidebarWidth = isOpen ? 'w-64' : 'w-20';

    return (
        <>
            {/* Mobile Menu Button - Fixed in top left */}
            {isMobile && (
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="fixed top-4 left-4 z-[60] p-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 text-white shadow-lg hover:bg-white/10 transition-all"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            )}

            {/* Mobile Overlay */}
            {isMobile && mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`
                    fixed left-0 top-0 h-screen 
                    bg-black/80 backdrop-blur-2xl 
                    border-r border-white/10 
                    transition-all duration-300 z-50
                    flex flex-col justify-between
                    ${sidebarWidth}
                    ${isMobile ? (mobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
                `}
            >
                {/* Header / Logo */}
                <div className="p-6 flex items-center justify-between">
                    {isOpen && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                T
                            </div>
                            <span className="font-bold text-lg text-white tracking-wide">Trader<span className="text-emerald-400">Mind</span></span>
                        </div>
                    )}

                    {/* Collapse button - Desktop only */}
                    {!isMobile && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredMenu.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                relative flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group
                                ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            <div className={`p-1 ${!isOpen ? 'mx-auto' : ''}`}>
                                {item.icon}
                            </div>
                            {isOpen && (
                                <span className="font-medium text-sm">{item.label}</span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {!isOpen && !isMobile && (
                                <div className="absolute left-full ml-2 px-3 py-2 bg-black/90 border border-white/10 rounded-lg text-sm text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-white/10 bg-black/40">
                    <div className={`flex items-center gap-3 ${!isOpen ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
                            {userEmail.charAt(0).toUpperCase()}
                        </div>

                        {isOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{userEmail}</p>
                                <p className="text-xs text-slate-500 truncate">{isAdmin ? 'Administrator' : 'Trader'}</p>
                            </div>
                        )}
                    </div>

                    {isOpen && (
                        <button
                            onClick={handleLogout}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/10"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    )}

                    {/* Logout icon when collapsed */}
                    {!isOpen && (
                        <button
                            onClick={handleLogout}
                            className="mt-4 w-full flex items-center justify-center p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};
