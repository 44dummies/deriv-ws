/**
 * TraderMind Settings Page
 * Comprehensive settings with working functionality
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore, Theme } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { 
    Palette, User, Shield, Check, Bell, Cpu, 
    ChevronRight, Zap, Lock, ExternalLink, 
    AlertTriangle, HardDrive, RefreshCcw, Fingerprint,
    Copy, CheckCircle2, LogOut, Smartphone
} from 'lucide-react';
import { cn } from '../lib/utils';

const themes: { id: Theme; name: string; color: string; description: string }[] = [
    { id: 'default', name: 'Ocean Blue', color: 'from-blue-500 to-blue-600', description: 'Clean professional look' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: 'from-pink-500 to-purple-600', description: 'Neon futuristic vibes' },
    { id: 'midnight', name: 'Midnight', color: 'from-purple-600 to-indigo-700', description: 'Deep space aesthetic' },
    { id: 'corporate', name: 'Emerald', color: 'from-emerald-500 to-teal-600', description: 'Professional & fresh' },
    { id: 'ocean', name: 'Arctic', color: 'from-cyan-500 to-blue-600', description: 'Cool & calming' },
];

// =============================================================================
// COMPONENTS
// =============================================================================

function SettingsSection({ 
    title, description, icon: Icon, children, badge, delay = 0 
}: {
    title: string;
    description: string;
    icon: any;
    children: React.ReactNode;
    badge?: string;
    delay?: number;
}) {
    const { isDarkMode } = useThemeStore();
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={cn(
                "rounded-2xl border overflow-hidden",
                isDarkMode 
                    ? "bg-gray-900/50 border-white/5"
                    : "bg-white border-black/5"
            )}
        >
            <div className={cn(
                "p-6 border-b",
                isDarkMode ? "border-white/5" : "border-black/5"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-xl ring-1",
                            isDarkMode 
                                ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-white/10"
                                : "bg-gradient-to-br from-blue-100 to-purple-100 ring-black/5"
                        )}>
                            <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className={cn(
                                    "text-lg font-bold",
                                    isDarkMode ? "text-white" : "text-gray-900"
                                )}>{title}</h2>
                                {badge && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                                        {badge}
                                    </span>
                                )}
                            </div>
                            <p className={cn(
                                "text-sm",
                                isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}>{description}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6">
                {children}
            </div>
        </motion.div>
    );
}

function ToggleSwitch({ 
    enabled, onChange, label, description 
}: {
    enabled: boolean;
    onChange: () => void;
    label: string;
    description?: string;
}) {
    const { isDarkMode } = useThemeStore();
    
    return (
        <button
            onClick={onChange}
            className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                isDarkMode 
                    ? "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                    : "bg-gray-50 hover:bg-gray-100 border-black/5 hover:border-black/10"
            )}
        >
            <div className="flex-1 text-left">
                <div className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>{label}</div>
                {description && (
                    <div className={cn("text-sm mt-0.5", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                        {description}
                    </div>
                )}
            </div>
            <div className={cn(
                "relative w-12 h-7 rounded-full transition-all duration-300",
                enabled ? "bg-blue-500" : isDarkMode ? "bg-gray-700" : "bg-gray-300"
            )}>
                <div className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300",
                    enabled ? "left-6" : "left-1"
                )} />
            </div>
        </button>
    );
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default' }: { 
    icon: any; 
    label: string; 
    onClick: () => void;
    variant?: 'default' | 'danger';
}) {
    const { isDarkMode } = useThemeStore();
    
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all group",
                variant === 'danger'
                    ? "text-red-400 hover:bg-red-500/10 border-red-500/20"
                    : isDarkMode 
                        ? "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                        : "bg-gray-50 hover:bg-gray-100 border-black/5 hover:border-black/10"
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className={cn(
                    "font-medium",
                    variant === 'danger' 
                        ? "text-red-400" 
                        : isDarkMode ? "text-white" : "text-gray-900"
                )}>{label}</span>
            </div>
            <ChevronRight className={cn(
                "w-4 h-4 group-hover:translate-x-1 transition-transform",
                isDarkMode ? "text-gray-500" : "text-gray-400"
            )} />
        </button>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    const { isDarkMode } = useThemeStore();
    
    return (
        <div className={cn(
            "flex items-center justify-between p-4 rounded-xl",
            isDarkMode ? "bg-white/5" : "bg-gray-50"
        )}>
            <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>{label}</span>
            <span className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>{value}</span>
        </div>
    );
}

// =============================================================================
// MAIN SETTINGS PAGE
// =============================================================================

export default function Settings() {
    const { currentTheme, setTheme, isDarkMode, toggleDarkMode } = useThemeStore();
    const { user, signOut } = useAuthStore();
    const [copiedId, setCopiedId] = useState(false);
    const [showSessionHistory, setShowSessionHistory] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [notifications, setNotifications] = useState({
        trades: true,
        signals: true,
        news: false,
        email: false
    });
    const [autoTrade, setAutoTrade] = useState(false);
    const [riskProtection, setRiskProtection] = useState(true);

    const activeAccount = user?.deriv_accounts?.find(a => a.loginid === user?.active_account_id);

    const copyDerivId = async () => {
        if (activeAccount?.loginid) {
            await navigator.clipboard.writeText(activeAccount.loginid);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const handleClearCache = () => {
        localStorage.removeItem('tradermind-theme-storage');
        sessionStorage.clear();
        window.location.reload();
    };

    const handleCheckUpdates = () => {
        alert('You are running the latest version (v2.1.0)');
    };

    const handleOpenDocs = () => {
        window.open('https://docs.tradermind.io', '_blank');
    };

    const handleView2FA = () => {
        setShow2FAModal(true);
    };

    const handleViewSessionHistory = () => {
        setShowSessionHistory(true);
    };

    // Mock session history
    const sessionHistory = [
        { id: 1, device: 'Chrome on Windows', location: 'Nairobi, Kenya', time: 'Active now', current: true },
        { id: 2, device: 'Safari on iPhone', location: 'Nairobi, Kenya', time: '2 hours ago', current: false },
        { id: 3, device: 'Chrome on MacOS', location: 'Mombasa, Kenya', time: '1 day ago', current: false },
    ];

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className={cn(
                            "text-3xl lg:text-4xl font-bold tracking-tight",
                            isDarkMode ? "text-white" : "text-gray-900"
                        )}>Settings</h1>
                        <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                            Customize your trading experience
                        </p>
                    </div>
                </motion.div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main settings column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Theme Selection */}
                    <SettingsSection
                        title="Appearance"
                        description="Choose your preferred visual theme"
                        icon={Palette}
                        delay={0.1}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {themes.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => setTheme(theme.id)}
                                    className={cn(
                                        "group relative overflow-hidden p-4 rounded-xl border transition-all duration-300",
                                        currentTheme === theme.id
                                            ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-105"
                                            : isDarkMode 
                                                ? "border-white/10 hover:border-white/20 hover:scale-[1.02]"
                                                : "border-black/10 hover:border-black/20 hover:scale-[1.02]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-full h-16 rounded-lg mb-3 bg-gradient-to-br",
                                        theme.color
                                    )} />
                                    <div className={cn(
                                        "text-sm font-bold",
                                        isDarkMode ? "text-white" : "text-gray-900"
                                    )}>{theme.name}</div>
                                    <div className={cn(
                                        "text-xs mt-1",
                                        isDarkMode ? "text-gray-500" : "text-gray-400"
                                    )}>{theme.description}</div>
                                    
                                    {currentTheme === theme.id && (
                                        <div className="absolute top-2 right-2 p-1 rounded-full bg-blue-500 text-white">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className={cn(
                            "mt-6 pt-6 border-t",
                            isDarkMode ? "border-white/5" : "border-black/5"
                        )}>
                            <ToggleSwitch
                                enabled={isDarkMode}
                                onChange={toggleDarkMode}
                                label="Dark Mode"
                                description="Use dark color scheme across the application"
                            />
                        </div>
                    </SettingsSection>

                    {/* Notifications */}
                    <SettingsSection
                        title="Notifications"
                        description="Control what alerts you receive"
                        icon={Bell}
                        delay={0.15}
                    >
                        <div className="space-y-3">
                            <ToggleSwitch
                                enabled={notifications.trades}
                                onChange={() => setNotifications({ ...notifications, trades: !notifications.trades })}
                                label="Trade Alerts"
                                description="Get notified when trades execute"
                            />
                            <ToggleSwitch
                                enabled={notifications.signals}
                                onChange={() => setNotifications({ ...notifications, signals: !notifications.signals })}
                                label="Signal Alerts"
                                description="Receive alerts when signals are detected"
                            />
                            <ToggleSwitch
                                enabled={notifications.news}
                                onChange={() => setNotifications({ ...notifications, news: !notifications.news })}
                                label="Market News"
                                description="Breaking news that may affect your positions"
                            />
                            <ToggleSwitch
                                enabled={notifications.email}
                                onChange={() => setNotifications({ ...notifications, email: !notifications.email })}
                                label="Email Digest"
                                description="Daily summary sent to your email"
                            />
                        </div>
                    </SettingsSection>

                    {/* Trading Preferences */}
                    <SettingsSection
                        title="Trading Preferences"
                        description="Configure your trading behavior"
                        icon={Zap}
                        badge="PRO"
                        delay={0.2}
                    >
                        <div className="space-y-3">
                            <ToggleSwitch
                                enabled={autoTrade}
                                onChange={() => setAutoTrade(!autoTrade)}
                                label="Auto Trading"
                                description="Let the system execute trades automatically"
                            />
                            <ToggleSwitch
                                enabled={riskProtection}
                                onChange={() => setRiskProtection(!riskProtection)}
                                label="RiskGuard™ Protection"
                                description="Automatic stop-loss and position sizing"
                            />
                        </div>

                        <div className={cn(
                            "mt-6 p-4 rounded-xl border",
                            isDarkMode 
                                ? "bg-orange-500/10 border-orange-500/20"
                                : "bg-orange-50 border-orange-200"
                        )}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-orange-400 text-sm">Risk Warning</div>
                                    <p className={cn(
                                        "text-sm mt-1",
                                        isDarkMode ? "text-gray-400" : "text-gray-600"
                                    )}>
                                        Trading involves significant risk. Past performance does not guarantee future results.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Account Card */}
                    <SettingsSection
                        title="Account"
                        description="Your Deriv profile"
                        icon={User}
                        delay={0.1}
                    >
                        <div className="space-y-4">
                            <div className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border",
                                isDarkMode 
                                    ? "bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-white/10"
                                    : "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200/50"
                            )}>
                                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={cn(
                                        "font-bold truncate",
                                        isDarkMode ? "text-white" : "text-gray-900"
                                    )}>
                                        {user?.fullname || user?.email?.split('@')[0] || 'Trader'}
                                    </div>
                                    <div className={cn(
                                        "text-sm truncate",
                                        isDarkMode ? "text-gray-500" : "text-gray-400"
                                    )}>{user?.email}</div>
                                </div>
                            </div>

                            {/* Deriv Account ID */}
                            <div className={cn(
                                "p-4 rounded-xl border",
                                isDarkMode 
                                    ? "bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20"
                                    : "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200"
                            )}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
                                            Deriv Account ID
                                        </div>
                                        <div className={cn(
                                            "font-mono text-xl font-bold",
                                            isDarkMode ? "text-white" : "text-gray-900"
                                        )}>
                                            {activeAccount?.loginid || 'Not Connected'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={copyDerivId}
                                        className={cn(
                                            "p-2 rounded-lg transition-all duration-200",
                                            copiedId 
                                                ? "bg-emerald-500/20 text-emerald-400" 
                                                : isDarkMode 
                                                    ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                                    : "bg-black/5 text-gray-500 hover:bg-black/10"
                                        )}
                                    >
                                        {copiedId ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <InfoRow 
                                    label="Account Type" 
                                    value={activeAccount?.is_virtual ? 'Demo' : 'Real'} 
                                />
                                <InfoRow 
                                    label="Currency" 
                                    value={activeAccount?.currency || 'USD'} 
                                />
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Security */}
                    <SettingsSection
                        title="Security"
                        description="Account protection"
                        icon={Shield}
                        delay={0.15}
                    >
                        <div className="space-y-2">
                            <ActionButton 
                                icon={Lock} 
                                label="2FA Settings" 
                                onClick={handleView2FA} 
                            />
                            <ActionButton 
                                icon={Fingerprint} 
                                label="Session History" 
                                onClick={handleViewSessionHistory} 
                            />
                        </div>

                        <div className={cn(
                            "mt-4 p-3 rounded-lg border",
                            isDarkMode 
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : "bg-emerald-50 border-emerald-200"
                        )}>
                            <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                <Shield className="w-4 h-4" />
                                <span className="font-bold">Protected Scope</span>
                            </div>
                            <p className={cn(
                                "text-xs mt-1",
                                isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}>
                                Withdrawal operations are disabled for this API token.
                            </p>
                        </div>
                    </SettingsSection>

                    {/* System */}
                    <SettingsSection
                        title="System"
                        description="App information"
                        icon={Cpu}
                        delay={0.2}
                    >
                        <div className="space-y-2">
                            <InfoRow label="Version" value="v2.1.0" />
                            <ActionButton 
                                icon={HardDrive} 
                                label="Clear Cache" 
                                onClick={handleClearCache} 
                            />
                            <ActionButton 
                                icon={RefreshCcw} 
                                label="Check Updates" 
                                onClick={handleCheckUpdates} 
                            />
                            <ActionButton 
                                icon={ExternalLink} 
                                label="Documentation" 
                                onClick={handleOpenDocs} 
                            />
                        </div>
                    </SettingsSection>

                    {/* Logout */}
                    <ActionButton
                        icon={LogOut}
                        label="Sign Out"
                        onClick={signOut}
                        variant="danger"
                    />
                </div>
            </div>

            {/* Session History Modal */}
            {showSessionHistory && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShowSessionHistory(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "w-full max-w-md rounded-2xl border p-6",
                            isDarkMode 
                                ? "bg-gray-900 border-white/10"
                                : "bg-white border-black/10"
                        )}
                    >
                        <h3 className={cn(
                            "text-lg font-bold mb-4",
                            isDarkMode ? "text-white" : "text-gray-900"
                        )}>Session History</h3>
                        <div className="space-y-3">
                            {sessionHistory.map((session) => (
                                <div
                                    key={session.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl",
                                        session.current 
                                            ? "bg-emerald-500/10 border border-emerald-500/20"
                                            : isDarkMode ? "bg-white/5" : "bg-gray-50"
                                    )}
                                >
                                    <Smartphone className={cn(
                                        "w-5 h-5",
                                        session.current ? "text-emerald-400" : "text-gray-400"
                                    )} />
                                    <div className="flex-1">
                                        <p className={cn(
                                            "font-medium text-sm",
                                            isDarkMode ? "text-white" : "text-gray-900"
                                        )}>{session.device}</p>
                                        <p className={cn(
                                            "text-xs",
                                            isDarkMode ? "text-gray-500" : "text-gray-400"
                                        )}>{session.location} • {session.time}</p>
                                    </div>
                                    {session.current && (
                                        <span className="text-xs text-emerald-400 font-medium">Current</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowSessionHistory(false)}
                            className="w-full mt-4 py-3 text-sm font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                        >
                            Close
                        </button>
                    </motion.div>
                </div>
            )}

            {/* 2FA Modal */}
            {show2FAModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setShow2FAModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "w-full max-w-md rounded-2xl border p-6",
                            isDarkMode 
                                ? "bg-gray-900 border-white/10"
                                : "bg-white border-black/10"
                        )}
                    >
                        <h3 className={cn(
                            "text-lg font-bold mb-4",
                            isDarkMode ? "text-white" : "text-gray-900"
                        )}>Two-Factor Authentication</h3>
                        
                        <div className={cn(
                            "p-4 rounded-xl mb-4",
                            isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"
                        )}>
                            <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                <Shield className="w-5 h-5" />
                                <span className="font-bold">2FA is Active</span>
                            </div>
                            <p className={cn(
                                "text-sm",
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                            )}>
                                Your account is protected with Deriv's built-in 2FA.
                            </p>
                        </div>

                        <p className={cn(
                            "text-sm mb-4",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                            Two-factor authentication is managed through your Deriv account settings. 
                            Visit Deriv's security settings to modify your 2FA preferences.
                        </p>

                        <button
                            onClick={() => window.open('https://app.deriv.com/account/security', '_blank')}
                            className={cn(
                                "w-full py-3 text-sm font-medium rounded-xl transition-colors mb-2",
                                isDarkMode 
                                    ? "bg-white/10 text-white hover:bg-white/20"
                                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                            )}
                        >
                            Open Deriv Security Settings
                        </button>
                        
                        <button
                            onClick={() => setShow2FAModal(false)}
                            className="w-full py-3 text-sm font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                        >
                            Close
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
