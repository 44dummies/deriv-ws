import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  RefreshCw, BarChart3, Hash, Clock, Users, BookOpen, UserPlus, Settings,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp,
  TrendingDown, DollarSign, Activity, Target, Award, MessageCircle, Heart,
  Wallet, ExternalLink, Shield, Cloud, CloudOff, Database, Menu, Timer
} from 'lucide-react';

import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import supabaseService from '../services/supabaseService';

const STORAGE_KEYS = {
  JOURNAL: 'nexatrade_journal',
  FRIENDS: 'nexatrade_friends',
  TRADES: 'nexatrade_trades',
  THEME: 'nexatrade_theme',
};

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border backdrop-blur-xl p-6 
    border-white/10 dark-mode:bg-white/5 
    light-card ${className}`}
    style={{ 
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--card-border)'
    }}>
    {children}
  </div>
);

const StatCard = ({ icon, label, value, trend, color = 'from-blue-500 to-purple-500' }) => (
  <div className="rounded-2xl border p-5 stat-card"
    style={{ 
      backgroundColor: 'var(--card-bg)',
      borderColor: 'var(--card-border)'
    }}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
  </div>
);

const EmptyState = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" 
      style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
      {icon}
    </div>
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
  </div>
);

const SettingRow = ({ icon, label, value, action }) => (
  <div className="flex items-center justify-between py-4 border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
        style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
        {icon}
      </div>
      <div>
        <p className="font-medium">{label}</p>
        {value && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{value}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Deriv Community Forum API (Discourse)
const DERIV_COMMUNITY_URL = 'https://community.deriv.com';

// Auto-logout settings
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_LOGOUT = 60 * 1000; // Show warning 1 minute before logout

// Helper to calculate time ago
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count}${interval.label} ago`;
  }
  return 'just now';
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('sync');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [friends, setFriends] = useState([]);
  const [digitStats, setDigitStats] = useState({0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0});
  const [analytics, setAnalytics] = useState({
    totalTrades: 0, winRate: 0, totalProfit: 0, avgProfit: 0,
    bestTrade: 0, worstTrade: 0, winStreak: 0, lossStreak: 0
  });
  const [syncing, setSyncing] = useState(false);
  const [newJournalTitle, setNewJournalTitle] = useState('');
  const [newJournalContent, setNewJournalContent] = useState('');
  const [newJournalMood, setNewJournalMood] = useState('neutral');
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendId, setNewFriendId] = useState('');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState(null);
  const [useSupabase, setUseSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState('checking'); // 'checking', 'connected', 'offline'
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  
  const sidebarRef = useRef(null);

  // Logout handler (defined early for inactivity hook)
  const handleLogout = useCallback(() => { 
    TokenService.clearTokens(); 
    websocketService.disconnect(); 
    navigate('/'); 
  }, [navigate]);

  // Auto-logout on inactivity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setShowInactivityWarning(false);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        // Auto logout
        toast.error('Session expired due to inactivity');
        handleLogout();
      } else if (timeSinceActivity >= INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT) {
        // Show warning
        setShowInactivityWarning(true);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(checkInactivity);
    };
  }, [lastActivity, handleLogout]);

  // Check if Supabase is configured on mount
  useEffect(() => {
    const checkSupabase = () => {
      const isConfigured = supabaseService.isSupabaseConfigured();
      setUseSupabase(isConfigured);
      setSupabaseStatus(isConfigured ? 'connected' : 'offline');
    };
    checkSupabase();
  }, []);

  // Close sidebar when clicking outside (only when expanded on mobile/tablet)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !sidebarCollapsed) {
        // Check if the click target is NOT the toggle button
        const isToggleButton = event.target.closest('[data-sidebar-toggle]');
        if (!isToggleButton) {
          setSidebarCollapsed(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarCollapsed]);

  // Load data from Supabase or localStorage
  const loadFromStorage = useCallback(async () => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) setIsDarkMode(savedTheme === 'dark');

    // If Supabase is configured and we have userInfo, load from Supabase
    if (useSupabase && userInfo?.loginid) {
      try {
        // Load journal entries from Supabase
        const { data: journalData } = await supabaseService.getJournalEntries(userInfo.loginid);
        if (journalData) {
          setJournalEntries(journalData.map(e => ({
            id: e.id,
            date: e.created_at,
            title: e.title,
            content: e.content,
            mood: e.mood,
            tags: e.tags || []
          })));
        }

        // Load friends from Supabase
        const { data: friendsData } = await supabaseService.getFriends(userInfo.loginid);
        if (friendsData) {
          setFriends(friendsData.map(f => ({
            id: f.id,
            name: f.friend_name,
            loginid: f.friend_login_id,
            winRate: Math.random() * 40 + 50,
            status: Math.random() > 0.5 ? 'online' : 'offline',
            addedAt: f.created_at
          })));
        }

        // Load trades from Supabase
        const { data: tradesData } = await supabaseService.getTradeHistory(userInfo.loginid);
        if (tradesData && tradesData.length > 0) {
          const trades = tradesData.map(t => ({
            id: t.id,
            contract_id: t.contract_id,
            symbol: t.symbol,
            buy_price: parseFloat(t.buy_price),
            sell_price: parseFloat(t.sell_price),
            profit: parseFloat(t.profit),
            purchase_time: new Date(t.purchase_time).getTime() / 1000,
            sell_time: new Date(t.sell_time).getTime() / 1000,
            shortcode: t.shortcode
          }));
          setTradeHistory(trades);
          calculateAnalytics(trades);
          calculateDigitStats(trades);
        }
        return;
      } catch (err) {
        console.error('Supabase load error:', err);
        // Fall through to localStorage
      }
    }

    // Fallback to localStorage
    const savedJournal = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    const savedFriends = localStorage.getItem(STORAGE_KEYS.FRIENDS);
    const savedTrades = localStorage.getItem(STORAGE_KEYS.TRADES);
    if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
    if (savedFriends) setFriends(JSON.parse(savedFriends));
    if (savedTrades) {
      const trades = JSON.parse(savedTrades);
      setTradeHistory(trades);
      calculateAnalytics(trades);
      calculateDigitStats(trades);
    }
  }, [useSupabase, userInfo]);

  const saveToStorage = useCallback((key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, []);

  const calculateAnalytics = (trades) => {
    if (trades.length === 0) {
      setAnalytics({ totalTrades: 0, winRate: 0, totalProfit: 0, avgProfit: 0, bestTrade: 0, worstTrade: 0, winStreak: 0, lossStreak: 0 });
      return;
    }
    const wins = trades.filter(t => t.profit > 0);
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const profits = trades.map(t => t.profit);
    let currentWinStreak = 0, maxWinStreak = 0, currentLossStreak = 0, maxLossStreak = 0;
    trades.forEach(t => {
      if (t.profit > 0) { currentWinStreak++; currentLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, currentWinStreak); }
      else { currentLossStreak++; currentWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); }
    });
    setAnalytics({
      totalTrades: trades.length,
      winRate: (wins.length / trades.length) * 100,
      totalProfit,
      avgProfit: totalProfit / trades.length,
      bestTrade: Math.max(...profits),
      worstTrade: Math.min(...profits),
      winStreak: maxWinStreak,
      lossStreak: maxLossStreak
    });
  };

  const calculateDigitStats = (trades) => {
    const stats = {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    trades.forEach(trade => {
      const priceStr = trade.sell_price.toString();
      const lastDigit = parseInt(priceStr[priceStr.length - 1]) || 0;
      stats[lastDigit]++;
    });
    setDigitStats(stats);
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (!TokenService.isAuthenticated()) { navigate('/'); return; }
        const tokens = TokenService.getTokens();
        if (!tokens) { navigate('/'); return; }
        await websocketService.connect();
        const authResponse = await websocketService.authorize(tokens.token);
        if (authResponse.error) { TokenService.clearTokens(); navigate('/'); return; }
        if (authResponse.authorize) {
          setUserInfo({
            balance: authResponse.authorize.balance,
            currency: authResponse.authorize.currency,
            email: authResponse.authorize.email,
            fullname: authResponse.authorize.fullname,
            loginid: authResponse.authorize.loginid,
            is_virtual: authResponse.authorize.is_virtual === 1,
          });
        }
        loadFromStorage();
        setIsLoading(false);
      } catch (err) { console.error('Dashboard error:', err); TokenService.clearTokens(); navigate('/'); }
    };
    initializeDashboard();
  }, [navigate, loadFromStorage]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const balanceRes = await websocketService.getBalance();
      if (balanceRes.balance) setUserInfo(prev => prev ? { ...prev, balance: balanceRes.balance.balance } : null);
      const profitRes = await websocketService.getProfitTable({ limit: 100 });
      if (profitRes.profit_table?.transactions) {
        const trades = profitRes.profit_table.transactions.map((t) => ({
          id: t.transaction_id?.toString() || Math.random().toString(),
          contract_id: t.contract_id?.toString() || '',
          symbol: t.shortcode?.split('_')[0] || 'Unknown',
          buy_price: t.buy_price || 0,
          sell_price: t.sell_price || 0,
          profit: (t.sell_price || 0) - (t.buy_price || 0),
          purchase_time: t.purchase_time || 0,
          sell_time: t.sell_time || 0,
          shortcode: t.shortcode || '',
        }));
        setTradeHistory(trades);
        saveToStorage(STORAGE_KEYS.TRADES, trades);
        calculateAnalytics(trades);
        calculateDigitStats(trades);

        // Sync trades to Supabase if configured
        if (useSupabase && userInfo?.loginid) {
          const { error } = await supabaseService.syncTradeHistory(userInfo.loginid, trades);
          if (error) {
            console.error('Supabase sync error:', error);
            toast.success('Data synced locally (cloud sync failed)');
            return;
          }
        }
      }
      toast.success(useSupabase ? 'Data synced to cloud!' : 'Data synced locally!');
    } catch (err) { console.error('Sync error:', err); toast.error('Failed to sync data'); }
    setSyncing(false);
  };

  const addJournalEntry = async () => {
    if (!newJournalTitle.trim() || !newJournalContent.trim()) { toast.error('Please fill in title and content'); return; }
    
    const entry = { 
      id: Date.now().toString(), 
      date: new Date().toISOString(), 
      title: newJournalTitle, 
      content: newJournalContent, 
      mood: newJournalMood, 
      tags: [] 
    };

    // Save to Supabase if configured
    if (useSupabase && userInfo?.loginid) {
      const { data, error } = await supabaseService.createJournalEntry(userInfo.loginid, entry);
      if (error) {
        console.error('Supabase error:', error);
        toast.error('Failed to save to cloud, saved locally');
      } else if (data) {
        entry.id = data.id;
        entry.date = data.created_at;
      }
    }

    const updated = [entry, ...journalEntries];
    setJournalEntries(updated);
    saveToStorage(STORAGE_KEYS.JOURNAL, updated);
    setNewJournalTitle(''); setNewJournalContent(''); setNewJournalMood('neutral');
    toast.success('Journal entry added!');
  };

  const deleteJournalEntry = async (id) => {
    // Delete from Supabase if configured
    if (useSupabase && userInfo?.loginid) {
      const { error } = await supabaseService.deleteJournalEntry(id, userInfo.loginid);
      if (error) console.error('Supabase delete error:', error);
    }

    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    saveToStorage(STORAGE_KEYS.JOURNAL, updated);
    toast.success('Entry deleted');
  };

  const addFriend = async () => {
    if (!newFriendName.trim() || !newFriendId.trim()) { toast.error('Please fill in name and login ID'); return; }
    
    const friend = { 
      id: Date.now().toString(), 
      name: newFriendName, 
      loginid: newFriendId, 
      winRate: Math.random() * 40 + 50, 
      status: Math.random() > 0.5 ? 'online' : 'offline', 
      addedAt: new Date().toISOString() 
    };

    // Save to Supabase if configured
    if (useSupabase && userInfo?.loginid) {
      const { data, error } = await supabaseService.addFriend(userInfo.loginid, friend);
      if (error) {
        console.error('Supabase error:', error);
        toast.error('Failed to save to cloud, saved locally');
      } else if (data) {
        friend.id = data.id;
      }
    }

    const updated = [friend, ...friends];
    setFriends(updated);
    saveToStorage(STORAGE_KEYS.FRIENDS, updated);
    setNewFriendName(''); setNewFriendId('');
    toast.success('Friend added!');
  };

  const removeFriend = async (id) => {
    // Delete from Supabase if configured
    if (useSupabase && userInfo?.loginid) {
      const { error } = await supabaseService.removeFriend(id, userInfo.loginid);
      if (error) console.error('Supabase delete error:', error);
    }

    const updated = friends.filter(f => f.id !== id);
    setFriends(updated);
    saveToStorage(STORAGE_KEYS.FRIENDS, updated);
    toast.success('Friend removed');
  };

  const toggleTheme = () => { setIsDarkMode(!isDarkMode); localStorage.setItem(STORAGE_KEYS.THEME, !isDarkMode ? 'dark' : 'light'); };

  // Fetch posts from Deriv Community Forum
  const fetchCommunityPosts = useCallback(async () => {
    setCommunityLoading(true);
    setCommunityError(null);
    try {
      // Fetch latest topics from Deriv Community (Discourse API)
      const response = await fetch(`${DERIV_COMMUNITY_URL}/latest.json`);
      if (!response.ok) throw new Error('Failed to fetch community posts');
      const data = await response.json();
      
      const posts = data.topic_list?.topics?.slice(0, 15).map(topic => ({
        id: topic.id.toString(),
        title: topic.title,
        user: topic.last_poster_username || 'Anonymous',
        avatar: topic.last_poster_username?.[0]?.toUpperCase() || '?',
        content: topic.excerpt || topic.title,
        likes: topic.like_count || 0,
        comments: topic.posts_count - 1 || 0,
        views: topic.views || 0,
        time: timeAgo(topic.last_posted_at || topic.created_at),
        url: `${DERIV_COMMUNITY_URL}/t/${topic.slug}/${topic.id}`,
        category: topic.category_id,
        pinned: topic.pinned || false,
      })) || [];
      
      setCommunityPosts(posts);
    } catch (err) {
      console.error('Community fetch error:', err);
      setCommunityError('Unable to load community posts. The forum may be unavailable.');
      // Set fallback posts
      setCommunityPosts([
        { id: '1', title: 'Welcome to Deriv Community', user: 'Deriv', avatar: 'D', content: 'Join discussions about trading strategies, API development, and more!', likes: 100, comments: 50, views: 1000, time: 'pinned', url: DERIV_COMMUNITY_URL, pinned: true },
      ]);
    }
    setCommunityLoading(false);
  }, []);

  // Load community posts when tab is active
  useEffect(() => {
    if (activeTab === 'community' && communityPosts.length === 0) {
      fetchCommunityPosts();
    }
  }, [activeTab, communityPosts.length, fetchCommunityPosts]);

  const tabs = [
    { id: 'sync', icon: <RefreshCw className="w-5 h-5" />, label: 'Sync Data' },
    { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
    { id: 'digit', icon: <Hash className="w-5 h-5" />, label: 'Digit Analyzer' },
    { id: 'timeline', icon: <Clock className="w-5 h-5" />, label: 'Trade Timeline' },
    { id: 'community', icon: <Users className="w-5 h-5" />, label: 'Community' },
    { id: 'journal', icon: <BookOpen className="w-5 h-5" />, label: 'Journal' },
    { id: 'friends', icon: <UserPlus className="w-5 h-5" />, label: 'Friends' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  const moodEmojis = { great: '🚀', good: '😊', neutral: '😐', bad: '😔' };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#040404] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-2xl font-bold mx-auto mb-4 animate-pulse text-white">N</div>
          <p className="text-gray-400">Loading NexaTrade...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen ${isDarkMode ? 'bg-[#040404] text-white' : 'bg-gray-50 text-gray-900'}`}
      style={{
        '--card-bg': isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
        '--card-border': isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
        '--text-secondary': isDarkMode ? '#9ca3af' : '#6b7280',
        '--accent-bg': isDarkMode ? 'rgba(255,255,255,0.05)' : '#f3f4f6'
      }}
    >
      <Toaster position="top-right" />
      
      {/* Inactivity Warning Modal */}
      {showInactivityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl shadow-2xl max-w-sm mx-4 text-center ${isDarkMode ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <Timer className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-bold mb-2">Session Expiring Soon</h3>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              You will be logged out in less than 1 minute due to inactivity. Move your mouse or press any key to stay logged in.
            </p>
            <button
              onClick={() => setShowInactivityWarning(false)}
              className="px-6 py-2 bg-gradient-to-r from-[#ff3355] to-[#ff6644] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              I'm Still Here
            </button>
          </div>
        </div>
      )}
      
      {isDarkMode && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-10 h-96 w-96 rounded-full bg-[#ff3355]/20 blur-[160px]" />
          <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-[#5d5dff]/10 blur-[200px]" />
        </div>
      )}

      <div className="relative z-10 flex">
        {/* Sidebar Overlay (for mobile) */}
        {!sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`${
            sidebarCollapsed ? 'w-0 lg:w-20' : 'w-64'
          } fixed lg:relative z-30 min-h-screen border-r ${isDarkMode ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-white shadow-lg'} backdrop-blur-xl transition-all duration-300 flex flex-col overflow-hidden`}
        >
          {/* Logo with integrated toggle */}
          <div className={`p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <button 
              data-sidebar-toggle
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center gap-3 w-full group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-lg font-bold shrink-0 text-white group-hover:scale-105 transition-transform">
                {sidebarCollapsed ? <Menu className="w-5 h-5" /> : 'N'}
              </div>
              {!sidebarCollapsed && <span className="font-semibold text-lg whitespace-nowrap">NexaTrade</span>}
            </button>
          </div>

          {userInfo && (
            <div className={`p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'} ${sidebarCollapsed ? 'text-center' : ''}`}>
              {!sidebarCollapsed && (
                <>
                  <p className="font-medium truncate">{userInfo.fullname || 'Trader'}</p>
                  <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{userInfo.loginid}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${userInfo.is_virtual ? 'bg-yellow-500/20 text-yellow-600' : 'bg-green-500/20 text-green-600'}`}>{userInfo.is_virtual ? 'Demo' : 'Real'}</span>
                    <span className="text-sm font-medium">{userInfo.currency} {userInfo.balance.toFixed(2)}</span>
                  </div>
                </>
              )}
              {sidebarCollapsed && <div className={`w-8 h-8 rounded-full mx-auto ${userInfo.is_virtual ? 'bg-yellow-500/20' : 'bg-green-500/20'} flex items-center justify-center text-xs`}>{userInfo.fullname?.[0] || 'T'}</div>}
            </div>
          )}

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (window.innerWidth < 1024) setSidebarCollapsed(true); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-[#ff3355]/20 to-transparent text-[#ff5f6d] border-l-2 border-[#ff3355]' : isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} ${sidebarCollapsed ? 'justify-center' : ''}`} title={sidebarCollapsed ? tab.label : undefined}>
                {tab.icon}
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>

          <div className={`p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'} space-y-2`}>
            <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isDarkMode ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {!sidebarCollapsed && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>

          {/* Desktop toggle button */}
          <button 
            data-sidebar-toggle
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="hidden lg:flex absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#ff3355] items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-40"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-0'}`}>
          {/* Top Header Bar (mobile only shows hamburger in collapsed logo) */}
          <div className={`sticky top-0 z-20 flex items-center gap-4 p-3 sm:p-4 border-b ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-white/80'} backdrop-blur-xl`}>
            {/* Mobile hamburger */}
            <button 
              data-sidebar-toggle
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
              className={`lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900'}`}
              title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base sm:text-lg truncate">{tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Supabase Status Indicator */}
              <div 
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  supabaseStatus === 'connected' 
                    ? 'bg-green-500/20 text-green-600' 
                    : isDarkMode ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-200 text-gray-500'
                }`}
                title={supabaseStatus === 'connected' ? 'Cloud sync enabled' : 'Local storage only'}
              >
                {supabaseStatus === 'connected' ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                <span className="hidden sm:inline">{supabaseStatus === 'connected' ? 'Cloud' : 'Local'}</span>
              </div>
              {userInfo && (
                <>
                  <span className={`hidden sm:inline text-xs px-2 py-1 rounded-full ${userInfo.is_virtual ? 'bg-yellow-500/20 text-yellow-600' : 'bg-green-500/20 text-green-600'}`}>
                    {userInfo.is_virtual ? 'Demo' : 'Real'}
                  </span>
                  <span className="text-xs sm:text-sm font-medium">{userInfo.currency} {userInfo.balance?.toFixed(2)}</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6">
          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold">Sync Data</h1><p style={{ color: 'var(--text-secondary)' }}>Synchronize your Deriv trading data</p></div>
                <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-white">
                  <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Wallet className="w-5 h-5 text-white" />} label="Balance" value={`${userInfo?.currency || ''} ${userInfo?.balance?.toFixed(2) || '0.00'}`} color="from-green-500 to-emerald-500" />
                <StatCard icon={<Activity className="w-5 h-5 text-white" />} label="Total Trades" value={tradeHistory.length} color="from-blue-500 to-cyan-500" />
                <StatCard icon={<Target className="w-5 h-5 text-white" />} label="Win Rate" value={`${analytics.winRate.toFixed(1)}%`} trend={analytics.winRate >= 50 ? 'up' : 'down'} color="from-purple-500 to-pink-500" />
                <StatCard icon={<DollarSign className="w-5 h-5 text-white" />} label="Total Profit" value={`${analytics.totalProfit.toFixed(2)}`} trend={analytics.totalProfit >= 0 ? 'up' : 'down'} color="from-orange-500 to-red-500" />
              </div>
              <Card>
                <h3 className="text-lg font-medium mb-4">Sync Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span>Balance</span></div><span className="text-green-500">Connected</span></div>
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span>Trade History</span></div><span className="text-green-500">{tradeHistory.length} trades synced</span></div>
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span>Account</span></div><span className="text-green-500">{userInfo?.loginid}</span></div>
                </div>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Analytics</h1><p style={{ color: 'var(--text-secondary)' }}>Your trading performance overview</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Activity className="w-5 h-5 text-white" />} label="Total Trades" value={analytics.totalTrades} color="from-blue-500 to-cyan-500" />
                <StatCard icon={<Target className="w-5 h-5 text-white" />} label="Win Rate" value={`${analytics.winRate.toFixed(1)}%`} trend={analytics.winRate >= 50 ? 'up' : 'down'} color="from-green-500 to-emerald-500" />
                <StatCard icon={<DollarSign className="w-5 h-5 text-white" />} label="Total Profit" value={analytics.totalProfit.toFixed(2)} trend={analytics.totalProfit >= 0 ? 'up' : 'down'} color="from-purple-500 to-pink-500" />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-white" />} label="Avg Profit/Trade" value={analytics.avgProfit.toFixed(2)} color="from-orange-500 to-red-500" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-medium mb-4">Win Rate Visualization</h3>
                  <div className="relative h-32 flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} strokeWidth="12" fill="none" />
                        <circle cx="64" cy="64" r="56" stroke="url(#winGradient)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${analytics.winRate * 3.52} 352`} />
                        <defs><linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ff3355" /><stop offset="100%" stopColor="#ff8042" /></linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-bold">{analytics.winRate.toFixed(0)}%</span></div>
                    </div>
                  </div>
                </Card>
                <Card>
                  <h3 className="text-lg font-medium mb-4">Trading Streaks</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"><p className="text-3xl font-bold text-green-500">{analytics.winStreak}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Best Win Streak</p></div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-3xl font-bold text-red-500">{analytics.lossStreak}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Worst Loss Streak</p></div>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p className="text-3xl font-bold text-blue-500">{analytics.bestTrade.toFixed(2)}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Best Trade</p></div>
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"><p className="text-3xl font-bold text-purple-500">{analytics.worstTrade.toFixed(2)}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Worst Trade</p></div>
                  </div>
                </Card>
              </div>
              {analytics.totalTrades === 0 && <Card><EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No analytics data" description="Sync your trades to see analytics" /></Card>}
            </div>
          )}

          {/* Digit Analyzer Tab */}
          {activeTab === 'digit' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Digit Analyzer</h1><p style={{ color: 'var(--text-secondary)' }}>Analyze digit patterns in your trades</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-6">Digit Frequency Distribution</h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 sm:gap-4">
                  {Object.entries(digitStats).map(([digit, count]) => {
                    const total = Object.values(digitStats).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={digit} className="text-center">
                        <div className="relative h-24 sm:h-32 rounded-xl overflow-hidden mb-2" style={{ display: 'flex', alignItems: 'flex-end', backgroundColor: 'var(--accent-bg)' }}>
                          <div className="w-full bg-gradient-to-t from-[#ff3355] to-[#ff8042] transition-all duration-500" style={{ height: `${Math.max(percentage, 5)}%` }} />
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mx-auto mb-1 font-bold text-sm sm:text-base" style={{ backgroundColor: 'var(--accent-bg)' }}>{digit}</div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{count}</p>
                        <p className="text-xs text-[#ff5f6d]">{percentage.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-medium mb-4">Hot Digits</h3>
                  <div className="space-y-3">
                    {Object.entries(digitStats).sort(([,a], [,b]) => b - a).slice(0, 3).map(([digit, count], i) => (
                      <div key={digit} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20 text-gray-500' : 'bg-orange-500/20 text-orange-500'}`}>{digit}</div>
                        <div className="flex-1"><div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}><div className="h-full bg-gradient-to-r from-[#ff3355] to-[#ff8042]" style={{ width: `${(count / Math.max(...Object.values(digitStats))) * 100}%` }} /></div></div>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{count} times</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <h3 className="text-lg font-medium mb-4">Cold Digits</h3>
                  <div className="space-y-3">
                    {Object.entries(digitStats).sort(([,a], [,b]) => a - b).slice(0, 3).map(([digit, count]) => (
                      <div key={digit} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">{digit}</div>
                        <div className="flex-1"><div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-border)' }}><div className="h-full bg-blue-500" style={{ width: `${(count / Math.max(...Object.values(digitStats), 1)) * 100}%` }} /></div></div>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{count} times</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Trade Timeline</h1><p style={{ color: 'var(--text-secondary)' }}>Your recent trading activity</p></div>
              {tradeHistory.length === 0 ? <Card><EmptyState icon={<Clock className="w-8 h-8" />} title="No trades yet" description="Sync your data to see your trade timeline" /></Card> : (
                <div className="space-y-4">
                  {tradeHistory.slice(0, 20).map((trade) => (
                    <Card key={trade.id}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${trade.profit >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>{trade.profit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}</div>
                          <div className="min-w-0"><p className="font-medium truncate">{trade.symbol}</p><p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{trade.shortcode?.slice(0, 30)}...</p></div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className={`text-lg font-bold ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(trade.sell_time * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 grid grid-cols-3 gap-4 text-sm" style={{ borderTop: '1px solid var(--card-border)' }}>
                        <div><p style={{ color: 'var(--text-secondary)' }}>Buy Price</p><p className="font-medium">{trade.buy_price.toFixed(2)}</p></div>
                        <div><p style={{ color: 'var(--text-secondary)' }}>Sell Price</p><p className="font-medium">{trade.sell_price.toFixed(2)}</p></div>
                        <div><p style={{ color: 'var(--text-secondary)' }}>Time</p><p className="font-medium">{new Date(trade.sell_time * 1000).toLocaleTimeString()}</p></div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Community Tab */}
          {activeTab === 'community' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">Deriv Community</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Latest discussions from community.deriv.com</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={fetchCommunityPosts} disabled={communityLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }}>
                    <RefreshCw className={`w-4 h-4 ${communityLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <a href={DERIV_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    <ExternalLink className="w-4 h-4" />
                    Visit Forum
                  </a>
                </div>
              </div>
              
              {communityError && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm">
                  {communityError}
                </div>
              )}

              {communityLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full" style={{ backgroundColor: 'var(--accent-bg)' }} />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 rounded w-1/4" style={{ backgroundColor: 'var(--accent-bg)' }} />
                          <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--accent-bg)' }} />
                          <div className="h-4 rounded w-1/2" style={{ backgroundColor: 'var(--accent-bg)' }} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : communityPosts.length === 0 ? (
                <Card>
                  <EmptyState icon={<Users className="w-8 h-8" />} title="No posts available" description="Unable to load community posts. Try refreshing." />
                </Card>
              ) : (
                <div className="space-y-4">
                  {communityPosts.map(post => (
                    <a key={post.id} href={post.url} target="_blank" rel="noopener noreferrer" className="block">
                      <Card>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${post.pinned ? 'bg-gradient-to-br from-[#ff3355] to-[#ff8042] text-white' : ''}`} style={!post.pinned ? { backgroundColor: 'var(--accent-bg)' } : {}}>
                            {post.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{post.user}</span>
                              {post.pinned && <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff3355]/20 text-[#ff5f6d]">Pinned</span>}
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{post.time}</span>
                            </div>
                            <h3 className="font-medium mb-2 line-clamp-1">{post.title}</h3>
                            <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
                            <div className="flex items-center gap-4 sm:gap-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" /> {post.likes}</span>
                              <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> {post.comments}</span>
                              <span className="hidden sm:flex items-center gap-1.5"><Activity className="w-4 h-4" /> {post.views}</span>
                            </div>
                          </div>
                          <ExternalLink className="w-5 h-5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                      </Card>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Journal Tab */}
          {activeTab === 'journal' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Trading Journal</h1><p style={{ color: 'var(--text-secondary)' }}>Document your trading journey</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-4">New Entry</h3>
                <div className="space-y-4">
                  <input type="text" value={newJournalTitle} onChange={(e) => setNewJournalTitle(e.target.value)} placeholder="Entry title..." className="w-full px-4 py-3 rounded-xl focus:border-[#ff3355] outline-none transition-colors" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }} />
                  <textarea value={newJournalContent} onChange={(e) => setNewJournalContent(e.target.value)} placeholder="What did you learn today? What went well? What could improve?" rows={4} className="w-full px-4 py-3 rounded-xl focus:border-[#ff3355] outline-none transition-colors resize-none" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }} />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mood:</span>
                      {['great', 'good', 'neutral', 'bad'].map(mood => (
                        <button key={mood} onClick={() => setNewJournalMood(mood)} className={`w-10 h-10 rounded-xl text-lg transition-all ${newJournalMood === mood ? 'scale-110' : ''}`} style={{ backgroundColor: newJournalMood === mood ? 'var(--card-border)' : 'var(--accent-bg)' }}>{moodEmojis[mood]}</button>
                      ))}
                    </div>
                    <button onClick={addJournalEntry} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-medium hover:opacity-90 transition-opacity text-white"><Plus className="w-5 h-5" /> Add Entry</button>
                  </div>
                </div>
              </Card>
              {journalEntries.length === 0 ? <Card><EmptyState icon={<BookOpen className="w-8 h-8" />} title="No journal entries yet" description="Start documenting your trading journey" /></Card> : (
                <div className="space-y-4">
                  {journalEntries.map(entry => (
                    <Card key={entry.id}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3"><span className="text-2xl">{moodEmojis[entry.mood]}</span><div><h4 className="font-medium">{entry.title}</h4><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(entry.date).toLocaleDateString()}</p></div></div>
                        <button onClick={() => deleteJournalEntry(entry.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <p className="whitespace-pre-wrap">{entry.content}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Friends</h1><p style={{ color: 'var(--text-secondary)' }}>Your trading network</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-4">Add Friend</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} placeholder="Friend's name..." className="flex-1 px-4 py-3 rounded-xl focus:border-[#ff3355] outline-none transition-colors" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }} />
                  <input type="text" value={newFriendId} onChange={(e) => setNewFriendId(e.target.value)} placeholder="Deriv Login ID..." className="flex-1 px-4 py-3 rounded-xl focus:border-[#ff3355] outline-none transition-colors" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }} />
                  <button onClick={addFriend} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-medium hover:opacity-90 transition-opacity text-white"><UserPlus className="w-5 h-5" /> Add</button>
                </div>
              </Card>
              {friends.length === 0 ? <Card><EmptyState icon={<Users className="w-8 h-8" />} title="No friends yet" description="Add friends to see their trading stats" /></Card> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(friend => (
                    <Card key={friend.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-xl font-bold text-white">{friend.name[0]}</div>
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${friend.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`} style={{ border: '2px solid var(--card-bg)' }} />
                          </div>
                          <div><p className="font-medium">{friend.name}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{friend.loginid}</p><div className="flex items-center gap-2 mt-1"><Award className="w-4 h-4 text-yellow-500" /><span className="text-sm">{friend.winRate.toFixed(1)}% Win Rate</span></div></div>
                        </div>
                        <button onClick={() => removeFriend(friend.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Settings</h1><p style={{ color: 'var(--text-secondary)' }}>Manage your NexaTrade preferences</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-4">Account Information</h3>
                <SettingRow icon={<Users className="w-5 h-5" />} label="Full Name" value={userInfo?.fullname || 'Not set'} />
                <SettingRow icon={<Shield className="w-5 h-5" />} label="Login ID" value={userInfo?.loginid} />
                <SettingRow icon={<Wallet className="w-5 h-5" />} label="Account Type" value={userInfo?.is_virtual ? 'Demo Account' : 'Real Account'} />
                <SettingRow icon={<DollarSign className="w-5 h-5" />} label="Currency" value={userInfo?.currency} />
              </Card>
              <Card>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" /> Cloud Storage
                </h3>
                <SettingRow 
                  icon={supabaseStatus === 'connected' ? <Cloud className="w-5 h-5 text-green-500" /> : <CloudOff className="w-5 h-5" />} 
                  label="Supabase Status" 
                  value={supabaseStatus === 'connected' ? 'Connected - Data syncs to cloud' : 'Not configured - Data stored locally'} 
                  action={
                    <span className={`text-xs px-3 py-1.5 rounded-full ${supabaseStatus === 'connected' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20'}`} style={{ color: supabaseStatus !== 'connected' ? 'var(--text-secondary)' : undefined }}>
                      {supabaseStatus === 'connected' ? 'Active' : 'Offline'}
                    </span>
                  }
                />
                {supabaseStatus !== 'connected' && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-300 mb-2">To enable cloud storage:</p>
                    <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Create a Supabase project at supabase.com</li>
                      <li>Run the SQL schema from <code className="text-[#ff5f6d]">supabase_schema.sql</code></li>
                      <li>Add your credentials to <code className="text-[#ff5f6d]">.env</code> file</li>
                      <li>Restart the application</li>
                    </ol>
                  </div>
                )}
              </Card>
              <Card>
                <h3 className="text-lg font-medium mb-4">Appearance</h3>
                <SettingRow icon={isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />} label="Theme" value={isDarkMode ? 'Dark Mode' : 'Light Mode'} action={
                  <button onClick={toggleTheme} className={`w-14 h-8 rounded-full transition-colors ${isDarkMode ? 'bg-[#ff3355]' : 'bg-gray-600'}`}>
                    <div className={`w-6 h-6 rounded-full bg-white transition-transform mx-1 ${isDarkMode ? 'translate-x-6' : ''}`} />
                  </button>
                } />
              </Card>
              <Card>
                <h3 className="text-lg font-medium mb-4">Quick Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a href="https://deriv.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><ExternalLink className="w-5 h-5 text-[#ff5f6d]" /><span>Deriv Website</span></a>
                  <a href="https://app.deriv.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><ExternalLink className="w-5 h-5 text-[#ff5f6d]" /><span>Deriv Trading Platform</span></a>
                  <a href="https://api.deriv.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><ExternalLink className="w-5 h-5 text-[#ff5f6d]" /><span>API Documentation</span></a>
                  <a href="https://community.deriv.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><ExternalLink className="w-5 h-5 text-[#ff5f6d]" /><span>Community Forum</span></a>
                </div>
              </Card>
              <Card>
                <h3 className="text-lg font-medium mb-4 text-red-400">Danger Zone</h3>
                <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"><LogOut className="w-5 h-5" /> Sign Out</button>
              </Card>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
