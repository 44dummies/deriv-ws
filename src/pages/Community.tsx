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

// Glass UI Components
import { GlassCard } from '../components/ui/glass/GlassCard';
import { GlassButton } from '../components/ui/glass/GlassButton';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Posts/messages state
  const [posts, setPosts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState('all');

  // Composer state
  const [messageInput, setMessageInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // UI state
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGalleryItems, setMediaGalleryItems] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<any[]>([]);

  // Comments state
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

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

  const transformPost = (post: any) => ({
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

  const transformComment = (comment: any) => ({
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
          setFilePreviews(prev => [...prev, { file, preview: e.target?.result, type: 'image' }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews(prev => [...prev, { file, preview: null, type: 'file' }]);
      }
    });
  };

  const removeFile = (index: number) => {
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

  const likePost = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

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

  const loadComments = async (postId: string) => {
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

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  const addComment = async (postId: string) => {
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

  const deletePost = async (postId: string) => {
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (!fileType) return File;
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Mic;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createPost();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getAvatarContent = (user: any, className = "w-10 h-10") => {
    if (user?.avatarUrl) {
      if (user.avatarUrl.startsWith('avatar:')) {
        const avatarId = parseInt(user.avatarUrl.split(':')[1]) || 1;
        const avatars = ['🧑‍💼', '👨‍💻', '👩‍💻', '🦊', '🦁', '🐺', '🦅', '🐉', '🦈', '🐂', '🎭', '🎩', '🕶️', '🤖', '👽', '🥷', '🧙‍♂️', '🦸', '🧑‍🚀', '👑', '💎', '🚀', '⚡', '🔥', '💰', '📈', '🎯', '🏆', '🌟', '🎲'];
        return (
          <div className={`${className} bg-white/10 rounded-full flex items-center justify-center text-lg`}>
            {avatars[avatarId - 1] || '👤'}
          </div>
        );
      }
      return (
        <img
          src={user.avatarUrl}
          alt=""
          className={`${className} rounded-full object-cover border-2 border-white/10`}
        />
      );
    }
    return (
      <div className={`${className} bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold`}>
        {user?.username?.[0]?.toUpperCase() || '?'}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
        <p className="mt-4 text-slate-400">Loading community...</p>
      </div>
    );
  }

  // NOTE: Used brand colors from tailwind.config.js for replacement
  // bg-[#0e0e12] -> bg-brand-dark
  // bg-[#1c1c28] -> bg-brand-card or bg-white/5
  // bg-[#2a2a35] -> bg-white/5

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-brand-dark overflow-hidden rounded-xl border border-white/5 shadow-2xl">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex-none p-4 border-b border-white/5 flex items-center justify-between bg-brand-card/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowSidebar(true)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-brand-red flex items-center justify-center shadow-lg shadow-brand-red/20">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-tight">Community</h1>
              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                {onlineUsers.length} online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowMediaGallery(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <ImageIcon size={20} />
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex-none p-3 border-b border-white/5 bg-brand-card">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-dark border border-white/10 rounded-xl py-2 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
              autoFocus
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex-none px-4 py-3 border-b border-white/5 overflow-x-auto hide-scrollbar flex gap-2 bg-brand-dark/50">
        {POST_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-none px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${activeCategory === cat.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-brand-dark"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {feedLoading && page === 1 && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
          </div>
        )}

        {hasMore && page > 1 && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => loadFeed(page + 1)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              {feedLoading ? <Loader2 size={12} className="animate-spin" /> : 'Load older messages'}
            </button>
          </div>
        )}

        <div className="space-y-6">
          {posts.length === 0 && !feedLoading && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center text-4xl">
                💬
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No messages yet</h3>
              <p className="text-slate-400">Be the first to start the conversation!</p>
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
                className={`flex gap-3 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : ''} ${showAvatar ? 'mt-4' : 'mt-1'}`}
              >
                {!isOwn && (
                  <div className="flex-none w-10">
                    {showAvatar && getAvatarContent(post.author)}
                  </div>
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <span className="text-xs font-bold mb-1 ml-1" style={{ color: stringToColor(post.author.username) }}>
                      @{post.author.username}
                    </span>
                  )}

                  <div className={`group relative p-3 rounded-2xl ${isOwn
                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-600/10'
                    : 'bg-white/5 text-white rounded-tl-sm border border-white/5 hover:bg-white/10 transition-colors'
                    }`}>
                    {/* Reply indicator */}
                    {post.replyTo && (
                      <div className="text-xs mb-2 pl-2 border-l-2 border-white/30 opacity-70">
                        <span>↩ Reply to {post.replyTo.author}</span>
                      </div>
                    )}

                    {/* Image */}
                    {post.imageUrl && (
                      <div
                        className="mb-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedMedia({ type: 'image', url: post.imageUrl })}
                      >
                        <img src={post.imageUrl} alt="" className="max-w-full max-h-[300px] object-cover" loading="lazy" />
                      </div>
                    )}

                    {/* File */}
                    {post.fileUrl && !post.imageUrl && (
                      <a href={post.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded bg-black/20 mb-2 hover:bg-black/30 transition-colors">
                        <div className="p-2 rounded bg-white/10 text-white">
                          {React.createElement(getFileIcon(post.fileType), { size: 20 })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{post.fileName || 'File'}</div>
                          <div className="text-xs opacity-70">{formatFileSize(post.fileSize)}</div>
                        </div>
                        <Download size={16} />
                      </a>
                    )}

                    {/* Text content */}
                    {post.content && (
                      <div className="text-sm md:text-base whitespace-pre-wrap break-words">{post.content}</div>
                    )}

                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <span className="text-[10px] opacity-60">
                        {formatTime(post.createdAt)}
                      </span>
                      {isOwn && <CheckCheck size={12} className="opacity-60" />}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() => likePost(post.id)}
                      className={`flex items-center gap-1 text-xs hover:text-red-400 transition-colors ${post.liked ? 'text-brand-red font-bold' : 'text-slate-500'}`}
                    >
                      <Heart size={14} fill={post.liked ? 'currentColor' : 'none'} />
                      {post.likeCount > 0 && <span>{post.likeCount}</span>}
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1 text-xs hover:text-blue-400 transition-colors ${expandedPost === post.id ? 'text-blue-500 font-bold' : 'text-slate-500'}`}
                    >
                      <MessageCircle size={14} />
                      {post.commentCount > 0 && <span>{post.commentCount}</span>}
                    </button>
                    <button
                      onClick={() => setReplyingTo(post)}
                      className="text-slate-500 hover:text-white"
                    >
                      <Share2 size={14} />
                    </button>
                    {isOwn && (
                      <button onClick={() => deletePost(post.id)} className="text-slate-500 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Comments/Replies */}
                  {expandedPost === post.id && (
                    <div className="w-full mt-2 pl-4 border-l-2 border-white/10 space-y-3">
                      {loadingComments[post.id] ? (
                        <div className="flex justify-center py-2">
                          <Loader2 size={16} className="text-blue-500 animate-spin" />
                        </div>
                      ) : (
                        <>
                          {(comments[post.id] || []).map(comment => (
                            <div key={comment.id} className="text-sm bg-white/5 p-2 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                {getAvatarContent(comment.author, "w-5 h-5")}
                                <span className="text-xs font-bold text-slate-300">@{comment.author.username}</span>
                                <span className="text-[10px] text-slate-500">{formatTime(comment.createdAt)}</span>
                              </div>
                              <p className="text-slate-300 pl-7 text-xs">{comment.content}</p>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Write a reply..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addComment(post.id)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => addComment(post.id)}
                              disabled={!commentInputs[post.id]?.trim()}
                              className="p-1.5 bg-blue-600 rounded-lg text-white disabled:opacity-50 hover:bg-blue-700"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-slate-500 text-xs px-2 animate-pulse">
            <span className="font-medium">{typingUsers.map(u => u.username).join(', ')}</span>
            <span>is typing...</span>
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex-none p-2 bg-brand-card border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col text-sm border-l-2 border-blue-500 pl-2">
            <span className="text-blue-400 font-bold text-xs">Reply to @{replyingTo.author.username}</span>
            <span className="text-slate-400 text-xs truncate max-w-[300px]">{replyingTo.content}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-400">
            <X size={16} />
          </button>
        </div>
      )}

      {/* File previews */}
      {filePreviews.length > 0 && (
        <div className="flex-none p-2 bg-brand-card border-t border-white/5 flex gap-2 overflow-x-auto">
          {filePreviews.map((item, index) => (
            <div key={index} className="relative group w-16 h-16 rounded-lg bg-black/20 flex-none border border-white/5 overflow-hidden">
              {item.type === 'image' ? (
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-400 p-1">
                  {React.createElement(getFileIcon(item.file.type), { size: 20 })}
                  <span className="truncate w-full text-center mt-1">{item.file.name.slice(0, 5)}...</span>
                </div>
              )}
              <button onClick={() => removeFile(index)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex-none p-4 bg-brand-card border-t border-white/5">
        <div className="flex items-end gap-2 bg-brand-dark rounded-2xl p-2 border border-white/10 focus-within:border-blue-500/50 transition-colors">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-slate-400 hover:text-yellow-400 transition-colors"
          >
            <Smile size={22} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 bg-brand-card border border-white/10 rounded-xl p-2 grid grid-cols-5 gap-2 shadow-xl z-50">
              {EMOJI_LIST.map(emoji => (
                <button key={emoji} onClick={() => insertEmoji(emoji)} className="p-2 hover:bg-white/5 rounded-lg text-xl">
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-400 transition-colors">
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

          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none py-2 max-h-[100px] focus:outline-none"
            rows={1}
          />

          <button
            onClick={createPost}
            disabled={posting || (!messageInput.trim() && selectedFiles.length === 0)}
            className={`p-2 rounded-xl transition-all ${(!messageInput.trim() && selectedFiles.length === 0)
              ? 'bg-white/5 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700'
              }`}
          >
            {posting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowMediaGallery(false)}>
          <GlassCard className="w-full max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-card">
              <h2 className="text-xl font-bold text-white">Shared Media</h2>
              <button onClick={() => setShowMediaGallery(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex gap-4 p-4 border-b border-white/5 bg-brand-card/50">
              <button className="text-blue-400 font-medium flex items-center gap-2 pb-2 border-b-2 border-blue-400">
                <ImageIcon size={16} /> Photos
              </button>
              <button className="text-slate-400 hover:text-white font-medium flex items-center gap-2 pb-2 transition-colors">
                <File size={16} /> Files
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-brand-dark">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaGalleryItems
                  .filter(m => m.type === 'image')
                  .map(media => (
                    <div
                      key={media.id}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-blue-500/50 transition-colors relative group"
                      onClick={() => setSelectedMedia({ type: 'image', url: media.url })}
                    >
                      <img src={media.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="text-white" />
                      </div>
                    </div>
                  ))}
              </div>
              {mediaGalleryItems.filter(m => m.type === 'image').length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                  <ImageIcon size={48} className="mb-2 opacity-50" />
                  <p>No shared photos yet</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Image viewer */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={() => setSelectedMedia(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 rounded-full p-2">
            <X size={28} />
          </button>
          <img src={selectedMedia.url} alt="" className="max-w-full max-h-[90vh] object-contain" />
        </div>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowSidebar(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-brand-card border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right" onClick={(e: any) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl mb-3 shadow-lg shadow-purple-500/20">
                💬
              </div>
              <h2 className="text-xl font-bold text-white">Community info</h2>
              <p className="text-green-400 text-sm mt-1">{onlineUsers.length} members online</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users size={14} /> Online Now
                </h3>
                <div className="space-y-3">
                  {onlineUsers.slice(0, 15).map(user => (
                    <div key={user.id || user.derivId || Math.random()} className="flex items-center gap-3">
                      <div className="relative">
                        {getAvatarContent(user, "w-8 h-8")}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-brand-card rounded-full"></span>
                      </div>
                      <span className="text-sm text-slate-200">@{user.username}</span>
                    </div>
                  ))}
                  {onlineUsers.length > 15 && (
                    <div className="text-xs text-slate-500 pl-1">
                      +{onlineUsers.length - 15} more online
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ImageIcon size={14} /> Shared Media
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {mediaGalleryItems.slice(0, 6).map(media => (
                    <div
                      key={media.id}
                      className="aspect-square rounded-lg overflow-hidden bg-black/20 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => { setSelectedMedia({ type: 'image', url: media.url }); setShowSidebar(false); }}
                    >
                      {media.type === 'image' && <img src={media.url} alt="" className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
                <button
                  className="w-full mt-3 py-2 text-xs font-medium text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors"
                  onClick={() => { setShowMediaGallery(true); setShowSidebar(false); }}
                >
                  View All Media
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to generate consistent color from string
const stringToColor = (str: string) => {
  if (!str) return '#8b5cf6';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
  return colors[Math.abs(hash) % colors.length];
};

export default Community;
