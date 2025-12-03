const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../db/supabase');

/**
 * Community Service - Supabase-backed with in-memory fallback
 * 
 * This service provides community post functionality. It attempts to use
 * Supabase tables (community_posts, post_comments, post_votes) when available,
 * falling back to in-memory storage for development or when tables don't exist.
 */

let useSupabase = null; // null = unknown, true = use DB, false = use memory

async function checkSupabaseAvailable() {
  if (useSupabase !== null) return useSupabase;
  
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('[Community] Supabase tables not found, using in-memory fallback');
      useSupabase = false;
    } else if (error) {
      console.log('[Community] Supabase error:', error.message, '- using in-memory fallback');
      useSupabase = false;
    } else {
      console.log('[Community] Supabase tables available, using database');
      useSupabase = true;
    }
  } catch (err) {
    console.log('[Community] Failed to check Supabase:', err.message, '- using in-memory fallback');
    useSupabase = false;
  }
  
  return useSupabase;
}

const demoUsers = [
  {
    id: 'demo-user-main',
    username: 'TraderNova',
    displayName: 'Trader Nova',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=TN',
    reputation: 420
  },
  {
    id: 'demo-user-mentor',
    username: 'MentorWave',
    displayName: 'Mentor Wave',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=MW',
    reputation: 610
  },
  {
    id: 'demo-user-analyst',
    username: 'QuantAyesha',
    displayName: 'Quant Ayesha',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=QA',
    reputation: 355
  },
  {
    id: 'demo-user-ai',
    username: 'AITactician',
    displayName: 'AI Tactician',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=AI',
    reputation: 502
  }
];

const now = Date.now();

const seedPosts = [
  {
    id: uuidv4(),
    userId: demoUsers[0].id,
    title: 'Recovering from a 5-trade drawdown',
    content:
      'Last week I hit a 5-trade losing streak. I audited every entry, reduced size by 50%, and focused on A+ setups only. Ended the week +2R. Sharing full checklist inside.',
    category: 'mindset',
    tags: ['mindset', 'risk', 'playbook'],
    attachments: [],
    votes: 42,
    upvotes: 48,
    downvotes: 6,
    viewCount: 1800,
    isPinned: true,
    createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    comments: [
      {
        id: uuidv4(),
        userId: demoUsers[1].id,
        content: 'Thanks for being transparent. Journaling the emotions is key during streaks.',
        createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString()
      },
      {
        id: uuidv4(),
        userId: demoUsers[2].id,
        content: 'Curious what metrics you tracked before scaling back up?',
        createdAt: new Date(now - 1000 * 60 * 30).toISOString()
      }
    ],
    isDeleted: false
  },
  {
    id: uuidv4(),
    userId: demoUsers[1].id,
    title: '52-week high breakout checklist (free template)',
    content:
      'Sharing my 7-step breakout checklist that focuses on volume pockets, multi-timeframe confluence, and risk compression. Link inside to duplicate on Notion.',
    category: 'strategy',
    tags: ['breakouts', 'trend following', 'tools'],
    attachments: ['https://www.notion.so/template/breakout'],
    votes: 65,
    upvotes: 72,
    downvotes: 7,
    viewCount: 2400,
    isPinned: false,
    createdAt: new Date(now - 1000 * 60 * 60 * 40).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 10).toISOString(),
    comments: [
      {
        id: uuidv4(),
        userId: demoUsers[0].id,
        content: 'Downloaded! Already added my ATR-based filter. Appreciate you.',
        createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString()
      }
    ],
    isDeleted: false
  },
  {
    id: uuidv4(),
    userId: demoUsers[3].id,
    title: 'AI sentiment dashboard for synthetic indices',
    content:
      'Built a lightweight sentiment layer by scraping Telegram, Twitter, and Deriv tick data. Combining it with EMA clouds improved timing on volatility spikes.',
    category: 'tools',
    tags: ['ai', 'synthetic', 'automation'],
    attachments: [],
    votes: 31,
    upvotes: 34,
    downvotes: 3,
    viewCount: 980,
    isPinned: false,
    createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 1).toISOString(),
    comments: [],
    isDeleted: false
  }
];

let posts = [...seedPosts];
const postVotes = new Map();

