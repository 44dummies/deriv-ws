
import React from 'react';

interface GlassStatusBadgeProps {
    status: 'active' | 'inactive' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
    children: React.ReactNode;
    pulse?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const GlassStatusBadge: React.FC<GlassStatusBadgeProps> = ({
    status,
    children,
    pulse = false,
    size = 'md'
}) => {
    const styles = {
        active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        warning: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        error: 'bg-red-500/10 text-red-400 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };

    const dots = {
        active: 'bg-emerald-400',
        success: 'bg-emerald-400',
        inactive: 'bg-slate-500',
        warning: 'bg-orange-400',
        error: 'bg-red-400',
        info: 'bg-blue-400',
        neutral: 'bg-gray-400',
    };

    const sizes = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm"
    };

    return (
        <span className={`
            inline-flex items-center gap-2 
            rounded-full 
            font-medium 
            border backdrop-blur-md
            ${styles[status]}
            ${sizes[size]}
        `}>
            <span className={`w-1.5 h-1.5 rounded-full ${dots[status]} ${pulse ? 'animate-pulse' : ''}`} />
            {children}
        </span>
    );
};
