/**
 * Mentor Service - Frontend API client
 */

import { CONFIG } from '../config/constants';

const API_URL = CONFIG.API_URL;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('accessToken');
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

export const mentorService = {
  async setMentor(mentorId, chatId) {
    const response = await fetch(`${API_URL}/api/mentor/set/${mentorId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ chatId })
    });
    return handleResponse(response);
  },

  async removeMentor(mentorId) {
    const response = await fetch(`${API_URL}/api/mentor/remove/${mentorId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getMentees() {
    const response = await fetch(`${API_URL}/api/mentor/mentees`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getMyMentor() {
    const response = await fetch(`${API_URL}/api/mentor/my-mentor`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async submitFeedback(menteeId, chatId, feedbackData) {
    const response = await fetch(`${API_URL}/api/mentor/feedback/${menteeId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ chatId, ...feedbackData })
    });
    return handleResponse(response);
  },

  async getFeedbackHistory(mentorId = null) {
    const params = mentorId ? `?mentorId=${mentorId}` : '';
    const response = await fetch(`${API_URL}/api/mentor/feedback/history${params}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getMenteeAnalytics(menteeId, weeks = 4) {
    const response = await fetch(
      `${API_URL}/api/mentor/analytics/${menteeId}?weeks=${weeks}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  }
};

export default mentorService;
