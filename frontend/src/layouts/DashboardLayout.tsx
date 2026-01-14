import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Menu,
    X,
    BarChart3,
    BarChart2,
    Activity,
    Moon,
    Sun
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../stores/useThemeStore';
import { cn } from '../lib/utils';

export default function DashboardLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { signOut, user } = useAuthStore();
    const { setTheme, resolvedTheme } = useThemeStore();
    const navigate = useNavigate();
    const isProduction = import.meta.env.PROD;

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/user/dashboard' },
        { icon: Activity, label: 'Sessions', path: '/user/sessions' },
        { icon: BarChart2, label: 'Statistics', path: '/user/stats' },
        { icon: BarChart3, label: 'Analytics', path: '/user/analytics' },
        { icon: Settings, label: 'Settings', path: '/user/settings' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex">

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
                <div className="p-6 flex items-center gap-3 border-b border-border">
                    <img src="/tradermind-logo.png" alt="TraderMind" className="w-8 h-8 rounded-md" />
                    <span className="font-semibold text-lg tracking-tight">TraderMind</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ease-out",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border space-y-3">
                    <div className="text-xs text-muted-foreground">
                        Signed in as
                        <div className="text-sm text-foreground font-medium truncate">{user?.email || '—'}</div>
                    </div>
                    <button
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors duration-150 ease-out"
                    >
                        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        <span className="font-medium">{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-muted/60 rounded-md transition-colors duration-150 ease-out"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-50 bg-background/95 border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src="/tradermind-logo.png" alt="Logo" className="w-8 h-8 rounded-md" />
                    <span className="font-semibold text-base">TraderMind</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-muted-foreground">
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-background pt-20 px-6 md:hidden">
                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 p-3 rounded-md text-sm border",
                                    isActive
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </NavLink>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 p-3 w-full text-sm text-destructive border border-transparent"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-20 md:pt-0">
                <div className="border-b border-border bg-background/95 sticky top-0 z-10">
                    <div className="px-6 md:px-10 py-3 flex items-center justify-between text-xs text-muted-foreground">
                        {!isProduction && <div>Environment: {import.meta.env.MODE}</div>}
                        <div className={isProduction ? '' : ''}>{isProduction ? '' : null}</div>
                        <div>Account: {user?.active_account_id || '—'}</div>
                    </div>
                </div>
                <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
