import { useState } from 'react';
import { Bell, Shield, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Settings() {
    const { user, signOut } = useAuthStore();
    const [notifications, setNotifications] = useState({
        trades: true,
        sessions: true,
        system: false
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Account preferences and security controls.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            Account
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm">
                            <div className="text-muted-foreground">Full name</div>
                            <div className="font-medium">{user?.fullname || '—'}</div>
                        </div>
                        <div className="text-sm">
                            <div className="text-muted-foreground">Email</div>
                            <div className="font-medium">{user?.email || '—'}</div>
                        </div>
                        <div className="text-sm">
                            <div className="text-muted-foreground">Role</div>
                            <div className="font-medium">{user?.role || '—'}</div>
                        </div>
                        <div className="text-sm">
                            <div className="text-muted-foreground">Active account</div>
                            <div className="font-medium">{user?.active_account_id || '—'}</div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Tokens are stored server-side only. Session cookies are httpOnly.
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="w-full px-3 py-2 rounded-md border border-border text-sm text-destructive hover:bg-muted/60 transition-colors duration-150 ease-out"
                        >
                            <span className="inline-flex items-center gap-2">
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </span>
                        </button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <button
                        onClick={() => setNotifications((prev) => ({ ...prev, trades: !prev.trades }))}
                        className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60 transition-colors duration-150 ease-out"
                    >
                        <span>Trade updates</span>
                        <span className="text-muted-foreground">{notifications.trades ? 'On' : 'Off'}</span>
                    </button>
                    <button
                        onClick={() => setNotifications((prev) => ({ ...prev, sessions: !prev.sessions }))}
                        className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60 transition-colors duration-150 ease-out"
                    >
                        <span>Session status</span>
                        <span className="text-muted-foreground">{notifications.sessions ? 'On' : 'Off'}</span>
                    </button>
                    <button
                        onClick={() => setNotifications((prev) => ({ ...prev, system: !prev.system }))}
                        className="w-full flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60 transition-colors duration-150 ease-out"
                    >
                        <span>System notices</span>
                        <span className="text-muted-foreground">{notifications.system ? 'On' : 'Off'}</span>
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
