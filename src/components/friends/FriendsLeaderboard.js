import React, { useState, useEffect } from 'react';
import leaderboardService from '../../services/leaderboardService';
import './Leaderboard.css';

const FriendsLeaderboard = ({ token, userId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [metric, setMetric] = useState('profit_loss');
  const [timeframe, setTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, [metric, timeframe, token]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await leaderboardService.getLeaderboard(token, metric, timeframe);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (friendId) => {
    try {
      setSelectedFriend(friendId);
      const data = await leaderboardService.compareWithFriend(token, friendId, timeframe);
      setComparison(data);
    } catch (err) {
      console.error('Failed to compare:', err);
    }
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatValue = (value, metricType) => {
    if (metricType === 'profit_loss') {
      const formatted = Math.abs(value).toFixed(2);
      return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
    }
    if (metricType === 'win_rate') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (metricType === 'trades_count') {
      return value;
    }
    return value;
  };

  return (
    <div className="friends-leaderboard">
      <div className="leaderboard-header">
        <h3>🏆 Friends Leaderboard</h3>
        <div className="leaderboard-filters">
          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value)}
            className="filter-select"
          >
            <option value="profit_loss">Profit/Loss</option>
            <option value="win_rate">Win Rate</option>
            <option value="trades_count">Trade Count</option>
          </select>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="filter-select"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="leaderboard-empty">
          <span className="empty-icon">📊</span>
          <p>No leaderboard data yet</p>
          <p className="hint">Add friends and start trading to see rankings!</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.user_id} 
              className={`leaderboard-item ${entry.user_id === userId ? 'is-me' : ''}`}
            >
              <div className="rank">{getRankIcon(index + 1)}</div>
              <div className="user-avatar">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt={entry.username} />
                ) : (
                  getInitials(entry.username)
                )}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {entry.username}
                  {entry.user_id === userId && <span className="you-badge">You</span>}
                </div>
                <div className="user-stats">
                  {entry.streak_days > 0 && (
                    <span className="streak-badge">🔥 {entry.streak_days}</span>
                  )}
                </div>
              </div>
              <div className={`score ${entry.value >= 0 ? 'positive' : 'negative'}`}>
                {formatValue(entry.value, metric)}
              </div>
              {entry.user_id !== userId && (
                <button 
                  className="compare-btn"
                  onClick={() => handleCompare(entry.user_id)}
                >
                  Compare
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {comparison && (
        <div className="comparison-modal" onClick={() => setComparison(null)}>
          <div className="comparison-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setComparison(null)}>×</button>
            <h4>📊 Comparison</h4>
            <div className="comparison-grid">
              <div className="comparison-user">
                <strong>You</strong>
                <div className="stat">
                  <span>Profit/Loss</span>
                  <span className={comparison.you?.profit_loss >= 0 ? 'positive' : 'negative'}>
                    {formatValue(comparison.you?.profit_loss || 0, 'profit_loss')}
                  </span>
                </div>
                <div className="stat">
                  <span>Win Rate</span>
                  <span>{formatValue(comparison.you?.win_rate || 0, 'win_rate')}</span>
                </div>
                <div className="stat">
                  <span>Trades</span>
                  <span>{comparison.you?.trades_count || 0}</span>
                </div>
              </div>
              <div className="vs">VS</div>
              <div className="comparison-user">
                <strong>{comparison.friend?.username}</strong>
                <div className="stat">
                  <span>Profit/Loss</span>
                  <span className={comparison.friend?.profit_loss >= 0 ? 'positive' : 'negative'}>
                    {formatValue(comparison.friend?.profit_loss || 0, 'profit_loss')}
                  </span>
                </div>
                <div className="stat">
                  <span>Win Rate</span>
                  <span>{formatValue(comparison.friend?.win_rate || 0, 'win_rate')}</span>
                </div>
                <div className="stat">
                  <span>Trades</span>
                  <span>{comparison.friend?.trades_count || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsLeaderboard;
