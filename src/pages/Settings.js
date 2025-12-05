import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Shield, Bell, Eye, Trash2, Check, X, ArrowLeft,
  LogOut, Globe, AlertTriangle, Loader2, Save, Settings as SettingsIcon,
  MessageSquare, Users, BarChart3, Smartphone, Monitor, Wifi, Sparkles, Palette
} from 'lucide-react';
import { TokenService } from '../services/tokenService';
import apiClient from '../services/apiClient';
import realtimeSocket from '../services/realtimeSocket';
import { useTheme } from '../context/ThemeContext';

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

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'privacy', label: 'Privacy', icon: Eye },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
];

const Settings = () => {
  const navigate = useNavigate();
  const { themeId, setTheme, themes } = useTheme();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  const usernameTimeoutRef = useRef(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const handleThemeChange = (newThemeId) => {
    setTheme(newThemeId);
    const themeName = themes.find(t => t.id === newThemeId)?.name;
    toast.success(`Theme changed to ${themeName}`);
  };

  const loadAllData = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Save error:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg)' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: 'var(--theme-primary)' }} />
          <p style={{ color: 'var(--theme-text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
        checked 
          ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
          : 'bg-gray-700'
      }`}
    >
      <span 
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="group relative"
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 flex items-center justify-center text-5xl transition-all group-hover:scale-105 group-hover:border-purple-400">
              {getAvatarEmoji(profile.avatarId)}
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </button>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Your Avatar</h3>
            <p className="text-gray-400 text-sm mb-3">Click to choose from 30 unique avatars</p>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
              <Sparkles className="w-3 h-3" /> {AVATARS.find(a => a.id === profile.avatarId)?.label}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Profile Information
        </h3>
        
        {}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            Username
            {checkingUsername && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
            {!checkingUsername && usernameAvailable === true && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Available
              </span>
            )}
            {!checkingUsername && usernameAvailable === false && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" /> Taken
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">@</span>
            <input
              type="text"
              value={profile.username}
              onChange={handleUsernameChange}
              placeholder="your_username"
              maxLength={20}
              className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">3-20 characters, letters, numbers, underscores only</p>
        </div>

        {}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
          <input
            type="text"
            value={profile.fullname}
            onChange={(e) => setProfile(prev => ({ ...prev, fullname: e.target.value }))}
            placeholder="Your display name"
            maxLength={50}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
          />
        </div>

        {}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell others about yourself..."
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
          />
          <p className="text-xs text-gray-500 mt-2 text-right">{profile.bio?.length || 0}/500</p>
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
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-6">
      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Deriv Account
        </h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-gray-400">Account ID</span>
            <span className="font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">{profile.derivId || 'Not connected'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-gray-400">Email</span>
            <span className="text-white">{profile.email || 'Not available'}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-400">Full Name</span>
            <span className="text-white">{profile.fullname || 'Not set'}</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Authentication is handled securely by Deriv
          </p>
        </div>
      </div>

      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-purple-400" />
          Active Sessions
        </h3>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <Wifi className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-white font-medium">Current Session</p>
          <p className="text-gray-500 text-sm">This is your only active session</p>
        </div>
      </div>

      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          Visibility Settings
        </h3>
        
        <div className="space-y-5">
          {[
            { key: 'onlineVisibility', icon: Globe, label: 'Online Status', desc: 'Show when you\'re online' },
            { key: 'showTradingStats', icon: BarChart3, label: 'Trading Stats', desc: 'Display your performance' },
            { key: 'showOnLeaderboard', icon: Users, label: 'Leaderboard', desc: 'Appear on rankings' },
            { key: 'searchable', icon: Users, label: 'Searchable', desc: 'Allow others to find you' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </div>
              <Toggle 
                checked={privacySettings[item.key]} 
                onChange={(v) => setPrivacySettings(p => ({ ...p, [item.key]: v }))} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Profile Visibility</h3>
        <select
          value={privacySettings.profileVisibility}
          onChange={(e) => setPrivacySettings(p => ({ ...p, profileVisibility: e.target.value }))}
          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:border-purple-500 outline-none"
        >
          <option value="public">Public - Anyone can view</option>
          <option value="friends">Friends Only</option>
          <option value="private">Private - Only you</option>
        </select>

        <button
          onClick={savePrivacySettings}
          disabled={saving}
          className="w-full mt-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Privacy Settings
        </button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Community
        </h3>
        
        <div className="space-y-5">
          {[
            { key: 'communityMentions', label: 'Mentions', desc: 'When tagged in posts' },
            { key: 'postReplies', label: 'Replies', desc: 'Responses to your posts' },
            { key: 'newFollowers', label: 'New Followers', desc: 'When someone follows you' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
              <Toggle 
                checked={notificationSettings[item.key]} 
                onChange={(v) => setNotificationSettings(p => ({ ...p, [item.key]: v }))} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#12121a] rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />
          System
        </h3>
        
        <div className="space-y-5">
          {[
            { key: 'adminAnnouncements', label: 'Announcements', desc: 'Platform updates' },
            { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser/app alerts' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
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
          className="w-full mt-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Notification Settings
        </button>
      </div>
    </div>
  );

  const renderAppearanceSection = () => {
    const currentTheme = themes.find(t => t.id === themeId) || themes[0];
    
    return (
      <div className="space-y-6">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            Theme Customization
          </h3>
          
          <p className="text-gray-400 text-sm mb-6">
            Choose a color theme that suits your style. Your preference will be saved automatically.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                  themeId === theme.id 
                    ? 'border-white/40 ring-2 ring-offset-2 ring-offset-[#0a0a0f]' 
                    : 'border-white/10 hover:border-white/20'
                }`}
                style={{ 
                  background: theme.bg,
                  ringColor: theme.primary
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}
                  />
                  <span className="text-sm font-medium">{theme.name}</span>
                </div>
                {themeId === theme.id && (
                  <div 
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: theme.primary }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium mb-3">Preview</h4>
            <div className="flex gap-3">
              <div 
                className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm"
                style={{ background: currentTheme.primary }}
              >
                Primary Color
              </div>
              <div 
                className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm border border-white/20"
                style={{ background: currentTheme.bg }}
              >
                Background
              </div>
              <div 
                className="flex-1 h-20 rounded-lg flex items-center justify-center text-sm"
                style={{ background: currentTheme.accent }}
              >
                Accent
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDangerSection = () => (
    <div className="space-y-6">
      <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>
        
        <div className="space-y-3">
          <button 
            onClick={() => toast.info('Coming soon')}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Clear Community Posts
          </button>
          <button 
            onClick={() => toast.info('Coming soon')}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Clear Chat History
          </button>
        </div>
      </div>

      <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Delete Account</h3>
        <p className="text-gray-400 text-sm mb-6">
          Once you delete your account, there is no going back. All your data will be permanently removed.
        </p>
        
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-all"
        >
          <Trash2 className="w-5 h-5" /> Delete Account Permanently
        </button>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile': return renderProfileSection();
      case 'appearance': return renderAppearanceSection();
      case 'account': return renderAccountSection();
      case 'privacy': return renderPrivacySection();
      case 'notifications': return renderNotificationsSection();
      case 'danger': return renderDangerSection();
      default: return renderProfileSection();
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--theme-bg-secondary)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)' }
      }} />

      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'rgba(var(--theme-bg), 0.8)', borderColor: 'var(--theme-border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
            Settings
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {}
          <nav className="lg:w-56 shrink-0">
            <div className="bg-[#12121a] rounded-2xl p-3 border border-white/10 lg:sticky lg:top-24">
              <div className="space-y-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeSection === section.id 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    } ${section.id === 'danger' ? 'text-red-400 hover:text-red-300' : ''}`}
                  >
                    <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-purple-400' : ''}`} />
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {}
          <main className="flex-1 min-w-0">
            {renderActiveSection()}
          </main>
        </div>
      </div>

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
                  className={`group relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 ${
                    profile.avatarId === avatar.id 
                      ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 ring-2 ring-purple-500' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                  title={avatar.label}
                >
                  <span className="text-3xl sm:text-4xl">{avatar.emoji}</span>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center group-hover:text-white transition-colors">
                    {avatar.label}
                  </span>
                  {profile.avatarId === avatar.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowAvatarPicker(false)}
              className="w-full mt-8 py-4 rounded-xl flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              <X className="w-5 h-5" /> Close
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#12121a] rounded-3xl p-8 border border-red-500/20"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Delete Account</h2>
              <p className="text-gray-400 mt-2">This action cannot be undone</p>
            </div>

            <ul className="text-sm text-gray-400 mb-6 space-y-2 bg-red-500/5 p-4 rounded-xl">
              <li>• Profile & settings will be deleted</li>
              <li>• Community posts & comments removed</li>
              <li>• Chat messages erased</li>
            </ul>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="w-full px-4 py-3 bg-black/40 border border-red-500/30 rounded-xl text-white placeholder-gray-500 focus:border-red-500 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
