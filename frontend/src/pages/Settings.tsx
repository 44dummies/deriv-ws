import { useThemeStore, Theme } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { Palette, User, Shield, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'default', name: 'Default Blue', color: 'bg-blue-500' },
    { id: 'cyberpunk', name: 'Cyberpunk Neon', color: 'bg-pink-500' },
    { id: 'midnight', name: 'Midnight Purple', color: 'bg-purple-500' },
    { id: 'corporate', name: 'Corporate Green', color: 'bg-emerald-500' },
    { id: 'ocean', name: 'Deep Ocean', color: 'bg-cyan-500' },
];

export default function Settings() {
    const { currentTheme, setTheme } = useThemeStore();
    const { user } = useAuthStore();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-gray-400">Manage global preferences and application appearance.</p>
            </div>

            {/* Application Theme */}
            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Palette className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold">Appearance</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {themes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => setTheme(theme.id)}
                            className={cn(
                                "group relative overflow-hidden p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02]",
                                currentTheme === theme.id
                                    ? "bg-primary/20 border-primary shadow-lg shadow-primary/20"
                                    : "bg-surface border-white/5 hover:border-white/20"
                            )}
                        >
                            <div className={cn("w-full h-24 rounded-lg mb-4 opacity-80", theme.color)} />
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{theme.name}</span>
                                {currentTheme === theme.id && <Check className="w-4 h-4 text-primary" />}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* User Profile */}
            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <User className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold">Deriv Profile</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-mono">Registered Email</label>
                            <div className="text-lg font-medium">{user?.email || 'N/A'}</div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-mono">Deriv Account ID</label>
                            <div className="text-lg font-medium">{user?.deriv_account?.loginid || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-center gap-2 text-orange-400 mb-2">
                            <Shield className="w-4 h-4" />
                            <span className="font-bold text-sm">Security Scope</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            This app operates within the scope of your Deriv API token permissions.
                            Sensitive operations like withdrawals are disabled by default.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
