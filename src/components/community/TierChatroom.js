/**
 * TierChatroom Component
 * Real-time chatroom where users are auto-grouped by performance tier
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Users, Image, Paperclip, Smile, Reply, Trash2, 
  MessageCircle, ChevronDown, Upload, X, FileText, Video, Music
} from 'lucide-react';
import tierChatroomService from '../../services/tierChatroomService';
import './TierChatroom.css';

// Common emoji reactions
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '💯', '🎯'];

const TierChatroom = ({ user, analytics }) => {
  const [chatroom, setChatroom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [tier, setTier] = useState('beginner');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Calculate and set user's tier
  useEffect(() => {
    if (analytics) {
      const userTier = tierChatroomService.calculateTier(
        analytics.winRate || 0,
        analytics.totalTrades || 0
      );
      setTier(userTier);
    }
  }, [analytics]);

  // Initialize chatroom - only assign on first load, not every render
  useEffect(() => {
    initializeChatroom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const initializeChatroom = async () => {
    setLoading(true);
    try {
      // First, try to get existing chatroom assignment
      const existingResult = await tierChatroomService.getMyTierChatroom();
      
      if (existingResult.success && existingResult.assignment?.tier_chatrooms) {
        // User is already assigned - use existing assignment
        setChatroom(existingResult.assignment.tier_chatrooms);
        setTier(existingResult.assignment.tier_chatrooms.tier);
        
        // Load messages and members
        const [messagesResult, membersResult] = await Promise.all([
          tierChatroomService.getChatroomMessages(existingResult.assignment.tier_chatrooms.id),
          tierChatroomService.getChatroomMembers(existingResult.assignment.tier_chatrooms.id)
        ]);
        
        if (messagesResult.success) {
          setMessages(messagesResult.messages);
        }
        if (membersResult.success) {
          setMembers(membersResult.members);
        }
      } else {
        // User not assigned - assign them (first login)
        const assignResult = await tierChatroomService.assignToTierChatroom(
          analytics?.winRate || 0,
          analytics?.totalTrades || 0
        );
        
        if (assignResult.success && assignResult.chatroom) {
          setChatroom(assignResult.chatroom);
          setTier(assignResult.tier || 'beginner');
          
          // Load messages and members
          const [messagesResult, membersResult] = await Promise.all([
            tierChatroomService.getChatroomMessages(assignResult.chatroom.id),
            tierChatroomService.getChatroomMembers(assignResult.chatroom.id)
          ]);
          
          if (messagesResult.success) {
            setMessages(messagesResult.messages);
          }
          if (membersResult.success) {
            setMembers(membersResult.members);
          }
        } else {
          // Fallback: get all chatrooms and show appropriate one
          const chatroomsResult = await tierChatroomService.getTierChatrooms();
          if (chatroomsResult.success && chatroomsResult.chatrooms.length > 0) {
            const userChatroom = chatroomsResult.chatrooms.find(c => c.tier === tier) 
              || chatroomsResult.chatrooms[0];
            setChatroom(userChatroom);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing chatroom:', error);
    }
    setLoading(false);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (chatroom?.id) {
      tierChatroomService.setTyping(chatroom.id, true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        tierChatroomService.setTyping(chatroom.id, false);
      }, 3000);
    }
  }, [chatroom?.id]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !selectedFile) || !chatroom?.id) return;
    
    setSending(true);
    
    try {
      let result;
      
      if (selectedFile) {
        // Send file message
        result = await tierChatroomService.sendFileMessage(
          chatroom.id,
          selectedFile,
          newMessage.trim() || null
        );
      } else {
        // Send text message
        result = await tierChatroomService.sendMessage(
          chatroom.id,
          newMessage.trim(),
          replyTo?.id || null
        );
      }
      
      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message]);
        setNewMessage('');
        setReplyTo(null);
        setSelectedFile(null);
        setFilePreview(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
    
    setSending(false);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Handle reaction
  const handleReaction = async (messageId, emoji) => {
    const result = await tierChatroomService.addReaction(messageId, emoji);
    if (result.success) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: result.reactions } : msg
      ));
    }
    setShowEmojiPicker(null);
  };

  // Handle delete
  const handleDelete = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      const result = await tierChatroomService.deleteMessage(messageId);
      if (result.success) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    }
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <Image size={20} />;
    if (fileType?.startsWith('video/')) return <Video size={20} />;
    if (fileType?.startsWith('audio/')) return <Music size={20} />;
    return <FileText size={20} />;
  };

  const tierInfo = tierChatroomService.getTierInfo(tier);

  if (loading) {
    return (
      <div className="tier-chatroom-loading">
        <div className="loading-spinner" />
        <p>Finding your trading community...</p>
      </div>
    );
  }

  return (
    <div className="tier-chatroom">
      {/* Header */}
      <div className="chatroom-header" style={{ borderColor: tierInfo.color }}>
        <div className="chatroom-info">
          <span className="tier-icon">{chatroom?.icon || tierInfo.icon}</span>
          <div>
            <h3>{chatroom?.name || tierInfo.name}</h3>
            <p>{chatroom?.description || tierInfo.description}</p>
          </div>
        </div>
        <div className="chatroom-actions">
          <button 
            className="members-btn"
            onClick={() => setShowMembers(!showMembers)}
          >
            <Users size={18} />
            <span>{chatroom?.member_count || members.length}</span>
          </button>
        </div>
      </div>

      {/* Your Tier Badge */}
      <div className="tier-badge" style={{ backgroundColor: tierInfo.color + '20', borderColor: tierInfo.color }}>
        <span>{tierInfo.icon}</span>
        <span>You're in the <strong>{tierInfo.name}</strong> based on your trading performance</span>
      </div>

      {/* Main Content */}
      <div className="chatroom-content">
        {/* Messages Area */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <MessageCircle size={48} />
              <h4>Welcome to {tierInfo.name}!</h4>
              <p>Be the first to start the conversation with fellow {tier} traders.</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`message ${msg.sender?.id === user?.id ? 'own' : ''}`}
                >
                  {/* Avatar */}
                  <div className="message-avatar">
                    {msg.sender?.profile_photo ? (
                      <img src={msg.sender.profile_photo} alt="" />
                    ) : (
                      <div className="avatar-placeholder">
                        {(msg.sender?.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="message-content">
                    <div className="message-header">
                      <span className="sender-name">
                        {msg.sender?.username || msg.sender?.fullname || 'Anonymous'}
                      </span>
                      {msg.sender?.performance_tier && (
                        <span className="sender-tier">
                          {tierChatroomService.getTierInfo(msg.sender.performance_tier).icon}
                        </span>
                      )}
                      <span className="message-time">
                        {tierChatroomService.formatMessageTime(msg.created_at)}
                      </span>
                    </div>
                    
                    {/* Reply Reference */}
                    {msg.reply_to && (
                      <div className="reply-reference">
                        <Reply size={12} />
                        <span>{msg.reply_to.sender?.username}: {msg.reply_to.message_text?.substring(0, 50)}...</span>
                      </div>
                    )}
                    
                    {/* Message Text */}
                    <div className="message-text">{msg.message_text}</div>
                    
                    {/* File Attachment */}
                    {msg.file_name && (
                      <div className="message-file">
                        {getFileIcon(msg.file_type)}
                        <div className="file-info">
                          <span className="file-name">{msg.file_name}</span>
                          <span className="file-size">
                            {tierChatroomService.formatFileSize(msg.file_size)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="message-reactions">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button 
                            key={emoji}
                            className={`reaction ${users?.includes(user?.id) ? 'active' : ''}`}
                            onClick={() => handleReaction(msg.id, emoji)}
                          >
                            {emoji} {users?.length || 0}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="message-actions">
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}>
                        <Smile size={14} />
                      </button>
                      <button onClick={() => setReplyTo(msg)}>
                        <Reply size={14} />
                      </button>
                      {msg.sender?.id === user?.id && (
                        <button onClick={() => handleDelete(msg.id)} className="delete-btn">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker === msg.id && (
                      <div className="emoji-picker">
                        {EMOJI_REACTIONS.map(emoji => (
                          <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="members-sidebar">
            <div className="members-header">
              <h4>Members ({members.length})</h4>
              <button onClick={() => setShowMembers(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="members-list">
              {members.map((member, index) => (
                <div key={member.user_id || index} className="member-item">
                  <div className={`member-avatar ${member.user_profiles?.is_online ? 'online' : ''}`}>
                    {member.user_profiles?.profile_photo ? (
                      <img src={member.user_profiles.profile_photo} alt="" />
                    ) : (
                      <div className="avatar-placeholder">
                        {(member.user_profiles?.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="member-info">
                    <span className="member-name">
                      {member.user_profiles?.username || member.user_profiles?.fullname || 'Trader'}
                    </span>
                    <span className="member-stats">
                      {member.user_profiles?.win_rate?.toFixed(1)}% WR • {member.user_profiles?.total_trades || 0} trades
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="reply-preview">
          <Reply size={16} />
          <span>Replying to <strong>{replyTo.sender?.username}</strong></span>
          <button onClick={() => setReplyTo(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="file-preview">
          {filePreview ? (
            <img src={filePreview} alt="Preview" />
          ) : (
            <div className="file-icon-preview">
              {getFileIcon(selectedFile.type)}
              <span>{selectedFile.name}</span>
            </div>
          )}
          <button onClick={() => { setSelectedFile(null); setFilePreview(null); }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Message Input */}
      <form className="message-input" onSubmit={handleSendMessage}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />
        
        <button 
          type="button" 
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} />
        </button>
        
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder={`Message ${tierInfo.name}...`}
          disabled={sending}
        />
        
        <button 
          type="submit" 
          className="send-btn"
          disabled={(!newMessage.trim() && !selectedFile) || sending}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default TierChatroom;
