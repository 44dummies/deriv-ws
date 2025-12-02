import React, { useState } from 'react';
import friendsService from '../../services/friendsService';

const FriendRequests = ({ requests, onAccept, onReject, token }) => {
  const [processing, setProcessing] = useState(new Set());

  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  const handleAccept = async (friendshipId) => {
    try {
      setProcessing(prev => new Set([...prev, friendshipId]));
      await friendsService.acceptFriendRequest(token, friendshipId);
      onAccept(friendshipId);
    } catch (err) {
      alert(err.message || 'Failed to accept request');
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendshipId);
        return newSet;
      });
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      setProcessing(prev => new Set([...prev, friendshipId]));
      await friendsService.rejectFriendRequest(token, friendshipId);
      onReject(friendshipId);
    } catch (err) {
      alert(err.message || 'Failed to reject request');
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendshipId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
  };

  if (requests.length === 0) {
    return (
      <div className="friend-list-empty">
        <span className="empty-icon">📬</span>
        <p>No pending friend requests</p>
        <p className="hint">When someone sends you a request, it will appear here</p>
      </div>
    );
  }

  return (
    <div className="friend-requests">
      <div className="requests-count">
        <span>{requests.length} pending request{requests.length > 1 ? 's' : ''}</span>
      </div>
      
      {requests.map(request => (
        <div key={request.id} className="request-card">
          <div className="friend-avatar">
            {request.avatar_url ? (
              <img src={request.avatar_url} alt={request.username} />
            ) : (
              getInitials(request.username)
            )}
          </div>
          <div className="friend-info">
            <div className="friend-name">{request.username || 'Anonymous User'}</div>
            <div className="friend-status">
              Sent {formatDate(request.created_at)}
            </div>
          </div>
          <div className="request-actions">
            <button
              className="accept-btn"
              onClick={() => handleAccept(request.id)}
              disabled={processing.has(request.id)}
            >
              {processing.has(request.id) ? '...' : '✓ Accept'}
            </button>
            <button
              className="reject-btn"
              onClick={() => handleReject(request.id)}
              disabled={processing.has(request.id)}
            >
              ✕ Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendRequests;
