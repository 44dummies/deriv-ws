
import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    isLoading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    icon,
    isLoading = false,
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        secondary: 'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        danger: 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        ghost: 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3.5 text-lg'
    };

    return (
        <button
            className={`
                relative
                backdrop-blur-md 
                border 
                rounded-xl 
                font-medium 
                transition-all duration-300 
                flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    {icon && <span className="opacity-90">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
};
