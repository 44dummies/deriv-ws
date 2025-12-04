import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  User, Camera, Bell, Lock, Palette, 
  ArrowLeft, Upload, Trash2, Check, X, 
  ChevronRight, Loader2, Eye, EyeOff,
  Volume2, VolumeX, Moon, Sun, Globe, Shield
} from 'lucide-react';
import profileService from '../services/profileService';
import apiClient from '../services/apiClient';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({
    derivId: '',
    username: '',
    displayName: '',
    bio: '',
    statusMessage: '',
    avatarUrl: null,
    country: '',
  });
  
  // Username validation
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Settings categories
  const [privacy, setPrivacy] = useState({
    showOnlineStatus: true,
    showPerformance: true,
    allowMessages: true,
    profileVisibility: 'public',
  });
  
  const [notifications, setNotifications] = useState({
    messages: true,
    mentions: true,
    sounds: true,
    push: false,
  });
  
  const [appearance, setAppearance] = useState({
    theme: 'dark',
    compactMode: false,
  });

  // Original values for dirty checking
  const [originalProfile, setOriginalProfile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Initialize profile service and get profile
      const userProfile = await profileService.initialize();
      
      if (userProfile) {
        const profileData = {
          derivId: userProfile.derivId,
          username: userProfile.username || '',
          displayName: userProfile.displayName || '',
          bio: userProfile.bio || '',
          statusMessage: userProfile.statusMessage || '',
          avatarUrl: userProfile.avatarUrl || null,
          country: userProfile.country || '',
        };
        setProfile(profileData);
        setOriginalProfile(profileData);
      }
      
      // Load settings
      try {
        const settings = await apiClient.get('/users/settings');
        if (settings.privacy) setPrivacy(settings.privacy);
        if (settings.notifications) setNotifications(settings.notifications);
        if (settings.appearance) setAppearance(settings.appearance);
      } catch (e) {
        // Use defaults
      }
      
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Debounced username check
  const checkUsername = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    if (username === originalProfile?.username) {
      setUsernameAvailable(true);
      return;
    }
    
    setCheckingUsername(true);
    try {
      const response = await apiClient.get(`/users/check-username/${username}`);
      setUsernameAvailable(response.available);
      if (!response.available) {
        setUsernameError('Username is already taken');
      }
    } catch (error) {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, [originalProfile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (profile.username) {
        checkUsername(profile.username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [profile.username, checkUsername]);

  const validateUsername = (username) => {
    if (!username) {
      setUsernameError('');
      return true;
    }
    if (username.length < 3) {
      setUsernameError('At least 3 characters');
      return false;
    }
    if (username.length > 20) {
      setUsernameError('Maximum 20 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Letters, numbers, underscore only');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setProfile(prev => ({ ...prev, username: value }));
    validateUsername(value);
    setUsernameAvailable(null);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    e.target.value = '';
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    setUploadingPhoto(true);
    
    try {
      const result = await profileService.uploadAvatar(file);
      
      if (result.success) {
        setProfile(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
        toast.success('Photo uploaded!');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async () => {
    if (!profile.avatarUrl) return;
    
    setUploadingPhoto(true);
    try {
      const result = await profileService.removeAvatar();
      if (result.success) {
        setProfile(prev => ({ ...prev, avatarUrl: null }));
        toast.success('Photo removed');
      }
    } catch (error) {
      toast.error('Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    // Validate username
    if (!validateUsername(profile.username)) {
      toast.error('Please fix username errors');
      return;
    }
    
    if (usernameAvailable === false) {
      toast.error('Username is not available');
      return;
    }
    
    setSaving(true);
    
    try {
      // Update profile
      await profileService.updateProfile({
        username: profile.username,
        display_name: profile.displayName,
        bio: profile.bio,
        status_message: profile.statusMessage,
      });
      
      // Update settings
      await apiClient.put('/users/settings', {
        privacy,
        notifications,
        appearance,
      });
      
      setOriginalProfile(profile);
      toast.success('Settings saved!');
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!originalProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  };

  // Toggle component
  const Toggle = ({ enabled, onChange, size = 'md' }) => (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`toggle-switch ${enabled ? 'active' : ''} ${size}`}
      aria-pressed={enabled}
    >
      <span className="toggle-thumb" />
    </button>
  );

  // Setting row component
  const SettingRow = ({ icon: Icon, title, description, children }) => (
    <div className="setting-row">
      <div className="setting-row-left">
        {Icon && <Icon size={20} className="setting-icon" />}
        <div className="setting-info">
          <span className="setting-title">{title}</span>
          {description && <span className="setting-desc">{description}</span>}
        </div>
      </div>
      <div className="setting-row-right">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <Loader2 size={40} className="spin" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          },
        }}
      />
      
      {/* Header */}
      <header className="settings-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        <h1>Settings</h1>
        <button 
          onClick={saveProfile} 
          disabled={saving || !hasChanges()}
          className={`save-btn ${hasChanges() ? 'has-changes' : ''}`}
        >
          {saving ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
          <span>Save</span>
        </button>
      </header>

      <main className="settings-main">
        {/* Profile Section */}
        <section className="settings-section">
          <h2 className="section-title">
            <User size={18} />
            Profile
          </h2>
          
          {/* Avatar */}
          <div className="avatar-section">
            <div className="avatar-container">
              <div className={`avatar-wrapper ${uploadingPhoto ? 'uploading' : ''}`}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Profile" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <User size={32} />
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="avatar-overlay">
                    <Loader2 size={24} className="spin" />
                  </div>
                )}
              </div>
              
              <div className="avatar-actions">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="avatar-btn upload"
                  disabled={uploadingPhoto}
                >
                  <Upload size={16} />
                  Upload
                </button>
                {profile.avatarUrl && (
                  <button 
                    onClick={removePhoto}
                    className="avatar-btn remove"
                    disabled={uploadingPhoto}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                hidden
              />
            </div>
            
            <div className="deriv-id">
              <span className="label">Deriv ID</span>
              <span className="value">{profile.derivId}</span>
            </div>
          </div>

          {/* Username */}
          <div className="input-group">
            <label>Username</label>
            <div className="input-wrapper">
              <span className="input-prefix">@</span>
              <input
                type="text"
                value={profile.username}
                onChange={handleUsernameChange}
                placeholder="your_username"
                className={`${usernameError ? 'error' : ''} ${usernameAvailable === true ? 'valid' : ''}`}
                maxLength={20}
              />
              <span className="input-suffix">
                {checkingUsername && <Loader2 size={16} className="spin" />}
                {!checkingUsername && usernameAvailable === true && <Check size={16} className="valid" />}
                {!checkingUsername && usernameAvailable === false && <X size={16} className="error" />}
              </span>
            </div>
            {usernameError && <span className="input-error">{usernameError}</span>}
          </div>

          {/* Display Name */}
          <div className="input-group">
            <label>Display Name</label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your display name"
              maxLength={50}
            />
          </div>

          {/* Status */}
          <div className="input-group">
            <label>Status Message</label>
            <input
              type="text"
              value={profile.statusMessage}
              onChange={(e) => setProfile(prev => ({ ...prev, statusMessage: e.target.value }))}
              placeholder="What's on your mind?"
              maxLength={100}
            />
          </div>

          {/* Bio */}
          <div className="input-group">
            <label>Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell others about yourself..."
              maxLength={300}
              rows={3}
            />
            <span className="char-count">{profile.bio.length}/300</span>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="settings-section">
          <h2 className="section-title">
            <Shield size={18} />
            Privacy
          </h2>
          
          <SettingRow
            icon={Eye}
            title="Show Online Status"
            description="Let others see when you're online"
          >
            <Toggle 
              enabled={privacy.showOnlineStatus} 
              onChange={(v) => setPrivacy(p => ({ ...p, showOnlineStatus: v }))}
            />
          </SettingRow>
          
          <SettingRow
            icon={Globe}
            title="Profile Visibility"
            description="Who can see your profile"
          >
            <select 
              value={privacy.profileVisibility}
              onChange={(e) => setPrivacy(p => ({ ...p, profileVisibility: e.target.value }))}
              className="setting-select"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </SettingRow>
          
          <SettingRow
            title="Allow Messages"
            description="Let others send you direct messages"
          >
            <Toggle 
              enabled={privacy.allowMessages} 
              onChange={(v) => setPrivacy(p => ({ ...p, allowMessages: v }))}
            />
          </SettingRow>
          
          <SettingRow
            title="Show Performance"
            description="Display your trading tier on profile"
          >
            <Toggle 
              enabled={privacy.showPerformance} 
              onChange={(v) => setPrivacy(p => ({ ...p, showPerformance: v }))}
            />
          </SettingRow>
        </section>

        {/* Notifications Section */}
        <section className="settings-section">
          <h2 className="section-title">
            <Bell size={18} />
            Notifications
          </h2>
          
          <SettingRow
            title="Messages"
            description="Notifications for new messages"
          >
            <Toggle 
              enabled={notifications.messages} 
              onChange={(v) => setNotifications(n => ({ ...n, messages: v }))}
            />
          </SettingRow>
          
          <SettingRow
            title="Mentions"
            description="When someone mentions you"
          >
            <Toggle 
              enabled={notifications.mentions} 
              onChange={(v) => setNotifications(n => ({ ...n, mentions: v }))}
            />
          </SettingRow>
          
          <SettingRow
            icon={notifications.sounds ? Volume2 : VolumeX}
            title="Sound Effects"
            description="Play sounds for notifications"
          >
            <Toggle 
              enabled={notifications.sounds} 
              onChange={(v) => setNotifications(n => ({ ...n, sounds: v }))}
            />
          </SettingRow>
          
          <SettingRow
            title="Push Notifications"
            description="Receive push notifications"
          >
            <Toggle 
              enabled={notifications.push} 
              onChange={(v) => setNotifications(n => ({ ...n, push: v }))}
            />
          </SettingRow>
        </section>

        {/* Appearance Section */}
        <section className="settings-section">
          <h2 className="section-title">
            <Palette size={18} />
            Appearance
          </h2>
          
          <SettingRow
            icon={appearance.theme === 'dark' ? Moon : Sun}
            title="Theme"
            description="Choose your preferred theme"
          >
            <select 
              value={appearance.theme}
              onChange={(e) => setAppearance(a => ({ ...a, theme: e.target.value }))}
              className="setting-select"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </SettingRow>
          
          <SettingRow
            title="Compact Mode"
            description="Reduce spacing and padding"
          >
            <Toggle 
              enabled={appearance.compactMode} 
              onChange={(v) => setAppearance(a => ({ ...a, compactMode: v }))}
            />
          </SettingRow>
        </section>
      </main>
    </div>
  );
};

export default Settings;
