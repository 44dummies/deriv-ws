
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Zap, MessageSquare, Menu } from 'lucide-react';

export const MobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab') || 'overview';

    const handleNavigate = (tab: string) => {
        navigate(`/user/dashboard?tab=${tab}`);
    };

    const navItems = [
        { id: 'overview', icon: <LayoutDashboard size={20} />, label: 'Home' },
        { id: 'trading', icon: <Zap size={20} />, label: 'Trade' },
        { id: 'community', icon: <MessageSquare size={20} />, label: 'Chat' },
        { id: 'settings', icon: <Menu size={20} />, label: 'Menu' },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0E0E0E]/95 backdrop-blur-xl border-t border-white/10 z-50 h-16 px-6">
            <div className="flex items-center justify-between h-full">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive ? 'text-brand-red' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <div className={`${isActive ? 'bg-brand-red/10 rounded-full p-1' : ''}`}>
                                {item.icon}
                            </div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
