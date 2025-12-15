
import React, { useState, useEffect } from 'react';
import { ModernSidebar } from './ModernSidebar';
import { Bell, Menu, Search } from 'lucide-react'; // Search kept just in case but we remove the bar
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { Logo } from '../ui/Logo';

interface DashboardLayoutProps {
    children: React.ReactNode;
    isAdmin?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, isAdmin = false }) => {
    // Get user from session storage
    const getUserInfo = () => {
        try {
            const userInfoStr = sessionStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                return { email: userInfo.email || 'user@deriv.com', role: userInfo.role || (isAdmin ? 'admin' : 'user') };
            }
        } catch (e) { }
        return { email: 'user@deriv.com', role: isAdmin ? 'admin' : 'user' };
    };

    const user = getUserInfo();
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle

    // Detect screen size for layout adjustments
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const sidebarWidth = '80px'; // Matching the ModernSidebar width usually

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] text-white font-sans selection:bg-[#ff3355]/30">
            {/* Liquid Background - Consistent with Dashboard */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#3b82f6]/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#8b5cf6]/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
            </div>

            {/* Sidebar */}
            <ModernSidebar
                isAdmin={isAdmin}
                userEmail={user.email}
                isMobileOpen={sidebarOpen}
                onMobileClose={() => setSidebarOpen(false)}
            />

            {/* Main Content Area */}
            {/* Added left margin to account for fixed sidebar on desktop */}
            <main
                className={`relative z-10 transition-all duration-300 min-h-screen flex flex-col`}
                style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
            >
                {/* Header - Minimal & Glassmorphic (Replaces the blocking top bar) */}
                <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-2xl px-6 h-20 flex items-center justify-between supports-[backdrop-filter]:bg-[#0a0a0f]/60">
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"
                            >
                                <Menu size={20} />
                            </button>
                        )}

                        {/* Page Title or Breadcrumb could go here, for now just Logo on mobile or context */}
                        {isMobile && (
                            <div className="flex items-center gap-3">
                                <Logo size={28} />
                                <span className="font-bold text-lg tracking-tight">TraderMind</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setNotificationOpen(true)}
                            className="relative p-2.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all group"
                        >
                            <Bell size={20} className="group-hover:text-[#ff3355] transition-colors" />
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#ff3355] rounded-full shadow-[0_0_8px_rgba(255,51,85,0.5)]" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
                    {children}
                </div>
            </main>

            {/* Notification Drawer */}
            <NotificationDrawer isOpen={notificationOpen} onClose={() => setNotificationOpen(false)} />
        </div>
    );
};