function getUserProfile(userId, overrides = {}) {
  const demo = demoUsers.find((user) => user.id === userId);
  const username = overrides.username || overrides.authorUsername || demo?.username || `Trader_${String(userId).slice(-4)}`;
  return {
    id: userId,
    username,
    displayName: overrides.displayName || overrides.authorDisplayName || demo?.displayName || username,
    avatarUrl:
      overrides.avatarUrl || demo?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
    reputation: overrides.reputation ?? demo?.reputation ?? 0
  };
}

function clonePost(post, userId = null) {
  const authorProfile = getUserProfile(post.userId);
  const userVote = userId ? postVotes.get(`${post.id}:${userId}`) || 0 : 0;
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    category: post.category,
    tags: post.tags,
    attachments: post.attachments,
    author: {
      username: authorProfile.username,
      displayName: authorProfile.displayName,
      avatarUrl: authorProfile.avatarUrl,
      reputation: authorProfile.reputation
    },
    votes: post.votes,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    commentCount: post.comments.length,
    userVote,
    isPinned: Boolean(post.isPinned),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    viewCount: post.viewCount || 0
  };
}

function clonePostWithComments(post, userId = null) {
  const base = clonePost(post, userId);
  return {
    ...base,
    comments: post.comments.map((comment) => {
      const profile = getUserProfile(comment.userId);
      return {
        id: comment.id,
        content: comment.content,
        author: {
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl
        },
        createdAt: comment.createdAt
      };
    })
  };
}

function paginate(list, page, limit) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = list.slice(start, end);
  return {
    slice,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: end < total
    }
  };
}

function sortPosts(list, sortBy) {
  switch (sortBy) {
    case 'newest':
      return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'top':
      return [...list].sort((a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));
    case 'trending':
    default:
      return [...list].sort(
        (a, b) =>
          b.votes / Math.max(1, (Date.now() - new Date(b.createdAt)) / 3600000) -
          a.votes / Math.max(1, (Date.now() - new Date(a.createdAt)) / 3600000)
      );
  }
}

function filterByTimeRange(list, timeRange) {
  if (!timeRange || timeRange === 'all') return list;
  const nowTs = Date.now();
  const deltaMap = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
  };
  const limit = deltaMap[timeRange];
  if (!limit) return list;
  return list.filter((post) => nowTs - new Date(post.createdAt).getTime() <= limit);
}

async function createPost(userId, data = {}, userInfo = {}) {
  const { title, content, category, tags = [], attachments = [] } = data;
  if (!title || title.length < 5 || title.length > 200) {
    return { success: false, error: 'Title must be 5-200 characters' };
  }
  if (!content || content.length < 10 || content.length > 10000) {
    return { success: false, error: 'Content must be 10-10000 characters' };
  }

  const newPost = {
    id: uuidv4(),
    userId,
    title: title.trim(),
    content: content.trim(),
    category: category || 'discussion',
    tags: Array.isArray(tags) ? tags : [],
    attachments: Array.isArray(attachments) ? attachments : [],
    votes: 0,
    upvotes: 0,
    downvotes: 0,
    viewCount: 0,
    isPinned: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: []
  };

  posts = [newPost, ...posts];
  return { success: true, post: clonePost(newPost, userInfo.id || userId) };
}

async function getFeed(options = {}) {
  const { page = 1, limit = 20, category, sortBy = 'trending', timeRange = 'week', userId = null } = options;
  let visible = posts.filter((post) => !post.isDeleted);
  if (category) {
    visible = visible.filter((post) => post.category === category);
  }
  visible = filterByTimeRange(visible, timeRange);
  visible = sortPosts(visible, sortBy);
  const { slice, pagination } = paginate(visible, page, limit);
  return {
    posts: slice.map((post) => clonePost(post, userId)),
    pagination
  };
}

async function getPost(postId, userId = null) {
  const post = posts.find((item) => item.id === postId && !item.isDeleted);
  if (!post) return null;
  post.viewCount += 1;
  post.updatedAt = new Date().toISOString();
  return clonePostWithComments(post, userId);
}

