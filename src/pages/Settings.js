import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Camera, Bell, Lock, MessageSquare, Shield, Eye,
  Save, ArrowLeft, Upload, Trash2, Volume2, AtSign, FileText
} from 'lucide-react';
import apiClient from '../services/apiClient';
import './Settings.css';

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
    profileVisibility: 'public', // public, private
    allowMessages: 'everyone', // everyone, nobody
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
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
    // Ensure tokens are loaded before making API calls
    const tokens = apiClient.loadTokens();
    if (!tokens.accessToken) {
      toast.error('Please log in to access settings');
      navigate('/');
      return;
    }
    loadSettings();
  }, [navigate]);

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
    
    try {
      // Show loading toast
      const uploadToast = toast.loading('Uploading photo...');
      
      // Upload to server
      const formData = new FormData();
      formData.append('avatar', file);
      
      const result = await apiClient.uploadFile('/users/me/avatar', formData);
      
      if (result.avatarUrl) {
        setProfile(prev => ({
          ...prev,
          profilePhotoUrl: result.avatarUrl,
          profilePhotoMetadata: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
          },
        }));
        
        toast.success('Photo uploaded successfully!', { id: uploadToast });
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    }
  };

  const removePhoto = async () => {
    try {
      await apiClient.delete('/users/me/avatar');
      setProfile(prev => ({
        ...prev,
        profilePhotoUrl: null,
        profilePhotoMetadata: null,
      }));
      toast.success('Photo removed');
    } catch (error) {
      console.error('Remove photo error:', error);
      toast.error('Failed to remove photo');
    }
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
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  // Toggle Component
  const Toggle = ({ enabled, onChange, label, description }) => (
    <div className="settings-toggle-row">
      <div className="toggle-info">
        <p className="toggle-label">{label}</p>
        {description && <p className="toggle-description">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`toggle-switch ${enabled ? 'active' : ''}`}
        aria-pressed={enabled}
        aria-label={label}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="loading-spinner-large" />
          <p className="loading-text">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />
      
      {/* Header */}
      <header className="settings-header">
        <div className="settings-header-inner">
          <div className="settings-header-left">
            <button
              onClick={() => navigate('/dashboard')}
              className="settings-back-btn"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="settings-title">Settings</h1>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            className="settings-save-btn"
          >
            {saving ? (
              <div className="spinner" />
            ) : (
              <Save size={18} />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </header>

      <main className="settings-main">
        {/* Tabs */}
        <div className="settings-tabs" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="settings-content">
            {/* Profile Photo Card */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <Camera size={22} />
                </div>
                <h2 className="settings-card-title">Profile Photo</h2>
              </div>
              
              <div className="profile-photo-section">
                <div className="profile-photo-container">
                  <div className="profile-photo">
                    {profile.profilePhotoUrl ? (
                      <img src={profile.profilePhotoUrl} alt="Profile" />
                    ) : (
                      <User size={48} />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="photo-edit-btn"
                    aria-label="Change photo"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </div>
                
                <div className="profile-photo-info">
                  <p>Upload a profile photo. Max size: 5MB. Recommended: Square image.</p>
                  <div className="photo-actions">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="photo-action-btn"
                    >
                      <Upload size={16} />
                      Upload
                    </button>
                    {profile.profilePhotoUrl && (
                      <button
                        onClick={removePhoto}
                        className="photo-action-btn remove"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Identity Card */}
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <AtSign size={22} />
                </div>
                <h2 className="settings-card-title">Identity</h2>
              </div>
              
              <div className="settings-form-group">
                <label className="settings-label">
                  Username
                  <span className="settings-label-hint">(unique identifier)</span>
                </label>
                <div className="settings-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.toLowerCase() }))}
                    placeholder="your_username"
                    className="settings-input username-input"
                  />
                </div>
                {validateUsername(profile.username) !== true && (
                  <p className="input-error">{validateUsername(profile.username)}</p>
                )}
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Your Display Name"
                  maxLength={50}
                  className="settings-input"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Status Message</label>
                <input
                  type="text"
                  value={profile.statusMessage}
                  onChange={(e) => setProfile(prev => ({ ...prev, statusMessage: e.target.value }))}
                  placeholder="What's on your mind?"
                  maxLength={100}
                  className="settings-input"
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about yourself..."
                  maxLength={500}
                  rows={4}
                  className="settings-textarea"
                />
                <p className="char-count">{profile.bio.length}/500</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="settings-content">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <Eye size={22} />
                </div>
                <h2 className="settings-card-title">Profile Visibility</h2>
              </div>
              
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

            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <Shield size={22} />
                </div>
                <h2 className="settings-card-title">Interaction Settings</h2>
              </div>
              
              <div className="settings-form-group">
                <label className="settings-label">Profile Visibility</label>
                <select
                  value={privacy.profileVisibility}
                  onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
                  className="settings-select"
                >
                  <option value="public">Public - Anyone can view</option>
                  <option value="private">Private - Only you</option>
                </select>
              </div>

              <div className="settings-form-group">
                <label className="settings-label">Who Can Message You</label>
                <select
                  value={privacy.allowMessages}
                  onChange={(e) => setPrivacy(prev => ({ ...prev, allowMessages: e.target.value }))}
                  className="settings-select"
                >
                  <option value="everyone">Everyone</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="settings-content">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <Bell size={22} />
                </div>
                <h2 className="settings-card-title">Notification Types</h2>
              </div>
              
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

            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <Volume2 size={22} />
                </div>
                <h2 className="settings-card-title">Notification Preferences</h2>
              </div>
              
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
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="settings-content">
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <MessageSquare size={22} />
                </div>
                <h2 className="settings-card-title">Message Settings</h2>
              </div>
              
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

            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <FileText size={22} />
                </div>
                <h2 className="settings-card-title">Message History</h2>
              </div>
              
              <Toggle
                enabled={chat.autoDeleteMessages}
                onChange={(v) => setChat(prev => ({ ...prev, autoDeleteMessages: v }))}
                label="Auto-Delete Old Messages"
                description="Automatically delete messages after a period"
              />
              
              {chat.autoDeleteMessages && (
                <div className="settings-form-group" style={{ marginTop: '16px' }}>
                  <label className="settings-label">Keep Messages For</label>
                  <select
                    value={chat.messageRetention}
                    onChange={(e) => setChat(prev => ({ ...prev, messageRetention: parseInt(e.target.value) }))}
                    className="settings-select"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
