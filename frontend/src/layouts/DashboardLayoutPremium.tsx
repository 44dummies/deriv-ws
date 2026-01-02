/**
 * TraderMind Premium Dashboard Layout
 * Liquid glass design with collapsible sidebar and theme support
 */

import { useState, createContext, useContext, useEffect } from 'react';
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
    Bell,
    Search,
    User,
    HelpCircle,
    Command,
    Moon,
    Sun,
    ChevronDown,
    Check,
    TrendingUp,
    PieChart,
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useDerivAccountInfo } from '../hooks/useDerivAccountInfo';
import { useThemeStore } from '../stores/useThemeStore';
import { cn } from '../lib/utils';

// =============================================================================
// CONTEXT FOR SIDEBAR STATE
// =============================================================================

interface SidebarContextType {
    isExpanded: boolean;
    setIsExpanded: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) throw new Error('useSidebar must be used within SidebarProvider');
    return context;
};

// =============================================================================
// LIQUID GLASS BACKGROUND
// =============================================================================

function LiquidGlassBackground() {
    const { isDarkMode } = useThemeStore();
    
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className={cn(
                "absolute inset-0 transition-colors duration-500",
                isDarkMode ? "bg-[#030712]" : "bg-[#f8fafc]"
            )} />
            
            <div className="absolute inset-0">
                <div className={cn(
                    "absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full filter blur-[120px] animate-pulse",
                    isDarkMode 
                        ? "bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent"
                        : "bg-gradient-to-br from-blue-400/30 via-blue-300/20 to-transparent"
                )} />
                <div className={cn(
                    "absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full filter blur-[140px] animate-pulse",
                    isDarkMode 
                        ? "bg-gradient-to-tl from-indigo-600/15 via-purple-500/10 to-transparent"
                        : "bg-gradient-to-tl from-indigo-400/25 via-purple-300/15 to-transparent"
                )} style={{ animationDelay: '2s' }} />
            </div>

            <div className={cn(
                "absolute inset-0",
                isDarkMode ? "opacity-[0.015]" : "opacity-[0.02]"
            )} style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }} />
        </div>
    );
}

// =============================================================================
// NAVIGATION ITEM
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
    const { isDarkMode } = useThemeStore();
    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <NavLink
            to={path}
            className={cn(
                "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group",
                isExpanded ? "justify-start" : "justify-center",
                isActive
                    ? isDarkMode 
                        ? "bg-white/10 text-white shadow-lg shadow-blue-500/10"
                        : "bg-blue-500/10 text-blue-600 shadow-lg shadow-blue-500/10"
                    : isDarkMode
                        ? "text-gray-400 hover:text-white hover:bg-white/5"
                        : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-full"
                />
            )}

            <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300",
                isActive 
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 text-white"
                    : isDarkMode
                        ? "bg-white/5 group-hover:bg-white/10"
                        : "bg-black/5 group-hover:bg-black/10"
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

            {badge && badge > 0 && (
                <span className={cn(
                    "absolute flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full",
                    isExpanded ? "right-3" : "top-1 right-1"
                )}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}

            {isNew && isExpanded && (
                <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-full uppercase tracking-wider">
                    New
                </span>
            )}

            {!isExpanded && (
                <div className={cn(
                    "absolute left-full ml-3 px-3 py-2 backdrop-blur-xl border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap",
                    isDarkMode 
                        ? "bg-gray-900/95 border-white/10 text-white"
                        : "bg-white/95 border-black/10 text-gray-900"
                )}>
                    <span className="text-sm font-medium">{label}</span>
                </div>
            )}
        </NavLink>
    );
}

// =============================================================================
// COLLAPSIBLE SIDEBAR
// =============================================================================