async function votePost(userId, postId, value) {
  if (![1, 0, -1].includes(value)) {
    return { success: false, error: 'Invalid vote value' };
  }
  const post = posts.find((item) => item.id === postId && !item.isDeleted);
  if (!post) {
    return { success: false, error: 'Post not found' };
  }
  const key = `${postId}:${userId}`;
  const previous = postVotes.get(key) || 0;
  postVotes.set(key, value);

  post.votes += value - previous;
  if (previous === 1) post.upvotes -= 1;
  if (previous === -1) post.downvotes -= 1;
  if (value === 1) post.upvotes += 1;
  if (value === -1) post.downvotes += 1;
  if (value === 0) postVotes.delete(key);

  return {
    success: true,
    votes: post.votes,
    upvotes: post.upvotes,
    downvotes: post.downvotes
  };
}

async function addComment(userId, postId, content, userInfo = {}) {
  if (!content || content.trim().length < 1 || content.length > 2000) {
    return { success: false, error: 'Comment must be 1-2000 characters' };
  }
  const post = posts.find((item) => item.id === postId && !item.isDeleted);
  if (!post) {
    return { success: false, error: 'Post not found' };
  }
  const comment = {
    id: uuidv4(),
    userId,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };
  post.comments.push(comment);
  post.updatedAt = new Date().toISOString();

  const profile = getUserProfile(userId, userInfo);
  return {
    success: true,
    comment: {
      id: comment.id,
      content: comment.content,
      author: {
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl
      },
      createdAt: comment.createdAt
    }
  };
}

async function deletePost(userId, postId) {
  const post = posts.find((item) => item.id === postId && !item.isDeleted);
  if (!post) {
    return { success: false, error: 'Post not found' };
  }
  if (post.userId !== userId) {
    return { success: false, error: 'Not authorized to delete this post' };
  }
  post.isDeleted = true;
  post.updatedAt = new Date().toISOString();
  return { success: true };
}

async function deleteComment(userId, commentId) {
  for (const post of posts) {
    const commentIndex = post.comments.findIndex((comment) => comment.id === commentId);
    if (commentIndex !== -1) {
      if (post.comments[commentIndex].userId !== userId) {
        return { success: false, error: 'Not authorized to delete this comment' };
      }
      post.comments.splice(commentIndex, 1);
      post.updatedAt = new Date().toISOString();
      return { success: true };
    }
  }
  return { success: false, error: 'Comment not found' };
}

async function getUserPosts(username, page = 1, limit = 20) {
  const filtered = posts.filter((post) => {
    const profile = getUserProfile(post.userId);
    return !post.isDeleted && profile.username.toLowerCase() === username.toLowerCase();
  });
  const ordered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { slice, pagination } = paginate(ordered, page, limit);
  return {
    posts: slice.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      votes: post.votes,
      commentCount: post.comments.length,
      createdAt: post.createdAt
    })),
    pagination
  };
}

async function getTrendingTags(limit = 10) {
  const tagCount = posts.reduce((acc, post) => {
    if (post.isDeleted) return acc;
    for (const tag of post.tags) {
      acc[tag] = (acc[tag] || 0) + 1;
    }
    return acc;
  }, {});
  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

async function searchPosts(query, options = {}) {
  const { page = 1, limit = 20, category } = options;
  if (!query) {
    return { posts: [], pagination: { page: 1, limit, total: 0, totalPages: 1, hasMore: false } };
  }
  const normalized = query.toLowerCase();
  let filtered = posts.filter((post) => {
    if (post.isDeleted) return false;
    const inText = post.title.toLowerCase().includes(normalized) || post.content.toLowerCase().includes(normalized);
    const inTags = post.tags.some((tag) => tag.toLowerCase().includes(normalized));
    return inText || inTags;
  });
  if (category) {
    filtered = filtered.filter((post) => post.category === category);
  }
  filtered = filtered.sort((a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));
  const { slice, pagination } = paginate(filtered, page, limit);
  return {
    posts: slice.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content.substring(0, 200),
      category: post.category,
      author: getUserProfile(post.userId),
      votes: post.votes,
      commentCount: post.comments.length,
      createdAt: post.createdAt
    })),
    pagination
  };
}

module.exports = {
  createPost,
  getFeed,
  getPost,
  votePost,
  addComment,
  deletePost,
  deleteComment,
  getUserPosts,
  getTrendingTags,
  searchPosts
};
