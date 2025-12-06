import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    DollarSign, TrendingUp, TrendingDown, Check, X, Bell,
    RefreshCw, Activity, Clock, AlertCircle
} from 'lucide-react';
import apiClient from '../../services/apiClient';

/**
 * User Dashboard
 * ONLY shows: balance, TP/SL inputs, accept session button, status, notifications, mini stats
 * NO admin controls, analytics, logs, account lists, or strategy details
 */
const UserDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [tp, setTp] = useState(10);
    const [sl, setSl] = useState(5);
    const [saving, setSaving] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Load dashboard data
    const loadDashboard = useCallback(async () => {
        try {
            const [dashRes, notifRes] = await Promise.all([
                apiClient.get('/user/dashboard'),
                apiClient.get('/user/notifications?limit=5')
            ]);

            setDashboardData(dashRes);
            setNotifications(notifRes?.notifications || []);

            // Set TP/SL from settings
            if (dashRes?.settings) {
                setTp(dashRes.settings.default_tp || 10);
                setSl(dashRes.settings.default_sl || 5);
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            if (error.status === 401) {
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(loadDashboard, 30000);
        return () => clearInterval(interval);
    }, [loadDashboard]);

    // Save TP/SL settings
    const handleSaveTPSL = async () => {
        if (tp <= 0 || sl <= 0) {
            toast.error('TP and SL must be greater than 0');
            return;
        }

        setSaving(true);
        try {
            await apiClient.put('/user/tpsl', { tp, sl });
            toast.success('Settings saved');
            loadDashboard();
        } catch (error) {
            toast.error(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Accept trading session
    const handleAcceptSession = async (sessionId) => {
        setAccepting(true);
        try {
            await apiClient.post('/user/sessions/accept', { sessionId, tp, sl });
            toast.success('Successfully joined session!');
            loadDashboard();
        } catch (error) {
            toast.error(error.message || 'Failed to join session');
        } finally {
            setAccepting(false);
        }
    };

    // Leave session
    const handleLeaveSession = async () => {
        if (!window.confirm('Are you sure you want to leave the current session?')) {
            return;
        }

        try {
            await apiClient.post('/user/sessions/leave', {
                sessionId: dashboardData?.currentSession?.sessionId
            });
            toast.success('Left session');
            loadDashboard();
        } catch (error) {
            toast.error(error.message || 'Failed to leave session');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-green-500/20 text-green-400',
            removed_tp: 'bg-blue-500/20 text-blue-400',
            removed_sl: 'bg-red-500/20 text-red-400',
            left: 'bg-gray-500/20 text-gray-400',
            none: 'bg-gray-500/20 text-gray-400'
        };

        const labels = {
            active: 'Active',
            removed_tp: 'TP Hit ✓',
            removed_sl: 'SL Hit',
            left: 'Left',
            none: 'Not in session'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm ${styles[status] || styles.none}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-blue-500/30">
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent pointer-events-none"></div>

            <Toaster position="top-right" toastOptions={{
                style: { background: '#1a1a20', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            }} />

            <div className="relative z-10 max-w-md mx-auto p-4 space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between py-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        TraderMind
                    </h1>
                    <div className="flex items-center gap-3">
                        {dashboardData?.currentSession?.session_type === 'recovery' && (
                            <div className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold animate-pulse flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                RECOVERY
                            </div>
                        )}
                        <div className="p-2 rounded-full bg-white/5 border border-white/10 relative">
                            <Bell className="w-5 h-5 text-gray-400" />
                            {notifications.length > 0 && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0f]"></span>
                            )}
                        </div>
                    </div>
                </header>

            <div className="max-w-2xl mx-auto space-y-6">
                {/* Session Status */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Session Status</h2>
                        {getStatusBadge(dashboardData?.currentSession?.userStatus || 'none')}
                    </div>

                    {dashboardData?.currentSession ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Session</span>
                                <span className="font-medium">{dashboardData.currentSession.sessionName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Type</span>
                                <span className="capitalize">{dashboardData.currentSession.sessionType}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Current P&L</span>
                                <span className={`font-medium ${(dashboardData.currentSession.currentPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${(dashboardData.currentSession.currentPnl || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Your TP</span>
                                <span className="text-green-400">${dashboardData.currentSession.tp}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Your SL</span>
                                <span className="text-red-400">${dashboardData.currentSession.sl}</span>
                            </div>

                            {dashboardData.currentSession.userStatus === 'active' && (
                                <button
                                    onClick={handleLeaveSession}
                                    className="w-full mt-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                >
                                    Leave Session
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-4">
                            Not currently in any trading session
                        </p>
                    )}
                </div>

                {/* TP/SL Settings */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4">Take Profit / Stop Loss</h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Take Profit ($)
                            </label>
                            <div className="relative">
                                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                                <input
                                    type="number"
                                    value={tp}
                                    onChange={(e) => setTp(parseFloat(e.target.value) || 0)}
                                    min="1"
                                    step="0.5"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Stop Loss ($)
                            </label>
                            <div className="relative">
                                <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                                <input
                                    type="number"
                                    value={sl}
                                    onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
                                    min="1"
                                    step="0.5"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-red-500/50 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveTPSL}
                        disabled={saving}
                        className="w-full py-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

                {/* Available Sessions */}
                {!dashboardData?.currentSession && dashboardData?.availableSessions?.length > 0 && (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                        <h2 className="text-lg font-semibold mb-4">Available Sessions</h2>

                        <div className="space-y-3">
                            {dashboardData.availableSessions.map(session => (
                                <div
                                    key={session.id}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium">{session.name}</h3>
                                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 capitalize">
                                            {session.type}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-400 mb-3">
                                        <div>
                                            <span className="block text-xs">Min Balance</span>
                                            <span className="text-white">${session.min_balance}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs">Default TP</span>
                                            <span className="text-green-400">${session.default_tp}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs">Default SL</span>
                                            <span className="text-red-400">${session.default_sl}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAcceptSession(session.id)}
                                        disabled={accepting || session.hasJoined}
                                        className="w-full py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {session.hasJoined ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Already Joined
                                            </>
                                        ) : accepting ? (
                                            'Joining...'
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Accept Trading Session
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mini Stats */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4">Your Stats</h2>

                    <button
                        onClick={() => navigate('/user/stats')}
                        className="w-full text-center py-3 text-blue-400 hover:text-blue-300"
                    >
                        View Full Statistics →
                    </button>
                </div>

                {/* Recent Notifications */}
                {notifications.length > 0 && (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Notifications</h2>
                            <button
                                onClick={() => navigate('/user/notifications')}
                                className="text-sm text-blue-400 hover:text-blue-300"
                            >
                                View All
                            </button>
                        </div>

                        <div className="space-y-2">
                            {notifications.slice(0, 3).map(notif => (
                                <div
                                    key={notif.id}
                                    className={`p-3 rounded-lg bg-white/5 ${!notif.read ? 'border-l-2 border-blue-400' : ''}`}
                                >
                                    <p className="font-medium text-sm">{notif.title}</p>
                                    <p className="text-xs text-gray-400 mt-1">{notif.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Eligibility Notice */}
                {dashboardData?.settings?.can_join_recovery && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-400">Recovery Session Available</p>
                                <p className="text-sm text-gray-300 mt-1">
                                    You are eligible to join a recovery session. Look for recovery sessions in the available sessions list.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
    );
};

export default UserDashboard;
