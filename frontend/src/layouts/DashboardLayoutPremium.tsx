/**
 * TraderMind Premium Dashboard Layout
 * Figma-worthy, ultra-modern design with collapsible side panel
 */

import { useState, createContext, useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    BarChart2,
    MessageSquare,
    Bell,
    Search,
    Sparkles,
    TrendingUp,
    Zap,
    User,
    HelpCircle,
    Command,
    Moon,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { cn } from '../lib/utils';

// =============================================================================
// CONTEXT FOR SIDEBAR STATE
// =============================================================================

interface SidebarContextType {
    isExpanded: boolean;
    setIsExpanded: (value: boolean) => void;
    isHovered: boolean;
    setIsHovered: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) throw new Error('useSidebar must be used within SidebarProvider');
    return context;
};

// =============================================================================
// ANIMATED BACKGROUND
// =============================================================================

function PremiumBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-[#030712]" />
            
            {/* Mesh gradient */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/30 via-transparent to-transparent rounded-full filter blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-purple-600/20 via-transparent to-transparent rounded-full filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-600/10 via-transparent to-cyan-600/10 rounded-full filter blur-[120px]" />
            </div>

            {/* Noise texture */}
            <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }} />

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
    );
}

// =============================================================================
// GLASSMORPHISM SIDEBAR
// =============================================================================

interface NavItemProps {
    icon: any;
    label: string;
    path: string;
    isExpanded: boolean;
    badge?: number;
    isNew?: boolean | undefined;
}

function NavItem({ icon: Icon, label, path, isExpanded, badge, isNew }: NavItemProps) {
    const location = useLocation();
    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <NavLink
            to={path}
            className={cn(
                "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group",
                isExpanded ? "justify-start" : "justify-center",
                isActive
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
        >
            {/* Active indicator */}
            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"
                />
            )}

            <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300",
                isActive 
                    ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25"
                    : "bg-white/5 group-hover:bg-white/10"
            )}>
                <Icon className="w-5 h-5" />
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>

            {/* Badge */}
            {badge && badge > 0 && (
                <span className={cn(
                    "absolute flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full",
                    isExpanded ? "right-3" : "top-1 right-1"
                )}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}

            {/* New badge */}
            {isNew && isExpanded && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-full uppercase tracking-wider">
                    New
                </span>
            )}

            {/* Tooltip for collapsed state */}
            {!isExpanded && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">{label}</span>
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 border-l border-b border-white/10 rotate-45" />
                </div>
            )}
        </NavLink>
    );
}

