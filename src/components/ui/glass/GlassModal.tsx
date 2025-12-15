import React, { Fragment } from 'react';

// Simplified transition since we don't have Headless UI, using basic CSS/React
interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassModal: React.FC<GlassModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md'
}) => {
    if (!isOpen) return null;

    const maxWidths = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`
        relative z-10 w-full ${maxWidths[size]} 
        bg-[#0a0a0f]/90 border border-white/10 rounded-2xl shadow-2xl 
        transform transition-all animate-float
      `}>
                {title && (
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
