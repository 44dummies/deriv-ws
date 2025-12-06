import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    DollarSign, TrendingUp, TrendingDown, Check, X, Bell,
    RefreshCw, Activity, Clock, AlertCircle, Home, Settings as SettingsIcon,
    BarChart3, User, Shield, Eye, Trash2, ArrowLeft, LogOut, Globe,
    AlertTriangle, Loader2, Save, MessageSquare, Users, Smartphone,
    Monitor, Wifi, Sparkles, Palette
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { tradingApi } from '../../trading/tradingApi';
import { TokenService } from '../../services/tokenService';
import realtimeSocket from '../../services/realtimeSocket';
import { useTheme } from '../../context/ThemeContext';

// Avatar options
const AVATARS = [
    { id: 1, emoji: '🧑‍💼', label: 'Business Pro' },
    { id: 2, emoji: '👨‍💻', label: 'Tech Trader' },
    { id: 3, emoji: '👩‍💻', label: 'Code Master' },
    { id: 4, emoji: '🦊', label: 'Clever Fox' },
    { id: 5, emoji: '🦁', label: 'Bold Lion' },
    { id: 6, emoji: '🐺', label: 'Alpha Wolf' },
    { id: 7, emoji: '🦅', label: 'Sharp Eagle' },
    { id: 8, emoji: '🐉', label: 'Dragon' },
    { id: 9, emoji: '🦈', label: 'Market Shark' },
    { id: 10, emoji: '🐂', label: 'Bull Trader' },
    { id: 11, emoji: '🎭', label: 'Mysterious' },
    { id: 12, emoji: '🎩', label: 'Top Hat' },
    { id: 13, emoji: '🕶️', label: 'Cool Shades' },
    { id: 14, emoji: '🤖', label: 'Bot Trader' },
    { id: 15, emoji: '👽', label: 'Alien' },
    { id: 16, emoji: '🥷', label: 'Ninja Trader' },
    { id: 17, emoji: '🧙‍♂️', label: 'Wizard' },
    { id: 18, emoji: '🦸', label: 'Hero' },
    { id: 19, emoji: '🧑‍🚀', label: 'Astronaut' },
    { id: 20, emoji: '👑', label: 'Royal' },
    { id: 21, emoji: '💎', label: 'Diamond Hands' },
    { id: 22, emoji: '🚀', label: 'Rocket' },
    { id: 23, emoji: '⚡', label: 'Lightning' },
    { id: 24, emoji: '🔥', label: 'Fire' },
    { id: 25, emoji: '💰', label: 'Money Maker' },
    { id: 26, emoji: '📈', label: 'Chart Master' },
    { id: 27, emoji: '🎯', label: 'Precise' },
    { id: 28, emoji: '🏆', label: 'Champion' },
    { id: 29, emoji: '🌟', label: 'Star' },
    { id: 30, emoji: '🎲', label: 'Risk Taker' }
];

// Tab configuration
const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'trading', label: 'Trading', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
];

/**
 * Consolidated User Dashboard
 * Single page with tabs: Dashboard, Trading, Settings
 */
