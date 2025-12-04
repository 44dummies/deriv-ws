import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft, Send, Heart, MessageCircle, Image, X, Users,
  Hash, Loader2, MoreHorizontal, Trash2, Flag, Share2,
  TrendingUp, Zap, Target, BookOpen, HelpCircle, Clock,
  ChevronDown, Filter, RefreshCw, Smile, Camera
} from 'lucide-react';
import apiClient from '../services/apiClient';
import realtimeSocket from '../services/realtimeSocket';
import profileService from '../services/profileService';
import './Community.css';

// Post type configurations
const POST_TYPES = {
  general: { label: 'General', icon: MessageCircle, color: '#8b5cf6' },
  strategy: { label: 'Strategy', icon: Target, color: '#22c55e' },
  result: { label: 'Result', icon: TrendingUp, color: '#3b82f6' },
  question: { label: 'Question', icon: HelpCircle, color: '#f59e0b' },
  news: { label: 'News', icon: Zap, color: '#ef4444' }
};

// Default rooms
const DEFAULT_ROOMS = [
  { id: 'general', name: 'General', icon: Hash, memberCount: 0 },
  { id: 'strategies', name: 'Strategies', icon: Target, memberCount: 0 },
  { id: 'results', name: 'Results', icon: TrendingUp, memberCount: 0 },
  { id: 'beginners', name: 'Beginners', icon: BookOpen, memberCount: 0 }
];

