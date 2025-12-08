/**
 * Admin Settings Page
 * Configure system settings and bot parameters
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
    Save, Shield, Target, Zap, Bell, Server, Database
} from 'lucide-react';

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
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
            {/* Settings Navigation */}
            <div className="admin-card" style={{ padding: '16px', height: 'fit-content' }}>
                <div style={{ marginBottom: '16px', padding: '0 12px' }}>
                    <h3 style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Settings
                    </h3>
                </div>
                {sections.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: 'none',
                            background: activeSection === section.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            color: activeSection === section.id ? '#fff' : '#9ca3af',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginBottom: '4px',
                            textAlign: 'left'
                        }}
                    >
                        <span style={{ color: activeSection === section.id ? '#3b82f6' : 'inherit' }}>
                            {section.icon}
                        </span>
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Settings Content */}
            <div className="admin-card" style={{ padding: '32px' }}>
                {activeSection === 'bot' && (
                    <>
                        <div style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Zap size={24} style={{ color: '#3b82f6' }} />
                                Bot Configuration
                            </h2>
                            <p style={{ color: '#9ca3af' }}>Configure the trading bot parameters and defaults.</p>
                        </div>

                        <div style={{ display: 'grid', gap: '24px', maxWidth: '600px' }}>
                            <SettingRow
                                label="Default Stake"
                                description="Initial stake amount for new sessions"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#9ca3af' }}>$</span>
                                    <input
                                        type="number"
                                        value={botConfig.default_stake}
                                        onChange={(e) => setBotConfig({ ...botConfig, default_stake: Number(e.target.value) })}
                                        step="0.01"
                                        min="0.35"
                                        style={{
                                            width: '120px',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </SettingRow>

                            <SettingRow
                                label="Maximum Stake"
                                description="Maximum stake limit per trade"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#9ca3af' }}>$</span>
                                    <input
                                        type="number"
                                        value={botConfig.max_stake}
                                        onChange={(e) => setBotConfig({ ...botConfig, max_stake: Number(e.target.value) })}
                                        min="1"
                                        style={{
                                            width: '120px',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </SettingRow>

                            <SettingRow
                                label="Martingale Multiplier"
                                description="Stake multiplier after a loss"
                            >
                                <input
                                    type="number"
                                    value={botConfig.martingale_multiplier}
                                    onChange={(e) => setBotConfig({ ...botConfig, martingale_multiplier: Number(e.target.value) })}
                                    step="0.1"
                                    min="1"
                                    style={{
                                        width: '120px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </SettingRow>

                            <SettingRow
                                label="Max Consecutive Losses"
                                description="Stop trading after this many losses in a row"
                            >
                                <input
                                    type="number"
                                    value={botConfig.max_consecutive_losses}
                                    onChange={(e) => setBotConfig({ ...botConfig, max_consecutive_losses: Number(e.target.value) })}
                                    min="1"
                                    max="10"
                                    style={{
                                        width: '120px',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </SettingRow>

                            <SettingRow
                                label="Auto Restart"
                                description="Automatically restart bot after connection issues"
                            >
                                <Toggle
                                    value={botConfig.auto_restart}
                                    onChange={(val) => setBotConfig({ ...botConfig, auto_restart: val })}
                                />
                            </SettingRow>
                        </div>
                    </>
                )}

                {activeSection === 'risk' && (
                    <>
                        <div style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Shield size={24} style={{ color: '#10b981' }} />
                                Risk Management
                            </h2>
                            <p style={{ color: '#9ca3af' }}>Configure default risk parameters for trading sessions.</p>
                        </div>

                        <div style={{ display: 'grid', gap: '24px', maxWidth: '600px' }}>
                            <SettingRow
                                label="Default Take Profit"
                                description="Target profit to close session"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#9ca3af' }}>$</span>
                                    <input
                                        type="number"
                                        value={botConfig.default_take_profit}
                                        onChange={(e) => setBotConfig({ ...botConfig, default_take_profit: Number(e.target.value) })}
                                        style={{
                                            width: '120px',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </SettingRow>

                            <SettingRow
                                label="Default Stop Loss"
                                description="Maximum loss before closing session"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#9ca3af' }}>$</span>
                                    <input
                                        type="number"
                                        value={botConfig.default_stop_loss}
                                        onChange={(e) => setBotConfig({ ...botConfig, default_stop_loss: Number(e.target.value) })}
                                        style={{
                                            width: '120px',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </SettingRow>
                        </div>
                    </>
                )}

                {activeSection === 'notifications' && (
                    <>
                        <div style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Bell size={24} style={{ color: '#8b5cf6' }} />
                                Notifications
                            </h2>
                            <p style={{ color: '#9ca3af' }}>Configure how you receive system notifications.</p>
                        </div>

                        <div style={{ display: 'grid', gap: '24px', maxWidth: '600px' }}>
                            <SettingRow
                                label="Enable Notifications"
                                description="Receive alerts for important events"
                            >
                                <Toggle
                                    value={botConfig.notifications_enabled}
                                    onChange={(val) => setBotConfig({ ...botConfig, notifications_enabled: val })}
                                />
                            </SettingRow>
                        </div>
                    </>
                )}

                {/* Save Button */}
                <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <Save size={20} />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
        <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>{description}</div>
        </div>
        {children}
    </div>
);

// Toggle Component
interface ToggleProps {
    value: boolean;
    onChange: (value: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        style={{
            width: '52px',
            height: '28px',
            borderRadius: '14px',
            background: value ? '#3b82f6' : 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s'
        }}
    >
        <span
            style={{
                position: 'absolute',
                top: '3px',
                left: value ? '27px' : '3px',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}
        />
    </button>
);

export default SettingsPage;