function CollapsibleSidebar() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();

    const effectiveExpanded = isExpanded || isHovered;

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const mainNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
        { icon: BarChart2, label: 'Sessions', path: '/user/sessions' },
        { icon: BarChart3, label: 'Statistics', path: '/user/stats' },
        { icon: MessageSquare, label: 'Assistant', path: '/user/chat', isNew: true },
    ];

    const bottomNavItems = [
        { icon: Settings, label: 'Settings', path: '/user/settings' },
        { icon: HelpCircle, label: 'Help & Support', path: '/user/help' },
    ];

    return (
        <motion.aside
            initial={false}
            animate={{ width: effectiveExpanded ? 280 : 80 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "hidden md:flex flex-col h-screen fixed left-0 top-0 z-40",
                "bg-gray-950/80 backdrop-blur-2xl border-r border-white/5"
            )}
        >
            {/* Logo Section */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <motion.div
                    className="flex items-center gap-3 overflow-hidden"
                    animate={{ justifyContent: effectiveExpanded ? 'flex-start' : 'center' }}
                >
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-950" />
                    </div>
                    <AnimatePresence>
                        {effectiveExpanded && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="overflow-hidden"
                            >
                                <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                                    TraderMind
                                </h1>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Pro Trading</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {effectiveExpanded && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </motion.button>
                )}
            </div>

            {/* User Quick Info */}
            <div className={cn(
                "p-4 border-b border-white/5",
                effectiveExpanded ? "px-4" : "px-2"
            )}>
                <div className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-white/5 to-transparent",
                    !effectiveExpanded && "justify-center p-2"
                )}>
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                                {user?.email?.charAt(0).toUpperCase() || 'T'}
                            </span>
                        </div>
                    </div>
                    <AnimatePresence>
                        {effectiveExpanded && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex-1 min-w-0 overflow-hidden"
                            >
                                <p className="font-medium text-white truncate text-sm">
                                    {user?.email?.split('@')[0] || 'Trader'}
                                </p>
                                <p className="text-xs text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Pro Account
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <AnimatePresence>
                    {effectiveExpanded && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"
                        >
                            Main Menu
                        </motion.p>
                    )}
                </AnimatePresence>
                
                {mainNavItems.map((item) => (
                    <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        isExpanded={effectiveExpanded}
                        isNew={item.isNew}
                    />
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 space-y-1 border-t border-white/5">
                {bottomNavItems.map((item) => (
                    <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        isExpanded={effectiveExpanded}
                    />
                ))}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all",
                        effectiveExpanded ? "justify-start" : "justify-center"
                    )}
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10">
                        <LogOut className="w-5 h-5" />
                    </div>
                    <AnimatePresence>
                        {effectiveExpanded && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="font-medium overflow-hidden"
                            >
                                Logout
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>

            {/* Pro Badge */}
            {effectiveExpanded && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4"
                >
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Quant Engine</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            10 strategies active. Adaptive learning enabled.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                            </div>
                            <span className="text-[10px] text-gray-500">75%</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.aside>
    );
}

// =============================================================================
// TOP BAR
// =============================================================================

function TopBar() {
    const { user } = useAuthStore();
    const [_searchOpen, setSearchOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 bg-gray-950/50 backdrop-blur-xl border-b border-white/5">
            {/* Search */}
            <div className="flex-1 max-w-xl">
                <div 
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                    <Search className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Search markets, trades...</span>
                    <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-[10px] text-gray-500 font-mono">
                        <Command className="w-3 h-3" />
                        K
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Quick Stats */}
                <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-gray-400">Market Open</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">+12.4%</span>
                    </div>
                </div>

                {/* Notifications */}
                <button className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Theme Toggle */}
                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <Moon className="w-5 h-5 text-gray-400" />
                </button>

                {/* Profile */}
                <button className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                            {user?.email?.charAt(0).toUpperCase() || 'T'}
                        </span>
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-white">{user?.email?.split('@')[0] || 'Trader'}</p>
                        <p className="text-[10px] text-gray-500">Pro Plan</p>
                    </div>
                </button>
            </div>
        </header>
    );
}

// =============================================================================
// MOBILE NAVIGATION
// =============================================================================

function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const { signOut } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
        { icon: BarChart2, label: 'Sessions', path: '/user/sessions' },
        { icon: BarChart3, label: 'Statistics', path: '/user/stats' },
        { icon: MessageSquare, label: 'Assistant', path: '/user/chat' },
        { icon: Settings, label: 'Settings', path: '/user/settings' },
    ];

    return (
        <>
            {/* Mobile Bottom Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 safe-area-inset-bottom">
                <div className="flex items-center justify-around">
                    {navItems.slice(0, 4).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                                isActive ? "text-blue-400" : "text-gray-500"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-gray-500"
                    >
                        <User className="w-5 h-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl p-6 pb-8 md:hidden"
                        >
                            <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-6" />
                            <nav className="space-y-2">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-4 p-4 rounded-xl",
                                            isActive 
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </NavLink>
                                ))}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-4 p-4 rounded-xl text-red-400 w-full"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-medium">Logout</span>
                                </button>
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// =============================================================================
// MAIN LAYOUT EXPORT
// =============================================================================

export default function DashboardLayoutPremium() {
    const [sidebarExpanded, _setSidebarExpanded] = useState(true);

    return (
        <div className="min-h-screen text-white font-sans">
            <PremiumBackground />
            <CollapsibleSidebar />
            <MobileNav />

            {/* Main Content Area */}
            <motion.main
                initial={false}
                animate={{ marginLeft: sidebarExpanded ? 280 : 80 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="hidden md:block min-h-screen"
                style={{ marginLeft: 280 }}
            >
                <TopBar />
                <div className="p-8 pb-24 max-w-[1600px] mx-auto">
                    <Outlet />
                </div>
            </motion.main>

            {/* Mobile Main Content */}
            <main className="md:hidden min-h-screen pb-20 pt-4">
                <div className="px-4">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
