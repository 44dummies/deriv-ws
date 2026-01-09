import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Activity,
    Terminal,
    DollarSign,
    LogOut,
    ShieldAlert,
    Menu,
    X
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { cn } from '../lib/utils';

export default function AdminLayout() {
    const { user, signOut, isAdmin } = useAuthStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    // Strict Security Check
    useEffect(() => {
        if (!user || !isAdmin) {
            navigate('/');
        }
    }, [user, isAdmin, navigate]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/admin/overview' },
        { icon: Activity, label: 'Sessions', path: '/admin/sessions' },
        { icon: ShieldAlert, label: 'Quant Monitor', path: '/admin/quant-monitor' },
        { icon: Terminal, label: 'Quant Logs', path: '/admin/logs' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: DollarSign, label: 'Commissions', path: '/admin/commissions' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card fixed h-full z-20">
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg tracking-tight">Administration</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Restricted access</div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="p-4 rounded-md bg-muted/40 border border-border mb-4">
                        <div className="text-xs text-muted-foreground mb-1">Authenticated as</div>
                        <div className="text-sm text-foreground truncate max-w-[180px]">{user?.email}</div>
                        <div className="text-xs text-muted-foreground mt-2">Session active</div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted/60 rounded-md transition-colors duration-150 ease-out"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 relative">
                {/* Mobile Header */}
                <div className="md:hidden sticky top-0 z-30 bg-background/95 border-b border-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <ShieldAlert className="h-5 w-5" />
                        <span className="font-semibold">Admin</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-muted-foreground">
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-20 bg-background pt-20 px-4 pb-4">
                        <nav className="space-y-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                )}

                {/* Page Content */}
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
