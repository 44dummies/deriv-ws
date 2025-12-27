/**
 * Notifications Service - Frontend API client
 */

import { apiClient } from './apiClient';

export const notificationsService = {
  async getNotifications(options: any = {}) {
    return apiClient.get('/user/notifications', { params: options });
  },

  async getUnreadCount() {
    return apiClient.get('/user/notifications/unread/count');
  },

  async markAsRead(notificationId: string) {
    return apiClient.put(`/user/notifications/${notificationId}/read`);
  },

  async markAllAsRead() {
    return apiClient.put('/user/notifications/read-all');
  },

  async deleteNotification(notificationId: string) {
    return apiClient.delete(`/user/notifications/${notificationId}`);
  }
};

export default notificationsService;
