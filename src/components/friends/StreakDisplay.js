import React, { useState, useEffect } from 'react';
import leaderboardService from '../../services/leaderboardService';

const StreakDisplay = ({ userId, token }) => {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadStreak();
    }
  }, [token, userId]);

  const loadStreak = async () => {
    try {
      // Get achievements which includes streak info
      const data = await leaderboardService.getAchievements(token, userId);
      const streakAchievement = data.achievements?.find(a => a.achievement_type === 'streak');
      if (streakAchievement) {
        setStreak(streakAchievement);
      }
    } catch (err) {
      console.error('Failed to load streak:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStreakTier = (days) => {
    if (days >= 180) return { name: 'Aurora', class: 'aurora' };
    if (days >= 90) return { name: 'Diamond', class: 'diamond' };
    if (days >= 30) return { name: 'Gold', class: 'gold' };
    if (days >= 14) return { name: 'Silver', class: 'silver' };
    if (days >= 7) return { name: 'Bronze', class: 'bronze' };
    if (days >= 3) return { name: 'Starter', class: 'starter' };
    return null;
  };

  if (loading || !streak) {
    return null;
  }

  const tier = getStreakTier(streak.current_streak || 0);
  const currentStreak = streak.current_streak || 0;

  if (currentStreak < 3) {
    return null; // Don't show if no streak yet
  }

  return (
    <div className="streak-display" title={`${currentStreak} day streak!`}>
      <span className="streak-icon">🔥</span>
      <span className="streak-count">{currentStreak}</span>
      {tier && (
        <span className={`streak-tier ${tier.class}`}>
          {tier.name}
        </span>
      )}
    </div>
  );
};

export default StreakDisplay;
