import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Activity,
    Terminal,
    DollarSign,
    MessageSquare,
    LogOut,
    ShieldAlert,
    Menu,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { cn } from '../lib/utils';

export default function AdminLayout() {
    const { user, signOut, isAdmin } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Strict Security Check
    useEffect(() => {
        if (!user || !isAdmin) {
            navigate('/');
        }
    }, [user, isAdmin, navigate]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin/overview' },
        { icon: Activity, label: 'Sessions', path: '/admin/sessions' },
        { icon: ShieldAlert, label: 'AI Monitor', path: '/admin/ai-monitor' },
        { icon: Terminal, label: 'Quant Logs', path: '/admin/logs' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: DollarSign, label: 'Commissions', path: '/admin/commissions' },
        { icon: MessageSquare, label: 'AI Audit Chat', path: '/admin/chat' },
    ];

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 flex">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-[#050a18]/50 backdrop-blur-xl fixed h-full z-20">
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-2 text-danger-glow animate-pulse-slow">
                        <ShieldAlert className="h-6 w-6" />
                        <span className="font-bold text-lg tracking-wider uppercase">RiskGuard</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">ADMINISTRATOR_ACCESS</div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-danger/10 text-danger border border-danger/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                    : "hover:bg-white/5 text-slate-400 hover:text-white"
                            )}
                        >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="font-medium">{item.label}</span>
                            {location.pathname === item.path && (
                                <motion.div
                                    layoutId="admin-active-indicator"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-danger shadow-[0_0_10px_#ef4444]"
                                />
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="p-4 rounded-xl bg-white/5 mb-4">
                        <div className="text-xs text-slate-500 mb-1">Authenticated as</div>
                        <div className="font-mono text-sm text-white truncate max-w-[180px]">{user?.email}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="text-xs text-success">Secure Connection</span>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 relative">
                {/* Mobile Header */}
                <div className="md:hidden sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-lg border-b border-white/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-danger">
                        <ShieldAlert className="h-5 w-5" />
                        <span className="font-bold">ADMIN</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="md:hidden fixed inset-0 z-20 bg-[#030712] pt-20 px-4 pb-4"
                        >
                            <nav className="space-y-2">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                            isActive ? "bg-danger/10 text-danger" : "text-slate-400"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Page Content */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
