/**
 * Risk Management & Signal Analysis Page
 * Centralized control for risk parameters and signal provider monitoring
 */

import React, { useState, useEffect } from 'react';
import {
    Shield, Activity, AlertTriangle, Zap, Settings,
    TrendingDown, AlertCircle, Eye, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tradingApi } from '../../trading/tradingApi';
import { useSessionManagement } from '../../hooks/useSessionManagement';

// Components
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassInput } from '../../components/ui/glass/GlassInput';
import { GlassMetricTile } from '../../components/ui/glass/GlassMetricTile';
import { SessionHealthPanel } from '../../components/admin/common/SessionHealthPanel';
import { GlassTable } from '../../components/ui/glass/GlassTable';

export default function RiskManagement() {
    const [loading, setLoading] = useState(false);

    // Config State
    const [globalRisk, setGlobalRisk] = useState({
        max_daily_loss: 500,
        max_exposure: 1000,
        max_stake: 50,
        risk_per_trade: 2 // percent
    });

    const [signals, setSignals] = useState<any[]>([]);

    // Leverage existing session management hook for global session stats
    const { sessions, loading: loadingSessions } = useSessionManagement();

    // Calculate global exposure
    const globalExposure = sessions.reduce((acc, s) => acc + (s.currentExposure || 0), 0);
    const activeDrawdown = sessions.reduce((acc, s) => acc + (s.pnl < 0 ? s.pnl : 0), 0);

    // Mock signal feed for now (replace with API call)
    useEffect(() => {
        // In real app: tradingApi.getSignalsHistory()
        setSignals([
            { id: 1, time: new Date().toISOString(), market: 'R_100', type: 'CALL', confidence: 0.85, result: 'WIN', source: 'Keltner Bot' },
            { id: 2, time: new Date(Date.now() - 60000).toISOString(), market: '1HZ10V', type: 'PUT', confidence: 0.92, result: 'WIN', source: 'MACD Divergence' },
            { id: 3, time: new Date(Date.now() - 120000).toISOString(), market: 'R_50', type: 'call', confidence: 0.65, result: 'LOSS', source: 'RSI Reversal' },
            { id: 4, time: new Date(Date.now() - 180000).toISOString(), market: 'JD75', type: 'PUT', confidence: 0.78, result: 'WIN', source: 'Keltner Bot' },
        ]);
    }, []);

    const handleSaveRisk = async () => {
        setLoading(true);
        try {
            await new Promise(r => setTimeout(r, 1000)); // Mock API
            toast.success('Global risk parameters updated');
        } catch (err) {
            toast.error('Failed to update risk settings');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Shield className="text-emerald-400" />
                Risk Management & Signals
            </h1>

            {/* Top Metrics: Risk Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassMetricTile
                    label="Current Exposure"
                    value={`$${globalExposure.toFixed(2)}`}
                    icon={<Activity size={18} />}
                    trend={globalExposure > globalRisk.max_exposure ? 'down' : 'up'}
                    trendValue={globalExposure > globalRisk.max_exposure ? 'High Risk' : 'Healthy'}
                />
                <GlassMetricTile
                    label="Active Drawdown"
                    value={`$${Math.abs(activeDrawdown).toFixed(2)}`}
                    icon={<TrendingDown size={18} />}
                    trend={Math.abs(activeDrawdown) > globalRisk.max_daily_loss * 0.5 ? 'down' : 'up'}
                />
                <GlassMetricTile
                    label="Daily Loss Limit"
                    value={`$${globalRisk.max_daily_loss}`}
                    icon={<AlertCircle size={18} />}
                />
                <GlassMetricTile
                    label="Signal Accuracy (24h)"
                    value="68.5%"
                    icon={<Zap size={18} />}
                    trend="up"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Configuration & Health */}
                <div className="space-y-6">
                    <GlassCard className="p-5">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Settings size={18} className="text-blue-400" /> Global Limits
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs text-slate-400 mb-1 block">Max Daily Loss ($)</label>
                                    <GlassInput
                                        type="number"
                                        value={globalRisk.max_daily_loss}
                                        onChange={(e) => setGlobalRisk({ ...globalRisk, max_daily_loss: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Max Exposure ($)</label>
                                    <GlassInput
                                        type="number"
                                        value={globalRisk.max_exposure}
                                        onChange={(e) => setGlobalRisk({ ...globalRisk, max_exposure: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Max Stake ($)</label>
                                    <GlassInput
                                        type="number"
                                        value={globalRisk.max_stake}
                                        onChange={(e) => setGlobalRisk({ ...globalRisk, max_stake: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <GlassButton
                                    onClick={handleSaveRisk}
                                    isLoading={loading}
                                    variant="primary"
                                    className="w-full"
                                >
                                    Update Limits
                                </GlassButton>
                            </div>
                        </div>
                    </GlassCard>

                    {/* System Health Module */}
                    <SessionHealthPanel
                        session={sessions[0] || { // Fallback if no sessions
                            health: {
                                status: 'idle',
                                isWebsocketAlive: true,
                                lastHeartbeat: Date.now(),
                                warnings: []
                            }
                        } as any}
                    />
                </div>

                {/* Right Panel: Signal Feed */}
                <div className="lg:col-span-2">
                    <GlassCard className="h-full flex flex-col p-0 overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Zap size={18} className="text-amber-400" /> Signal Provder Feed
                            </h2>
                            <div className="flex gap-2 text-xs">
                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Active Providers: 3</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-xs text-slate-400 uppercase">
                                    <tr>
                                        <th className="p-3">Time</th>
                                        <th className="p-3">Source</th>
                                        <th className="p-3">Market</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Confidence</th>
                                        <th className="p-3">Result</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {signals.map((signal) => (
                                        <tr key={signal.id} className="hover:bg-white/5 transition-all">
                                            <td className="p-3 text-slate-400 font-mono">
                                                {new Date(signal.time).toLocaleTimeString()}
                                            </td>
                                            <td className="p-3 font-medium text-blue-300">
                                                {signal.source}
                                            </td>
                                            <td className="p-3 text-slate-300">{signal.market}</td>
                                            <td className="p-3">
                                                <span className={`font-bold ${signal.type.toUpperCase() === 'CALL' ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {signal.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500"
                                                            style={{ width: `${signal.confidence * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-slate-400">{(signal.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${signal.result === 'WIN'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`}>
                                                    {signal.result}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
