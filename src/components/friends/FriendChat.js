import React, { useState, useEffect, useRef } from 'react';
import privateChatService from '../../services/privateChatService';
import friendsSocket from '../../services/friendsSocket';

const FriendChat = ({ friend, user, token, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadChat();
    setupSocketListeners();

    return () => {
      // Cleanup typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [friend.friend_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocketListeners = () => {
    friendsSocket.onNewMessage((message) => {
      if (message.chat_id === chatId || message.senderId === friend.friend_id) {
        setMessages(prev => [...prev, message]);
        // Mark as read
        if (chatId) {
          privateChatService.markAsRead(token, chatId);
        }
      }
    });

    friendsSocket.onTyping((data) => {
      if (data.userId === friend.friend_id) {
        setIsTyping(true);
        // Clear typing after 3 seconds
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    friendsSocket.onPing((data) => {
      if (data.from === friend.friend_id) {
        // Visual ping notification
        const audio = new Audio('/sounds/ping.mp3');
        audio.play().catch(() => {}); // Ignore if no audio
      }
    });

    friendsSocket.onReaction((data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: [...(msg.reactions || []), data.reaction] }
          : msg
      ));
    });
  };

  const loadChat = async () => {
    try {
      setLoading(true);
      const chatData = await privateChatService.getOrCreateChat(token, friend.friend_id);
      setChatId(chatData.chat.id);
      
      const messagesData = await privateChatService.getMessages(token, chatData.chat.id);
      setMessages(messagesData.messages || []);
      
      // Mark as read
      await privateChatService.markAsRead(token, chatData.chat.id);
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (chatId) {
      friendsSocket.sendTyping(chatId, friend.friend_id);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const sentMessage = await privateChatService.sendMessage(token, chatId, messageContent);
      setMessages(prev => [...prev, sentMessage.message]);
      
      // Emit via socket for real-time
      friendsSocket.sendMessage(chatId, friend.friend_id, sentMessage.message);
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleSendPing = async () => {
    if (!chatId) return;
    
    try {
      await privateChatService.sendPing(token, chatId);
      friendsSocket.sendPing(friend.friend_id);
    } catch (err) {
      console.error('Failed to send ping:', err);
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      await privateChatService.addReaction(token, chatId, messageId, emoji);
      friendsSocket.sendReaction(chatId, messageId, emoji);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString();
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(msg => {
      const date = formatDate(msg.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(msg);
    });
    return groups;
  };

  const getInitials = (username) => {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="friend-chat">
        <div className="chat-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="chat-friend-info">
            <div className="chat-friend-name">{friend.username}</div>
          </div>
        </div>
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="friend-chat">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="friend-avatar small">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt={friend.username} />
          ) : (
            getInitials(friend.username)
          )}
          <span className={`online-indicator ${friend.is_online ? '' : 'offline'}`}></span>
        </div>
        <div className="chat-friend-info">
          <div className="chat-friend-name">{friend.username}</div>
          <div className="chat-friend-status">
            {isTyping ? (
              <span className="typing-indicator">typing...</span>
            ) : friend.is_online ? (
              <span style={{ color: '#4caf50' }}>Online</span>
            ) : (
              'Offline'
            )}
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="empty-icon">💬</span>
            <p>No messages yet</p>
            <p className="hint">Say hi to {friend.username}!</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, msgs]) => (
            <div key={date} className="message-group">
              <div className="date-divider">
                <span>{date}</span>
              </div>
              {msgs.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.sender_id === user?.deriv_account_id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    {msg.message_type === 'ping' ? (
                      <span className="ping-message">👋 Ping!</span>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="message-reactions">
                      {msg.reactions.map((r, i) => (
                        <span key={i} className="reaction">{r.emoji}</span>
                      ))}
                    </div>
                  )}
                  <div className="message-time">{formatTime(msg.created_at)}</div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-container" onSubmit={handleSendMessage}>
        <button 
          type="button" 
          className="ping-btn" 
          onClick={handleSendPing}
          title="Send a ping"
        >
          👋
        </button>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleTyping}
          disabled={sending}
        />
        <button 
          type="submit" 
          className="send-btn"
          disabled={!newMessage.trim() || sending}
        >
          {sending ? '...' : '→'}
        </button>
      </form>
    </div>
  );
};

export default FriendChat;
