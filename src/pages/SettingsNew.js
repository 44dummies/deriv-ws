/**
 * Settings Page - Enterprise Trading Platform
 * Full-featured settings control center with real-time sync
 * 
 * Features:
 * - Profile Management (username, avatar, bio)
 * - Privacy Controls
 * - Security Settings (2FA, sessions, trusted devices)
 * - Trading Preferences
 * - Notification Settings
 * - Danger Zone (account deletion)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Bell, TrendingUp, Lock, Trash2, Camera, Check, X,
  Eye, EyeOff, LogOut, Smartphone, Monitor, Globe, Mail, Key,
  Volume2, VolumeX, AlertTriangle, ChevronRight, Loader2, Upload,
  Settings as SettingsIcon, MessageSquare, Users, BarChart3, Zap,
  RefreshCw, Clock, MapPin, Activity, Fingerprint, Save, Edit3
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { TokenService } from '../services/tokenService';
import { apiClient } from '../services/apiClient';
import { realtimeSocket } from '../services/websocketService';
import './Settings.css';

// =============================================
// SETTINGS SECTIONS CONFIGURATION
// =============================================
const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Manage your identity' },
  { id: 'privacy', label: 'Privacy', icon: Eye, description: 'Control your visibility' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Protect your account' },
  { id: 'trading', label: 'Trading', icon: TrendingUp, description: 'Trading preferences' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert settings' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Account actions' }
];

const MARKETS = [
  { value: 'boom_crash', label: 'Boom & Crash', icon: '📈' },
  { value: 'forex', label: 'Forex', icon: '💱' },
  { value: 'indices', label: 'Indices', icon: '📊' },
  { value: 'commodities', label: 'Commodities', icon: '🛢️' },
  { value: 'crypto', label: 'Crypto', icon: '₿' }
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: '#22c55e', description: 'Conservative trading' },
  { value: 'medium', label: 'Medium', color: '#eab308', description: 'Balanced approach' },
  { value: 'high', label: 'High', color: '#f97316', description: 'Aggressive growth' },
  { value: 'aggressive', label: 'Aggressive', color: '#ef4444', description: 'Maximum risk' }
];

// =============================================
// MAIN SETTINGS COMPONENT
// =============================================
export default function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: null,
    email: '',
    derivId: ''
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
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: 30,
    trustedDevices: [],
    activeSessions: []
  });
  
  const [tradingPrefs, setTradingPrefs] = useState({
    defaultMarket: 'boom_crash',
    favoriteMarkets: ['boom_crash'],
    defaultTradeAmount: 10,
    maxTradeAmount: 1000,
    riskLevel: 'medium',
    stopLossEnabled: true,
    defaultStopLossPercent: 5,
    takeProfitEnabled: true,
    defaultTakeProfitPercent: 10,
    maxOpenTrades: 5,
    soundEnabled: true,
    soundTradeOpen: true,
    soundTradeWin: true,
    soundTradeLoss: true,
    soundVolume: 70
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    tradeAlerts: true,
    communityMentions: true,
    commentNotifications: true,
    followerNotifications: true,
    adminAnnouncements: true
  });
  
  // UI States
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const fileInputRef = useRef(null);
  const usernameTimeoutRef = useRef(null);

  // =============================================
  // DATA LOADING
  // =============================================
  useEffect(() => {
    loadAllSettings();
    
    // Listen for real-time updates
    realtimeSocket.on('settings:updated', handleSettingsUpdate);
    realtimeSocket.on('profile:updated', handleProfileUpdate);
    
    return () => {
      realtimeSocket.off('settings:updated', handleSettingsUpdate);
      realtimeSocket.off('profile:updated', handleProfileUpdate);
    };
  }, []);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes, tradingRes, sessionsRes] = await Promise.all([
        apiClient.get('/users/me'),
        apiClient.get('/settings').catch(() => ({ data: null })),
        apiClient.get('/settings/trading').catch(() => ({ data: null })),
        apiClient.get('/settings/sessions').catch(() => ({ data: [] }))
      ]);

      if (profileRes) {
        setProfile({
          username: profileRes.username || '',
          displayName: profileRes.display_name || profileRes.displayName || profileRes.fullname || '',
          bio: profileRes.bio || '',
          avatarUrl: profileRes.profile_photo || profileRes.avatarUrl || null,
          email: profileRes.email || '',
          derivId: profileRes.deriv_id || profileRes.derivId || ''
        });
      }

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
          emailNotifications: settingsRes.data.email_notifications ?? true,
          pushNotifications: settingsRes.data.push_notifications ?? true,
          tradeAlerts: settingsRes.data.trade_alerts ?? true,
          communityMentions: settingsRes.data.community_mentions ?? true,
          commentNotifications: settingsRes.data.comment_notifications ?? true,
          followerNotifications: settingsRes.data.follower_notifications ?? true,
          adminAnnouncements: settingsRes.data.admin_announcements ?? true
        });
        
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: settingsRes.data.two_factor_enabled ?? false,
          loginAlerts: settingsRes.data.login_alerts ?? true,
          sessionTimeout: settingsRes.data.session_timeout || 30
        }));
      }

      if (tradingRes?.data) {
        setTradingPrefs({
          defaultMarket: tradingRes.data.default_market || 'boom_crash',
          favoriteMarkets: tradingRes.data.favorite_markets || ['boom_crash'],
          defaultTradeAmount: tradingRes.data.default_trade_amount || 10,
          maxTradeAmount: tradingRes.data.max_trade_amount || 1000,
          riskLevel: tradingRes.data.risk_level || 'medium',
          stopLossEnabled: tradingRes.data.stop_loss_enabled ?? true,
          defaultStopLossPercent: tradingRes.data.default_stop_loss_percent || 5,
          takeProfitEnabled: tradingRes.data.take_profit_enabled ?? true,
          defaultTakeProfitPercent: tradingRes.data.default_take_profit_percent || 10,
          maxOpenTrades: tradingRes.data.max_open_trades || 5,
          soundEnabled: tradingRes.data.sound_enabled ?? true,
          soundTradeOpen: tradingRes.data.sound_trade_open ?? true,
          soundTradeWin: tradingRes.data.sound_trade_win ?? true,
          soundTradeLoss: tradingRes.data.sound_trade_loss ?? true,
          soundVolume: tradingRes.data.sound_volume || 70
        });
      }

      if (sessionsRes?.data) {
        setSecuritySettings(prev => ({
          ...prev,
          activeSessions: sessionsRes.data || []
        }));
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // REAL-TIME EVENT HANDLERS
  // =============================================
  const handleSettingsUpdate = (data) => {
    if (data.type === 'privacy') {
      setPrivacySettings(prev => ({ ...prev, ...data.settings }));
    } else if (data.type === 'notifications') {
      setNotificationSettings(prev => ({ ...prev, ...data.settings }));
    } else if (data.type === 'trading') {
      setTradingPrefs(prev => ({ ...prev, ...data.settings }));
    }
  };

  const handleProfileUpdate = (data) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  // =============================================
  // USERNAME VALIDATION
  // =============================================
  const checkUsernameAvailability = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    if (username === profile.username) {
      setUsernameAvailable(true);
      return;
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await apiClient.get(`/users/check-username/${username}`);
      setUsernameAvailable(response.available);
    } catch (error) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, [profile.username]);

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setProfile(prev => ({ ...prev, username: newUsername }));
    
    // Debounce the check
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    usernameTimeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);
  };

  // =============================================
  // AVATAR UPLOAD
  // =============================================
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
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
        
        // Emit WebSocket event for real-time sync
        realtimeSocket.emit('profile:avatar:update', {
          userId: profile.derivId,
          avatarUrl: response.avatarUrl
        });
        
        toast.success('Avatar updated successfully');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // =============================================
  // SAVE HANDLERS
  // =============================================
  const saveProfile = async () => {
    if (usernameAvailable === false) {
      toast.error('Please choose an available username');
      return;
    }

    setSaving(true);
    try {
      await apiClient.put('/users/me', {
        username: profile.username,
        display_name: profile.displayName,
        bio: profile.bio
      });

      // Emit WebSocket events
      realtimeSocket.emit('profile:update', {
        userId: profile.derivId,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl
      });

      toast.success('Profile saved successfully');
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error(error.message || 'Failed to save profile');
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

      realtimeSocket.emit('settings:update', {
        type: 'privacy',
        settings: privacySettings
      });

      toast.success('Privacy settings saved');
    } catch (error) {
      toast.error('Failed to save privacy settings');
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
        default_trade_amount: tradingPrefs.defaultTradeAmount,
        max_trade_amount: tradingPrefs.maxTradeAmount,
        risk_level: tradingPrefs.riskLevel,
        stop_loss_enabled: tradingPrefs.stopLossEnabled,
        default_stop_loss_percent: tradingPrefs.defaultStopLossPercent,
        take_profit_enabled: tradingPrefs.takeProfitEnabled,
        default_take_profit_percent: tradingPrefs.defaultTakeProfitPercent,
        max_open_trades: tradingPrefs.maxOpenTrades,
        sound_enabled: tradingPrefs.soundEnabled,
        sound_trade_open: tradingPrefs.soundTradeOpen,
        sound_trade_win: tradingPrefs.soundTradeWin,
        sound_trade_loss: tradingPrefs.soundTradeLoss,
        sound_volume: tradingPrefs.soundVolume
      });

      realtimeSocket.emit('settings:update', {
        type: 'trading',
        settings: tradingPrefs
      });

      toast.success('Trading preferences saved');
    } catch (error) {
      toast.error('Failed to save trading preferences');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/notifications', {
        email_notifications: notificationSettings.emailNotifications,
        push_notifications: notificationSettings.pushNotifications,
        trade_alerts: notificationSettings.tradeAlerts,
        community_mentions: notificationSettings.communityMentions,
        comment_notifications: notificationSettings.commentNotifications,
        follower_notifications: notificationSettings.followerNotifications,
        admin_announcements: notificationSettings.adminAnnouncements
      });

      toast.success('Notification settings saved');
    } catch (error) {
      toast.error('Failed to save notification settings');
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
      setSecuritySettings(prev => ({
        ...prev,
        activeSessions: prev.activeSessions.filter(s => s.id !== sessionId)
      }));
      toast.success('Session terminated');
    } catch (error) {
      toast.error('Failed to terminate session');
    }
  };

  const terminateAllSessions = async () => {
    try {
      await apiClient.delete('/settings/sessions');
      toast.success('All other sessions terminated');
      // Reload current session data
      loadAllSettings();
    } catch (error) {
      toast.error('Failed to terminate sessions');
    }
  };

  const handleLogout = () => {
    realtimeSocket.emit('user:offline', { userId: profile.derivId });
    TokenService.clearTokens();
    navigate('/');
  };

  // =============================================
  // DANGER ZONE ACTIONS
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
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  // =============================================
  // RENDER HELPERS
  // =============================================
  const renderSkeletonLoader = () => (
    <div className="settings-skeleton">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line skeleton-title"></div>
          <div className="skeleton-line skeleton-text"></div>
          <div className="skeleton-line skeleton-text short"></div>
        </div>
      ))}
    </div>
  );

  // =============================================
  // PROFILE SECTION
  // =============================================
  const renderProfileSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><User size={24} /> Profile Settings</h2>
        <p>Manage your public identity across the platform</p>
      </div>

      <div className="settings-card">
        {/* Avatar Upload */}
        <div className="avatar-section">
          <div 
            className={`avatar-container ${avatarUploading ? 'uploading' : ''}`}
            onClick={handleAvatarClick}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                <User size={48} />
              </div>
            )}
            <div className="avatar-overlay">
              {avatarUploading ? (
                <Loader2 size={24} className="spin" />
              ) : (
                <Camera size={24} />
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <div className="avatar-info">
            <h3>Profile Photo</h3>
            <p>Click to upload (JPG, PNG, WebP • Max 2MB)</p>
          </div>
        </div>

        {/* Username */}
        <div className="form-group">
          <label>
            Username
            {checkingUsername && <Loader2 size={14} className="spin inline-loader" />}
            {!checkingUsername && usernameAvailable === true && (
              <span className="status-badge success"><Check size={12} /> Available</span>
            )}
            {!checkingUsername && usernameAvailable === false && (
              <span className="status-badge error"><X size={12} /> Taken</span>
            )}
          </label>
          <div className="input-with-prefix">
            <span className="input-prefix">@</span>
            <input
              type="text"
              value={profile.username}
              onChange={handleUsernameChange}
              placeholder="your_username"
              maxLength={20}
            />
          </div>
          <span className="input-hint">3-20 characters, letters, numbers, and underscores only</span>
        </div>

        {/* Display Name */}
        <div className="form-group">
          <label>Display Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
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
          <span className="input-hint">{profile.bio.length}/500 characters</span>
        </div>

        {/* Deriv ID (Read-only) */}
        <div className="form-group">
          <label>Deriv ID</label>
          <div className="readonly-field">
            <span>{profile.derivId || 'Not connected'}</span>
            <Lock size={14} />
          </div>
        </div>

        <button 
          className="save-button" 
          onClick={saveProfile}
          disabled={saving || usernameAvailable === false}
        >
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Profile
        </button>
      </div>
    </div>
  );

  // =============================================
  // PRIVACY SECTION
  // =============================================
  const renderPrivacySection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Eye size={24} /> Privacy Settings</h2>
        <p>Control who can see your information and interact with you</p>
      </div>

      <div className="settings-card">
        <h3>Visibility</h3>
        
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <Globe size={20} />
              <div>
                <span>Online Status</span>
                <p>Show when you're online</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacySettings.onlineVisibility}
                onChange={(e) => setPrivacySettings(prev => ({
                  ...prev,
                  onlineVisibility: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <BarChart3 size={20} />
              <div>
                <span>Trading Stats</span>
                <p>Show your trading performance</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacySettings.showTradingStats}
                onChange={(e) => setPrivacySettings(prev => ({
                  ...prev,
                  showTradingStats: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <Activity size={20} />
              <div>
                <span>Leaderboard</span>
                <p>Appear on public leaderboards</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacySettings.showOnLeaderboard}
                onChange={(e) => setPrivacySettings(prev => ({
                  ...prev,
                  showOnLeaderboard: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <Users size={20} />
              <div>
                <span>Searchable</span>
                <p>Allow others to find you by username</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={privacySettings.searchable}
                onChange={(e) => setPrivacySettings(prev => ({
                  ...prev,
                  searchable: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Interactions</h3>

        <div className="form-group">
          <label>Profile Visibility</label>
          <select
            value={privacySettings.profileVisibility}
            onChange={(e) => setPrivacySettings(prev => ({
              ...prev,
              profileVisibility: e.target.value
            }))}
          >
            <option value="public">Public - Anyone can view</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private - Only you</option>
          </select>
        </div>

        <div className="form-group">
          <label>Who can send you messages</label>
          <select
            value={privacySettings.allowMessagesFrom}
            onChange={(e) => setPrivacySettings(prev => ({
              ...prev,
              allowMessagesFrom: e.target.value
            }))}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">No One</option>
          </select>
        </div>

        <div className="form-group">
          <label>Who can tag you in posts</label>
          <select
            value={privacySettings.allowTagsFrom}
            onChange={(e) => setPrivacySettings(prev => ({
              ...prev,
              allowTagsFrom: e.target.value
            }))}
          >
            <option value="everyone">Everyone</option>
            <option value="friends">Friends Only</option>
            <option value="none">No One</option>
          </select>
        </div>

        <button className="save-button" onClick={savePrivacySettings} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Privacy Settings
        </button>
      </div>
    </div>
  );

  // =============================================
  // SECURITY SECTION
  // =============================================
  const renderSecuritySection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Shield size={24} /> Security Settings</h2>
        <p>Protect your account and manage access</p>
      </div>

      <div className="settings-card">
        <h3>Two-Factor Authentication</h3>
        <div className="security-feature">
          <div className="feature-info">
            <Fingerprint size={32} />
            <div>
              <span>2FA Protection</span>
              <p>Add an extra layer of security with authenticator app</p>
            </div>
          </div>
          <button 
            className={`feature-button ${securitySettings.twoFactorEnabled ? 'enabled' : ''}`}
            onClick={() => toast.info('2FA setup coming soon')}
          >
            {securitySettings.twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>Active Sessions</h3>
        <div className="sessions-list">
          {securitySettings.activeSessions.length === 0 ? (
            <div className="empty-state">
              <Monitor size={32} />
              <p>No active sessions found</p>
            </div>
          ) : (
            securitySettings.activeSessions.map((session) => (
              <div key={session.id} className="session-item">
                <div className="session-icon">
                  {session.device_type === 'mobile' ? <Smartphone size={24} /> : <Monitor size={24} />}
                </div>
                <div className="session-info">
                  <span className="session-device">{session.device_name || 'Unknown Device'}</span>
                  <span className="session-details">
                    {session.browser} • {session.location_city || 'Unknown Location'}
                  </span>
                  <span className="session-time">
                    <Clock size={12} /> Last active: {new Date(session.last_activity).toLocaleString()}
                  </span>
                </div>
                {session.is_current ? (
                  <span className="current-badge">Current</span>
                ) : (
                  <button 
                    className="terminate-button"
                    onClick={() => terminateSession(session.id)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        
        {securitySettings.activeSessions.length > 1 && (
          <button className="danger-button-outline" onClick={terminateAllSessions}>
            <LogOut size={18} />
            Terminate All Other Sessions
          </button>
        )}
      </div>

      <div className="settings-card">
        <h3>Security Alerts</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <Mail size={20} />
              <div>
                <span>Login Alerts</span>
                <p>Get notified of new logins</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={securitySettings.loginAlerts}
                onChange={(e) => setSecuritySettings(prev => ({
                  ...prev,
                  loginAlerts: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Session Timeout (minutes)</label>
          <select
            value={securitySettings.sessionTimeout}
            onChange={(e) => setSecuritySettings(prev => ({
              ...prev,
              sessionTimeout: parseInt(e.target.value)
            }))}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={480}>8 hours</option>
          </select>
        </div>
      </div>

      <div className="settings-card">
        <h3>Password</h3>
        <button className="secondary-button" onClick={() => setShowPasswordModal(true)}>
          <Key size={18} />
          Change Password
        </button>
      </div>
    </div>
  );

  // =============================================
  // TRADING SECTION
  // =============================================
  const renderTradingSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><TrendingUp size={24} /> Trading Preferences</h2>
        <p>Customize your trading experience</p>
      </div>

      <div className="settings-card">
        <h3>Default Market</h3>
        <div className="market-grid">
          {MARKETS.map((market) => (
            <button
              key={market.value}
              className={`market-option ${tradingPrefs.defaultMarket === market.value ? 'selected' : ''}`}
              onClick={() => setTradingPrefs(prev => ({ ...prev, defaultMarket: market.value }))}
            >
              <span className="market-icon">{market.icon}</span>
              <span className="market-label">{market.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h3>Risk Level</h3>
        <div className="risk-selector">
          {RISK_LEVELS.map((level) => (
            <button
              key={level.value}
              className={`risk-option ${tradingPrefs.riskLevel === level.value ? 'selected' : ''}`}
              onClick={() => setTradingPrefs(prev => ({ ...prev, riskLevel: level.value }))}
              style={{ '--risk-color': level.color }}
            >
              <span className="risk-indicator"></span>
              <span className="risk-label">{level.label}</span>
              <span className="risk-description">{level.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card">
        <h3>Trade Amounts</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Default Trade Amount ($)</label>
            <input
              type="number"
              value={tradingPrefs.defaultTradeAmount}
              onChange={(e) => setTradingPrefs(prev => ({
                ...prev,
                defaultTradeAmount: parseFloat(e.target.value) || 0
              }))}
              min={1}
              max={tradingPrefs.maxTradeAmount}
            />
          </div>
          <div className="form-group">
            <label>Maximum Trade Amount ($)</label>
            <input
              type="number"
              value={tradingPrefs.maxTradeAmount}
              onChange={(e) => setTradingPrefs(prev => ({
                ...prev,
                maxTradeAmount: parseFloat(e.target.value) || 0
              }))}
              min={tradingPrefs.defaultTradeAmount}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Maximum Open Trades</label>
          <input
            type="number"
            value={tradingPrefs.maxOpenTrades}
            onChange={(e) => setTradingPrefs(prev => ({
              ...prev,
              maxOpenTrades: parseInt(e.target.value) || 1
            }))}
            min={1}
            max={20}
          />
        </div>
      </div>

      <div className="settings-card">
        <h3>Risk Management</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <AlertTriangle size={20} />
              <div>
                <span>Stop Loss</span>
                <p>Automatically limit losses</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={tradingPrefs.stopLossEnabled}
                onChange={(e) => setTradingPrefs(prev => ({
                  ...prev,
                  stopLossEnabled: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {tradingPrefs.stopLossEnabled && (
            <div className="form-group nested">
              <label>Default Stop Loss (%)</label>
              <input
                type="number"
                value={tradingPrefs.defaultStopLossPercent}
                onChange={(e) => setTradingPrefs(prev => ({
                  ...prev,
                  defaultStopLossPercent: parseFloat(e.target.value) || 0
                }))}
                min={1}
                max={50}
                step={0.5}
              />
            </div>
          )}

          <div className="toggle-item">
            <div className="toggle-info">
              <Zap size={20} />
              <div>
                <span>Take Profit</span>
                <p>Automatically secure profits</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={tradingPrefs.takeProfitEnabled}
                onChange={(e) => setTradingPrefs(prev => ({
                  ...prev,
                  takeProfitEnabled: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {tradingPrefs.takeProfitEnabled && (
            <div className="form-group nested">
              <label>Default Take Profit (%)</label>
              <input
                type="number"
                value={tradingPrefs.defaultTakeProfitPercent}
                onChange={(e) => setTradingPrefs(prev => ({
                  ...prev,
                  defaultTakeProfitPercent: parseFloat(e.target.value) || 0
                }))}
                min={1}
                max={100}
                step={0.5}
              />
            </div>
          )}
        </div>
      </div>

      <div className="settings-card">
        <h3>Sound Effects</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              {tradingPrefs.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              <div>
                <span>Enable Sounds</span>
                <p>Play sounds for trade events</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={tradingPrefs.soundEnabled}
                onChange={(e) => setTradingPrefs(prev => ({
                  ...prev,
                  soundEnabled: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {tradingPrefs.soundEnabled && (
            <>
              <div className="toggle-item nested">
                <div className="toggle-info">
                  <div>
                    <span>Trade Open</span>
                  </div>
                </div>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={tradingPrefs.soundTradeOpen}
                    onChange={(e) => setTradingPrefs(prev => ({
                      ...prev,
                      soundTradeOpen: e.target.checked
                    }))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item nested">
                <div className="toggle-info">
                  <div>
                    <span>Trade Win</span>
                  </div>
                </div>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={tradingPrefs.soundTradeWin}
                    onChange={(e) => setTradingPrefs(prev => ({
                      ...prev,
                      soundTradeWin: e.target.checked
                    }))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item nested">
                <div className="toggle-info">
                  <div>
                    <span>Trade Loss</span>
                  </div>
                </div>
                <label className="toggle-switch small">
                  <input
                    type="checkbox"
                    checked={tradingPrefs.soundTradeLoss}
                    onChange={(e) => setTradingPrefs(prev => ({
                      ...prev,
                      soundTradeLoss: e.target.checked
                    }))}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="form-group nested">
                <label>Volume: {tradingPrefs.soundVolume}%</label>
                <input
                  type="range"
                  value={tradingPrefs.soundVolume}
                  onChange={(e) => setTradingPrefs(prev => ({
                    ...prev,
                    soundVolume: parseInt(e.target.value)
                  }))}
                  min={0}
                  max={100}
                  className="volume-slider"
                />
              </div>
            </>
          )}
        </div>

        <button className="save-button" onClick={saveTradingPrefs} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Trading Preferences
        </button>
      </div>
    </div>
  );

  // =============================================
  // NOTIFICATIONS SECTION
  // =============================================
  const renderNotificationsSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Bell size={24} /> Notification Settings</h2>
        <p>Control what alerts you receive</p>
      </div>

      <div className="settings-card">
        <h3>Delivery Methods</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <Mail size={20} />
              <div>
                <span>Email Notifications</span>
                <p>Receive updates via email</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  emailNotifications: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <Smartphone size={20} />
              <div>
                <span>Push Notifications</span>
                <p>Browser & app notifications</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.pushNotifications}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  pushNotifications: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Trading Alerts</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <TrendingUp size={20} />
              <div>
                <span>Trade Alerts</span>
                <p>Open, close, and position updates</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.tradeAlerts}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  tradeAlerts: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>Community</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <MessageSquare size={20} />
              <div>
                <span>Mentions</span>
                <p>When someone mentions you</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.communityMentions}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  communityMentions: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <MessageSquare size={20} />
              <div>
                <span>Comments</span>
                <p>Replies to your posts</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.commentNotifications}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  commentNotifications: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-item">
            <div className="toggle-info">
              <Users size={20} />
              <div>
                <span>New Followers</span>
                <p>When someone follows you</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.followerNotifications}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  followerNotifications: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h3>System</h3>
        <div className="toggle-group">
          <div className="toggle-item">
            <div className="toggle-info">
              <Bell size={20} />
              <div>
                <span>Admin Announcements</span>
                <p>Important platform updates</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.adminAnnouncements}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  adminAnnouncements: e.target.checked
                }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <button className="save-button" onClick={saveNotificationSettings} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Notification Settings
        </button>
      </div>
    </div>
  );

  // =============================================
  // DANGER ZONE SECTION
  // =============================================
  const renderDangerSection = () => (
    <div className="settings-section">
      <div className="section-header danger">
        <h2><AlertTriangle size={24} /> Danger Zone</h2>
        <p>Irreversible actions - proceed with caution</p>
      </div>

      <div className="settings-card danger-card">
        <h3>Clear Data</h3>
        <div className="danger-actions">
          <button 
            className="danger-button-outline"
            onClick={() => toast.info('This will clear your community posts and comments')}
          >
            <Trash2 size={18} />
            Clear Community Data
          </button>
          <button 
            className="danger-button-outline"
            onClick={() => toast.info('This will clear your chat history')}
          >
            <Trash2 size={18} />
            Clear Chat History
          </button>
          <button 
            className="danger-button-outline"
            onClick={() => toast.info('This will reset your trading preferences')}
          >
            <RefreshCw size={18} />
            Reset Trading Preferences
          </button>
        </div>
      </div>

      <div className="settings-card danger-card">
        <h3>Account Actions</h3>
        <div className="danger-actions">
          <button 
            className="danger-button"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Logout
          </button>
          <button 
            className="danger-button critical"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 size={18} />
            Delete Account Permanently
          </button>
        </div>
        <p className="danger-warning">
          <AlertTriangle size={14} />
          Deleting your account is permanent and cannot be undone. All your data, 
          trading history, and community posts will be permanently removed.
        </p>
      </div>
    </div>
  );

  // =============================================
  // RENDER ACTIVE SECTION
  // =============================================
  const renderActiveSection = () => {
    if (loading) return renderSkeletonLoader();

    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'privacy':
        return renderPrivacySection();
      case 'security':
        return renderSecuritySection();
      case 'trading':
        return renderTradingSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'danger':
        return renderDangerSection();
      default:
        return renderProfileSection();
    }
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  return (
    <div className="settings-page">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />

      {/* Header */}
      <header className="settings-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1><SettingsIcon size={28} /> Settings</h1>
        </div>
      </header>

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <nav className="settings-sidebar">
          <div className="sidebar-content">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                className={`sidebar-item ${activeSection === section.id ? 'active' : ''} ${section.id === 'danger' ? 'danger' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <section.icon size={20} />
                <div className="sidebar-item-text">
                  <span>{section.label}</span>
                  <p>{section.description}</p>
                </div>
                <ChevronRight size={16} className="chevron" />
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="settings-main">
          {renderActiveSection()}
        </main>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content danger-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle size={32} className="danger-icon" />
              <h2>Delete Account</h2>
            </div>
            <p>
              This action is <strong>permanent</strong> and cannot be undone. 
              All your data will be permanently deleted including:
            </p>
            <ul>
              <li>Your profile and settings</li>
              <li>All community posts and comments</li>
              <li>Trading history and preferences</li>
              <li>Chat messages and connections</li>
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
              <button className="secondary-button" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button 
                className="danger-button critical"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Key size={24} />
              <h2>Change Password</h2>
            </div>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" placeholder="Enter current password" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Enter new password" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" placeholder="Confirm new password" />
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </button>
              <button className="save-button">
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
