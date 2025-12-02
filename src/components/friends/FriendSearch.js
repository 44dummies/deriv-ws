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

  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="friend-search">
      <div className="search-input-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by username..."
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
          <span>Searching...</span>
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="search-empty">
          <p>No users found matching "{query}"</p>
          <p className="hint">Try a different username</p>
        </div>
      )}

      <div className="search-results">
        {results.map(user => (
          <div key={user.deriv_account_id} className="search-result-card">
            <div className="friend-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} />
              ) : (
                getInitials(user.username)
              )}
            </div>
            <div className="friend-info">
              <div className="friend-name">{user.username}</div>
              {user.bio && (
                <div className="friend-bio">{user.bio.substring(0, 50)}...</div>
              )}
            </div>
            <button
              className={`add-friend-btn ${pendingRequests.has(user.deriv_account_id) ? 'pending' : ''}`}
              onClick={() => handleSendRequest(user.deriv_account_id)}
              disabled={pendingRequests.has(user.deriv_account_id)}
            >
              {pendingRequests.has(user.deriv_account_id) ? '✓ Sent' : '+ Add'}
            </button>
          </div>
        ))}
      </div>

      {query.length === 0 && (
        <div className="search-hint">
          <span className="hint-icon">💡</span>
          <p>Search for friends by their username to start connecting!</p>
        </div>
      )}
    </div>
  );
};

export default FriendSearch;
