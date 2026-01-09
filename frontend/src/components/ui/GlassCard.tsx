import React from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className,
    hoverEffect = false,
    onClick
}) => {
    return (
        <div
            className={cn(
                "rounded-lg border bg-card text-card-foreground",
                hoverEffect && "transition-colors duration-150 ease-out hover:border-primary/40 cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            <div className="relative">
                {children}
            </div>
        </div>
    );
};
