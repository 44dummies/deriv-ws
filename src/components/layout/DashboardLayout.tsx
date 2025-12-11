
import React, { useState } from 'react';
import { ModernSidebar } from './ModernSidebar';
import { Bell, Search } from 'lucide-react';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

interface DashboardLayoutProps {
    children: React.ReactNode;
    isAdmin?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, isAdmin = false }) => {
    // Mock user for now if hook doesn't exist yet
    const user = { email: 'admin@deriv.com', role: isAdmin ? 'admin' : 'user' };
    const [notificationOpen, setNotificationOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-emerald-500/30">
            {/* Global Blobs (Liquid Background) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
                <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
                <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
            </div>

            {/* Sidebar */}
            <ModernSidebar isAdmin={isAdmin} userEmail={user.email} />

            {/* Main Content Area */}
            <main className="relative z-10 transition-all duration-300 ml-20 lg:ml-64 p-8">
                {/* Top Metrics / utility Bar */}
                <div className="mb-8 flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-4 text-slate-400">
                        <span className="text-sm font-mono">{new Date().toLocaleDateString()}</span>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium">SYSTEM OPERATIONAL</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Search (Visual Only) */}
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                className="bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 w-64 transition-all"
                            />
                        </div>

                        {/* Notifications */}
                        <button
                            onClick={() => setNotificationOpen(true)}
                            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"
                        >
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        </button>
                    </div>
                </div>

                {/* Page Content */}
                <div className="animate-fade-in">
                    {children}
                </div>
            </main>

            {/* Notification Drawer */}
            <NotificationDrawer isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />
        </div>
    );
};
