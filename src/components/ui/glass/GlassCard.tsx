import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'active' | 'success' | 'warning' | 'danger';
    noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    variant = 'default',
    noPadding = false,
    ...props
}) => {
    const variants = {
        default: 'bg-black/40 border-white/5 hover:border-white/10',
        active: 'bg-liquid-accent/5 border-liquid-accent/20 shadow-[0_0_20px_rgba(0,209,255,0.1)]',
        success: 'bg-emerald-500/5 border-emerald-500/20',
        warning: 'bg-amber-500/5 border-amber-500/20',
        danger: 'bg-red-500/5 border-red-500/20',
    };

    return (
        <div
            className={`
                relative backdrop-blur-xl border rounded-2xl transition-all duration-300
                ${variants[variant]}
                ${noPadding ? 'p-0' : 'p-6'}
                ${className}
            `}
            {...props}
        >
            {/* Glossy reflection effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