const Community = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const feedRef = useRef(null);
  const composerRef = useRef(null);

  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Feed state
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('general');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);

  // Room state
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [roomInput, setRoomInput] = useState('');

  // Online users state
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(true);

  // Comment state
  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

  // Initialize
  useEffect(() => {
    initializeCommunity();
    setupSocketListeners();
    
    return () => {
      cleanupSocketListeners();
    };
  }, []);

  const initializeCommunity = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const profile = await profileService.initialize();
      if (profile) {
        setCurrentUser(profile);
      }

      // Load initial feed
      await loadFeed(1, true);

      // Load online users
      loadOnlineUsers();

    } catch (error) {
      console.error('Failed to initialize community:', error);
      toast.error('Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for new posts
    realtimeSocket.on('community:post:new', (post) => {
      setPosts(prev => [transformPost(post), ...prev]);
      toast.success('New post in community!', { duration: 2000 });
    });

    // Listen for post likes
    realtimeSocket.on('community:post:like', ({ postId, likeCount, liked, userId }) => {
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likeCount, liked: userId === currentUser?.id ? liked : p.liked } : p
      ));
    });

    // Listen for new comments
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

    // Listen for online users
    realtimeSocket.on('community:user:online', (user) => {
      setOnlineUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });

    realtimeSocket.on('community:user:offline', ({ derivId }) => {
      setOnlineUsers(prev => prev.filter(u => u.derivId !== derivId));
    });

    // Profile updates
    profileService.subscribe((event, data) => {
      if (event === 'user:updated') {
        // Update posts with new user info
        setPosts(prev => prev.map(p => 
          p.author.derivId === data.derivId 
            ? { ...p, author: { ...p.author, username: data.username, avatarUrl: data.avatarUrl } }
            : p
        ));
      }
    });
  };

  const cleanupSocketListeners = () => {
    realtimeSocket.off('community:post:new');
    realtimeSocket.off('community:post:like');
    realtimeSocket.off('community:post:comment');
    realtimeSocket.off('community:user:online');
    realtimeSocket.off('community:user:offline');
  };

  // Transform API post to component format
  const transformPost = (post) => ({
    id: post.id,
    content: post.content,
    postType: post.post_type || post.postType || 'general',
    imageUrl: post.image_url || post.imageUrl,
    likeCount: post.like_count ?? post.likeCount ?? 0,
    commentCount: post.comment_count ?? post.commentCount ?? 0,
    viewCount: post.view_count ?? post.viewCount ?? 0,
    liked: post.liked || false,
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

  // Load feed
  const loadFeed = async (pageNum = 1, reset = false) => {
    if (feedLoading) return;
    
    setFeedLoading(true);
    try {
      const response = await apiClient.get('/community/feed', {
        page: pageNum,
        limit: 20,
        category: filter !== 'all' ? filter : undefined,
        sortBy
      });

      const transformedPosts = (response.posts || []).map(transformPost);
      
      if (reset) {
        setPosts(transformedPosts);
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
      }
      
      setHasMore(response.pagination?.hasMore ?? false);
      setPage(pageNum);
    } catch (error) {
      console.error('Load feed error:', error);
      toast.error('Failed to load posts');
    } finally {
      setFeedLoading(false);
    }
  };

  // Load more posts (infinite scroll)
  const loadMore = useCallback(() => {
    if (!feedLoading && hasMore) {
      loadFeed(page + 1);
    }
  }, [feedLoading, hasMore, page]);

  // Scroll handler for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore();
      }
    };

    const feed = feedRef.current;
    if (feed) {
      feed.addEventListener('scroll', handleScroll);
      return () => feed.removeEventListener('scroll', handleScroll);
    }
  }, [loadMore]);

  // Filter/sort change
  useEffect(() => {
    if (!loading) {
      loadFeed(1, true);
    }
  }, [filter, sortBy]);

  // Load online users
  const loadOnlineUsers = async () => {
    try {
      const response = await apiClient.get('/community/online-users');
      setOnlineUsers(response.users || []);
    } catch (error) {
      // Use cached from profileService
      setOnlineUsers(profileService.getOnlineUsers());
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Only JPG, PNG, or WebP images allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setPostImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPostImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Create post
  const createPost = async () => {
    if (!postContent.trim() && !postImage) {
      toast.error('Please add some content');
      return;
    }

    if (postContent.length > 5000) {
      toast.error('Post is too long (max 5000 characters)');
      return;
    }

    setPosting(true);
    try {
      let imageUrl = null;

      // Upload image if present
      if (postImage) {
        const formData = new FormData();
        formData.append('image', postImage);
        const uploadResult = await apiClient.uploadFile('/community/upload-image', formData);
        imageUrl = uploadResult.url;
      }

      // Create post
      const response = await apiClient.post('/community/posts', {
        content: postContent.trim(),
        post_type: postType,
        image_url: imageUrl
      });

      // Add to feed
      const newPost = transformPost(response);
      setPosts(prev => [newPost, ...prev]);

      // Emit via WebSocket
      realtimeSocket.emit('community:post:new', newPost);

      // Reset composer
      setPostContent('');
      setPostType('general');
      removeImage();
      setComposerOpen(false);

      toast.success('Post created!');
    } catch (error) {
      console.error('Create post error:', error);
      toast.error(error.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  // Like post
  const likePost = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      const newLiked = !post.liked;

      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, liked: newLiked, likeCount: p.likeCount + (newLiked ? 1 : -1) }
          : p
      ));

      // API call
      await apiClient.post(`/community/posts/${postId}/like`, { liked: newLiked });

      // Emit via WebSocket
      realtimeSocket.emit('community:post:like', {
        postId,
        liked: newLiked,
        userId: currentUser?.id
      });

    } catch (error) {
      console.error('Like error:', error);
      // Revert on error
      loadFeed(1, true);
    }
  };

  // Load comments for a post
  const loadComments = async (postId) => {
    if (loadingComments[postId]) return;

    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const response = await apiClient.get(`/community/posts/${postId}/comments`);
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

  // Toggle comments
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

  // Add comment
  const addComment = async (postId) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      const response = await apiClient.post(`/community/posts/${postId}/comments`, { content });
      
      const newComment = transformComment(response.comment || response);
      
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
      ));

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));

      // Emit via WebSocket
      realtimeSocket.emit('community:post:comment', {
        postId,
        comment: newComment
      });

    } catch (error) {
      console.error('Add comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  // Delete post
  const deletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;

    try {
      await apiClient.delete(`/community/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Skeleton loader
  const PostSkeleton = () => (
    <div className="post-card skeleton">
      <div className="post-header">
        <div className="skeleton-avatar" />
        <div className="skeleton-info">
          <div className="skeleton-line w-32" />
          <div className="skeleton-line w-20" />
        </div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-line w-full" />
        <div className="skeleton-line w-3/4" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="community-page">
        <div className="community-loading">
          <Loader2 size={40} className="spin" />
          <p>Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-page">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="community-header">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        <h1>Community</h1>
        <button onClick={() => loadFeed(1, true)} className="refresh-btn">
          <RefreshCw size={18} className={feedLoading ? 'spin' : ''} />
        </button>
      </header>

      <div className="community-layout">
        {/* Left Sidebar - Rooms */}
        <aside className="community-sidebar rooms-sidebar">
          <h2 className="sidebar-title">
            <Hash size={16} />
            Rooms
          </h2>
          <div className="rooms-list">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id === activeRoom ? null : room.id)}
                className={`room-item ${activeRoom === room.id ? 'active' : ''}`}
              >
                <room.icon size={16} />
                <span>{room.name}</span>
                {room.memberCount > 0 && (
                  <span className="member-count">{room.memberCount}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Feed */}
        <main className="community-feed" ref={feedRef}>
          {/* Composer Toggle */}
          {!composerOpen && (
            <button 
              onClick={() => setComposerOpen(true)} 
              className="composer-toggle"
            >
              <div className="composer-avatar">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" />
                ) : (
                  <span>{currentUser?.username?.[0] || '?'}</span>
                )}
              </div>
              <span>What's on your mind?</span>
            </button>
          )}

          {/* Composer */}
          {composerOpen && (
            <div className="post-composer" ref={composerRef}>
              <div className="composer-header">
                <div className="composer-user">
                  <div className="user-avatar">
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="" />
                    ) : (
                      <span>{currentUser?.username?.[0] || '?'}</span>
                    )}
                  </div>
                  <span>@{currentUser?.username || 'anonymous'}</span>
                </div>
                <button onClick={() => setComposerOpen(false)} className="close-btn">
                  <X size={18} />
                </button>
              </div>

              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share your thoughts, strategies, or results..."
                className="composer-input"
                rows={4}
                maxLength={5000}
              />

              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button onClick={removeImage} className="remove-image">
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="composer-footer">
                <div className="composer-actions">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="action-btn"
                    title="Add image"
                  >
                    <Camera size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelect}
                    hidden
                  />

                  <select 
                    value={postType} 
                    onChange={(e) => setPostType(e.target.value)}
                    className="type-select"
                  >
                    {Object.entries(POST_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="composer-submit">
                  <span className="char-count">{postContent.length}/5000</span>
                  <button 
                    onClick={createPost}
                    disabled={posting || (!postContent.trim() && !postImage)}
                    className="post-btn"
                  >
                    {posting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                    <span>Post</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="feed-filters">
            <div className="filter-group">
              <button
                onClick={() => setFilter('all')}
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              {Object.entries(POST_TYPES).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`filter-btn ${filter === key ? 'active' : ''}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest</option>
              <option value="trending">Trending</option>
              <option value="top">Top</option>
            </select>
          </div>

          {/* Posts */}
          <div className="posts-list">
            {posts.map(post => (
              <article key={post.id} className="post-card">
                {/* Post Header */}
                <div className="post-header">
                  <div 
                    className="post-author"
                    onClick={() => {/* Open profile modal */}}
                  >
                    <div className="author-avatar">
                      {post.author.avatarUrl ? (
                        <img src={post.author.avatarUrl} alt="" />
                      ) : (
                        <span>{post.author.username?.[0] || '?'}</span>
                      )}
                    </div>
                    <div className="author-info">
                      <span className="author-name">
                        @{post.author.username}
                      </span>
                      <span className="post-time">
                        <Clock size={12} />
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="post-meta">
                    <span 
                      className="post-type-badge"
                      style={{ backgroundColor: POST_TYPES[post.postType]?.color + '20', color: POST_TYPES[post.postType]?.color }}
                    >
                      {POST_TYPES[post.postType]?.label || 'General'}
                    </span>

                    {post.author.id === currentUser?.id && (
                      <button 
                        onClick={() => deletePost(post.id)}
                        className="delete-btn"
                        title="Delete post"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <div className="post-content">
                  <p>{post.content}</p>
                  {post.imageUrl && (
                    <div className="post-image">
                      <img src={post.imageUrl} alt="" loading="lazy" />
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="post-actions">
                  <button 
                    onClick={() => likePost(post.id)}
                    className={`action-btn ${post.liked ? 'liked' : ''}`}
                  >
                    <Heart size={18} fill={post.liked ? 'currentColor' : 'none'} />
                    <span>{post.likeCount}</span>
                  </button>

                  <button 
                    onClick={() => toggleComments(post.id)}
                    className={`action-btn ${expandedPost === post.id ? 'active' : ''}`}
                  >
                    <MessageCircle size={18} />
                    <span>{post.commentCount}</span>
                  </button>

                  <button className="action-btn">
                    <Share2 size={18} />
                  </button>
                </div>

                {/* Comments Section */}
                {expandedPost === post.id && (
                  <div className="comments-section">
                    {loadingComments[post.id] ? (
                      <div className="comments-loading">
                        <Loader2 size={16} className="spin" />
                      </div>
                    ) : (
                      <>
                        <div className="comments-list">
                          {(comments[post.id] || []).map(comment => (
                            <div key={comment.id} className="comment">
                              <div className="comment-avatar">
                                {comment.author.avatarUrl ? (
                                  <img src={comment.author.avatarUrl} alt="" />
                                ) : (
                                  <span>{comment.author.username?.[0] || '?'}</span>
                                )}
                              </div>
                              <div className="comment-body">
                                <span className="comment-author">@{comment.author.username}</span>
                                <p>{comment.content}</p>
                                <span className="comment-time">{timeAgo(comment.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="comment-input-wrapper">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a comment..."
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
              </article>
            ))}

            {feedLoading && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}

            {!feedLoading && posts.length === 0 && (
              <div className="empty-feed">
                <MessageCircle size={48} />
                <h3>No posts yet</h3>
                <p>Be the first to share something with the community!</p>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="end-of-feed">
                <p>You've seen all posts</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Online Users */}
        <aside className="community-sidebar users-sidebar">
          <h2 className="sidebar-title">
            <Users size={16} />
            Online
            <span className="online-count">{onlineUsers.length}</span>
          </h2>
          <div className="online-users-list">
            {onlineUsers.slice(0, 20).map(user => (
              <div key={user.id || user.derivId} className="online-user">
                <div className="user-avatar">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" />
                  ) : (
                    <span>{user.username?.[0] || '?'}</span>
                  )}
                  <span className="online-dot" />
                </div>
                <span className="user-name">@{user.username}</span>
              </div>
            ))}

            {onlineUsers.length === 0 && (
              <p className="no-users">No users online</p>
            )}

            {onlineUsers.length > 20 && (
              <p className="more-users">+{onlineUsers.length - 20} more</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Community;
