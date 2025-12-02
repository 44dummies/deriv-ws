import React, { useState } from 'react';
import { FriendsCenter, FriendsLeaderboard, UserProfile } from '../components/friends';
import './Friends.css';

const Friends = ({ user, token }) => {
  const [activeSection, setActiveSection] = useState('center');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const handleViewProfile = (userId) => {
    setSelectedUserId(userId);
    setActiveSection('profile');
  };

  const handleBackToCenter = () => {
    setSelectedUserId(null);
    setActiveSection('center');
  };

  if (!user || !token) {
    return (
      <div className="friends-page">
        <div className="friends-login-required">
          <h2>👥 Friends Center</h2>
          <p>Please log in to access the Friends Center</p>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <div className="friends-nav">
        <button 
          className={`nav-btn ${activeSection === 'center' ? 'active' : ''}`}
          onClick={() => setActiveSection('center')}
        >
          👥 Friends
        </button>
        <button 
          className={`nav-btn ${activeSection === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveSection('leaderboard')}
        >
          🏆 Leaderboard
        </button>
        <button 
          className={`nav-btn ${activeSection === 'myprofile' ? 'active' : ''}`}
          onClick={() => setActiveSection('myprofile')}
        >
          👤 My Profile
        </button>
      </div>

      <div className="friends-page-content">
        {activeSection === 'center' && (
          <FriendsCenter 
            user={user} 
            token={token}
            onViewProfile={handleViewProfile}
          />
        )}

        {activeSection === 'leaderboard' && (
          <div className="leaderboard-section">
            <FriendsLeaderboard 
              token={token} 
              userId={user?.deriv_account_id}
            />
          </div>
        )}

        {activeSection === 'myprofile' && (
          <UserProfile 
            userId={user?.deriv_account_id}
            token={token}
            isOwnProfile={true}
          />
        )}

        {activeSection === 'profile' && selectedUserId && (
          <UserProfile 
            userId={selectedUserId}
            token={token}
            isOwnProfile={false}
            onBack={handleBackToCenter}
          />
        )}
      </div>
    </div>
  );
};

export default Friends;
