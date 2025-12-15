import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    containerClassName = '',
    className = '',
    id,
    ...props
}) => {
    const inputId = id || props.name || Math.random().toString(36).substr(2, 9);

    return (
        <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium text-liquid-text-muted ml-1">
                    {label}
                </label>
            )}

            <div className="relative group">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-liquid-accent transition-colors">
                        {leftIcon}
                    </div>
                )}

                <input
                    id={inputId}
                    className={`
            w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white
            placeholder:text-gray-600
            focus:outline-none focus:border-liquid-accent/50 focus:ring-1 focus:ring-liquid-accent/50
            transition-all duration-300
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-red-500/50 focus:border-red-500' : ''}
            ${className}
          `}
                    {...props}
                />

                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {rightIcon}
                    </div>
                )}
            </div>

            {error && (
                <span className="text-xs text-red-400 ml-1">{error}</span>
            )}
        </div>
    );
};
