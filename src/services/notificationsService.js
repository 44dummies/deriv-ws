/**
 * Notifications Service - Frontend API client
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

export const notificationsService = {
  async getNotifications(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.unreadOnly) params.append('unreadOnly', 'true');
    if (options.offset) params.append('offset', options.offset);
    
    const response = await fetch(
      `${API_URL}/api/notifications?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  async getUnreadCount() {
    const response = await fetch(`${API_URL}/api/notifications/unread/count`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async markAsRead(notificationId) {
    const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async markAllAsRead() {
    const response = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async deleteNotification(notificationId) {
    const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export default notificationsService;
