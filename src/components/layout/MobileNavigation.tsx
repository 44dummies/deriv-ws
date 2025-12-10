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

        const commonClasses = `
      flex flex-col items-center justify-center w-full h-full space-y-1
      ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-400'}
      active:scale-95 transition-transform bg-transparent border-none p-0 cursor-pointer text-decoration-none
    `;

        const icon = React.cloneElement(item.icon as React.ReactElement, { size: 20 });
        const label = <span className="text-[10px] font-medium">{item.label}</span>;

        if (item.path && !item.onClick) {
            return (
                <NavLink
                    key={item.label}
                    to={item.path}
                    className={commonClasses}
                >
                    {icon}
                    {label}
                </NavLink>
            );
        }

        return (
            <button
                key={item.label}
                onClick={item.onClick || (() => { })}
                className={commonClasses}
                type="button"
            >
                {icon}
                {label}
            </button>
        );
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[var(--theme-bg)] border-t border-[var(--theme-border)] md:hidden">
            <div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
                {mainItems.map(renderItem)}

                {hasMore && (
                    <button
                        onClick={onMoreClick}
                        className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400 active:scale-95 transition-transform bg-transparent border-none p-0 cursor-pointer"
                        type="button"
                    >
                        <MoreHorizontal size={20} />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default MobileNavigation;
