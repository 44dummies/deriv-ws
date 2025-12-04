import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Shield, Bell, Eye, Trash2, Check, X,
  LogOut, ChevronLeft, Globe, AlertTriangle,
  Loader2, Save, Settings as SettingsIcon, MessageSquare,
  Users, BarChart3, Clock, Smartphone, Monitor, Wifi
} from 'lucide-react';
import { TokenService } from '../services/tokenService';
import apiClient from '../services/apiClient';
import realtimeSocket from '../services/realtimeSocket';

// =============================================
// AVATAR OPTIONS - 30 Unique Avatars
// =============================================
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

// =============================================
// REUSABLE COMPONENTS (matching Dashboard.js style)
// =============================================
const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl sm:rounded-2xl border backdrop-blur-xl p-4 sm:p-6 
    border-white/10 ${className}`}
    style={{ 
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--card-border)'
    }}>
    {children}
  </div>
);

const SettingRow = ({ icon, label, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 border-b last:border-0 gap-2 sm:gap-0" 
    style={{ borderColor: 'var(--card-border)' }}>
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0" 
        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm sm:text-base">{label}</p>
        {description && <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{description}</p>}
      </div>
    </div>
    {action && <div className="ml-10 sm:ml-0">{action}</div>}
  </div>
);

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-gray-600'}`}
  >
    <span 
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`}
    />
  </button>
);

// =============================================
// SETTINGS SECTIONS CONFIG
// =============================================
const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Your identity' },
  { id: 'account', label: 'Account', icon: Shield, description: 'Deriv account & sessions' },
  { id: 'privacy', label: 'Privacy', icon: Eye, description: 'Visibility controls' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert settings' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Account actions' }
];

// =============================================
// MAIN SETTINGS COMPONENT
// =============================================
const Settings = () => {
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
  
  // Session States
  const [sessions, setSessions] = useState([]);
  const [currentSocketId, setCurrentSocketId] = useState(null);
  
  // UI States
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  const usernameTimeoutRef = useRef(null);

  // =============================================
  // LOAD DATA ON MOUNT
  // =============================================
  useEffect(() => {
    loadAllData();
    
    if (realtimeSocket.socket?.id) {
      setCurrentSocketId(realtimeSocket.socket.id);
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const profileRes = await apiClient.get('/users/me').catch(() => null);

      if (profileRes) {
        let avatarId = 1;
        if (profileRes.profile_photo || profileRes.avatarUrl) {
          const avatarStr = profileRes.profile_photo || profileRes.avatarUrl;
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
    } finally {
      setLoading(false);
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
          achievements: true,
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
  // LOADING STATE
  // =============================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  // =============================================
  // RENDER SECTIONS
  // =============================================
  const renderProfileSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Profile Settings
        </h3>
        
        {/* Avatar Selection */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--card-bg)', border: '3px solid var(--accent-primary)' }}
          >
            {getAvatarEmoji(profile.avatarId)}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs text-white">Change</span>
            </div>
          </button>
          <div>
            <p className="font-medium">Your Avatar</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click to choose from 30 avatars</p>
          </div>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            Username
            {checkingUsername && <Loader2 className="w-3 h-3 animate-spin" />}
            {!checkingUsername && usernameAvailable === true && (
              <span className="text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" /> Available</span>
            )}
            {!checkingUsername && usernameAvailable === false && (
              <span className="text-xs text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Taken</span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
            <input
              type="text"
              value={profile.username}
              onChange={handleUsernameChange}
              placeholder="your_username"
              maxLength={20}
              className="w-full pl-8 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none transition"
              style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>3-20 characters, letters, numbers, underscores</p>
        </div>

        {/* Display Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            value={profile.fullname}
            onChange={(e) => setProfile(prev => ({ ...prev, fullname: e.target.value }))}
            placeholder="Your display name"
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none transition"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Bio */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell others about yourself..."
            maxLength={500}
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none transition resize-none"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)'
            }}
          />
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-secondary)' }}>{profile.bio?.length || 0}/500</p>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </button>
      </Card>
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Deriv Account
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span style={{ color: 'var(--text-secondary)' }}>Account ID</span>
            <span className="font-mono" style={{ color: 'var(--accent-primary)' }}>{profile.derivId || 'Not connected'}</span>
          </div>
          <div className="flex justify-between py-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Email</span>
            <span>{profile.email || 'Not available'}</span>
          </div>
          <div className="flex justify-between py-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Full Name</span>
            <span>{profile.fullname || 'Not set'}</span>
          </div>
        </div>
        
        <p className="text-sm mt-4 flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <Shield className="w-4 h-4" />
          Authentication is handled by Deriv. No password management required.
        </p>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Active Sessions
        </h3>
        
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>This is your only active session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  {session.device_type === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                  <div>
                    <p className="font-medium text-sm">{session.device_name || 'Unknown Device'}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {session.socket_id === currentSocketId ? 'Current session' : `Last seen: ${new Date(session.last_seen).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                {session.socket_id === currentSocketId ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <button onClick={() => terminateSession(session.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {sessions.length > 1 && (
          <button 
            onClick={terminateAllOtherSessions}
            className="mt-4 w-full py-2.5 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Terminate All Other Sessions
          </button>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Sign Out</h3>
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" /> Logout from this device
        </button>
      </Card>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Visibility
        </h3>
        
        <SettingRow
          icon={<Globe className="w-5 h-5" />}
          label="Online Status"
          description="Show when you're online"
          action={<ToggleSwitch checked={privacySettings.onlineVisibility} onChange={(v) => setPrivacySettings(p => ({ ...p, onlineVisibility: v }))} />}
        />
        <SettingRow
          icon={<BarChart3 className="w-5 h-5" />}
          label="Trading Stats"
          description="Display your performance"
          action={<ToggleSwitch checked={privacySettings.showTradingStats} onChange={(v) => setPrivacySettings(p => ({ ...p, showTradingStats: v }))} />}
        />
        <SettingRow
          icon={<Users className="w-5 h-5" />}
          label="Leaderboard"
          description="Appear on rankings"
          action={<ToggleSwitch checked={privacySettings.showOnLeaderboard} onChange={(v) => setPrivacySettings(p => ({ ...p, showOnLeaderboard: v }))} />}
        />
        <SettingRow
          icon={<Users className="w-5 h-5" />}
          label="Searchable"
          description="Allow others to find you"
          action={<ToggleSwitch checked={privacySettings.searchable} onChange={(v) => setPrivacySettings(p => ({ ...p, searchable: v }))} />}
        />
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Profile Visibility</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Who can see your profile</label>
          <select
            value={privacySettings.profileVisibility}
            onChange={(e) => setPrivacySettings(p => ({ ...p, profileVisibility: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-purple-500 outline-none"
            style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <button
          onClick={savePrivacySettings}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Privacy Settings
        </button>
      </Card>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          Community Notifications
        </h3>
        
        <SettingRow
          icon={<MessageSquare className="w-5 h-5" />}
          label="Mentions"
          description="When tagged in posts"
          action={<ToggleSwitch checked={notificationSettings.communityMentions} onChange={(v) => setNotificationSettings(p => ({ ...p, communityMentions: v }))} />}
        />
        <SettingRow
          icon={<MessageSquare className="w-5 h-5" />}
          label="Replies"
          description="Responses to your posts"
          action={<ToggleSwitch checked={notificationSettings.postReplies} onChange={(v) => setNotificationSettings(p => ({ ...p, postReplies: v }))} />}
        />
        <SettingRow
          icon={<Users className="w-5 h-5" />}
          label="New Followers"
          description="When someone follows you"
          action={<ToggleSwitch checked={notificationSettings.newFollowers} onChange={(v) => setNotificationSettings(p => ({ ...p, newFollowers: v }))} />}
        />
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          System Notifications
        </h3>
        
        <SettingRow
          icon={<Bell className="w-5 h-5" />}
          label="Announcements"
          description="Platform updates"
          action={<ToggleSwitch checked={notificationSettings.adminAnnouncements} onChange={(v) => setNotificationSettings(p => ({ ...p, adminAnnouncements: v }))} />}
        />
        <SettingRow
          icon={<Smartphone className="w-5 h-5" />}
          label="Push Notifications"
          description="Browser/app alerts"
          action={<ToggleSwitch checked={notificationSettings.pushNotifications} onChange={(v) => setNotificationSettings(p => ({ ...p, pushNotifications: v }))} />}
        />

        <button
          onClick={saveNotificationSettings}
          disabled={saving}
          className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Notification Settings
        </button>
      </Card>
    </div>
  );

  const renderDangerSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-red-500/30">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>
        
        <div className="space-y-3 mb-4">
          <button 
            onClick={() => toast.info('Coming soon')}
            className="w-full py-2.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear Community Posts
          </button>
          <button 
            onClick={() => toast.info('Coming soon')}
            className="w-full py-2.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear Chat History
          </button>
        </div>
      </Card>

      <Card className="border-red-500/30">
        <h3 className="text-lg font-semibold mb-4 text-red-500">Delete Account</h3>
        
        <button
          onClick={handleLogout}
          className="w-full mb-3 py-2.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
        
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Delete Account Permanently
        </button>
        
        <p className="text-sm mt-3 flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          Deleting your account is permanent. All data will be lost forever.
        </p>
      </Card>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile': return renderProfileSection();
      case 'account': return renderAccountSection();
      case 'privacy': return renderPrivacySection();
      case 'notifications': return renderNotificationsSection();
      case 'danger': return renderDangerSection();
      default: return renderProfileSection();
    }
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }
      }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--card-border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            Settings
          </h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 shrink-0">
            <Card className="lg:sticky lg:top-24">
              <div className="space-y-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition ${
                      activeSection === section.id 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'hover:bg-white/5'
                    } ${section.id === 'danger' ? 'text-red-400' : ''}`}
                  >
                    <section.icon className="w-5 h-5" />
                    <div>
                      <p className="font-medium text-sm">{section.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{section.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </nav>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {renderActiveSection()}
          </main>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarPicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowAvatarPicker(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <h3 className="text-xl font-semibold text-center mb-6">Choose Your Avatar</h3>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.id)}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-xl transition hover:scale-105 ${
                    profile.avatarId === avatar.id 
                      ? 'bg-purple-500/30 ring-2 ring-purple-500' 
                      : 'hover:bg-white/10'
                  }`}
                  style={{ backgroundColor: profile.avatarId === avatar.id ? undefined : 'var(--bg-secondary)' }}
                  title={avatar.label}
                >
                  <span className="text-2xl sm:text-3xl">{avatar.emoji}</span>
                  <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-secondary)' }}>{avatar.label}</span>
                  {profile.avatarId === avatar.id && (
                    <Check className="absolute top-1 right-1 w-4 h-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowAvatarPicker(false)}
              className="w-full mt-6 py-3 rounded-lg flex items-center justify-center gap-2 transition"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold">Delete Account</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                This is permanent and cannot be undone. All your data will be deleted.
              </p>
            </div>

            <ul className="text-sm mb-6 space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li>• Profile & settings</li>
              <li>• Community posts & comments</li>
              <li>• Chat messages</li>
            </ul>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-red-500 outline-none"
                style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-lg transition"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
