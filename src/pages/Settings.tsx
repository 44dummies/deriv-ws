import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Shield, Bell, Eye, Trash2, Check, X, ArrowLeft,
  LogOut, Globe, AlertTriangle, Loader2, Save, Settings as SettingsIcon,
  MessageSquare, Users, BarChart3, Smartphone, Monitor, Wifi, Sparkles, Palette, Play
} from 'lucide-react';
import { TokenService } from '../services/tokenService';
import apiClient from '../services/apiClient';
import realtimeSocket from '../services/realtimeSocket';

// Glass UI
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { GlassCard } from '../components/ui/glass/GlassCard';
import { GlassButton } from '../components/ui/glass/GlassButton';
import { GlassToggle } from '../components/ui/glass/GlassToggle';
import { GlassModal } from '../components/ui/glass/GlassModal';

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
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'privacy', label: 'Privacy', icon: Eye },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
];

const Settings = () => {
  const navigate = useNavigate();
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

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const usernameTimeoutRef = useRef<any>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const profileRes = await apiClient.get<any>('/users/me').catch(() => null);

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

      const settingsRes = await apiClient.get<any>('/users/settings').catch(() => null);

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

  const checkUsernameAvailability = useCallback(async (username: string) => {
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
      const response = await apiClient.get<any>(`/users/check-username/${username}`);
      setUsernameAvailable(response.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setProfile(prev => ({ ...prev, username: newUsername }));
    setUsernameAvailable(null);

    if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);
    usernameTimeoutRef.current = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);
  };

  const handleAvatarSelect = (avatarId: number) => {
    setProfile(prev => ({ ...prev, avatarId }));
    setShowAvatarPicker(false);
  };

  const getAvatarEmoji = (id: number) => {
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
    } catch (error: any) {
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
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-500" />
            <p className="text-slate-400">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderProfileSection = () => (
    <div className="space-y-6">
      <GlassCard className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-center gap-6">
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
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-white mb-1">Your Avatar</h3>
            <p className="text-gray-400 text-sm mb-3">Tap to choose from 30 unique avatars</p>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium border border-purple-500/30">
              <Sparkles className="w-3 h-3" /> {AVATARS.find(a => a.id === profile.avatarId)?.label}
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Profile Information
        </h3>

        {/* Username */}
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

        {/* Display Name */}
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

        {/* Bio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell others about yourself..."
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
          />
          <p className="text-xs text-gray-500 mt-2 text-right">{profile.bio?.length || 0}/500</p>
        </div>

        <GlassButton
          onClick={saveProfile}
          isLoading={saving}
          className="w-full"
        >
          Save Profile
        </GlassButton>
      </GlassCard>
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Deriv Account
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-gray-400">Account ID</span>
            <span className="font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">{profile.derivId || 'Not connected'}</span>
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
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-purple-400" />
          Active Sessions
        </h3>

        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <Wifi className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-white font-medium">Current Session</p>
          <p className="text-gray-500 text-sm">This is your only active session</p>
        </div>
      </GlassCard>

      <GlassCard>
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </GlassCard>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <GlassCard>
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
          ].map((item: any) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <item.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </div>
              <GlassToggle
                checked={(privacySettings as any)[item.key]}
                onChange={(v) => setPrivacySettings(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-4">Profile Visibility</h3>
        <select
          value={privacySettings.profileVisibility}
          onChange={(e) => setPrivacySettings(p => ({ ...p, profileVisibility: e.target.value }))}
          className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:border-purple-500 outline-none"
        >
          <option value="public">Public - Anyone can view</option>

          <option value="private">Private - Only you</option>
        </select>

        <GlassButton
          onClick={savePrivacySettings}
          isLoading={saving}
          className="w-full mt-6"
        >
          Save Privacy Settings
        </GlassButton>
      </GlassCard>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Community
        </h3>

        <div className="space-y-5">
          {[
            { key: 'communityMentions', label: 'Mentions', desc: 'When tagged in posts' },
            { key: 'postReplies', label: 'Replies', desc: 'Responses to your posts' },
            { key: 'newFollowers', label: 'New Followers', desc: 'When someone follows you' }
          ].map((item: any) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
              <GlassToggle
                checked={(notificationSettings as any)[item.key]}
                onChange={(v) => setNotificationSettings(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-400" />
          System
        </h3>

        <div className="space-y-5">
          {[
            { key: 'adminAnnouncements', label: 'Announcements', desc: 'Platform updates' },
            { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser/app alerts' }
          ].map((item: any) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
              <GlassToggle
                checked={(notificationSettings as any)[item.key]}
                onChange={(v) => setNotificationSettings(p => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>

        <GlassButton
          onClick={saveNotificationSettings}
          isLoading={saving}
          className="w-full mt-6"
        >
          Save Notification Settings
        </GlassButton>
      </GlassCard>
    </div>
  );

  const renderDangerSection = () => (
    <div className="space-y-6">
      <GlassCard className="bg-red-500/5 border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h3>

        <div className="space-y-3">
          <button
            onClick={() => toast('Coming soon')}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Clear Community Posts
          </button>
          <button
            onClick={() => toast('Coming soon')}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" /> Clear Chat History
          </button>
        </div>
      </GlassCard>

      <GlassCard className="bg-red-500/5 border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Delete Account</h3>
        <p className="text-gray-400 text-sm mb-6">
          Once you delete your account, there is no going back. All your data will be permanently removed.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
        >
          <Trash2 className="w-5 h-5" /> Delete Account Permanently
        </button>
      </GlassCard>
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

  return (
    <DashboardLayout>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1c1c28', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
      }} />

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-emerald-400" />
              Settings
            </h1>
            <p className="text-slate-400 mt-2">Manage your account preferences and personalized settings.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 shrink-0">
            <GlassCard className="p-2 lg:sticky lg:top-8">
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all whitespace-nowrap lg:whitespace-normal w-full ${activeSection === section.id
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                      } ${section.id === 'danger' && activeSection !== 'danger' ? 'text-red-400 hover:text-red-300' : ''}`}
                  >
                    <section.icon className={`w-5 h-5 shrink-0 ${activeSection === section.id ? 'text-emerald-400' : ''}`} />
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="animate-fade-in slide-in-from-bottom-4 duration-500">
              {renderActiveSection()}
            </div>
          </main>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <GlassModal
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        title="Choose Your Avatar"
      >
        <div className="p-6">
          <p className="text-gray-400 mb-6 text-center">Select an avatar that represents you</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar.id)}
                className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105 ${profile.avatarId === avatar.id
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 ring-2 ring-purple-500'
                  : 'bg-white/5 hover:bg-white/10'
                  }`}
                title={avatar.label}
              >
                <span className="text-3xl">{avatar.emoji}</span>
              </button>
            ))}
          </div>
          <GlassButton onClick={() => setShowAvatarPicker(false)} className="w-full mt-6">
            Close
          </GlassButton>
        </div>
      </GlassModal>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#12121a] rounded-3xl p-8 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Delete Account</h2>
              <p className="text-gray-400 mt-2">This action cannot be undone</p>
            </div>

            <ul className="text-sm text-gray-400 mb-6 space-y-2 bg-red-500/5 p-4 rounded-xl border border-red-500/10">
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
                className="w-full px-4 py-3 bg-black/40 border border-red-500/30 rounded-xl text-white placeholder-gray-500 focus:border-red-500 outline-none transition-all"
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
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Settings;
