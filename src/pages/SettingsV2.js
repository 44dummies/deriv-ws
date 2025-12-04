/**
 * Settings Page - Deriv Trading Platform
 * Enterprise-grade settings control center
 * 
 * Auth: Deriv OAuth ONLY (no email/password)
 * Database: Supabase
 * Realtime: Supabase + WebSocket
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Bell, TrendingUp, Eye, Trash2, Camera, Check, X,
  LogOut, Smartphone, Monitor, Globe, Volume2, VolumeX, AlertTriangle,
  ChevronRight, Loader2, Save, Settings as SettingsIcon, MessageSquare,
  Users, BarChart3, Zap, Clock, Activity, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { TokenService } from '../services/tokenService';
import { apiClient } from '../services/apiClient';
import { realtimeSocket } from '../services/realtimeSocket';
import './SettingsV2.css';

// =============================================
// CONFIGURATION
// =============================================
const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Your identity' },
  { id: 'account', label: 'Account', icon: Shield, description: 'Deriv account & sessions' },
  { id: 'privacy', label: 'Privacy', icon: Eye, description: 'Visibility controls' },
  { id: 'trading', label: 'Trading', icon: TrendingUp, description: 'Trade preferences' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert settings' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Account actions' }
];

const MARKETS = [
  { value: 'boom_crash', label: 'Boom & Crash', icon: '📈' },
  { value: 'binary', label: 'Binary Options', icon: '⚡' },
  { value: 'forex', label: 'Forex', icon: '💱' },
  { value: 'indices', label: 'Indices', icon: '📊' },
  { value: 'crypto', label: 'Crypto', icon: '₿' }
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low Risk', color: '#22c55e', desc: 'Conservative' },
  { value: 'medium', label: 'Medium Risk', color: '#eab308', desc: 'Balanced' },
  { value: 'high', label: 'High Risk', color: '#ef4444', desc: 'Aggressive' }
];

// =============================================
// MAIN COMPONENT
// =============================================
export default function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({
    derivId: '',
    email: '',
    fullname: '',
    username: '',
    bio: '',
    avatarUrl: null
  });
  
  // Settings States
  const [privacySettings, setPrivacySettings] = useState({
    onlineVisibility: true,
    profileVisibility: 'public',
    allowMessagesFrom: 'everyone',
    allowTagsFrom: 'everyone',
    showTradingStats: true,
    showOnLeaderboard: true,
    searchable: true
  });
  
  const [tradingPrefs, setTradingPrefs] = useState({
    defaultMarket: 'boom_crash',
    favoriteMarkets: ['boom_crash'],
    defaultStakeAmount: 10,
    maxStakeAmount: 1000,
    riskLevel: 'medium',
    stopLossEnabled: true,
    defaultStopLossPercent: 5,
    takeProfitEnabled: true,
    defaultTakeProfitPercent: 10,
    soundEnabled: true,
    soundTradeOpen: true,
    soundTradeWin: true,
    soundTradeLoss: true,
    soundVolume: 70
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    tradeAlerts: true,
    communityMentions: true,
    postReplies: true,
    newFollowers: true,
    adminAnnouncements: true,
    pushNotifications: true
  });
  
  // Session States
  const [sessions, setSessions] = useState([]);
  const [currentSocketId, setCurrentSocketId] = useState(null);
  
  // UI States
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const fileInputRef = useRef(null);
  const usernameTimeoutRef = useRef(null);

  // =============================================
  // LOAD DATA ON MOUNT
  // =============================================
  useEffect(() => {
    loadAllData();
    
    // Get current socket ID
    if (realtimeSocket.socket?.id) {
      setCurrentSocketId(realtimeSocket.socket.id);
    }
    
    // Listen for real-time updates
    realtimeSocket.on('settings:updated', handleSettingsUpdate);
    realtimeSocket.on('profile:updated', handleProfileUpdate);
    realtimeSocket.on('session:terminated', handleSessionTerminated);
    
    return () => {
      realtimeSocket.off('settings:updated', handleSettingsUpdate);
      realtimeSocket.off('profile:updated', handleProfileUpdate);
      realtimeSocket.off('session:terminated', handleSessionTerminated);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [profileRes, settingsRes, tradingRes, sessionsRes] = await Promise.all([
        apiClient.get('/users/me').catch(() => null),
        apiClient.get('/settings').catch(() => ({ data: null })),
        apiClient.get('/settings/trading').catch(() => ({ data: null })),
        apiClient.get('/settings/sessions').catch(() => ({ data: [] }))
      ]);

      // Set profile data
      if (profileRes) {
        setProfile({
          derivId: profileRes.deriv_id || profileRes.derivId || '',
          email: profileRes.email || '',
          fullname: profileRes.fullname || profileRes.display_name || '',
          username: profileRes.username || '',
          bio: profileRes.bio || '',
          avatarUrl: profileRes.profile_photo || profileRes.avatarUrl || null
        });
      }

      // Set privacy & notification settings
      if (settingsRes?.data) {
        setPrivacySettings({
          onlineVisibility: settingsRes.data.online_visibility ?? true,
          profileVisibility: settingsRes.data.profile_visibility || 'public',
          allowMessagesFrom: settingsRes.data.allow_messages_from || 'everyone',
          allowTagsFrom: settingsRes.data.allow_tags_from || 'everyone',
          showTradingStats: settingsRes.data.show_trading_stats ?? true,
          showOnLeaderboard: settingsRes.data.show_on_leaderboard ?? true,
          searchable: settingsRes.data.searchable ?? true
        });
        
        setNotificationSettings({
          tradeAlerts: settingsRes.data.notify_trade_alerts ?? true,
          communityMentions: settingsRes.data.notify_community_mentions ?? true,
          postReplies: settingsRes.data.notify_post_replies ?? true,
          newFollowers: settingsRes.data.notify_new_followers ?? true,
          adminAnnouncements: settingsRes.data.notify_admin_announcements ?? true,
          pushNotifications: settingsRes.data.push_notifications ?? true
        });
      }

      // Set trading preferences
      if (tradingRes?.data) {
        setTradingPrefs({
          defaultMarket: tradingRes.data.default_market || 'boom_crash',
          favoriteMarkets: tradingRes.data.favorite_markets || ['boom_crash'],
          defaultStakeAmount: tradingRes.data.default_stake_amount || 10,
          maxStakeAmount: tradingRes.data.max_stake_amount || 1000,
          riskLevel: tradingRes.data.risk_level || 'medium',
          stopLossEnabled: tradingRes.data.stop_loss_enabled ?? true,
          defaultStopLossPercent: tradingRes.data.default_stop_loss_percent || 5,
          takeProfitEnabled: tradingRes.data.take_profit_enabled ?? true,
          defaultTakeProfitPercent: tradingRes.data.default_take_profit_percent || 10,
          soundEnabled: tradingRes.data.sound_enabled ?? true,
          soundTradeOpen: tradingRes.data.sound_trade_open ?? true,
          soundTradeWin: tradingRes.data.sound_trade_win ?? true,
          soundTradeLoss: tradingRes.data.sound_trade_loss ?? true,
          soundVolume: tradingRes.data.sound_volume || 70
        });
      }

      // Set sessions
      if (Array.isArray(sessionsRes?.data)) {
        setSessions(sessionsRes.data);
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // REAL-TIME HANDLERS
  // =============================================
  const handleSettingsUpdate = (data) => {
    if (data.type === 'privacy') {
      setPrivacySettings(prev => ({ ...prev, ...data.settings }));
    } else if (data.type === 'notifications') {
      setNotificationSettings(prev => ({ ...prev, ...data.settings }));
    } else if (data.type === 'trading') {
      setTradingPrefs(prev => ({ ...prev, ...data.settings }));
    }
    toast.success('Settings synced');
  };

  const handleProfileUpdate = (data) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  const handleSessionTerminated = (data) => {
    if (data.all || data.sessionId === currentSocketId) {
      toast.error('Session terminated');
      handleLogout();
    } else {
      setSessions(prev => prev.filter(s => s.socket_id !== data.sessionId));
    }
  };

  // =============================================
  // USERNAME VALIDATION
  // =============================================
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

  // =============================================
  // AVATAR UPLOAD
  // =============================================
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Please upload JPG, PNG, or WebP');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.upload('/users/me/avatar', formData);
      
      if (response.avatarUrl) {
        setProfile(prev => ({ ...prev, avatarUrl: response.avatarUrl }));
        
        // Emit WebSocket event for global sync
        realtimeSocket.emit('profile:avatar:update', {
          derivId: profile.derivId,
          avatarUrl: response.avatarUrl
        });
        
        toast.success('Avatar updated');
      }
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // =============================================
  // SAVE HANDLERS
  // =============================================
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
        bio: profile.bio
      });

      // Emit global profile update
      realtimeSocket.emit('profile:update', {
        derivId: profile.derivId,
        username: profile.username,
        displayName: profile.fullname,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl
      });

      toast.success('Profile saved');
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const savePrivacySettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/privacy', {
        online_visibility: privacySettings.onlineVisibility,
        profile_visibility: privacySettings.profileVisibility,
        allow_messages_from: privacySettings.allowMessagesFrom,
        allow_tags_from: privacySettings.allowTagsFrom,
        show_trading_stats: privacySettings.showTradingStats,
        show_on_leaderboard: privacySettings.showOnLeaderboard,
        searchable: privacySettings.searchable
      });

      realtimeSocket.emit('settings:update', { type: 'privacy', settings: privacySettings });
      toast.success('Privacy settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveTradingPrefs = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/trading', {
        default_market: tradingPrefs.defaultMarket,
        favorite_markets: tradingPrefs.favoriteMarkets,
        default_stake_amount: tradingPrefs.defaultStakeAmount,
        max_stake_amount: tradingPrefs.maxStakeAmount,
        risk_level: tradingPrefs.riskLevel,
        stop_loss_enabled: tradingPrefs.stopLossEnabled,
        default_stop_loss_percent: tradingPrefs.defaultStopLossPercent,
        take_profit_enabled: tradingPrefs.takeProfitEnabled,
        default_take_profit_percent: tradingPrefs.defaultTakeProfitPercent,
        sound_enabled: tradingPrefs.soundEnabled,
        sound_trade_open: tradingPrefs.soundTradeOpen,
        sound_trade_win: tradingPrefs.soundTradeWin,
        sound_trade_loss: tradingPrefs.soundTradeLoss,
        sound_volume: tradingPrefs.soundVolume
      });

      realtimeSocket.emit('settings:update', { type: 'trading', settings: tradingPrefs });
      toast.success('Trading preferences saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/notifications', {
        notify_trade_alerts: notificationSettings.tradeAlerts,
        notify_community_mentions: notificationSettings.communityMentions,
        notify_post_replies: notificationSettings.postReplies,
        notify_new_followers: notificationSettings.newFollowers,
        notify_admin_announcements: notificationSettings.adminAnnouncements,
        push_notifications: notificationSettings.pushNotifications
      });

      toast.success('Notification settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // =============================================
  // SESSION MANAGEMENT
  // =============================================
  const terminateSession = async (sessionId) => {
    try {
      await apiClient.delete(`/settings/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId && s.socket_id !== sessionId));
      
      realtimeSocket.emit('session:terminate', { sessionId });
      toast.success('Session terminated');
    } catch {
      toast.error('Failed to terminate session');
    }
  };

  const terminateAllOtherSessions = async () => {
    try {
      await apiClient.delete('/settings/sessions');
      setSessions(prev => prev.filter(s => s.socket_id === currentSocketId));
      
      realtimeSocket.emit('session:terminate', { all: true, except: currentSocketId });
      toast.success('All other sessions terminated');
    } catch {
      toast.error('Failed to terminate sessions');
    }
  };

  const handleLogout = () => {
    realtimeSocket.emit('user:offline', { derivId: profile.derivId });
    TokenService.clearTokens();
    navigate('/');
  };

  // =============================================
  // DANGER ZONE
  // =============================================
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      await apiClient.delete('/users/me');
      toast.success('Account deleted');
      TokenService.clearTokens();
      navigate('/');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  // =============================================
  // SKELETON LOADER
  // =============================================
  const SkeletonLoader = () => (
    <div className="settings-skeleton">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line title"></div>
          <div className="skeleton-line text"></div>
          <div className="skeleton-line text short"></div>
        </div>
      ))}
    </div>
  );

  // =============================================
  // SECTION RENDERERS
  // =============================================
  
  // PROFILE SECTION
  const renderProfileSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><User size={24} /> Profile Settings</h2>
        <p>Your identity across the platform</p>
      </div>

      <div className="settings-card">
        {/* Avatar */}
        <div className="avatar-section">
          <div 
            className={`avatar-container ${avatarUploading ? 'uploading' : ''}`}
            onClick={handleAvatarClick}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder"><User size={48} /></div>
            )}
            <div className="avatar-overlay">
              {avatarUploading ? <Loader2 size={24} className="spin" /> : <Camera size={24} />}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            hidden
          />
          <div className="avatar-info">
            <h3>Profile Photo</h3>
            <p>Click to upload • JPG, PNG, WebP • Max 2MB</p>
          </div>
        </div>

        {/* Username */}
        <div className="form-group">
          <label>
            Username
            {checkingUsername && <Loader2 size={14} className="spin inline" />}
            {!checkingUsername && usernameAvailable === true && (
              <span className="badge success"><Check size={12} /> Available</span>
            )}
            {!checkingUsername && usernameAvailable === false && (
              <span className="badge error"><X size={12} /> Taken</span>
            )}
          </label>
          <div className="input-prefix-group">
            <span className="prefix">@</span>
            <input
              type="text"
              value={profile.username}
              onChange={handleUsernameChange}
              placeholder="your_username"
              maxLength={20}
            />
          </div>
          <span className="hint">3-20 characters, letters, numbers, underscores</span>
        </div>

        {/* Display Name */}
        <div className="form-group">
          <label>Display Name</label>
          <input
            type="text"
            value={profile.fullname}
            onChange={(e) => setProfile(prev => ({ ...prev, fullname: e.target.value }))}
            placeholder="Your display name"
            maxLength={50}
          />
        </div>

        {/* Bio */}
        <div className="form-group">
          <label>Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell others about yourself..."
            maxLength={500}
            rows={4}
          />
          <span className="hint">{profile.bio?.length || 0}/500</span>
        </div>

        <button className="btn-save" onClick={saveProfile} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Profile
        </button>
      </div>
    </div>
  );

  // ACCOUNT SECTION (Deriv-based)
  const renderAccountSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Shield size={24} /> Account & Sessions</h2>
        <p>Your Deriv account and active sessions</p>
      </div>

      {/* Deriv Account Info */}
      <div className="settings-card">
        <h3>Deriv Account</h3>
        <div className="account-info">
          <div className="info-row">
            <span className="label">Account ID</span>
            <span className="value deriv-id">{profile.derivId || 'Not connected'}</span>
          </div>
          <div className="info-row">
            <span className="label">Email</span>
            <span className="value">{profile.email || 'Not available'}</span>
          </div>
          <div className="info-row">
            <span className="label">Full Name</span>
            <span className="value">{profile.fullname || 'Not set'}</span>
          </div>
        </div>
        <p className="info-note">
          <Shield size={14} /> Authentication is handled by Deriv. No password management required.
        </p>
      </div>

      {/* Active Sessions */}
      <div className="settings-card">
        <h3>Active Sessions</h3>
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <Monitor size={32} />
              <p>No active sessions</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className={`session-item ${session.socket_id === currentSocketId ? 'current' : ''}`}>
                <div className="session-icon">
                  {session.device_type === 'mobile' ? <Smartphone size={24} /> : <Monitor size={24} />}
                </div>
                <div className="session-details">
                  <span className="device">{session.device_name || session.browser || 'Unknown Device'}</span>
                  <span className="meta">
                    {session.location_city && `${session.location_city} • `}
                    {session.os}
                  </span>
                  <span className="time">
                    <Clock size={12} />
                    {session.socket_id === currentSocketId 
                      ? 'Current session' 
                      : `Last seen: ${new Date(session.last_seen).toLocaleString()}`
                    }
                  </span>
                </div>
                {session.socket_id === currentSocketId ? (
                  <span className="current-badge"><Wifi size={14} /> Active</span>
                ) : (
                  <button className="btn-terminate" onClick={() => terminateSession(session.id)}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        
        {sessions.length > 1 && (
          <button className="btn-danger-outline" onClick={terminateAllOtherSessions}>
            <LogOut size={18} /> Terminate All Other Sessions
          </button>
        )}
      </div>

      {/* Logout */}
      <div className="settings-card">
        <h3>Sign Out</h3>
        <button className="btn-danger" onClick={handleLogout}>
          <LogOut size={18} /> Logout from this device
        </button>
      </div>
    </div>
  );

  // PRIVACY SECTION
  const renderPrivacySection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Eye size={24} /> Privacy Settings</h2>
        <p>Control who can see you and interact with you</p>
      </div>

      <div className="settings-card">
        <h3>Visibility</h3>
        <div className="toggle-list">
          <ToggleItem
            icon={<Globe size={20} />}
            label="Online Status"
            description="Show when you're online"
            checked={privacySettings.onlineVisibility}
            onChange={(v) => setPrivacySettings(p => ({ ...p, onlineVisibility: v }))}
          />
          <ToggleItem
            icon={<BarChart3 size={20} />}
            label="Trading Stats"
            description="Display your performance"
            checked={privacySettings.showTradingStats}
            onChange={(v) => setPrivacySettings(p => ({ ...p, showTradingStats: v }))}
          />
          <ToggleItem
            icon={<Activity size={20} />}
            label="Leaderboard"
            description="Appear on rankings"
            checked={privacySettings.showOnLeaderboard}
            onChange={(v) => setPrivacySettings(p => ({ ...p, showOnLeaderboard: v }))}
          />
          <ToggleItem
            icon={<Users size={20} />}
            label="Searchable"
            description="Allow others to find you"
            checked={privacySettings.searchable}
            onChange={(v) => setPrivacySettings(p => ({ ...p, searchable: v }))}
          />
        </div>
      </div>

      <div className="settings-card">
        <h3>Interactions</h3>
        <div className="form-group">
          <label>Profile Visibility</label>
          <select
            value={privacySettings.profileVisibility}
            onChange={(e) => setPrivacySettings(p => ({ ...p, profileVisibility: e.target.value }))}
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>
        <div className="form-group">
          <label>Who can message you</label>
          <select
            value={privacySettings.allowMessagesFrom}
            onChange={(e) => setPrivacySettings(p => ({ ...p, allowMessagesFrom: e.target.value }))}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">No One</option>
          </select>
        </div>
        <div className="form-group">
          <label>Who can tag you</label>
          <select
            value={privacySettings.allowTagsFrom}
            onChange={(e) => setPrivacySettings(p => ({ ...p, allowTagsFrom: e.target.value }))}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">No One</option>
          </select>
        </div>

        <button className="btn-save" onClick={savePrivacySettings} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Privacy Settings
        </button>
      </div>
    </div>
  );

  // TRADING SECTION
  const renderTradingSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><TrendingUp size={24} /> Trading Preferences</h2>
        <p>Customize your trading experience</p>
      </div>

      <div className="settings-card">
        <h3>Default Market</h3>
        <div className="market-grid">
          {MARKETS.map((m) => (
            <button
              key={m.value}
              className={`market-btn ${tradingPrefs.defaultMarket === m.value ? 'active' : ''}`}
              onClick={() => setTradingPrefs(p => ({ ...p, defaultMarket: m.value }))}
            >
              <span className="icon">{m.icon}</span>
              <span className="label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h3>Risk Level</h3>
        <div className="risk-grid">
          {RISK_LEVELS.map((r) => (
            <button
              key={r.value}
              className={`risk-btn ${tradingPrefs.riskLevel === r.value ? 'active' : ''}`}
              onClick={() => setTradingPrefs(p => ({ ...p, riskLevel: r.value }))}
              style={{ '--risk-color': r.color }}
            >
              <span className="indicator"></span>
              <span className="label">{r.label}</span>
              <span className="desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h3>Stake Amounts</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Default Stake ($)</label>
            <input
              type="number"
              value={tradingPrefs.defaultStakeAmount}
              onChange={(e) => setTradingPrefs(p => ({ ...p, defaultStakeAmount: +e.target.value || 0 }))}
              min={1}
            />
          </div>
          <div className="form-group">
            <label>Max Stake ($)</label>
            <input
              type="number"
              value={tradingPrefs.maxStakeAmount}
              onChange={(e) => setTradingPrefs(p => ({ ...p, maxStakeAmount: +e.target.value || 0 }))}
              min={1}
            />
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Risk Management</h3>
        <div className="toggle-list">
          <ToggleItem
            icon={<AlertTriangle size={20} />}
            label="Stop Loss"
            description="Limit losses automatically"
            checked={tradingPrefs.stopLossEnabled}
            onChange={(v) => setTradingPrefs(p => ({ ...p, stopLossEnabled: v }))}
          />
          {tradingPrefs.stopLossEnabled && (
            <div className="form-group nested">
              <label>Default Stop Loss (%)</label>
              <input
                type="number"
                value={tradingPrefs.defaultStopLossPercent}
                onChange={(e) => setTradingPrefs(p => ({ ...p, defaultStopLossPercent: +e.target.value || 0 }))}
                min={1}
                max={50}
              />
            </div>
          )}
          <ToggleItem
            icon={<Zap size={20} />}
            label="Take Profit"
            description="Secure gains automatically"
            checked={tradingPrefs.takeProfitEnabled}
            onChange={(v) => setTradingPrefs(p => ({ ...p, takeProfitEnabled: v }))}
          />
          {tradingPrefs.takeProfitEnabled && (
            <div className="form-group nested">
              <label>Default Take Profit (%)</label>
              <input
                type="number"
                value={tradingPrefs.defaultTakeProfitPercent}
                onChange={(e) => setTradingPrefs(p => ({ ...p, defaultTakeProfitPercent: +e.target.value || 0 }))}
                min={1}
                max={100}
              />
            </div>
          )}
        </div>
      </div>

      <div className="settings-card">
        <h3>Sound Effects</h3>
        <div className="toggle-list">
          <ToggleItem
            icon={tradingPrefs.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            label="Sound Effects"
            description="Audio feedback for trades"
            checked={tradingPrefs.soundEnabled}
            onChange={(v) => setTradingPrefs(p => ({ ...p, soundEnabled: v }))}
          />
          {tradingPrefs.soundEnabled && (
            <>
              <ToggleItem
                label="Trade Open"
                checked={tradingPrefs.soundTradeOpen}
                onChange={(v) => setTradingPrefs(p => ({ ...p, soundTradeOpen: v }))}
                small
              />
              <ToggleItem
                label="Trade Win"
                checked={tradingPrefs.soundTradeWin}
                onChange={(v) => setTradingPrefs(p => ({ ...p, soundTradeWin: v }))}
                small
              />
              <ToggleItem
                label="Trade Loss"
                checked={tradingPrefs.soundTradeLoss}
                onChange={(v) => setTradingPrefs(p => ({ ...p, soundTradeLoss: v }))}
                small
              />
              <div className="form-group nested">
                <label>Volume: {tradingPrefs.soundVolume}%</label>
                <input
                  type="range"
                  value={tradingPrefs.soundVolume}
                  onChange={(e) => setTradingPrefs(p => ({ ...p, soundVolume: +e.target.value }))}
                  min={0}
                  max={100}
                  className="slider"
                />
              </div>
            </>
          )}
        </div>

        <button className="btn-save" onClick={saveTradingPrefs} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Trading Preferences
        </button>
      </div>
    </div>
  );

  // NOTIFICATIONS SECTION
  const renderNotificationsSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Bell size={24} /> Notifications</h2>
        <p>Control your alerts</p>
      </div>

      <div className="settings-card">
        <h3>Trading</h3>
        <div className="toggle-list">
          <ToggleItem
            icon={<TrendingUp size={20} />}
            label="Trade Alerts"
            description="Open, close, P&L updates"
            checked={notificationSettings.tradeAlerts}
            onChange={(v) => setNotificationSettings(p => ({ ...p, tradeAlerts: v }))}
          />
        </div>
      </div>

      <div className="settings-card">
        <h3>Community</h3>
        <div className="toggle-list">
          <ToggleItem
            icon={<MessageSquare size={20} />}
            label="Mentions"
            description="When tagged in posts"
            checked={notificationSettings.communityMentions}
            onChange={(v) => setNotificationSettings(p => ({ ...p, communityMentions: v }))}
          />
          <ToggleItem
            icon={<MessageSquare size={20} />}
            label="Replies"
            description="Responses to your posts"
            checked={notificationSettings.postReplies}
            onChange={(v) => setNotificationSettings(p => ({ ...p, postReplies: v }))}
          />
          <ToggleItem
            icon={<Users size={20} />}
            label="New Followers"
            description="When someone follows you"
            checked={notificationSettings.newFollowers}
            onChange={(v) => setNotificationSettings(p => ({ ...p, newFollowers: v }))}
          />
        </div>
      </div>

      <div className="settings-card">
        <h3>System</h3>
        <div className="toggle-list">
          <ToggleItem
            icon={<Bell size={20} />}
            label="Announcements"
            description="Platform updates"
            checked={notificationSettings.adminAnnouncements}
            onChange={(v) => setNotificationSettings(p => ({ ...p, adminAnnouncements: v }))}
          />
          <ToggleItem
            icon={<Smartphone size={20} />}
            label="Push Notifications"
            description="Browser/app alerts"
            checked={notificationSettings.pushNotifications}
            onChange={(v) => setNotificationSettings(p => ({ ...p, pushNotifications: v }))}
          />
        </div>

        <button className="btn-save" onClick={saveNotificationSettings} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Notification Settings
        </button>
      </div>
    </div>
  );

  // DANGER ZONE
  const renderDangerSection = () => (
    <div className="settings-section">
      <div className="section-header danger">
        <h2><AlertTriangle size={24} /> Danger Zone</h2>
        <p>Irreversible actions</p>
      </div>

      <div className="settings-card danger-card">
        <h3>Clear Data</h3>
        <div className="danger-actions">
          <button className="btn-danger-outline" onClick={() => toast.info('Coming soon')}>
            <Trash2 size={18} /> Clear Community Posts
          </button>
          <button className="btn-danger-outline" onClick={() => toast.info('Coming soon')}>
            <Trash2 size={18} /> Clear Chat History
          </button>
          <button className="btn-danger-outline" onClick={() => toast.info('Coming soon')}>
            <RefreshCw size={18} /> Reset Trading Preferences
          </button>
        </div>
      </div>

      <div className="settings-card danger-card">
        <h3>Account</h3>
        <button className="btn-danger" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
        <button className="btn-danger critical" onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={18} /> Delete Account Permanently
        </button>
        <p className="warning-text">
          <AlertTriangle size={14} />
          Deleting your account is permanent. All data will be lost forever.
        </p>
      </div>
    </div>
  );

  // =============================================
  // TOGGLE COMPONENT
  // =============================================
  const ToggleItem = ({ icon, label, description, checked, onChange, small }) => (
    <div className={`toggle-item ${small ? 'small' : ''}`}>
      <div className="toggle-info">
        {icon}
        <div>
          <span>{label}</span>
          {description && <p>{description}</p>}
        </div>
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );

  // =============================================
  // MAIN RENDER
  // =============================================
  const renderActiveSection = () => {
    if (loading) return <SkeletonLoader />;
    
    switch (activeSection) {
      case 'profile': return renderProfileSection();
      case 'account': return renderAccountSection();
      case 'privacy': return renderPrivacySection();
      case 'trading': return renderTradingSection();
      case 'notifications': return renderNotificationsSection();
      case 'danger': return renderDangerSection();
      default: return renderProfileSection();
    }
  };

  return (
    <div className="settings-page">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />

      <header className="settings-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h1><SettingsIcon size={28} /> Settings</h1>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`nav-item ${activeSection === s.id ? 'active' : ''} ${s.id === 'danger' ? 'danger' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <s.icon size={20} />
              <div>
                <span>{s.label}</span>
                <p>{s.description}</p>
              </div>
              <ChevronRight size={16} />
            </button>
          ))}
        </nav>

        <main className="settings-content">
          {renderActiveSection()}
        </main>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal danger-modal" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={48} className="danger-icon" />
            <h2>Delete Account</h2>
            <p>This is permanent and cannot be undone. All your data will be deleted:</p>
            <ul>
              <li>Profile & settings</li>
              <li>Community posts & comments</li>
              <li>Trading history</li>
              <li>Chat messages</li>
            </ul>
            <div className="form-group">
              <label>Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button 
                className="btn-danger critical"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
