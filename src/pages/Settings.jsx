/**
 * Settings Page - Deriv Trading Platform
 * Enterprise-grade settings control center
 * 
 * Auth: Deriv OAuth ONLY (no email/password)
 * Database: Supabase
 * Avatars: 30 pre-designed avatar options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Bell, Eye, Trash2, Check, X,
  LogOut, Smartphone, Monitor, Globe, AlertTriangle,
  ChevronRight, Loader2, Save, Settings as SettingsIcon, MessageSquare,
  Users, BarChart3, Clock, Activity, Wifi, RefreshCw
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { TokenService } from '../services/tokenService';
import { apiClient } from '../services/apiClient';
import { realtimeSocket } from '../services/realtimeSocket';
import './Settings.css';

// =============================================
// AVATAR OPTIONS - 30 Unique Avatars
// =============================================
const AVATARS = [
  // Traders & Finance
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
  // Cool & Mysterious
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
  // Symbols & Energy
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

// =============================================
// CONFIGURATION
// =============================================
const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Your identity' },
  { id: 'account', label: 'Account', icon: Shield, description: 'Deriv account & sessions' },
  { id: 'privacy', label: 'Privacy', icon: Eye, description: 'Visibility controls' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert settings' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Account actions' }
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
    avatarId: 1
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  const usernameTimeoutRef = React.useRef(null);

  // =============================================
  // LOAD DATA ON MOUNT
  // =============================================
  useEffect(() => {
    loadAllData();
    
    if (realtimeSocket.socket?.id) {
      setCurrentSocketId(realtimeSocket.socket.id);
    }
    
    const unsubSettings = realtimeSocket.on('settings:updated', handleSettingsUpdate);
    const unsubProfile = realtimeSocket.on('profile:updated', handleProfileUpdate);
    const unsubSession = realtimeSocket.on('session:terminated', handleSessionTerminated);
    
    return () => {
      if (unsubSettings) unsubSettings();
      if (unsubProfile) unsubProfile();
      if (unsubSession) unsubSession();
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load profile
      const profileRes = await apiClient.get('/users/me').catch(() => null);

      if (profileRes) {
        // Extract avatar ID from profile_photo or default to 1
        let avatarId = 1;
        if (profileRes.profile_photo || profileRes.avatarUrl) {
          const avatarStr = profileRes.profile_photo || profileRes.avatarUrl;
          // Check if it's an avatar ID like "avatar:5"
          if (avatarStr && avatarStr.startsWith('avatar:')) {
            avatarId = parseInt(avatarStr.split(':')[1]) || 1;
          }
        }

        setProfile({
          derivId: profileRes.deriv_id || profileRes.derivId || '',
          email: profileRes.email || '',
          fullname: profileRes.fullname || profileRes.display_name || '',
          username: profileRes.username || '',
          bio: profileRes.bio || '',
          avatarId
        });
      }

      // Load settings from user_settings endpoint (uses existing /users/settings route)
      const settingsRes = await apiClient.get('/users/settings').catch(() => null);

      if (settingsRes?.privacy) {
        setPrivacySettings({
          onlineVisibility: settingsRes.privacy.showOnlineStatus ?? true,
          profileVisibility: settingsRes.privacy.profileVisibility || 'public',
          allowMessagesFrom: 'everyone',
          allowTagsFrom: 'everyone',
          showTradingStats: settingsRes.privacy.showPerformance ?? true,
          showOnLeaderboard: settingsRes.privacy.showPerformance ?? true,
          searchable: true
        });
      }

      if (settingsRes?.notifications) {
        setNotificationSettings({
          tradeAlerts: settingsRes.notifications.achievements ?? true,
          communityMentions: settingsRes.notifications.chatMentions ?? true,
          postReplies: settingsRes.notifications.messages ?? true,
          newFollowers: settingsRes.notifications.communityUpdates ?? true,
          adminAnnouncements: settingsRes.notifications.streakReminders ?? true,
          pushNotifications: settingsRes.notifications.pushEnabled ?? false
        });
      }

    } catch (error) {
      console.error('Failed to load settings:', error);
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
  // AVATAR SELECTION
  // =============================================
  const handleAvatarSelect = (avatarId) => {
    setProfile(prev => ({ ...prev, avatarId }));
    setShowAvatarPicker(false);
  };

  const getAvatarEmoji = (id) => {
    const avatar = AVATARS.find(a => a.id === id);
    return avatar ? avatar.emoji : '👤';
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
        bio: profile.bio,
        profile_photo: `avatar:${profile.avatarId}`
      });

      realtimeSocket.emit('profile:update', {
        derivId: profile.derivId,
        username: profile.username,
        displayName: profile.fullname,
        bio: profile.bio,
        avatarId: profile.avatarId
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

      realtimeSocket.emit('settings:update', { type: 'privacy', settings: privacySettings });
      toast.success('Privacy settings saved');
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
          achievements: notificationSettings.tradeAlerts,
          streakReminders: notificationSettings.adminAnnouncements,
          communityUpdates: notificationSettings.newFollowers,
          soundEnabled: true,
          pushEnabled: notificationSettings.pushNotifications
        }
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
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      realtimeSocket.emit('session:terminate', { sessionId });
      toast.success('Session terminated');
    } catch {
      toast.error('Failed to terminate session');
    }
  };

  const terminateAllOtherSessions = async () => {
    try {
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
        {/* Avatar Selection */}
        <div className="avatar-section">
          <div 
            className="avatar-container avatar-selector"
            onClick={() => setShowAvatarPicker(true)}
          >
            <span className="avatar-emoji">{getAvatarEmoji(profile.avatarId)}</span>
            <div className="avatar-overlay">
              <span>Change</span>
            </div>
          </div>
          <div className="avatar-info">
            <h3>Choose Your Avatar</h3>
            <p>Click to select from 30 unique avatars</p>
          </div>
        </div>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
            <div className="avatar-picker" onClick={e => e.stopPropagation()}>
              <h3>Select Your Avatar</h3>
              <div className="avatar-grid">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    className={`avatar-option ${profile.avatarId === avatar.id ? 'selected' : ''}`}
                    onClick={() => handleAvatarSelect(avatar.id)}
                    title={avatar.label}
                  >
                    <span className="emoji">{avatar.emoji}</span>
                    <span className="label">{avatar.label}</span>
                    {profile.avatarId === avatar.id && <Check className="check" size={16} />}
                  </button>
                ))}
              </div>
              <button className="btn-close" onClick={() => setShowAvatarPicker(false)}>
                <X size={18} /> Close
              </button>
            </div>
          </div>
        )}

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

  // ACCOUNT SECTION
  const renderAccountSection = () => (
    <div className="settings-section">
      <div className="section-header">
        <h2><Shield size={24} /> Account & Sessions</h2>
        <p>Your Deriv account and active sessions</p>
      </div>

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

      <div className="settings-card">
        <h3>Active Sessions</h3>
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <Monitor size={32} />
              <p>This is your only active session</p>
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

        <button className="btn-save" onClick={savePrivacySettings} disabled={saving}>
          {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
          Save Privacy Settings
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
            <RefreshCw size={18} /> Reset All Settings
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
  // MAIN RENDER
  // =============================================
  const renderActiveSection = () => {
    if (loading) return <SkeletonLoader />;
    
    switch (activeSection) {
      case 'profile': return renderProfileSection();
      case 'account': return renderAccountSection();
      case 'privacy': return renderPrivacySection();
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
