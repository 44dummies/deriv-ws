
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Zap, MessageSquare, LineChart, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/apiClient';

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isDanger?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick, isDanger }) => (
    <div className="relative group flex justify-center w-full my-2">
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-red rounded-r-md shadow-[0_0_10px_#ff444f]" />
        )}
        <button
            onClick={onClick}
            className={`
                p-3 rounded-xl transition-all duration-200 relative
                ${isActive
                    ? 'text-white bg-brand-red/10'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }
                ${isDanger ? 'hover:text-red-500 hover:bg-red-500/10' : ''}
            `}
        >
            {icon}
        </button>

        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-[#1a1c20] text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-50 shadow-xl">
            {label}
        </div>
    </div>
);

export const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    // Parse active tab from URL query param
    const searchParams = new URLSearchParams(location.search);
    const activeTab = searchParams.get('tab') || 'overview';
    const isDashboard = location.pathname.includes('/dashboard') || location.pathname.includes('/user/trading');

    const handleNavigate = (tab: string) => {
        navigate(`/user/dashboard?tab=${tab}`);
    };

    const handleLogout = async () => {
        try {
            await apiClient.logout();
            logout();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-16 bg-[#0E0E0E] border-r border-white/5 flex flex-col items-center py-6 z-50">
            {/* Logo area - minimal */}
            <div className="mb-8 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-red to-orange-600 shadow-lg shadow-brand-red/20">
                <span className="font-bold text-white text-lg">T</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 w-full space-y-2 flex flex-col items-center">
                <SidebarItem
                    icon={<LayoutDashboard size={20} />}
                    label="Overview"
                    isActive={activeTab === 'overview' && isDashboard}
                    onClick={() => handleNavigate('overview')}
                />
                <SidebarItem
                    icon={<Zap size={20} />}
                    label="Live Trading"
                    isActive={activeTab === 'trading' && isDashboard}
                    onClick={() => handleNavigate('trading')}
                />
                <SidebarItem
                    icon={<MessageSquare size={20} />}
                    label="Community"
                    isActive={activeTab === 'community' && isDashboard}
                    onClick={() => handleNavigate('community')}
                />
                <SidebarItem
                    icon={<LineChart size={20} />}
                    label="Reports"
                    isActive={activeTab === 'reports' && isDashboard}
                    onClick={() => handleNavigate('reports')}
                />
                <SidebarItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    isActive={activeTab === 'settings' && isDashboard}
                    onClick={() => handleNavigate('settings')}
                />
            </nav>

            {/* Logout */}
            <div className="mt-auto w-full flex flex-col items-center">
                <div className="w-8 h-px bg-white/10 mb-4" />
                <SidebarItem
                    icon={<LogOut size={20} />}
                    label="Logout"
                    isActive={false}
                    onClick={handleLogout}
                    isDanger
                />
            </div>
        </aside>
    );
};