const UserDashboard = () => {
    const navigate = useNavigate();
    const { themeId, setTheme, themes } = useTheme();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    // Dashboard state
    const [dashboardData, setDashboardData] = useState(null);
    const [tp, setTp] = useState(10);
    const [sl, setSl] = useState(5);
    const [saving, setSaving] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Trading state
    const [userInfo, setUserInfo] = useState(null);
    const [availableSessions, setAvailableSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [takeProfit, setTakeProfit] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [sessionStatus, setSessionStatus] = useState('waiting');

    // Settings state
    const [profile, setProfile] = useState({
        derivId: '',
        email: '',
        fullname: '',
        username: '',
        bio: '',
        avatarId: 1
    });
    const [privacySettings, setPrivacySettings] = useState({
        onlineVisibility: true,
        profileVisibility: 'public',
        showTradingStats: true,
        showOnLeaderboard: true,
        searchable: true
    });
    const [notificationSettings, setNotificationSettings] = useState({
        communityMentions: true,
        postReplies: true,
        newFollowers: true,
        adminAnnouncements: true,
        pushNotifications: true
    });
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const usernameTimeoutRef = useRef(null);

    // Load all data on mount
    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
            loadDashboard(),
            loadTradingData(),
            loadSettingsData()
        ]);
        setLoading(false);
    };

    // Dashboard data loading
    const loadDashboard = useCallback(async () => {
        try {
            const [dashRes, notifRes] = await Promise.all([
                apiClient.get('/user/dashboard').catch(() => null),
                apiClient.get('/user/notifications?limit=5').catch(() => ({ notifications: [] }))
            ]);

            if (dashRes) {
                setDashboardData(dashRes);
                if (dashRes?.settings) {
                    setTp(dashRes.settings.default_tp || 10);
                    setSl(dashRes.settings.default_sl || 5);
                }
            }
            setNotifications(notifRes?.notifications || []);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            if (error.status === 401) {
                navigate('/');
            }
        }
    }, [navigate]);

    // Trading data loading
    const loadTradingData = async () => {
        try {
            const derivId = sessionStorage.getItem('derivId');
            const balance = sessionStorage.getItem('balance');
            const currency = sessionStorage.getItem('currency');

            setUserInfo({
                derivId,
                balance: parseFloat(balance) || 0,
                currency: currency || 'USD'
            });

            // Get available sessions (pending status)
            const sessionsRes = await tradingApi.getSessions({ status: 'pending' }).catch(() => ({ sessions: [] }));
            setAvailableSessions(sessionsRes?.sessions || []);

            // Get running sessions for active session
            const runningRes = await tradingApi.getSessions({ status: 'running' }).catch(() => ({ sessions: [] }));
            if (runningRes?.sessions?.length > 0) {
                const session = runningRes.sessions[0];
                setActiveSession(session);
                setTakeProfit(session.default_tp || '');
                setStopLoss(session.default_sl || '');
                setSessionStatus('active');
            }
        } catch (error) {
            console.error('Failed to load trading data:', error);
        }
    };

    // Settings data loading
    const loadSettingsData = async () => {
        try {
            const profileRes = await apiClient.get('/users/me').catch(() => null);

            if (profileRes) {
                let avatarId = 1;
                if (profileRes.avatarUrl || profileRes.profile_photo) {
                    const avatarStr = profileRes.avatarUrl || profileRes.profile_photo;
                    if (avatarStr && avatarStr.startsWith('avatar:')) {
                        avatarId = parseInt(avatarStr.split(':')[1]) || 1;
                    }
                }

                setProfile({
                    derivId: profileRes.derivId || profileRes.deriv_id || '',
                    email: profileRes.email || '',
                    fullname: profileRes.fullname || profileRes.displayName || '',
                    username: profileRes.username || '',
                    bio: profileRes.bio || '',
                    avatarId
                });
            }

            const settingsRes = await apiClient.get('/users/settings').catch(() => null);

            if (settingsRes?.privacy) {
                setPrivacySettings({
                    onlineVisibility: settingsRes.privacy.showOnlineStatus ?? true,
                    profileVisibility: settingsRes.privacy.profileVisibility || 'public',
                    showTradingStats: settingsRes.privacy.showPerformance ?? true,
                    showOnLeaderboard: settingsRes.privacy.showPerformance ?? true,
                    searchable: true
                });
            }

            if (settingsRes?.notifications) {
                setNotificationSettings({
                    communityMentions: settingsRes.notifications.chatMentions ?? true,
                    postReplies: settingsRes.notifications.messages ?? true,
                    newFollowers: settingsRes.notifications.communityUpdates ?? true,
                    adminAnnouncements: settingsRes.notifications.streakReminders ?? true,
                    pushNotifications: settingsRes.notifications.pushEnabled ?? false
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    // Dashboard handlers
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

    const handleAcceptSession = async (sessionId) => {
        setAccepting(true);
        try {
            await apiClient.post('/user/sessions/accept', { sessionId, tp, sl });
            toast.success('Successfully joined session!');
            loadDashboard();
            loadTradingData();
        } catch (error) {
            toast.error(error.message || 'Failed to join session');
        } finally {
            setAccepting(false);
        }
    };

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
            loadTradingData();
        } catch (error) {
            toast.error(error.message || 'Failed to leave session');
        }
    };

    // Trading handlers
    const handleTradingAcceptSession = async (sessionId) => {
        if (!takeProfit || !stopLoss) {
            toast.error('Please set your Take Profit and Stop Loss first');
            return;
        }

        try {
            // Use the user API endpoint for accepting sessions
            await apiClient.post('/user/sessions/accept', {
                sessionId,
                tp: parseFloat(takeProfit),
                sl: parseFloat(stopLoss)
            });

            toast.success('Session accepted successfully!');
            loadTradingData();
            loadDashboard();
        } catch (error) {
            toast.error('Failed to accept session. Please try again.');
        }
    };

    const handleUpdateTPSL = async () => {
        if (!activeSession) return;

        try {
            // Use the user API endpoint for updating TP/SL
            await apiClient.put('/user/tpsl', {
                sessionId: activeSession.id,
                tp: parseFloat(takeProfit),
                sl: parseFloat(stopLoss)
            });

            toast.success('TP/SL updated successfully!');
        } catch (error) {
            toast.error('Failed to update TP/SL');
        }
    };

    // Settings handlers
    const checkUsernameAvailability = useCallback(async (username) => {
        if (!username || username.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            setUsernameAvailable(false);
            return;
        }

        setCheckingUsername(true);
        try {
            const response = await apiClient.get(`/users/check-username/${username}`);
            setUsernameAvailable(response.available);
        } catch {
            setUsernameAvailable(null);
        } finally {
            setCheckingUsername(false);
        }
    }, []);

    const handleUsernameChange = (e) => {
        const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setProfile(prev => ({ ...prev, username: newUsername }));
        setUsernameAvailable(null);

        if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);
        usernameTimeoutRef.current = setTimeout(() => {
            checkUsernameAvailability(newUsername);
        }, 500);
    };

    const handleAvatarSelect = (avatarId) => {
        setProfile(prev => ({ ...prev, avatarId }));
        setShowAvatarPicker(false);
    };

    const getAvatarEmoji = (id) => {
        const avatar = AVATARS.find(a => a.id === id);
        return avatar ? avatar.emoji : '👤';
    };

    const saveProfile = async () => {
        if (profile.username && usernameAvailable === false) {
            toast.error('Username is not available');
            return;
        }

        setSaving(true);
        try {
            await apiClient.put('/users/me', {
                username: profile.username,
                display_name: profile.fullname,
                bio: profile.bio,
                profile_photo: `avatar:${profile.avatarId}`
            });

            toast.success('Profile saved!');
        } catch (error) {
            toast.error(error.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const savePrivacySettings = async () => {
        setSaving(true);
        try {
            await apiClient.put('/users/settings', {
                privacy: {
                    showUsername: true,
                    showRealName: false,
                    showEmail: false,
                    showCountry: true,
                    showPerformance: privacySettings.showTradingStats,
                    showOnlineStatus: privacySettings.onlineVisibility,
                    profileVisibility: privacySettings.profileVisibility
                }
            });
            toast.success('Privacy settings saved!');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const saveNotificationSettings = async () => {
        setSaving(true);
        try {
            await apiClient.put('/users/settings', {
                notifications: {
                    messages: notificationSettings.postReplies,
                    chatMentions: notificationSettings.communityMentions,
                    achievements: true,
                    streakReminders: notificationSettings.adminAnnouncements,
                    communityUpdates: notificationSettings.newFollowers,
                    soundEnabled: true,
                    pushEnabled: notificationSettings.pushNotifications
                }
            });
            toast.success('Notification settings saved!');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        realtimeSocket.emit('user:offline', { derivId: profile.derivId });
        TokenService.clearTokens();
        navigate('/');
    };

    const handleThemeChange = (newThemeId) => {
        setTheme(newThemeId);
        const themeName = themes.find(t => t.id === newThemeId)?.name;
        toast.success(`Theme changed to ${themeName}`);
    };

    // UI Components
    const Toggle = ({ checked, onChange }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-12 h-7 rounded-full transition-all duration-300 ${checked
                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                : 'bg-gray-700'
                }`}
        >
            <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${checked ? 'translate-x-5' : ''
                    }`}
            />
        </button>
    );

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

    // Render Dashboard Tab
    const renderDashboardTab = () => (
        <div className="space-y-6">
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

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4">Recent Notifications</h2>
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
        </div>
    );

    // Render Trading Tab
    const renderTradingTab = () => (
        <div className="space-y-6">
            {/* Balance Display */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Account Balance</p>
                        <p className="text-3xl font-bold">{userInfo?.currency} {userInfo?.balance?.toFixed(2)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5">
                        <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                </div>
            </div>

            {/* TP/SL Inputs */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <h2 className="text-lg font-semibold mb-4">Set Your Limits</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            Take Profit (TP)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(e.target.value)}
                            placeholder="Enter TP amount"
                            disabled={!activeSession && availableSessions.length === 0}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500/50 focus:outline-none disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            Stop Loss (SL)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={stopLoss}
                            onChange={(e) => setStopLoss(e.target.value)}
                            placeholder="Enter SL amount"
                            disabled={!activeSession && availableSessions.length === 0}
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-red-500/50 focus:outline-none disabled:opacity-50"
                        />
                    </div>
                </div>
                {activeSession && (
                    <button onClick={handleUpdateTPSL} className="w-full py-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition">
                        Update TP/SL
                    </button>
                )}
            </div>

            {/* Active Session or Available Sessions */}
            {!activeSession ? (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4">Available Sessions</h2>
                    {availableSessions.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No trading sessions available</p>
                            <p className="text-sm text-gray-500">Wait for admin to create a session</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {availableSessions.map(session => (
                                <div key={session.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium">{session.session_name}</h3>
                                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                            {session.session_type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3">Strategy: {session.strategy_name}</p>
                                    <button
                                        onClick={() => handleTradingAcceptSession(session.id)}
                                        disabled={!takeProfit || !stopLoss}
                                        className="w-full py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50"
                                    >
                                        Accept Session
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4">Your Active Session</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 text-center">
                            <p className="text-2xl font-bold">{activeSession.total_trades || 0}</p>
                            <p className="text-sm text-gray-400">Total Trades</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 text-center">
                            <p className="text-2xl font-bold text-green-400">{activeSession.winning_trades || 0}</p>
                            <p className="text-sm text-gray-400">Wins</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 text-center">
                            <p className="text-2xl font-bold text-red-400">{activeSession.losing_trades || 0}</p>
                            <p className="text-sm text-gray-400">Losses</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 text-center">
                            <p className={`text-2xl font-bold ${(activeSession.net_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {userInfo?.currency} {activeSession.net_pnl?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-sm text-gray-400">P&L</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Render Settings Tab
    const renderSettingsTab = () => (
        <div className="space-y-6">
            {/* Profile Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    Profile
                </h3>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-6">
                    <button
                        onClick={() => setShowAvatarPicker(true)}
                        className="group relative"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 flex items-center justify-center text-4xl transition-all group-hover:scale-105">
                            {getAvatarEmoji(profile.avatarId)}
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                    </button>
                    <div>
                        <p className="font-medium">Click to change avatar</p>
                        <p className="text-sm text-gray-400">{AVATARS.find(a => a.id === profile.avatarId)?.label}</p>
                    </div>
                </div>

                {/* Username */}
                <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        Username
                        {checkingUsername && <Loader2 className="w-3 h-3 animate-spin" />}
                        {!checkingUsername && usernameAvailable === true && (
                            <span className="text-green-400 text-xs flex items-center gap-1">
                                <Check className="w-3 h-3" /> Available
                            </span>
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                            <span className="text-red-400 text-xs flex items-center gap-1">
                                <X className="w-3 h-3" /> Taken
                            </span>
                        )}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                        <input
                            type="text"
                            value={profile.username}
                            onChange={handleUsernameChange}
                            placeholder="your_username"
                            maxLength={20}
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Display Name */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                    <input
                        type="text"
                        value={profile.fullname}
                        onChange={(e) => setProfile(prev => ({ ...prev, fullname: e.target.value }))}
                        placeholder="Your display name"
                        maxLength={50}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none"
                    />
                </div>

                {/* Bio */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Bio</label>
                    <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell others about yourself..."
                        maxLength={500}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500/50 focus:outline-none resize-none"
                    />
                </div>

                <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 transition-all"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Profile
                </button>
            </div>

            {/* Theme Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-400" />
                    Theme
                </h3>
                <div className="grid grid-cols-4 gap-3">
                    {themes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={`relative p-3 rounded-xl border-2 transition-all ${themeId === theme.id
                                ? 'border-white/40 ring-2 ring-white/20'
                                : 'border-white/10 hover:border-white/20'
                                }`}
                            style={{ background: theme.bg }}
                        >
                            <div
                                className="w-8 h-8 rounded-full mx-auto mb-2"
                                style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}
                            />
                            <span className="text-xs block text-center">{theme.name}</span>
                            {themeId === theme.id && (
                                <div
                                    className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{ background: theme.primary }}
                                >
                                    <Check className="w-2 h-2 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Privacy Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-400" />
                    Privacy
                </h3>
                <div className="space-y-4">
                    {[
                        { key: 'onlineVisibility', label: 'Show Online Status' },
                        { key: 'showTradingStats', label: 'Show Trading Stats' },
                        { key: 'showOnLeaderboard', label: 'Show on Leaderboard' }
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                            <span>{item.label}</span>
                            <Toggle
                                checked={privacySettings[item.key]}
                                onChange={(v) => setPrivacySettings(p => ({ ...p, [item.key]: v }))}
                            />
                        </div>
                    ))}
                </div>
                <button
                    onClick={savePrivacySettings}
                    disabled={saving}
                    className="w-full mt-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                >
                    Save Privacy Settings
                </button>
            </div>

            {/* Notifications Section */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-400" />
                    Notifications
                </h3>
                <div className="space-y-4">
                    {[
                        { key: 'communityMentions', label: 'Community Mentions' },
                        { key: 'postReplies', label: 'Post Replies' },
                        { key: 'adminAnnouncements', label: 'Announcements' },
                        { key: 'pushNotifications', label: 'Push Notifications' }
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                            <span>{item.label}</span>
                            <Toggle
                                checked={notificationSettings[item.key]}
                                onChange={(v) => setNotificationSettings(p => ({ ...p, [item.key]: v }))}
                            />
                        </div>
                    ))}
                </div>
                <button
                    onClick={saveNotificationSettings}
                    disabled={saving}
                    className="w-full mt-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                >
                    Save Notification Settings
                </button>
            </div>

            {/* Logout */}
            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition"
                >
                    <LogOut className="w-5 h-5" /> Sign Out
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-purple-400" />
                    <p className="text-gray-400">Loading your dashboard...</p>
                </div>
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

            <div className="relative z-10">
                {/* Header */}
                <header className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50 bg-[#0a0a0f]/80">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
                            <button
                                onClick={() => loadAllData()}
                                className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
                            >
                                <RefreshCw className="w-5 h-5 text-gray-400" />
                            </button>
                            <div className="p-2 rounded-full bg-white/5 border border-white/10 relative">
                                <Bell className="w-5 h-5 text-gray-400" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0a0f]"></span>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex gap-2 p-1.5 rounded-xl bg-white/5 border border-white/5">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <main className="max-w-4xl mx-auto px-4 pb-8">
                    {activeTab === 'dashboard' && renderDashboardTab()}
                    {activeTab === 'trading' && renderTradingTab()}
                    {activeTab === 'settings' && renderSettingsTab()}
                </main>
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowAvatarPicker(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#12121a] rounded-3xl p-8 border border-white/10"
                    >
                        <h3 className="text-2xl font-bold text-center mb-2">Choose Your Avatar</h3>
                        <p className="text-gray-400 text-center mb-8">Select an avatar that represents you</p>

                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                            {AVATARS.map((avatar) => (
                                <button
                                    key={avatar.id}
                                    onClick={() => handleAvatarSelect(avatar.id)}
                                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105 ${profile.avatarId === avatar.id
                                        ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500'
                                        : 'bg-white/5 border border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <span className="text-3xl">{avatar.emoji}</span>
                                    {profile.avatarId === avatar.id && (
                                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowAvatarPicker(false)}
                            className="w-full mt-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
