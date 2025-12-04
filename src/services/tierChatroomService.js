/**
 * Tier Chatroom Service
 * Frontend service for tier-based community chatrooms
 * Users are auto-grouped by their performance tier (beginner, intermediate, advanced, expert, master)
 */

import apiClient from './apiClient';

const API_BASE = '/community';
const FILES_API = '/files';


const fileStorage = {
  /**
   * Upload file to server for persistent storage
   * Returns the permanent URL from Supabase Storage
   */
  uploadFile: async (file, context = 'chatroom') => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.uploadFile(`${FILES_API}/upload?context=${context}`, formData);
    return response;
  },

  /**
   * Upload voice note to server
   */
  uploadVoice: async (file, duration = null) => {
    const formData = new FormData();
    formData.append('voice', file);
    if (duration) {
      formData.append('duration', duration);
    }
    
    const response = await apiClient.uploadFile(`${FILES_API}/voice`, formData);
    return response;
  },

  /**
   * Store file metadata locally for caching
   */
  saveFileMetadata: (fileId, metadata) => {
    const files = JSON.parse(localStorage.getItem('tradermind_shared_files') || '{}');
    files[fileId] = {
      ...metadata,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('tradermind_shared_files', JSON.stringify(files));
  },

  /**
   * Get stored file metadata
   */
  getFileMetadata: (fileId) => {
    const files = JSON.parse(localStorage.getItem('tradermind_shared_files') || '{}');
    return files[fileId] || null;
  },

  /**
   * Generate file hash for integrity verification
   */
  generateFileHash: async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Create object URL for local file preview
   */
  createLocalUrl: (file) => {
    return URL.createObjectURL(file);
  },

  /**
   * Revoke object URL when done
   */
  revokeLocalUrl: (url) => {
    URL.revokeObjectURL(url);
  }
};

/**
 * Get all tier chatrooms
 */
async function getTierChatrooms() {
  try {
    const response = await apiClient.get(`${API_BASE}/tier-chatrooms`);
    return response;
  } catch (error) {
    console.error('Error fetching tier chatrooms:', error);
    return { success: false, chatrooms: [] };
  }
}

/**
 * Get user's current tier chatroom assignment
 */
async function getMyTierChatroom() {
  try {
    const response = await apiClient.get(`${API_BASE}/my-tier-chatroom`);
    return response;
  } catch (error) {
    console.error('Error fetching my chatroom:', error);
    return { success: false, assignment: null };
  }
}

/**
 * Calculate user's tier based on their analytics
 */
function calculateTier(winRate, totalTrades) {
  if (totalTrades >= 1000 && winRate >= 80) return 'master';
  if (totalTrades >= 500 && winRate >= 65) return 'expert';
  if (totalTrades >= 200 && winRate >= 55) return 'advanced';
  if (totalTrades >= 50 && winRate >= 45) return 'intermediate';
  return 'beginner';
}

/**
 * Get tier info with display properties
 */
function getTierInfo(tier) {
  const tiers = {
    beginner: {
      name: 'Beginners Hub',
      icon: '🌱',
      color: '#4CAF50',
      description: 'Learn the basics together'
    },
    intermediate: {
      name: 'Intermediate Traders',
      icon: '📈',
      color: '#2196F3',
      description: 'Level up your skills'
    },
    advanced: {
      name: 'Advanced Trading Room',
      icon: '🎯',
      color: '#9C27B0',
      description: 'For consistent traders'
    },
    expert: {
      name: 'Expert Lounge',
      icon: '👑',
      color: '#FF9800',
      description: 'Elite traders only'
    },
    master: {
      name: 'Masters Circle',
      icon: '🏆',
      color: '#F44336',
      description: 'The pinnacle of excellence'
    }
  };
  return tiers[tier] || tiers.beginner;
}

/**
 * Assign user to tier chatroom based on analytics
 */
async function assignToTierChatroom(winRate, totalTrades) {
  try {
    const response = await apiClient.post(`${API_BASE}/assign-tier`, {
      winRate,
      totalTrades
    });
    return response;
  } catch (error) {
    console.error('Error assigning to chatroom:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get chatroom members
 */
async function getChatroomMembers(chatroomId, limit = 50) {
  try {
    const response = await apiClient.get(`${API_BASE}/tier-chatroom/${chatroomId}/members`, {
      params: { limit }
    });
    return response;
  } catch (error) {
    console.error('Error fetching members:', error);
    return { success: false, members: [] };
  }
}

/**
 * Get chatroom messages
 */
async function getChatroomMessages(chatroomId, limit = 50, before = null) {
  try {
    const params = { limit };
    if (before) params.before = before;
    
    const response = await apiClient.get(`${API_BASE}/tier-chatroom/${chatroomId}/messages`, {
      params
    });
    return response;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, messages: [] };
  }
}

/**
 * Send a text message
 */
async function sendMessage(chatroomId, text, replyToId = null) {
  try {
    const response = await apiClient.post(`${API_BASE}/tier-chatroom/${chatroomId}/message`, {
      text,
      type: 'text',
      replyToId
    });
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a file message (file uploaded to server for persistent storage)
 */
async function sendFileMessage(chatroomId, file, caption = null) {
  try {
    
    const uploadResult = await fileStorage.uploadFile(file, 'chatroom');
    
    if (!uploadResult.success) {
      console.error('File upload failed:', uploadResult.error);
      return { success: false, error: uploadResult.error || 'Failed to upload file' };
    }
    
    const { url, fileName, fileType, fileSize, fileHash } = uploadResult.file;
    
    
    let messageType = 'file';
    if (fileType.startsWith('image/')) messageType = 'image';
    else if (fileType.startsWith('video/')) messageType = 'video';
    else if (fileType.startsWith('audio/')) messageType = 'audio';
    
    
    const response = await apiClient.post(`${API_BASE}/tier-chatroom/${chatroomId}/message`, {
      text: caption || `Shared: ${fileName}`,
      type: messageType,
      fileName: fileName,
      fileType: fileType,
      fileSize: fileSize,
      fileHash: fileHash,
      fileUrl: url 
    });
    
    
    if (response.success) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      fileStorage.saveFileMetadata(fileId, {
        name: fileName,
        type: fileType,
        size: fileSize,
        hash: fileHash,
        url: url
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error sending file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add reaction to message
 */
async function addReaction(messageId, emoji) {
  try {
    const response = await apiClient.post(`${API_BASE}/tier-message/${messageId}/reaction`, {
      emoji
    });
    return response;
  } catch (error) {
    console.error('Error adding reaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a message
 */
async function deleteMessage(messageId) {
  try {
    const response = await apiClient.delete(`${API_BASE}/tier-message/${messageId}`);
    return response;
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set typing indicator
 */
async function setTyping(chatroomId, isTyping) {
  try {
    await apiClient.post(`${API_BASE}/tier-chatroom/${chatroomId}/typing`, {
      isTyping
    });
  } catch (error) {
    
  }
}

/**
 * Format message time for display
 */
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default {
  
  getTierChatrooms,
  getMyTierChatroom,
  assignToTierChatroom,
  getChatroomMembers,
  getChatroomMessages,
  sendMessage,
  sendFileMessage,
  addReaction,
  deleteMessage,
  setTyping,
  
  
  calculateTier,
  getTierInfo,
  formatMessageTime,
  formatFileSize,
  
  
  fileStorage
};
