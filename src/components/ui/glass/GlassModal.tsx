import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-xl'
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full ${maxWidth} transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
                    }`}
            >
                <div className="relative overflow-hidden rounded-3xl bg-[#0a0a0f]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                    {/* Glossy Header Highlight */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
