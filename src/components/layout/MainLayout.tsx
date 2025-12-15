
import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#0E0E0E] text-white font-sans selection:bg-brand-red/30 flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 pl-16">
                <TopBar />

                {/* Content Area - pushed by TopBar (h-16) */}
                <main className="flex-1 pt-16 min-h-screen transition-all duration-300 relative z-0">
                    <div className="container mx-auto p-6 max-w-[1600px] animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
