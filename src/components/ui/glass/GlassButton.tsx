
import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'brand';
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
        primary: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        secondary: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]',
        danger: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]',
        ghost: 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white',
        brand: 'bg-gradient-to-r from-[#ff3355]/80 to-[#ff8042]/80 border-transparent text-white hover:opacity-90 hover:shadow-[0_0_25px_rgba(255,51,85,0.4)] shadow-[0_0_15px_rgba(255,51,85,0.2)]'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-8 py-4 text-base'
    };

    return (
        <button
            className={`
                relative
                backdrop-blur-md 
                border 
                rounded-xl 
                font-medium
                tracking-wide
                transition-all duration-300 
                flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
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
