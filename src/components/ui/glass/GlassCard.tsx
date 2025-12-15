
import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hoverEffect = false,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className={`
                bg-[#12121a]/60 backdrop-blur-2xl 
                border border-white/5 
                rounded-3xl 
                shadow-xl 
                p-6 
                transition-all duration-300
                relative overflow-hidden
                ${hoverEffect ? 'hover:bg-white/5 hover:border-white/10 hover:shadow-2xl hover:-translate-y-1 cursor-pointer' : ''}
                ${className}
            `}
        >
            {/* Liquid Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
