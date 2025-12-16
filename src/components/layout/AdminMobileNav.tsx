
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Layers, Users, Shield, Menu } from 'lucide-react';

export const AdminMobileNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active tab based on current path
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/admin/sessions')) return 'sessions';
        if (path.includes('/admin/users')) return 'users';
        if (path.includes('/admin/risk')) return 'risk';
        if (path.includes('/admin/settings')) return 'settings';
        return 'dashboard';
    };

    const activeTab = getActiveTab();

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    const navItems = [
        { id: 'dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
        { id: 'sessions', path: '/admin/sessions', icon: <Layers size={20} />, label: 'Sessions' },
        { id: 'risk', path: '/admin/risk', icon: <Shield size={20} />, label: 'Risk' },
        { id: 'users', path: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0E0E0E]/95 backdrop-blur-xl border-t border-white/10 z-50 h-16 px-6">
            <div className="flex items-center justify-between h-full">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigate(item.path)}
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
                <button
                    onClick={() => handleNavigate('/admin/settings')}
                    className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${activeTab === 'settings' ? 'text-brand-red' : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <div className={`${activeTab === 'settings' ? 'bg-brand-red/10 rounded-full p-1' : ''}`}>
                        <Menu size={20} />
                    </div>
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>
        </div>
    );
};
