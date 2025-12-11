import React from 'react';

interface GlassToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export const GlassToggle: React.FC<GlassToggleProps> = ({ checked, onChange, label, disabled }) => {
    return (
        <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {label && <span className="text-sm text-slate-300 font-medium">{label}</span>}
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    className="sr-only"
                    disabled={disabled}
                />
                <div className={`w-11 h-6 rounded-full transition-all duration-300 border ${checked
                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-black/40 border-white/10'
                    }`}></div>
                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-all duration-300 ${checked
                        ? 'translate-x-5 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-slate-500'
                    }`}></div>
            </div>
        </label>
    );
};
