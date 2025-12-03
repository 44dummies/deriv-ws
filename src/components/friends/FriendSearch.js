import React, { useState } from 'react';
import friendsService from '../../services/friendsService';

const FriendSearch = ({ token, currentUserId, existingFriends, onRequestSent }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await friendsService.searchUsers(token, value);
      // Filter out current user and existing friends
      const filtered = (data.users || []).filter(
        user => user.deriv_account_id !== currentUserId && 
                !existingFriends.includes(user.deriv_account_id)
      );
      setResults(filtered);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      setPendingRequests(prev => new Set([...prev, userId]));
      await friendsService.sendFriendRequest(token, userId);
      onRequestSent();
    } catch (err) {
      setPendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      alert(err.message || 'Failed to send friend request');
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get tier badge info
  const getTierInfo = (tier) => {
    const tiers = {
      'bronze': { label: 'Bronze', color: '#cd7f32', icon: '🥉' },
      'silver': { label: 'Silver', color: '#c0c0c0', icon: '🥈' },
      'gold': { label: 'Gold', color: '#ffd700', icon: '🥇' },
      'platinum': { label: 'Platinum', color: '#e5e4e2', icon: '💎' },
      'diamond': { label: 'Diamond', color: '#b9f2ff', icon: '💠' },
    };
    return tiers[tier?.toLowerCase()] || { label: 'New', color: '#6366f1', icon: '✨' };
  };

  return (
    <div className="friend-search">
      <div className="search-input-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search traders by username..."
          value={query}
          onChange={handleSearch}
          autoFocus
        />
      </div>

      {error && (
        <div className="search-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading && (
        <div className="search-loading">
          <div className="loading-spinner small"></div>
          <span>Searching traders...</span>
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="search-empty">
          <p>No traders found matching "{query}"</p>
          <p className="hint">Try a different username</p>
        </div>
      )}

      <div className="search-results">
        {results.map(user => {
          const tierInfo = getTierInfo(user.performance_tier);
          const displayName = user.display_name || user.username || user.fullname || 'Trader';
          const isPending = pendingRequests.has(user.deriv_account_id) || user.friendship_status === 'pending';
          
          return (
            <div key={user.deriv_account_id || user.id} className="trader-card">
              {/* Card Glow Effect */}
              <div className="trader-card-glow"></div>
              
              {/* Online Status Indicator */}
              <div className={`trader-status-dot ${user.is_online ? 'online' : 'offline'}`}></div>
              
              {/* Tier Badge */}
              <div className="trader-tier-badge" style={{ '--tier-color': tierInfo.color }}>
                <span className="tier-icon">{tierInfo.icon}</span>
                <span className="tier-label">{tierInfo.label}</span>
              </div>
              
              {/* Avatar Section */}
              <div className="trader-avatar-section">
                <div className="trader-avatar">
                  {user.avatar_url || user.profile_photo ? (
                    <img src={user.avatar_url || user.profile_photo} alt={displayName} />
                  ) : (
                    <div className="avatar-initials">{getInitials(displayName)}</div>
                  )}
                </div>
              </div>
              
              {/* Info Section */}
              <div className="trader-info-section">
                <h4 className="trader-name">{displayName}</h4>
                <p className="trader-username">@{user.username || 'trader'}</p>
                
                {/* Meta Info Row */}
                <div className="trader-meta">
                  {user.country && (
                    <span className="trader-country">
                      <span className="meta-icon">🌍</span>
                      {user.country}
                    </span>
                  )}
                </div>
                
                {/* Status Message */}
                {user.status_message && (
                  <p className="trader-status-msg">"{user.status_message}"</p>
                )}
              </div>
              
              {/* Action Section */}
              <div className="trader-action-section">
                <button
                  className={`trader-add-btn ${isPending ? 'pending' : ''}`}
                  onClick={() => handleSendRequest(user.deriv_account_id || user.id)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <span className="btn-icon">✓</span>
                      <span>Sent</span>
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">+</span>
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {query.length === 0 && (
        <div className="search-hint">
          <div className="hint-graphic">
            <span className="hint-icon-large">🔎</span>
            <div className="hint-circles">
              <div className="hint-circle"></div>
              <div className="hint-circle"></div>
              <div className="hint-circle"></div>
            </div>
          </div>
          <h4>Find Traders</h4>
          <p>Search by username to connect with other traders in the community</p>
        </div>
      )}
      
      {query.length === 1 && (
        <div className="search-hint-typing">
          <p>Keep typing to search...</p>
        </div>
      )}
    </div>
  );
};

export default FriendSearch;
