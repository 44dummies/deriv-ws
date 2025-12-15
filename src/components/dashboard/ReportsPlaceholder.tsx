import React from 'react';
import { LineChart, BarChart2, PieChart } from 'lucide-react';
import { GlassCard } from '../ui/glass/GlassCard';

export const ReportsPlaceholder: React.FC = () => {
    return (
        <div className="h-full w-full flex items-center justify-center p-6">
            <GlassCard className="max-w-md w-full p-12 flex flex-col items-center text-center space-y-6 bg-secondary/30 border-white/5">
                <div className="relative">
                    <div className="absolute inset-0 bg-brand-red/20 blur-xl rounded-full animate-pulse" />
                    <div className="relative bg-white/5 p-4 rounded-2xl border border-white/10 ring-1 ring-white/20">
                        <LineChart size={48} className="text-brand-red" />
                    </div>
                    {/* Decorative floating icons */}
                    <div className="absolute -right-8 -top-4 text-brand-orange/40 animate-bounce delay-100">
                        <BarChart2 size={24} />
                    </div>
                    <div className="absolute -left-8 -bottom-4 text-brand-red/40 animate-bounce delay-300">
                        <PieChart size={24} />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Reports Module
                    </h2>
                    <p className="text-gray-400">
                        Advanced analytics and trading reports are under construction.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                    <span className="text-xs font-medium text-brand-orange uppercase tracking-wider">
                        Coming Soon
                    </span>
                </div>
            </GlassCard>
        </div>
    );
};
