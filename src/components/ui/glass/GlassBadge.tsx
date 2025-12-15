import React from 'react';

interface GlassBadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    size?: 'sm' | 'md';
    className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
    children,
    variant = 'neutral',
    size = 'md',
    className = ''
}) => {
    const variants = {
        success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        danger: "bg-red-500/10 text-red-400 border-red-500/20",
        info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        neutral: "bg-white/5 text-gray-400 border-white/10"
    };

    const sizes = {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs"
    };

    return (
        <span className={`
      inline-flex items-center rounded-full font-medium border
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
            {children}
        </span>
    );
};
