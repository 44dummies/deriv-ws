import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft, Send, Heart, MessageCircle, X, Users,
  Loader2, Trash2, Share2, Paperclip,
  Smile, ChevronDown, Search, MoreVertical, CheckCheck,
  Play, FileText, Download, ImageIcon, Video, File, Mic
} from 'lucide-react';
import apiClient from '../services/apiClient';
import realtimeSocket from '../services/realtimeSocket';
import profileService from '../services/profileService';
import './Community.css';

const POST_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '💬' },
  { id: 'general', label: 'General', emoji: '💭' },
  { id: 'strategy', label: 'Strategies', emoji: '📊' },
  { id: 'result', label: 'Results', emoji: '🏆' },
  { id: 'question', label: 'Questions', emoji: '❓' },
  { id: 'news', label: 'News', emoji: '📰' }
];

const EMOJI_LIST = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉', '💯', '🚀', '💎'];

const Community = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Posts/messages state
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('all');

  // Composer state
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // UI state
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGalleryItems, setMediaGalleryItems] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);

  // Comments state
  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

  useEffect(() => {
    initializeCommunity();
    setupSocketListeners();
    return () => cleanupSocketListeners();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadFeed(1, true);
    }
  }, [activeCategory]);

  const initializeCommunity = async () => {
    try {
      setLoading(true);
      const profile = await profileService.initialize();
      if (profile) {
        setCurrentUser(profile);
      }
      await loadFeed(1, true);
      loadOnlineUsers();
      loadMediaGallery();
    } catch (error) {
      console.error('Failed to initialize community:', error);
      toast.error('Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    realtimeSocket.on('community:post:new', (post) => {
      setPosts(prev => [transformPost(post), ...prev]);
    });

    realtimeSocket.on('community:post:like', ({ postId, likeCount, liked, userId }) => {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, likeCount, liked: userId === currentUser?.id ? liked : p.liked } : p
      ));
    });

    realtimeSocket.on('community:post:comment', ({ postId, comment, commentCount }) => {
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, commentCount } : p
      ));
      if (comments[postId]) {
        setComments(prev => ({
          ...prev,
          [postId]: [...prev[postId], transformComment(comment)]
        }));
      }
    });

    realtimeSocket.on('community:user:online', (user) => {
      setOnlineUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    realtimeSocket.on('community:user:offline', ({ derivId }) => {
      setOnlineUsers(prev => prev.filter(u => u.derivId !== derivId));
    });

    realtimeSocket.on('community:typing', ({ user }) => {
      setTypingUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.id !== user.id));
      }, 3000);
    });
  };

  const cleanupSocketListeners = () => {
    (realtimeSocket as any).off('community:post:new');
    (realtimeSocket as any).off('community:post:like');
    (realtimeSocket as any).off('community:post:comment');
    (realtimeSocket as any).off('community:user:online');
    (realtimeSocket as any).off('community:user:offline');
    (realtimeSocket as any).off('community:typing');
  };

  const transformPost = (post) => ({
    id: post.id,
    content: post.content,
    postType: post.post_type || post.postType || 'general',
    imageUrl: post.image_url || post.imageUrl,
    fileUrl: post.file_url || post.fileUrl,
    fileName: post.file_name || post.fileName,
    fileType: post.file_type || post.fileType,
    fileSize: post.file_size || post.fileSize,
    likeCount: post.like_count ?? post.likeCount ?? 0,
    commentCount: post.comment_count ?? post.commentCount ?? 0,
    viewCount: post.view_count ?? post.viewCount ?? 0,
    liked: post.liked || false,
    reactions: post.reactions || {},
    createdAt: post.created_at || post.createdAt,
    author: {
      id: post.author?.id || post.user_id,
      derivId: post.author?.derivId || post.author?.deriv_id,
      username: post.author?.username || 'Anonymous',
      displayName: post.author?.displayName || post.author?.display_name,
      avatarUrl: post.author?.avatarUrl || post.author?.profile_photo
    }
  });

  const transformComment = (comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.created_at || comment.createdAt,
    author: {
      id: comment.author?.id || comment.user_id,
      username: comment.author?.username || 'Anonymous',
      avatarUrl: comment.author?.avatarUrl || comment.author?.profile_photo
    }
  });

  const loadFeed = async (pageNum = 1, reset = false) => {
    if (feedLoading) return;

    setFeedLoading(true);
    try {
      const response = await apiClient.get<any>('/community/feed', {
        params: {
          page: pageNum,
          limit: 30,
          category: activeCategory !== 'all' ? activeCategory : undefined
        }
      });

      const transformedPosts = (response.posts || []).map(transformPost);

      if (reset) {
        setPosts(transformedPosts);
        scrollToBottom();
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
      }

      setHasMore(response.pagination?.hasMore ?? false);
      setPage(pageNum);
    } catch (error) {
      console.error('Load feed error:', error);
      toast.error('Failed to load messages');
    } finally {
      setFeedLoading(false);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const response = await apiClient.get<any>('/community/online-users');
      setOnlineUsers(response.users || []);
    } catch (error) {
      setOnlineUsers(profileService.getOnlineUsers());
    }
  };

  const loadMediaGallery = async () => {
    try {
      const response = await apiClient.get<any>('/community/media');
      setMediaGalleryItems(response.media || []);
    } catch (error) {
      // Extract media from posts as fallback
      const media = posts
        .filter(p => p.imageUrl || p.fileUrl)
        .map(p => ({
          id: p.id,
          url: p.imageUrl || p.fileUrl,
          type: p.imageUrl ? 'image' : 'file',
          fileName: p.fileName,
          createdAt: p.createdAt,
          author: p.author
        }));
      setMediaGalleryItems(media);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop } = chatContainerRef.current;
    if (scrollTop < 100 && !feedLoading && hasMore) {
      loadFeed(page + 1);
    }
  }, [feedLoading, hasMore, page]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, { file, preview: e.target.result, type: 'image' }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews(prev => [...prev, { file, preview: null, type: 'file' }]);
      }
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const createPost = async () => {
    if (!messageInput.trim() && selectedFiles.length === 0) return;

    setPosting(true);
    try {
      let imageUrl = null;
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      let fileSize = null;

      if (selectedFiles.length > 0) {
        const file = selectedFiles[0];
        const formData = new FormData();

        if (file.type.startsWith('image/')) {
          formData.append('image', file);
          const uploadResult = await apiClient.uploadFile('/community/upload-image', formData) as { url: string };
          imageUrl = uploadResult.url;
        } else {
          formData.append('file', file);
          const uploadResult = await apiClient.uploadFile('/community/upload-file', formData) as { url: string };
          fileUrl = uploadResult.url;
          fileName = file.name;
          fileType = file.type;
          fileSize = file.size;
        }
      }

      const response = await apiClient.post('/community/posts', {
        content: messageInput.trim(),
        post_type: activeCategory !== 'all' ? activeCategory : 'general',
        image_url: imageUrl,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        reply_to: replyingTo?.id
      });

      const newPost = transformPost(response);
      setPosts(prev => [newPost, ...prev]);

      // Update media gallery
      if (imageUrl || fileUrl) {
        setMediaGalleryItems(prev => [{
          id: newPost.id,
          url: imageUrl || fileUrl,
          type: imageUrl ? 'image' : 'file',
          fileName,
          createdAt: newPost.createdAt,
          author: newPost.author
        }, ...prev]);
      }

      realtimeSocket.emit('community:post:new', newPost);

      setMessageInput('');
      setSelectedFiles([]);
      setFilePreviews([]);
      setReplyingTo(null);
      scrollToBottom();

      toast.success('Message sent!');
    } catch (error: any) {
      console.error('Create post error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setPosting(false);
    }
  };

  const likePost = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      const newLiked = !post.liked;

      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked: newLiked, likeCount: p.likeCount + (newLiked ? 1 : -1) }
          : p
      ));

      await apiClient.post(`/community/posts/${postId}/like`, { liked: newLiked });

      realtimeSocket.emit('community:post:like', {
        postId,
        liked: newLiked,
        userId: currentUser?.id
      });
    } catch (error) {
      console.error('Like error:', error);
      loadFeed(1, true);
    }
  };

  const loadComments = async (postId) => {
    if (loadingComments[postId]) return;

    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const response = await apiClient.get<any>(`/community/posts/${postId}/comments`);
      setComments(prev => ({
        ...prev,
        [postId]: (response.comments || []).map(transformComment)
      }));
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  const addComment = async (postId) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const response = await apiClient.post<any>(`/community/posts/${postId}/comments`, { content });

      const newComment = transformComment(response.comment || response);

      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));

      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
      ));

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));

      realtimeSocket.emit('community:post:comment', {
        postId,
        comment: newComment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      toast.error('Failed to add reply');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await apiClient.delete(`/community/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const formatTime = (date: string | Date): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return File;
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Mic;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createPost();
    }
  };

  const insertEmoji = (emoji) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getAvatarContent = (user) => {
    if (user?.avatarUrl) {
      if (user.avatarUrl.startsWith('avatar:')) {
        const avatarId = parseInt(user.avatarUrl.split(':')[1]) || 1;
        const avatars = ['🧑‍💼', '👨‍💻', '👩‍💻', '🦊', '🦁', '🐺', '🦅', '🐉', '🦈', '🐂', '🎭', '🎩', '🕶️', '🤖', '👽', '🥷', '🧙‍♂️', '🦸', '🧑‍🚀', '👑', '💎', '🚀', '⚡', '🔥', '💰', '📈', '🎯', '🏆', '🌟', '🎲'];
        return <span className="avatar-emoji">{avatars[avatarId - 1] || '👤'}</span>;
      }
      return <img src={user.avatarUrl} alt="" />;
    }
    return <span className="avatar-initial">{user?.username?.[0]?.toUpperCase() || '?'}</span>;
  };

  if (loading) {
    return (
      <div className="tg-community">
        <div className="tg-loading">
          <div className="tg-loading-spinner"></div>
          <p>Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tg-community">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="tg-header">
        <button onClick={() => navigate('/dashboard')} className="tg-header-btn">
          <ArrowLeft size={22} />
        </button>

        <div className="tg-header-info" onClick={() => setShowSidebar(true)}>
          <div className="tg-header-avatar">
            <span>💬</span>
          </div>
          <div className="tg-header-text">
            <h1>TraderMind Community</h1>
            <span className="tg-header-subtitle">
              {onlineUsers.length} online • {posts.length} messages
            </span>
          </div>
        </div>

        <div className="tg-header-actions">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="tg-header-btn"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowMediaGallery(true)}
            className="tg-header-btn"
          >
            <ImageIcon size={20} />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="tg-header-btn"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {showSearch && (
        <div className="tg-search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="tg-categories">
        {POST_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`tg-category ${activeCategory === cat.id ? 'active' : ''}`}
          >
            <span className="tg-category-emoji">{cat.emoji}</span>
            <span className="tg-category-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Area */}
      <div
        className="tg-chat-container"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {feedLoading && page === 1 && (
          <div className="tg-loading-messages">
            <div className="tg-loading-spinner small"></div>
          </div>
        )}

        {hasMore && page > 1 && (
          <div className="tg-load-more">
            <button onClick={() => loadFeed(page + 1)}>
              {feedLoading ? <Loader2 size={16} className="spin" /> : 'Load older messages'}
            </button>
          </div>
        )}

        <div className="tg-messages">
          {posts.length === 0 && !feedLoading && (
            <div className="tg-empty">
              <div className="tg-empty-icon">💬</div>
              <h3>No messages yet</h3>
              <p>Be the first to start the conversation!</p>
            </div>
          )}

          {[...posts].reverse().map((post, index, arr) => {
            const isOwn = post.author.id === currentUser?.id;
            const showAvatar = index === 0 || arr[index - 1]?.author.id !== post.author.id;
            const showName = showAvatar && !isOwn;
            const isFiltered = searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase());

            if (isFiltered) return null;

            return (
              <div
                key={post.id}
                className={`tg-message ${isOwn ? 'own' : ''} ${showAvatar ? 'with-avatar' : ''}`}
              >
                {!isOwn && showAvatar && (
                  <div className="tg-message-avatar">
                    {getAvatarContent(post.author)}
                  </div>
                )}

                <div className="tg-message-bubble">
                  {showName && (
                    <div className="tg-message-name" style={{ color: stringToColor(post.author.username) }}>
                      @{post.author.username}
                    </div>
                  )}

                  {/* Reply indicator */}
                  {post.replyTo && (
                    <div className="tg-message-reply">
                      <span>↩ Reply to {post.replyTo.author}</span>
                    </div>
                  )}

                  {/* Image */}
                  {post.imageUrl && (
                    <div
                      className="tg-message-media"
                      onClick={() => setSelectedMedia({ type: 'image', url: post.imageUrl })}
                    >
                      <img src={post.imageUrl} alt="" loading="lazy" />
                    </div>
                  )}

                  {/* File */}
                  {post.fileUrl && !post.imageUrl && (
                    <a href={post.fileUrl} target="_blank" rel="noopener noreferrer" className="tg-message-file">
                      <div className="tg-file-icon">
                        {React.createElement(getFileIcon(post.fileType), { size: 24 })}
                      </div>
                      <div className="tg-file-info">
                        <span className="tg-file-name">{post.fileName || 'File'}</span>
                        <span className="tg-file-size">{formatFileSize(post.fileSize)}</span>
                      </div>
                      <Download size={18} className="tg-file-download" />
                    </a>
                  )}

                  {/* Text content */}
                  {post.content && (
                    <div className="tg-message-text">{post.content}</div>
                  )}

                  {/* Message footer */}
                  <div className="tg-message-footer">
                    <span className="tg-message-time">{formatTime(post.createdAt)}</span>
                    {isOwn && (
                      <span className="tg-message-status">
                        <CheckCheck size={14} />
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="tg-message-actions">
                    <button
                      onClick={() => likePost(post.id)}
                      className={`tg-action ${post.liked ? 'active' : ''}`}
                    >
                      <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />
                      {post.likeCount > 0 && <span>{post.likeCount}</span>}
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`tg-action ${expandedPost === post.id ? 'active' : ''}`}
                    >
                      <MessageCircle size={16} />
                      {post.commentCount > 0 && <span>{post.commentCount}</span>}
                    </button>
                    <button
                      onClick={() => setReplyingTo(post)}
                      className="tg-action"
                    >
                      <Share2 size={16} />
                    </button>
                    {isOwn && (
                      <button onClick={() => deletePost(post.id)} className="tg-action delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comments/Replies */}
                {expandedPost === post.id && (
                  <div className="tg-replies">
                    {loadingComments[post.id] ? (
                      <div className="tg-replies-loading">
                        <Loader2 size={16} className="spin" />
                      </div>
                    ) : (
                      <>
                        {(comments[post.id] || []).map(comment => (
                          <div key={comment.id} className="tg-reply">
                            <div className="tg-reply-avatar">
                              {getAvatarContent(comment.author)}
                            </div>
                            <div className="tg-reply-content">
                              <span className="tg-reply-author">@{comment.author.username}</span>
                              <p>{comment.content}</p>
                              <span className="tg-reply-time">{formatTime(comment.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                        <div className="tg-reply-input">
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                          />
                          <button
                            onClick={() => addComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="tg-typing">
            <div className="tg-typing-dots">
              <span></span><span></span><span></span>
            </div>
            <span>{typingUsers.map(u => u.username).join(', ')} typing...</span>
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="tg-reply-preview">
          <div className="tg-reply-preview-content">
            <span className="tg-reply-preview-name">@{replyingTo.author.username}</span>
            <span className="tg-reply-preview-text">{replyingTo.content?.slice(0, 50)}...</span>
          </div>
          <button onClick={() => setReplyingTo(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* File previews */}
      {filePreviews.length > 0 && (
        <div className="tg-file-previews">
          {filePreviews.map((item, index) => (
            <div key={index} className="tg-file-preview">
              {item.type === 'image' ? (
                <img src={item.preview} alt="" />
              ) : (
                <div className="tg-file-preview-icon">
                  {React.createElement(getFileIcon(item.file.type), { size: 24 })}
                  <span>{item.file.name}</span>
                </div>
              )}
              <button onClick={() => removeFile(index)} className="tg-file-preview-remove">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="tg-input-area">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="tg-input-btn"
        >
          <Smile size={22} />
        </button>

        {showEmojiPicker && (
          <div className="tg-emoji-picker">
            {EMOJI_LIST.map(emoji => (
              <button key={emoji} onClick={() => insertEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => fileInputRef.current?.click()} className="tg-input-btn">
          <Paperclip size={22} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
          multiple
          hidden
        />

        <div className="tg-input-wrapper">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Message..."
            rows={1}
          />
        </div>

        <button
          onClick={createPost}
          disabled={posting || (!messageInput.trim() && selectedFiles.length === 0)}
          className="tg-send-btn"
        >
          {posting ? (
            <Loader2 size={20} className="spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="tg-modal-overlay" onClick={() => setShowMediaGallery(false)}>
          <div className="tg-media-gallery" onClick={e => e.stopPropagation()}>
            <div className="tg-gallery-header">
              <h2>Shared Media</h2>
              <button onClick={() => setShowMediaGallery(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="tg-gallery-tabs">
              <button className="active">
                <ImageIcon size={16} /> Photos
              </button>
              <button>
                <File size={16} /> Files
              </button>
            </div>
            <div className="tg-gallery-grid">
              {mediaGalleryItems
                .filter(m => m.type === 'image')
                .map(media => (
                  <div
                    key={media.id}
                    className="tg-gallery-item"
                    onClick={() => setSelectedMedia({ type: 'image', url: media.url })}
                  >
                    <img src={media.url} alt="" loading="lazy" />
                  </div>
                ))}
              {mediaGalleryItems.filter(m => m.type === 'image').length === 0 && (
                <div className="tg-gallery-empty">
                  <ImageIcon size={48} />
                  <p>No shared photos yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image viewer */}
      {selectedMedia && (
        <div className="tg-image-viewer" onClick={() => setSelectedMedia(null)}>
          <button className="tg-viewer-close">
            <X size={28} />
          </button>
          <img src={selectedMedia.url} alt="" />
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className="tg-sidebar-overlay" onClick={() => setShowSidebar(false)}>
          <div className="tg-sidebar" onClick={e => e.stopPropagation()}>
            <div className="tg-sidebar-header">
              <div className="tg-sidebar-avatar">💬</div>
              <h2>TraderMind Community</h2>
              <p>{onlineUsers.length} members online</p>
            </div>

            <div className="tg-sidebar-section">
              <h3>
                <Users size={16} /> Online Now
              </h3>
              <div className="tg-online-list">
                {onlineUsers.slice(0, 15).map(user => (
                  <div key={user.id || user.derivId} className="tg-online-user">
                    <div className="tg-online-avatar">
                      {getAvatarContent(user)}
                      <span className="tg-online-dot"></span>
                    </div>
                    <span>@{user.username}</span>
                  </div>
                ))}
                {onlineUsers.length > 15 && (
                  <div className="tg-online-more">
                    +{onlineUsers.length - 15} more online
                  </div>
                )}
              </div>
            </div>

            <div className="tg-sidebar-section">
              <h3>
                <ImageIcon size={16} /> Shared Media
              </h3>
              <div className="tg-sidebar-media-preview">
                {mediaGalleryItems.slice(0, 6).map(media => (
                  <div
                    key={media.id}
                    className="tg-sidebar-media-item"
                    onClick={() => { setSelectedMedia({ type: 'image', url: media.url }); setShowSidebar(false); }}
                  >
                    {media.type === 'image' && <img src={media.url} alt="" />}
                  </div>
                ))}
              </div>
              <button
                className="tg-sidebar-view-all"
                onClick={() => { setShowMediaGallery(true); setShowSidebar(false); }}
              >
                View All Media
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to generate consistent color from string
const stringToColor = (str) => {
  if (!str) return '#8b5cf6';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
  return colors[Math.abs(hash) % colors.length];
};

export default Community;
