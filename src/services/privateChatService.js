/**
 * Chat Service - Frontend API client for private messaging
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

export const privateChatService = {
  // =============================================
  // CHATS
  // =============================================

  async getChats() {
    const response = await fetch(`${API_URL}/api/chats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getChatById(chatId) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getChatWithUser(userId) {
    const response = await fetch(`${API_URL}/api/chats/with/${userId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async archiveChat(chatId, archived) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/archive`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ archived })
    });
    return handleResponse(response);
  },

  // =============================================
  // MESSAGES
  // =============================================

  async getMessages(chatId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.before) params.append('before', options.before);
    if (options.after) params.append('after', options.after);
    
    const response = await fetch(
      `${API_URL}/api/chats/${chatId}/messages?${params.toString()}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  async sendMessage(chatId, messageData) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData)
    });
    return handleResponse(response);
  },

  /**
   * Send a file message after uploading to server
   * @param {string} chatId - Chat ID
   * @param {File} file - File to upload
   * @param {string} caption - Optional caption
   */
  async sendFileMessage(chatId, file, caption = null) {
    // Upload file first
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('accessToken');
    const uploadResponse = await fetch(`${API_URL}/api/files/upload?context=chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload file');
    }
    
    const uploadResult = await uploadResponse.json();
    
    // Determine message type
    let messageType = 'file';
    if (file.type.startsWith('image/')) messageType = 'image';
    else if (file.type.startsWith('video/')) messageType = 'video';
    else if (file.type.startsWith('audio/')) messageType = 'voice';
    
    // Send message with file URL
    return this.sendMessage(chatId, {
      message_text: caption || `Shared: ${file.name}`,
      message_type: messageType,
      media_filename: uploadResult.file.fileName,
      media_type: uploadResult.file.fileType,
      media_size: uploadResult.file.fileSize,
      file_url: uploadResult.file.url
    });
  },

  /**
   * Send a voice message
   * @param {string} chatId - Chat ID
   * @param {Blob} audioBlob - Voice recording blob
   * @param {number} duration - Duration in seconds
   */
  async sendVoiceMessage(chatId, audioBlob, duration = null) {
    // Upload voice file
    const formData = new FormData();
    formData.append('voice', audioBlob, 'voice.webm');
    if (duration) {
      formData.append('duration', duration);
    }
    
    const token = localStorage.getItem('accessToken');
    const uploadResponse = await fetch(`${API_URL}/api/files/voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload voice message');
    }
    
    const uploadResult = await uploadResponse.json();
    
    // Send message with voice URL
    return this.sendMessage(chatId, {
      message_text: '🎤 Voice message',
      message_type: 'voice',
      media_filename: uploadResult.voice.fileName,
      media_type: uploadResult.voice.fileType,
      media_size: uploadResult.voice.fileSize,
      media_duration: duration,
      file_url: uploadResult.voice.url
    });
  },

  async markAsRead(chatId) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async deleteMessage(chatId, messageId) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // =============================================
  // REACTIONS
  // =============================================

  async addReaction(chatId, messageId, reaction) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/messages/${messageId}/react`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reaction })
    });
    return handleResponse(response);
  },

  // =============================================
  // TYPING
  // =============================================

  async setTyping(chatId, isTyping) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/typing`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isTyping })
    });
    return handleResponse(response);
  },

  // =============================================
  // PING
  // =============================================

  async sendPing(chatId) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/ping`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // =============================================
  // STREAKS
  // =============================================

  async nameStreak(chatId, name) {
    const response = await fetch(`${API_URL}/api/chats/${chatId}/streak/name`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });
    return handleResponse(response);
  },

  // =============================================
  // UNREAD
  // =============================================

  async getUnreadCount() {
    const response = await fetch(`${API_URL}/api/chats/unread/count`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

export default privateChatService;
