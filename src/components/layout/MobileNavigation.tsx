import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

export interface NavItem {
    label: string;
    icon: React.ReactNode;
    path?: string;
    onClick?: () => void;
    isActive?: boolean;
}

interface MobileNavigationProps {
    items: NavItem[];
    onMoreClick?: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ items, onMoreClick }) => {
    const location = useLocation();
    const mainItems = items.slice(0, 4);
    const hasMore = items.length > 4;

    const renderItem = (item: NavItem) => {
        const isPathActive = item.path ? (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) : false;
        const isActive = item.isActive !== undefined ? item.isActive : isPathActive;

        // Premium Active/Inactive Styles
        const baseClasses = "flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group";
        const activeClasses = "text-[var(--theme-primary)] scale-105";
        const inactiveClasses = "text-gray-400 hover:text-gray-200";

        const icon = React.cloneElement(item.icon as React.ReactElement, {
            size: 24, // Larger icon
            className: `transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`
        } as any);

        const label = (
            <span className={`text-[11px] font-medium mt-1 ${isActive ? 'font-bold' : ''}`}>
                {item.label}
            </span>
        );

        // Active Indicator Dot
        const indicator = isActive && (
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-primary)]" />
        );

        if (item.path && !item.onClick) {
            return (
                <NavLink
                    key={item.label}
                    to={item.path}
                    className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                >
                    {indicator}
                    {icon}
                    {label}
                </NavLink>
            );
        }

        return (
            <button
                key={item.label}
                onClick={item.onClick || (() => { })}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                type="button"
            >
                {indicator}
                {icon}
                {label}
            </button>
        );
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
            {/* Glassmorphism Background Container */}
            <div className="absolute inset-0 bg-[#0e1621]/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]" />

            <div className="relative flex justify-around items-center h-[72px] pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
                {mainItems.map(renderItem)}

                {hasMore && (
                    <button
                        onClick={onMoreClick}
                        className="flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-white transition-all duration-300 active:scale-95"
                        type="button"
                    >
                        <MoreHorizontal size={24} />
                        <span className="text-[11px] font-medium mt-1">More</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default MobileNavigation;
