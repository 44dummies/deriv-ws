import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Camera, Bell, Lock, MessageSquare, Shield, Eye, EyeOff,
  Save, ArrowLeft, Check, X, Upload, Trash2, Globe, Users,
  Volume2, VolumeX, Moon, Sun, Smartphone, Mail, AtSign, FileText
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { TokenService } from '../services/tokenService';

const Card = ({ children, className = '', title, icon: Icon }) => (
  <div className={`rounded-xl border backdrop-blur-xl p-6 border-white/10 ${className}`}
    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
    {title && (
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
        {Icon && <Icon className="w-5 h-5 text-purple-400" />}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const Toggle = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1">
      <p className="font-medium">{label}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-purple-500' : 'bg-gray-600'
      }`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-7' : 'translate-x-1'
      }`} />
    </button>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [profile, setProfile] = useState({
    username: '',
    displayName: '',
    bio: '',
    statusMessage: '',
    profilePhotoUrl: null,
    profilePhotoMetadata: null, // Metadata only - no actual file storage
  });
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    showUsername: true,
    showRealName: false,
    showEmail: false,
    showCountry: true,
    showPerformance: true,
    showOnlineStatus: true,
    profileVisibility: 'public', // public, friends, private
    allowFriendRequests: true,
    allowMessages: 'friends', // everyone, friends, nobody
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    friendRequests: true,
    messages: true,
    chatMentions: true,
    achievements: true,
    streakReminders: true,
    communityUpdates: true,
    soundEnabled: true,
    pushEnabled: false,
  });
  
  // Chat settings
  const [chat, setChat] = useState({
    enterToSend: true,
    showTypingIndicator: true,
    showReadReceipts: true,
    autoDeleteMessages: false,
    messageRetention: 30, // days
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/users/settings');
      
      if (response.profile) {
        setProfile({
          username: response.profile.username || '',
          displayName: response.profile.display_name || response.profile.fullname || '',
          bio: response.profile.bio || '',
          statusMessage: response.profile.status_message || '',
          profilePhotoUrl: response.profile.profile_photo || null,
          profilePhotoMetadata: response.profile.profile_photo_metadata || null,
        });
      }
      
      if (response.privacy) setPrivacy(response.privacy);
      if (response.notifications) setNotifications(response.notifications);
      if (response.chat) setChat(response.chat);
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Load defaults if API fails
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      await apiClient.put('/users/settings', {
        profile: {
          username: profile.username,
          display_name: profile.displayName,
          bio: profile.bio,
          status_message: profile.statusMessage,
          profile_photo: profile.profilePhotoUrl,
          profile_photo_metadata: profile.profilePhotoMetadata,
        },
        privacy,
        notifications,
        chat,
      });
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be less than 5MB');
      return;
    }
    
    // Create local preview URL
    const localUrl = URL.createObjectURL(file);
    
    // Store metadata only - no actual upload to server
    const metadata = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      localPath: localUrl, // This is a blob URL for preview
      // In production, you'd use a service like Cloudinary, S3, or IPFS
      // and store the external URL here
    };
    
    setProfile(prev => ({
      ...prev,
      profilePhotoUrl: localUrl,
      profilePhotoMetadata: metadata,
    }));
    
    toast.success('Photo selected! Save to apply changes.');
  };

  const removePhoto = () => {
    setProfile(prev => ({
      ...prev,
      profilePhotoUrl: null,
      profilePhotoMetadata: null,
    }));
  };

  const validateUsername = (username) => {
    if (!username) return true;
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return true;
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10"
        style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 
              rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Photo */}
            <Card title="Profile Photo" icon={Camera}>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                    flex items-center justify-center overflow-hidden">
                    {profile.profilePhotoUrl ? (
                      <img 
                        src={profile.profilePhotoUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-2 bg-purple-500 rounded-full 
                      hover:bg-purple-600 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-3">
                    Upload a profile photo. Max size: 5MB. Recommended: Square image.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg 
                        transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                    {profile.profilePhotoUrl && (
                      <button
                        onClick={removePhoto}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 
                          rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Username & Display Name */}
            <Card title="Identity" icon={AtSign}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Username
                    <span className="text-gray-400 ml-2">(searchable by friends)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                    <input
                      type="text"
                      value={profile.username}
                      onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                      placeholder="your_username"
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                        focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </div>
                  {validateUsername(profile.username) !== true && (
                    <p className="text-red-400 text-sm mt-1">{validateUsername(profile.username)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your Display Name"
                    maxLength={50}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                      focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status Message</label>
                  <input
                    type="text"
                    value={profile.statusMessage}
                    onChange={(e) => setProfile(prev => ({ ...prev, statusMessage: e.target.value }))}
                    placeholder="What's on your mind?"
                    maxLength={100}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                      focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about yourself..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                      focus:border-purple-500 focus:outline-none transition-colors resize-none"
                  />
                  <p className="text-sm text-gray-400 mt-1">{profile.bio.length}/500</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <Card title="Profile Visibility" icon={Eye}>
              <div className="space-y-2">
                <Toggle
                  enabled={privacy.showUsername}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, showUsername: v }))}
                  label="Show Username in Chatrooms"
                  description="Display your custom username instead of Deriv ID"
                />
                <Toggle
                  enabled={privacy.showRealName}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, showRealName: v }))}
                  label="Show Real Name"
                  description="Display your full name from Deriv account"
                />
                <Toggle
                  enabled={privacy.showEmail}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, showEmail: v }))}
                  label="Show Email"
                  description="Make your email visible to other users"
                />
                <Toggle
                  enabled={privacy.showCountry}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, showCountry: v }))}
                  label="Show Country"
                  description="Display your country on your profile"
                />
                <Toggle
                  enabled={privacy.showPerformance}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, showPerformance: v }))}
                  label="Show Performance Tier"
                  description="Display your trading performance tier"
                />
                <Toggle
                  enabled={privacy.showOnlineStatus}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, showOnlineStatus: v }))}
                  label="Show Online Status"
                  description="Let others see when you're online"
                />
              </div>
            </Card>

            <Card title="Interaction Settings" icon={Shield}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Profile Visibility</label>
                  <select
                    value={privacy.profileVisibility}
                    onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                      focus:border-purple-500 focus:outline-none"
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private - Only you</option>
                  </select>
                </div>

                <Toggle
                  enabled={privacy.allowFriendRequests}
                  onChange={(v) => setPrivacy(prev => ({ ...prev, allowFriendRequests: v }))}
                  label="Allow Friend Requests"
                  description="Let other users send you friend requests"
                />

                <div>
                  <label className="block text-sm font-medium mb-2">Who Can Message You</label>
                  <select
                    value={privacy.allowMessages}
                    onChange={(e) => setPrivacy(prev => ({ ...prev, allowMessages: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                      focus:border-purple-500 focus:outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card title="Notification Types" icon={Bell}>
              <div className="space-y-2">
                <Toggle
                  enabled={notifications.friendRequests}
                  onChange={(v) => setNotifications(prev => ({ ...prev, friendRequests: v }))}
                  label="Friend Requests"
                  description="When someone sends you a friend request"
                />
                <Toggle
                  enabled={notifications.messages}
                  onChange={(v) => setNotifications(prev => ({ ...prev, messages: v }))}
                  label="Direct Messages"
                  description="When you receive a private message"
                />
                <Toggle
                  enabled={notifications.chatMentions}
                  onChange={(v) => setNotifications(prev => ({ ...prev, chatMentions: v }))}
                  label="Chat Mentions"
                  description="When someone mentions you in a chatroom"
                />
                <Toggle
                  enabled={notifications.achievements}
                  onChange={(v) => setNotifications(prev => ({ ...prev, achievements: v }))}
                  label="Achievements"
                  description="When you unlock a new achievement"
                />
                <Toggle
                  enabled={notifications.streakReminders}
                  onChange={(v) => setNotifications(prev => ({ ...prev, streakReminders: v }))}
                  label="Streak Reminders"
                  description="Reminders to maintain your streaks"
                />
                <Toggle
                  enabled={notifications.communityUpdates}
                  onChange={(v) => setNotifications(prev => ({ ...prev, communityUpdates: v }))}
                  label="Community Updates"
                  description="News and updates from the community"
                />
              </div>
            </Card>

            <Card title="Notification Preferences" icon={Volume2}>
              <div className="space-y-2">
                <Toggle
                  enabled={notifications.soundEnabled}
                  onChange={(v) => setNotifications(prev => ({ ...prev, soundEnabled: v }))}
                  label="Sound Notifications"
                  description="Play sounds for notifications"
                />
                <Toggle
                  enabled={notifications.pushEnabled}
                  onChange={(v) => setNotifications(prev => ({ ...prev, pushEnabled: v }))}
                  label="Push Notifications"
                  description="Receive push notifications on your device"
                />
              </div>
            </Card>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            <Card title="Message Settings" icon={MessageSquare}>
              <div className="space-y-2">
                <Toggle
                  enabled={chat.enterToSend}
                  onChange={(v) => setChat(prev => ({ ...prev, enterToSend: v }))}
                  label="Press Enter to Send"
                  description="Send messages by pressing Enter (Shift+Enter for new line)"
                />
                <Toggle
                  enabled={chat.showTypingIndicator}
                  onChange={(v) => setChat(prev => ({ ...prev, showTypingIndicator: v }))}
                  label="Show Typing Indicator"
                  description="Let others see when you're typing"
                />
                <Toggle
                  enabled={chat.showReadReceipts}
                  onChange={(v) => setChat(prev => ({ ...prev, showReadReceipts: v }))}
                  label="Read Receipts"
                  description="Show when you've read messages"
                />
              </div>
            </Card>

            <Card title="Message History" icon={FileText}>
              <div className="space-y-4">
                <Toggle
                  enabled={chat.autoDeleteMessages}
                  onChange={(v) => setChat(prev => ({ ...prev, autoDeleteMessages: v }))}
                  label="Auto-Delete Old Messages"
                  description="Automatically delete messages after a period"
                />
                
                {chat.autoDeleteMessages && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Keep Messages For</label>
                    <select
                      value={chat.messageRetention}
                      onChange={(e) => setChat(prev => ({ ...prev, messageRetention: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg 
                        focus:border-purple-500 focus:outline-none"
                    >
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
