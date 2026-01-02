import { useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore, Theme } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { 
    Palette, User, Shield, Check, Bell, Key, Cpu, 
    ChevronRight, Zap, Lock, ExternalLink, 
    AlertTriangle, HardDrive, RefreshCcw, Fingerprint,
    Info, Sparkles, Copy, CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GlassCard, ScrollReveal, ShimmerText, Floating } from '../components/PremiumUI';

const themes: { id: Theme; name: string; color: string; description: string }[] = [
    { id: 'default', name: 'Ocean Blue', color: 'from-blue-500 to-blue-600', description: 'Clean professional look' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: 'from-pink-500 to-purple-600', description: 'Neon futuristic vibes' },
    { id: 'midnight', name: 'Midnight', color: 'from-purple-600 to-indigo-700', description: 'Deep space aesthetic' },
    { id: 'corporate', name: 'Emerald', color: 'from-emerald-500 to-teal-600', description: 'Professional & fresh' },
    { id: 'ocean', name: 'Arctic', color: 'from-cyan-500 to-blue-600', description: 'Cool & calming' },
];

// Settings section component
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
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="rounded-2xl bg-gray-900/50 border border-white/5 overflow-hidden"
        >
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-white/10">
                            <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">{title}</h2>
                                {badge && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
                                        {badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">{description}</p>
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

// Toggle switch component
function ToggleSwitch({ 
    enabled, onChange, label, description 
}: {
    enabled: boolean;
    onChange: () => void;
    label: string;
    description?: string;
}) {
    return (
        <button
            onClick={onChange}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10"
        >
            <div className="flex-1 text-left">
                <div className="font-medium text-white">{label}</div>
                {description && <div className="text-sm text-gray-500 mt-0.5">{description}</div>}
            </div>
            <div className={cn(
                "relative w-12 h-7 rounded-full transition-all duration-300",
                enabled ? "bg-blue-500" : "bg-gray-700"
            )}>
                <div className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all duration-300",
                    enabled ? "left-6" : "left-1"
                )} />
            </div>
        </button>
    );
}

// Link row component
function LinkRow({ icon: Icon, label, value, onClick }: { icon: any; label: string; value?: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10 group"
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-white">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm text-gray-500">{value}</span>}
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
    );
}

export default function Settings() {
    const { currentTheme, setTheme } = useThemeStore();
    const { user } = useAuthStore();
    const [copiedId, setCopiedId] = useState(false);
    
    // Local settings state (would persist to localStorage/API in production)
    const [notifications, setNotifications] = useState({
        trades: true,
        signals: true,
        news: false,
        email: false
    });
    const [darkMode, setDarkMode] = useState(true);
    const [autoTrade, setAutoTrade] = useState(false);
    const [riskProtection, setRiskProtection] = useState(true);

    const activeAccount = user?.deriv_accounts.find(a => a.loginid === user?.active_account_id);

    const copyDerivId = async () => {
        if (activeAccount?.loginid) {
            await navigator.clipboard.writeText(activeAccount.loginid);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <header>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <Floating>
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                    </Floating>
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                            <ShimmerText>Settings</ShimmerText>
                        </h1>
                        <p className="text-gray-400">Customize your trading experience</p>
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
                                            : "border-white/10 hover:border-white/20 hover:scale-[1.02]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-full h-16 rounded-lg mb-3 bg-gradient-to-br",
                                        theme.color
                                    )} />
                                    <div className="text-sm font-bold text-white">{theme.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{theme.description}</div>
                                    
                                    {currentTheme === theme.id && (
                                        <div className="absolute top-2 right-2 p-1 rounded-full bg-blue-500 text-white">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <ToggleSwitch
                                enabled={darkMode}
                                onChange={() => setDarkMode(!darkMode)}
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
                                label="AI Signal Alerts"
                                description="Receive alerts when AI detects opportunities"
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
                                description="Let AI execute trades automatically"
                            />
                            <ToggleSwitch
                                enabled={riskProtection}
                                onChange={() => setRiskProtection(!riskProtection)}
                                label="RiskGuard™ Protection"
                                description="Automatic stop-loss and position sizing"
                            />
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-orange-400 text-sm">Risk Warning</div>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Trading involves significant risk. Past performance does not guarantee future results.
                                        Only trade with funds you can afford to lose.
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
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
                                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white truncate">
                                        {user?.email?.split('@')[0] || 'Trader'}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                                </div>
                            </div>

                            {/* Deriv Account ID - Prominent Display */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Deriv Account ID</div>
                                        <div className="font-mono text-xl font-bold text-white">
                                            {activeAccount?.loginid || 'Not Connected'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={copyDerivId}
                                        className={cn(
                                            "p-2 rounded-lg transition-all duration-200",
                                            copiedId 
                                                ? "bg-emerald-500/20 text-emerald-400" 
                                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        )}
                                        title="Copy Account ID"
                                    >
                                        {copiedId ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Account Type</span>
                                    <span className={cn(
                                        "font-bold",
                                        activeAccount?.is_virtual ? "text-orange-400" : "text-emerald-400"
                                    )}>
                                        {activeAccount?.is_virtual ? 'Demo' : 'Real'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Currency</span>
                                    <span className="font-mono text-white">{activeAccount?.currency || 'USD'}</span>
                                </div>
                            </div>
                        </div>
                    </SettingsSection>

                    {/* Security */}
                    <SettingsSection
                        title="Security"
                        description="API keys & permissions"
                        icon={Shield}
                        delay={0.15}
                    >
                        <div className="space-y-2">
                            <LinkRow icon={Key} label="API Token" value="••••••••" />
                            <LinkRow icon={Lock} label="2FA Settings" />
                            <LinkRow icon={Fingerprint} label="Session History" />
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                <Shield className="w-4 h-4" />
                                <span className="font-bold">Protected Scope</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
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
                            <LinkRow icon={Info} label="Version" value="v2.1.0" />
                            <LinkRow icon={HardDrive} label="Clear Cache" />
                            <LinkRow icon={RefreshCcw} label="Check Updates" />
                            <LinkRow icon={ExternalLink} label="Documentation" />
                        </div>
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
}
