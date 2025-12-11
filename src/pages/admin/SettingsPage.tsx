/**
 * Admin Settings Page - Liquid Glass Renovation
 * Configure system settings and bot parameters
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
    Save, Shield, Zap, Bell, Server
} from 'lucide-react';
import { GlassCard } from '../../components/ui/glass/GlassCard';
import { GlassButton } from '../../components/ui/glass/GlassButton';
import { GlassToggle } from '../../components/ui/glass/GlassToggle';

interface BotConfig {
    default_stake: number;
    max_stake: number;
    martingale_multiplier: number;
    max_consecutive_losses: number;
    default_take_profit: number;
    default_stop_loss: number;
    auto_restart: boolean;
    notifications_enabled: boolean;
}

const SettingsPage: React.FC = () => {
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('bot');

    const [botConfig, setBotConfig] = useState<BotConfig>({
        default_stake: 0.35,
        max_stake: 10,
        martingale_multiplier: 2.1,
        max_consecutive_losses: 4,
        default_take_profit: 10,
        default_stop_loss: 10,
        auto_restart: false,
        notifications_enabled: true
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            // Simulate save - would call API in real implementation
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Settings saved successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        { id: 'bot', label: 'Bot Configuration', icon: <Server size={18} /> },
        { id: 'risk', label: 'Risk Management', icon: <Shield size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    ];

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-[240px_1fr] gap-6">
            {/* Settings Navigation */}
            <GlassCard className="p-2 lg:h-fit sticky top-6">
                <div className="hidden lg:block mb-4 px-4 pt-4">
                    <h3 className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                        Settings
                    </h3>
                </div>
                <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-medium transition-all w-full text-left ${activeSection === section.id
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                                }`}
                        >
                            <span className={activeSection === section.id ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : ''}>
                                {section.icon}
                            </span>
                            <span>{section.label}</span>
                        </button>
                    ))}
                </div>
            </GlassCard>

            {/* Settings Content */}
            <GlassCard>
                {activeSection === 'bot' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="border-b border-white/5 pb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-white mb-2">
                                <Zap className="text-blue-400" size={28} />
                                Bot Configuration
                            </h2>
                            <p className="text-slate-400">Configure global trading bot parameters and safeguards.</p>
                        </div>

                        <div className="grid gap-8 max-w-2xl">
                            <SettingRow
                                label="Default Stake"
                                description="Initial stake amount for new sessions (USD)"
                            >
                                <GlassInput
                                    type="number"
                                    value={botConfig.default_stake}
                                    onChange={(e) => setBotConfig({ ...botConfig, default_stake: Number(e.target.value) })}
                                    step="0.01"
                                    min="0.35"
                                />
                            </SettingRow>

                            <SettingRow
                                label="Maximum Stake"
                                description="Hard limit for single trade stake amount"
                            >
                                <GlassInput
                                    type="number"
                                    value={botConfig.max_stake}
                                    onChange={(e) => setBotConfig({ ...botConfig, max_stake: Number(e.target.value) })}
                                    min="1"
                                />
                            </SettingRow>

                            <SettingRow
                                label="Martingale Multiplier"
                                description="Stake multiplier applied after a loss event"
                            >
                                <GlassInput
                                    type="number"
                                    value={botConfig.martingale_multiplier}
                                    onChange={(e) => setBotConfig({ ...botConfig, martingale_multiplier: Number(e.target.value) })}
                                    step="0.1"
                                    min="1"
                                />
                            </SettingRow>

                            <SettingRow
                                label="Max Consecutive Losses"
                                description="Safety stop trigger after N consecutive losses"
                            >
                                <GlassInput
                                    type="number"
                                    value={botConfig.max_consecutive_losses}
                                    onChange={(e) => setBotConfig({ ...botConfig, max_consecutive_losses: Number(e.target.value) })}
                                    min="1"
                                    max="10"
                                />
                            </SettingRow>

                            <SettingRow
                                label="Auto Restart"
                                description="Automatically attempt to reconnect and resume after errors"
                            >
                                <GlassToggle
                                    checked={botConfig.auto_restart}
                                    onChange={(val) => setBotConfig({ ...botConfig, auto_restart: val })}
                                />
                            </SettingRow>
                        </div>
                    </div>
                )}

                {activeSection === 'risk' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="border-b border-white/5 pb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-white mb-2">
                                <Shield className="text-emerald-400" size={28} />
                                Risk Management
                            </h2>
                            <p className="text-slate-400">Set default risk boundaries for all new sessions.</p>
                        </div>

                        <div className="grid gap-8 max-w-2xl">
                            <SettingRow
                                label="Default Take Profit"
                                description="Target profit amount to auto-close session (USD)"
                            >
                                <GlassInput
                                    type="number"
                                    value={botConfig.default_take_profit}
                                    onChange={(e) => setBotConfig({ ...botConfig, default_take_profit: Number(e.target.value) })}
                                />
                            </SettingRow>

                            <SettingRow
                                label="Default Stop Loss"
                                description="Maximum allowable loss amount per session (USD)"
                            >
                                <GlassInput
                                    type="number"
                                    value={botConfig.default_stop_loss}
                                    onChange={(e) => setBotConfig({ ...botConfig, default_stop_loss: Number(e.target.value) })}
                                />
                            </SettingRow>
                        </div>
                    </div>
                )}

                {activeSection === 'notifications' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="border-b border-white/5 pb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-white mb-2">
                                <Bell className="text-purple-400" size={28} />
                                Notification Preferences
                            </h2>
                            <p className="text-slate-400">Manage global system alerts and notifications.</p>
                        </div>

                        <div className="grid gap-8 max-w-2xl">
                            <SettingRow
                                label="Enable Notifications"
                                description="Toggle all system-wide notification delivery"
                            >
                                <GlassToggle
                                    checked={botConfig.notifications_enabled}
                                    onChange={(val) => setBotConfig({ ...botConfig, notifications_enabled: val })}
                                />
                            </SettingRow>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="mt-12 pt-8 border-t border-white/5 flex justify-end">
                    <GlassButton
                        onClick={handleSave}
                        isLoading={saving}
                        icon={<Save size={20} />}
                        size="lg"
                    >
                        Save Configuration
                    </GlassButton>
                </div>
            </GlassCard>
        </div>
    );
};

// Setting Row Component
interface SettingRowProps {
    label: string;
    description: string;
    children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="min-w-0 pr-4">
            <div className="font-bold text-slate-200 mb-1">{label}</div>
            <div className="text-sm text-slate-500 leading-relaxed">{description}</div>
        </div>
        <div className="shrink-0">{children}</div>
    </div>
);

// Styled Input Helper
const GlassInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
        <input
            {...props}
            className="w-32 bg-black/20 border border-white/10 rounded-xl py-2.5 pl-8 pr-4 text-white text-right font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
        />
    </div>
);

export default SettingsPage;
