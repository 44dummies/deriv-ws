import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    icon,
    disabled,
    ...props
}) => {
    const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden";

    const variants = {
        primary: "bg-brand-red hover:bg-brand-redHover text-white shadow-lg shadow-brand-red/20 hover:shadow-brand-red/30 hover:scale-[1.02]",
        secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
        ghost: "text-brand-gray-300 hover:text-white hover:bg-white/5",
        danger: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20 hover:shadow-red-600/40",
        success: "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
    };

    const sizes = {
        xs: "px-2.5 py-1 text-xs gap-1.5",
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-5 py-2.5 text-sm gap-2",
        lg: "px-8 py-4 text-base gap-2.5",
        icon: "p-2.5"
    };

    // Use icon prop as leftIcon if leftIcon is not provided
    const effectiveLeftIcon = leftIcon || icon;

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {/* Shine effect on hover for primary/danger/success */}
            {['primary', 'danger', 'success'].includes(variant) && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
            )}

            {isLoading ? (
                // Mini candlestick loader
                <div className="flex items-end gap-0.5 h-4 mr-2">
                    <div className="w-1 bg-white/80 h-2 animate-[pulse_0.6s_ease-in-out_infinite]" />
                    <div className="w-1 bg-white/60 h-3 animate-[pulse_0.8s_ease-in-out_infinite_0.1s]" />
                    <div className="w-1 bg-white/40 h-2.5 animate-[pulse_0.7s_ease-in-out_infinite_0.2s]" />
                </div>
            ) : effectiveLeftIcon ? (
                <span className="relative z-10">{effectiveLeftIcon}</span>
            ) : null}

            <span className="relative z-10">{isLoading ? 'Loading...' : children}</span>

            {!isLoading && rightIcon && (
                <span className="relative z-10 group-hover:translate-x-0.5 transition-transform">{rightIcon}</span>
            )}
        </button>
    );
};
