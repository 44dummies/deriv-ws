/**
 * Leaderboard & Achievements Service
 */

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }
  return response.json();
};

export const leaderboardService = {
  async getLeaderboard(category = 'win_rate') {
    const response = await fetch(
      `${API_URL}/api/leaderboard?category=${category}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  async getImprovementLeaderboard() {
    const response = await fetch(`${API_URL}/api/leaderboard/improvement`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getConsistencyLeaderboard() {
    const response = await fetch(`${API_URL}/api/leaderboard/consistency`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getHelpfulnessLeaderboard() {
    const response = await fetch(`${API_URL}/api/leaderboard/helpfulness`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getStreakLeaderboard() {
    const response = await fetch(`${API_URL}/api/leaderboard/streaks`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export const achievementsService = {
  async getMyAchievements() {
    const response = await fetch(`${API_URL}/api/achievements`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getUserAchievements(userId) {
    const response = await fetch(`${API_URL}/api/achievements/user/${userId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getAchievementDefinitions() {
    const response = await fetch(`${API_URL}/api/achievements/definitions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getProgress() {
    const response = await fetch(`${API_URL}/api/achievements/progress`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export default { leaderboardService, achievementsService };
