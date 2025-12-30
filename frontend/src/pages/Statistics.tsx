import { motion } from 'framer-motion';
import { TrendingUp, BarChart2, Calendar, Target } from 'lucide-react';
import { cn } from '../lib/utils';

const StatCard = ({ title, value, change, icon: Icon, delay }: any) => (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay }}
        className="glass-panel p-6 rounded-2xl"
    >
        <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon className="w-6 h-6" />
            </div>
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full", change >= 0 ? "bg-success/10 text-success" : "bg-red-500/10 text-red-500")}>
                {change >= 0 ? '+' : ''}{change}%
            </span>
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        <div className="text-xs text-gray-400">{title}</div>
    </motion.div>
);

export default function Statistics() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Statistics</h1>
                <p className="text-gray-400">Deep dive into your trading performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Net Profit" value="$1,240.50" change={12.5} icon={TrendingUp} delay={0} />
                <StatCard title="Win Rate" value="68.4%" change={2.1} icon={Target} delay={0.1} />
                <StatCard title="Total Trades" value="1,204" change={8.4} icon={BarChart2} delay={0.2} />
                <StatCard title="Avg. Holding Time" value="14m 30s" change={-5.2} icon={Calendar} delay={0.3} />
            </div>

            {/* Placeholder for AI Report */}
            <div className="glass-panel p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary animate-pulse">
                    <BarChart2 className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">AI Performance Report</h3>
                    <p className="text-gray-400 max-w-md mx-auto mt-2">
                        Advanced analytics and pattern recognition reports will appear here once the AI module gathers sufficient data.
                    </p>
                </div>
                <button className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition-colors">
                    Configure Report Generation
                </button>
            </div>
        </div>
    );
}
