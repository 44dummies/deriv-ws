import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

export const MainLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0E0E0E] text-white font-sans selection:bg-brand-red/30 flex flex-col md:flex-row">
            {/* Desktop Sidebar Wrapper */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-16 bg-[#0E0E0E] border-r border-white/5 flex-col items-center py-6 z-50">
                <Sidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-16">
                <TopBar />

                {/* Content Area - pushed by TopBar (h-16) and padded differently for mobile/desktop */}
                <main className="flex-1 pt-16 pb-16 md:pb-0 min-h-screen transition-all duration-300 relative z-0">
                    <div className="container mx-auto p-4 md:p-6 max-w-[1600px] animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileNav />
        </div>
    );
};