function CollapsibleSidebar({ isExpanded, setIsExpanded }: { isExpanded: boolean; setIsExpanded: (v: boolean) => void }) {
    const { user, signOut } = useAuthStore();
    const { fullname } = useDerivAccountInfo();
    const { isDarkMode } = useThemeStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const mainNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
        { icon: BarChart2, label: 'Sessions', path: '/user/sessions' },
        { icon: PieChart, label: 'Analytics', path: '/user/analytics', isNew: true },
        { icon: BarChart3, label: 'Statistics', path: '/user/stats' },
    ];

    const bottomNavItems = [
        { icon: Settings, label: 'Settings', path: '/user/settings' },
        { icon: HelpCircle, label: 'Help & Support', path: '/user/help' },
    ];

    return (
        <motion.aside
            initial={false}
            animate={{ width: isExpanded ? 260 : 72 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
                "hidden md:flex flex-col h-screen fixed left-0 top-0 z-40",
                "backdrop-blur-2xl border-r",
                isDarkMode 
                    ? "bg-gray-950/70 border-white/5"
                    : "bg-white/70 border-black/5"
            )}
        >
            {/* Logo Section */}
            <div className={cn(
                "p-4 flex items-center justify-between border-b",
                isDarkMode ? "border-white/5" : "border-black/5"
            )}>
                <motion.div
                    className="flex items-center gap-3 overflow-hidden"
                    animate={{ justifyContent: isExpanded ? 'flex-start' : 'center' }}
                >
                    <div className="relative flex-shrink-0">
                        <img 
                            src="/logo.svg" 
                            alt="TraderMind" 
                            className="w-10 h-10 rounded-xl shadow-lg shadow-blue-500/30"
                        />
                        <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2",
                            isDarkMode ? "border-gray-950" : "border-white"
                        )} />
                    </div>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="overflow-hidden"
                            >
                                <h1 className={cn(
                                    "font-bold text-lg",
                                    isDarkMode ? "text-white" : "text-gray-900"
                                )}>
                                    TraderMind
                                </h1>
                                <p className={cn(
                                    "text-[10px] uppercase tracking-widest",
                                    isDarkMode ? "text-gray-500" : "text-gray-400"
                                )}>Pro Trading</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "p-2 rounded-lg transition-colors flex-shrink-0",
                        isDarkMode 
                            ? "bg-white/5 hover:bg-white/10 text-gray-400"
                            : "bg-black/5 hover:bg-black/10 text-gray-600"
                    )}
                >
                    {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </motion.button>
            </div>

            {/* User Quick Info */}
            <div className={cn(
                "p-4 border-b",
                isDarkMode ? "border-white/5" : "border-black/5",
                isExpanded ? "px-4" : "px-2"
            )}>
                <div className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all",
                    isDarkMode 
                        ? "bg-white/5"
                        : "bg-black/5",
                    !isExpanded && "justify-center p-2"
                )}>
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">
                                {fullname?.charAt(0).toUpperCase() || 'T'}
                            </span>
                        </div>
                    </div>
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex-1 min-w-0 overflow-hidden text-left"
                            >
                                <p className={cn(
                                    "font-medium truncate text-sm",
                                    isDarkMode ? "text-white" : "text-gray-900"
                                )}>
                                    {fullname || 'Trader'}
                                </p>
                                <p className={cn(
                                    "text-xs truncate",
                                    isDarkMode ? "text-gray-500" : "text-gray-400"
                                )}>
                                    {user?.email?.split('@')[0]}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <AnimatePresence>
                    {isExpanded && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                                "px-3 py-2 text-[10px] font-bold uppercase tracking-widest",
                                isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}
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
                        isExpanded={isExpanded}
                        isNew={item.isNew}
                    />
                ))}
            </nav>

            {/* Bottom Section */}
            <div className={cn(
                "p-3 space-y-1 border-t",
                isDarkMode ? "border-white/5" : "border-black/5"
            )}>
                {bottomNavItems.map((item) => (
                    <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        isExpanded={isExpanded}
                    />
                ))}

                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all",
                        isExpanded ? "justify-start" : "justify-center"
                    )}
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10">
                        <LogOut className="w-5 h-5" />
                    </div>
                    <AnimatePresence>
                        {isExpanded && (
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

            {/* Quant Engine Status */}
            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4"
                >
                    <div className={cn(
                        "p-4 rounded-2xl border",
                        isDarkMode 
                            ? "bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-transparent border-white/5"
                            : "bg-gradient-to-br from-blue-100 via-blue-50 to-transparent border-blue-200/50"
                    )}>
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider",
                                isDarkMode ? "text-white" : "text-gray-900"
                            )}>Quant Engine</span>
                        </div>
                        <p className={cn(
                            "text-[11px] leading-relaxed",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                            10 strategies active
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <div className={cn(
                                "flex-1 h-1.5 rounded-full overflow-hidden",
                                isDarkMode ? "bg-gray-800" : "bg-gray-200"
                            )}>
                                <div className="w-3/4 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" />
                            </div>
                            <span className={cn(
                                "text-[10px]",
                                isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}>75%</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.aside>
    );
}

// =============================================================================
// ACCOUNT SWITCHER DROPDOWN
// =============================================================================

function AccountSwitcher() {
    const { user, switchAccount } = useAuthStore();
    const { balance, currency, isVirtual, loginid } = useDerivAccountInfo();
    const { isDarkMode } = useThemeStore();
    const [isOpen, setIsOpen] = useState(false);

    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all",
                    isDarkMode 
                        ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        : "bg-white border-black/10 hover:bg-gray-50 hover:border-black/20",
                    isVirtual 
                        ? "ring-1 ring-orange-500/30"
                        : "ring-1 ring-emerald-500/30"
                )}
            >
                <div className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-lg",
                    isVirtual ? "bg-orange-500/20" : "bg-emerald-500/20"
                )}>
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isVirtual ? "bg-orange-500" : "bg-emerald-500 animate-pulse"
                    )} />
                    <span className={cn(
                        "text-xs font-bold",
                        isVirtual ? "text-orange-400" : "text-emerald-400"
                    )}>
                        {isVirtual ? 'DEMO' : 'REAL'}
                    </span>
                </div>

                <div className="hidden sm:block text-left">
                    <p className={cn(
                        "text-sm font-mono font-bold",
                        isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                        {balance.toLocaleString()} {currency}
                    </p>
                    <p className={cn(
                        "text-[10px]",
                        isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>{loginid}</p>
                </div>

                <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    isDarkMode ? "text-gray-400" : "text-gray-500",
                    isOpen && "rotate-180"
                )} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className={cn(
                                "absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-2xl overflow-hidden z-50",
                                isDarkMode 
                                    ? "bg-gray-900/95 backdrop-blur-xl border-white/10"
                                    : "bg-white border-black/10"
                            )}
                        >
                            <div className="p-2">
                                <p className={cn(
                                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider",
                                    isDarkMode ? "text-gray-500" : "text-gray-400"
                                )}>
                                    Switch Account
                                </p>
                                {user?.deriv_accounts?.map((acc) => (
                                    <button
                                        key={acc.loginid}
                                        onClick={() => {
                                            switchAccount(acc.loginid);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-lg transition-all",
                                            acc.loginid === activeAccount?.loginid
                                                ? isDarkMode ? "bg-white/10" : "bg-blue-50"
                                                : isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-3 h-3 rounded-full",
                                                !acc.is_virtual ? "bg-emerald-500" : "bg-orange-500"
                                            )} />
                                            <div className="text-left">
                                                <p className={cn(
                                                    "font-medium",
                                                    isDarkMode ? "text-white" : "text-gray-900"
                                                )}>
                                                    {!acc.is_virtual ? 'Real Account' : 'Demo Account'}
                                                </p>
                                                <p className={cn(
                                                    "text-xs",
                                                    isDarkMode ? "text-gray-500" : "text-gray-400"
                                                )}>{acc.loginid}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className={cn(
                                                    "font-mono font-bold",
                                                    isDarkMode ? "text-white" : "text-gray-900"
                                                )}>
                                                    {acc.balance?.toLocaleString() || '0'}
                                                </p>
                                                <p className={cn(
                                                    "text-xs",
                                                    isDarkMode ? "text-gray-500" : "text-gray-400"
                                                )}>{acc.currency}</p>
                                            </div>
                                            {acc.loginid === activeAccount?.loginid && (
                                                <Check className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================================================
// TOP BAR
// =============================================================================

function TopBar() {
    const { user } = useAuthStore();
    const { fullname } = useDerivAccountInfo();
    const { isDarkMode, toggleDarkMode } = useThemeStore();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications] = useState([
        { id: 1, title: 'Trade Executed', message: 'BUY R_100 @ 1234.56', time: '2m ago', unread: true },
        { id: 2, title: 'Strategy Alert', message: 'RSI detected on R_50', time: '15m ago', unread: true },
        { id: 3, title: 'Session Complete', message: 'Session ended +$45.20', time: '1h ago', unread: false },
    ]);

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <header className={cn(
            "sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-4 backdrop-blur-xl border-b",
            isDarkMode 
                ? "bg-gray-950/50 border-white/5"
                : "bg-white/50 border-black/5"
        )}>
            {/* Search */}
            <div className="flex-1 max-w-xl">
                <div className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all group",
                    isDarkMode 
                        ? "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                        : "bg-white border-black/5 hover:bg-gray-50 hover:border-black/10"
                )}>
                    <Search className={cn("w-4 h-4", isDarkMode ? "text-gray-500" : "text-gray-400")} />
                    <span className={cn("text-sm", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                        Search markets, trades...
                    </span>
                    <div className={cn(
                        "ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono",
                        isDarkMode ? "bg-white/5 text-gray-500" : "bg-black/5 text-gray-400"
                    )}>
                        <Command className="w-3 h-3" />K
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <AccountSwitcher />

                {/* Notifications */}
                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={cn(
                            "relative p-2.5 rounded-xl transition-colors",
                            isDarkMode 
                                ? "bg-white/5 hover:bg-white/10"
                                : "bg-white border border-black/5 hover:bg-gray-50"
                        )}
                    >
                        <Bell className={cn("w-5 h-5", isDarkMode ? "text-gray-400" : "text-gray-500")} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className={cn(
                                        "absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-2xl overflow-hidden z-50",
                                        isDarkMode 
                                            ? "bg-gray-900/95 backdrop-blur-xl border-white/10"
                                            : "bg-white border-black/10"
                                    )}
                                >
                                    <div className={cn("p-4 border-b", isDarkMode ? "border-white/5" : "border-black/5")}>
                                        <h3 className={cn("font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                                            Notifications
                                        </h3>
                                        <p className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                            {unreadCount} unread
                                        </p>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={cn(
                                                    "p-4 border-b transition-colors cursor-pointer",
                                                    isDarkMode 
                                                        ? "border-white/5 hover:bg-white/5"
                                                        : "border-black/5 hover:bg-gray-50",
                                                    notif.unread && (isDarkMode ? "bg-blue-500/5" : "bg-blue-50")
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {notif.unread && <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />}
                                                    <div className="flex-1">
                                                        <p className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                                                            {notif.title}
                                                        </p>
                                                        <p className={cn("text-xs mt-0.5", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                                                            {notif.message}
                                                        </p>
                                                        <p className={cn("text-[10px] mt-1", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                                            {notif.time}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Theme Toggle */}
                <button 
                    onClick={toggleDarkMode}
                    className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        isDarkMode 
                            ? "bg-white/5 hover:bg-white/10"
                            : "bg-white border border-black/5 hover:bg-gray-50"
                    )}
                >
                    {isDarkMode ? (
                        <Sun className="w-5 h-5 text-yellow-400" />
                    ) : (
                        <Moon className="w-5 h-5 text-gray-500" />
                    )}
                </button>

                {/* Profile */}
                <button className={cn(
                    "flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl border transition-all",
                    isDarkMode 
                        ? "bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-white/5 hover:border-white/10"
                        : "bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200/50 hover:border-blue-300"
                )}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                            {fullname?.charAt(0).toUpperCase() || 'T'}
                        </span>
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                            {fullname || 'Trader'}
                        </p>
                        <p className={cn("text-[10px]", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                            {user?.email?.split('@')[0]}
                        </p>
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
    const { signOut, user, switchAccount } = useAuthStore();
    const { fullname, balance, currency, isVirtual, loginid } = useDerivAccountInfo();
    const { isDarkMode, toggleDarkMode } = useThemeStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
        { icon: BarChart2, label: 'Sessions', path: '/user/sessions' },
        { icon: PieChart, label: 'Analytics', path: '/user/analytics' },
        { icon: BarChart3, label: 'Statistics', path: '/user/stats' },
        { icon: Settings, label: 'Settings', path: '/user/settings' },
    ];

    return (
        <>
            <div className={cn(
                "md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t px-4 py-2 safe-area-inset-bottom",
                isDarkMode ? "bg-gray-950/90 border-white/10" : "bg-white/90 border-black/10"
            )}>
                <div className="flex items-center justify-around">
                    {navItems.slice(0, 4).map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                                isActive ? "text-blue-500" : isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                    <button
                        onClick={() => setIsOpen(true)}
                        className={cn("flex flex-col items-center gap-1 p-2 rounded-xl", isDarkMode ? "text-gray-500" : "text-gray-400")}
                    >
                        <User className="w-5 h-5" />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </div>

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
                            className={cn(
                                "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 pb-8 md:hidden max-h-[85vh] overflow-y-auto",
                                isDarkMode ? "bg-gray-900" : "bg-white"
                            )}
                        >
                            <div className={cn("w-12 h-1 rounded-full mx-auto mb-6", isDarkMode ? "bg-gray-700" : "bg-gray-200")} />
                            
                            <div className={cn(
                                "mb-6 p-4 rounded-xl border",
                                isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"
                            )}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center",
                                        isVirtual 
                                            ? "bg-gradient-to-br from-orange-400 to-amber-500"
                                            : "bg-gradient-to-br from-emerald-400 to-cyan-500"
                                    )}>
                                        <span className="text-lg font-bold text-white">{fullname?.charAt(0).toUpperCase() || 'T'}</span>
                                    </div>
                                    <div>
                                        <p className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>{fullname || 'Trader'}</p>
                                        <p className={cn("text-sm", isVirtual ? "text-orange-400" : "text-emerald-400")}>
                                            {isVirtual ? 'Demo Account' : 'Real Account'}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn("flex items-center justify-between p-3 rounded-lg", isDarkMode ? "bg-white/5" : "bg-white")}>
                                    <span className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>Balance</span>
                                    <span className={cn("font-mono font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                                        {balance.toLocaleString()} {currency}
                                    </span>
                                </div>
                            </div>

                            {user?.deriv_accounts && user.deriv_accounts.length > 1 && (
                                <div className="mb-6">
                                    <p className={cn("text-xs font-bold uppercase tracking-wider mb-2 px-1", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                        Switch Account
                                    </p>
                                    <div className="space-y-2">
                                        {user.deriv_accounts.map((acc) => (
                                            <button
                                                key={acc.loginid}
                                                onClick={() => { switchAccount(acc.loginid); setIsOpen(false); }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                                                    acc.loginid === loginid
                                                        ? "bg-blue-500/20 border border-blue-500/30"
                                                        : isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                                                )}
                                            >
                                                <div className={cn("w-3 h-3 rounded-full", acc.is_virtual ? "bg-orange-500" : "bg-emerald-500")} />
                                                <div className="flex-1 text-left">
                                                    <p className={cn("text-sm", isDarkMode ? "text-white" : "text-gray-900")}>{acc.is_virtual ? 'Demo' : 'Real'}</p>
                                                    <p className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-400")}>{acc.loginid}</p>
                                                </div>
                                                <p className={cn("text-sm font-mono", isDarkMode ? "text-white" : "text-gray-900")}>
                                                    {acc.balance?.toLocaleString() || '0'} {acc.currency}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={toggleDarkMode}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl mb-4",
                                    isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-50 hover:bg-gray-100"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {isDarkMode ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                                    <span className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                    </span>
                                </div>
                                <div className={cn(
                                    "w-12 h-7 rounded-full transition-colors flex items-center px-1",
                                    isDarkMode ? "bg-blue-500 justify-end" : "bg-gray-300 justify-start"
                                )}>
                                    <div className="w-5 h-5 rounded-full bg-white shadow" />
                                </div>
                            </button>
                            
                            <nav className="space-y-2">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className={({ isActive }) => cn(
                                            "flex items-center gap-4 p-4 rounded-xl",
                                            isActive 
                                                ? "bg-blue-500/10 text-blue-500"
                                                : isDarkMode ? "text-gray-400 hover:bg-white/5" : "text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </NavLink>
                                ))}
                                <button onClick={handleLogout} className="flex items-center gap-4 p-4 rounded-xl text-red-400 w-full">
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
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const { applyTheme, isDarkMode } = useThemeStore();

    useEffect(() => {
        applyTheme();
    }, [applyTheme]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return (
        <SidebarContext.Provider value={{ isExpanded: sidebarExpanded, setIsExpanded: setSidebarExpanded }}>
            <div className={cn("min-h-screen font-sans transition-colors duration-300", isDarkMode ? "text-white" : "text-gray-900")}>
                <LiquidGlassBackground />
                <CollapsibleSidebar isExpanded={sidebarExpanded} setIsExpanded={setSidebarExpanded} />
                <MobileNav />

                <motion.main
                    initial={false}
                    animate={{ marginLeft: sidebarExpanded ? 260 : 72 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="hidden md:block min-h-screen"
                >
                    <TopBar />
                    <div className="p-8 pb-24 max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </motion.main>

                <main className="md:hidden min-h-screen pb-20 pt-4">
                    <div className="px-4">
                        <Outlet />
                    </div>
                </main>
            </div>
        </SidebarContext.Provider>
    );
}
