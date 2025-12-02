import React, { useState, useEffect } from 'react';
import friendsService from '../../services/friendsService';
import UserPortfolio from './UserPortfolio';
import SharedNotes from './SharedNotes';
import SharedWatchlist from './SharedWatchlist';
import StreakDisplay from './StreakDisplay';
import './UserProfile.css';

const UserProfile = ({ userId, token, isOwnProfile = false, onBack }) => {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [userId, token]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Get user profile and friendship status
      const [profileData, friendshipData] = await Promise.all([
        friendsService.getUserProfile(token, userId),
        isOwnProfile ? null : friendsService.getFriendship(token, userId)
      ]);
      
      setProfile(profileData.user);
      if (friendshipData) {
        setFriendship(friendshipData.friendship);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="user-profile loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile error">
        <p>Profile not found</p>
        {onBack && <button onClick={onBack}>Go Back</button>}
      </div>
    );
  }

  return (
    <div className="user-profile">
      {onBack && (
        <button className="back-btn" onClick={onBack}>← Back</button>
      )}

      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} />
          ) : (
            getInitials(profile.username)
          )}
        </div>
        <div className="profile-info">
          <h2>{profile.username}</h2>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-meta">
            <span>📅 Joined {formatDate(profile.created_at)}</span>
            {friendship && (
              <span>👥 Friends since {formatDate(friendship.created_at)}</span>
            )}
          </div>
          <div className="profile-badges">
            <StreakDisplay userId={userId} token={token} />
          </div>
        </div>
      </div>

      {friendship?.anniversary_date && (
        <div className="anniversary-banner">
          🎉 Friendship Anniversary: {formatDate(friendship.anniversary_date)}
        </div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          📂 Portfolio
        </button>
        {(isOwnProfile || friendship) && (
          <>
            <button 
              className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              📝 Notes
            </button>
            <button 
              className={`tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('watchlist')}
            >
              👀 Watchlist
            </button>
          </>
        )}
      </div>

      <div className="profile-content">
        {activeTab === 'portfolio' && (
          <UserPortfolio 
            userId={userId} 
            token={token} 
            isOwner={isOwnProfile}
          />
        )}
        {activeTab === 'notes' && (
          <SharedNotes 
            friendId={userId} 
            token={token}
          />
        )}
        {activeTab === 'watchlist' && (
          <SharedWatchlist 
            friendId={userId} 
            token={token}
          />
        )}
      </div>
    </div>
  );
};

export default UserProfile;
