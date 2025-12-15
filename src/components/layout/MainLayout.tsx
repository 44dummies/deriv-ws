import React from 'react';
import { Outlet } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { GlassButton } from '../ui/glass/GlassButton';
import { Home, LineChart, Users, Settings, LogOut, Menu } from 'lucide-react';

export const MainLayout: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div className="min-h-screen relative text-white selection:bg-liquid-accent/30 overflow-hidden">
            {/* Ambient Background */}
            <div className="ambient-light" />

            {/* Animated Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-blob" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
            </div>

            {/* Top Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#05070a]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Logo className="h-8 w-auto" />
                        <span className="font-bold text-xl tracking-tight hidden sm:block">TraderMind</span>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <NavButton icon={<Home size={18} />} label="Dashboard" to="/user/dashboard" />
                        <NavButton icon={<LineChart size={18} />} label="Trading" to="/user/dashboard?tab=trading" />
                        <NavButton icon={<Users size={18} />} label="Community" to="/user/dashboard?tab=community" />
                        <NavButton icon={<Settings size={18} />} label="Settings" to="/user/dashboard?tab=settings" />
                    </nav>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-3">
                            {/* User Profile Summary could go here */}
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-liquid-accent to-purple-600" />
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-2 text-gray-400 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-xl pt-20 px-6 md:hidden animate-in fade-in slide-in-from-top-10">
                    <nav className="flex flex-col gap-4">
                        <MobileNavLink icon={<Home size={20} />} label="Dashboard" to="/user/dashboard" onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink icon={<LineChart size={20} />} label="Trading" to="/user/dashboard?tab=trading" onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink icon={<Users size={20} />} label="Community" to="/user/dashboard?tab=community" onClick={() => setIsMobileMenuOpen(false)} />
                        <MobileNavLink icon={<Settings size={20} />} label="Settings" to="/user/dashboard?tab=settings" onClick={() => setIsMobileMenuOpen(false)} />
                        <hr className="border-white/10 my-2" />
                        <button className="flex items-center gap-3 p-4 text-red-400 font-medium hover:bg-white/5 rounded-xl transition-colors">
                            <LogOut size={20} />
                            Sign Out
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="relative z-10 pt-20 pb-20 px-4 max-w-7xl mx-auto min-h-screen">
                <Outlet />
            </main>
        </div>
    );
};

// Helper Components
const NavButton = ({ icon, label, to }: { icon: React.ReactNode, label: string, to: string }) => {
    // Basic implementation - in real app use react-router NavLink for active states
    return (
        <a href={to} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            {icon}
            {label}
        </a>
    );
}

const MobileNavLink = ({ icon, label, to, onClick }: { icon: React.ReactNode, label: string, to: string, onClick: () => void }) => (
    <a href={to} onClick={onClick} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 text-lg font-medium active:scale-[0.98] transition-all">
        <span className="text-liquid-accent">{icon}</span>
        {label}
    </a>
);
