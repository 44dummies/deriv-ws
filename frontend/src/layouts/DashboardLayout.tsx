import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Menu,
    X,
    BrainCircuit,
    BarChart2,
    MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';
import { cn } from '../lib/utils';
import { AnimatedGradientBackground } from '../components/PremiumUI';

export default function DashboardLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: BarChart2, label: 'Sessions', path: '/user/sessions' },
        { icon: BrainCircuit, label: 'Stats & AI', path: '/user/stats' }, // Updated Icon
        { icon: MessageSquare, label: 'Assistant', path: '/user/chat' }, // New Chat Item
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="min-h-screen bg-background text-white font-sans flex overflow-hidden relative">
            {/* Premium Animated Background */}
            <AnimatedGradientBackground />

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-surface/80 backdrop-blur-2xl relative z-20">
                <div className="p-6 flex items-center gap-3 border-b border-white/5">
                    <img src="/tradermind-logo.png" alt="TraderMind" className="w-8 h-8 rounded-lg shadow-lg shadow-primary/20" />
                    <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        TraderMind
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="/tradermind-logo.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                    <span className="font-bold text-lg">TraderMind</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400">
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        className="fixed inset-0 z-40 bg-background pt-20 px-6 md:hidden"
                    >
                        <nav className="space-y-4">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-4 p-4 rounded-xl text-lg border",
                                        isActive
                                            ? "bg-primary/10 text-primary border-primary/20"
                                            : "border-transparent text-gray-400"
                                    )}
                                >
                                    <item.icon className="w-6 h-6" />
                                    {item.label}
                                </NavLink>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-4 p-4 w-full text-lg text-red-400 border border-transparent"
                            >
                                <LogOut className="w-6 h-6" />
                                Logout
                            </button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-20 md:pt-0 relative z-10">
                <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
