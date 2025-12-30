import { useState, useEffect } from 'react';
import { BrainCircuit, Activity, Zap, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { motion } from 'framer-motion';

export default function AdminAIMonitor() {
    const [confidence, setConfidence] = useState<number[]>([]);

    // Simulate live AI stream
    useEffect(() => {
        const interval = setInterval(() => {
            setConfidence(prev => {
                const newVal = Math.random() * 0.4 + 0.6; // 0.6 - 1.0 range
                const newArr = [...prev, newVal];
                if (newArr.length > 30) newArr.shift();
                return newArr;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-accent" />
                    Intelligence Monitor
                </h1>
                <p className="text-slate-500 text-sm">Live introspection of the TraderMind Neural Engine.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Health Status */}
                <GlassCard className="p-6 md:col-span-1 border-l-4 border-l-accent">
                    <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Model Status</h3>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
                        <span className="text-xl font-bold text-white">Online</span>
                    </div>
                    <div className="text-sm font-mono text-slate-500">
                        Model: <span className="text-white">tradermind:latest</span><br />
                        Latency: <span className="text-white">45ms</span><br />
                        Provider: <span className="text-white">Ollama (Local)</span>
                    </div>
                </GlassCard>

                {/* Safety Stats */}
                <GlassCard className="p-6 md:col-span-2 flex justify-around items-center">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white font-mono">1,240</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Inferences Today</div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                        <div className="text-3xl font-bold text-danger font-mono">12</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Jailbreaks Blocked</div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                        <div className="text-3xl font-bold text-success font-mono">99.9%</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Uptime</div>
                    </div>
                </GlassCard>
            </div>

            {/* Live Confidence Stream Visualization */}
            <GlassCard className="p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-accent" />
                        Live Confidence Stream
                    </h3>
                    <span className="text-xs font-mono text-accent animate-pulse">STREAMING_TENSORS</span>
                </div>

                <div className="h-48 flex items-end gap-1">
                    {confidence.map((val, i) => (
                        <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${val * 100}%` }}
                            className="flex-1 bg-accent/20 border-t border-accent rounded-t sm:min-w-[10px]"
                            style={{ opacity: 0.3 + (i / 30) * 0.7 }} // Fade older bars
                        />
                    ))}
                </div>
                <div className="mt-2 text-xs text-slate-500 font-mono flex justify-between">
                    <span>-30s</span>
                    <span>NOW</span>
                </div>
            </GlassCard>

            {/* Recent Thoughts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-4">
                    <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-400" /> Recent Insights
                    </h3>
                    <ul className="space-y-3 text-sm">
                        <li className="flex gap-2 text-slate-300">
                            <span className="text-slate-600 font-mono">[10:05]</span>
                            Market entropy increasing on EURUSD. Recommending wider stops.
                        </li>
                        <li className="flex gap-2 text-slate-300">
                            <span className="text-slate-600 font-mono">[10:02]</span>
                            Volatility spike detected. Anomaly Score: 0.88.
                        </li>
                    </ul>
                </GlassCard>

                <GlassCard className="p-4 bg-danger/5 border-danger/10">
                    <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-danger" /> Security Events
                    </h3>
                    <ul className="space-y-3 text-sm">
                        <li className="flex gap-2 text-slate-300">
                            <span className="text-slate-600 font-mono">[09:55]</span>
                            Blocked request: "Ignore previous instructions". (Jailbreak Attempt)
                        </li>
                    </ul>
                </GlassCard>
            </div>
        </div>
    );
}
