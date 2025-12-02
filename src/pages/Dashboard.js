import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  RefreshCw, BarChart3, Hash, Clock, Users, BookOpen, UserPlus, Settings,
  LogOut, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp,
  TrendingDown, DollarSign, Activity, Target, Award, MessageCircle, Heart,
  Wallet, ExternalLink, Shield, Cloud, CloudOff, Menu, Timer,
  Flame, AlertTriangle, Tag, Snowflake, Sparkles, Keyboard, Filter, Zap,
  Brain, HeartPulse, Gauge, Lightbulb, ArrowUpDown, PieChart, Scale
} from 'lucide-react';

import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import supabaseService from '../services/supabaseService';
import analyticsService from '../services/analyticsService';

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('sync');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed (especially for mobile)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // Separate state for mobile
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
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  
  // Advanced Analytics State
  const [profitCurve, setProfitCurve] = useState([]);
  const [advancedAnalytics, setAdvancedAnalytics] = useState({
    byHour: {}, byMarket: {}, byContractType: {}, streakData: []
  });
  const [digitHeatmap, setDigitHeatmap] = useState({
    counts: {0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0},
    hotColdStatus: {}
  });
  const [timelineInsights, setTimelineInsights] = useState({
    biggestLoss: null, fastestWin: null, riskStreaks: []
  });
  const [journalTags, setJournalTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags] = useState(['#overtrading', '#perfect-entry', '#bad-day', '#strategyA', '#scalping', '#martingale']);
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(true);
  
  // Full Analytics State
  const [fullAnalytics, setFullAnalytics] = useState(null);
  const [statements, setStatements] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  const sidebarRef = useRef(null);
  const isInitialized = useRef(false);
  const profileSynced = useRef(false);

  // Logout handler (defined early for inactivity hook)
  const handleLogout = useCallback(() => { 
    TokenService.clearTokens(); 
    websocketService.disconnect(); 
    navigate('/'); 
  }, [navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
          case 'j': e.preventDefault(); setActiveTab('journal'); break;
          case 'd': e.preventDefault(); setActiveTab('digit'); break;
          case 't': e.preventDefault(); setActiveTab('timeline'); break;
          case 'a': e.preventDefault(); setActiveTab('analytics'); break;
          case 's': e.preventDefault(); setActiveTab('sync'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && mobileSidebarOpen) {
        // Check if the click target is NOT the toggle button
        const isToggleButton = event.target.closest('[data-sidebar-toggle]');
        if (!isToggleButton) {
          setMobileSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSidebarOpen]);

  // Load data from Supabase or localStorage
  const loadFromStorage = useCallback(async () => {
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
      setProfitCurve([]);
      setAdvancedAnalytics({ byHour: {}, byMarket: {}, byContractType: {}, streakData: [] });
      setTimelineInsights({ biggestLoss: null, fastestWin: null, riskStreaks: [] });
      return;
    }
    const wins = trades.filter(t => t.profit > 0);
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const profits = trades.map(t => t.profit);
    let currentWinStreak = 0, maxWinStreak = 0, currentLossStreak = 0, maxLossStreak = 0;
    const streakData = [];
    trades.forEach((t, i) => {
      if (t.profit > 0) { currentWinStreak++; currentLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, currentWinStreak); }
      else { currentLossStreak++; currentWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); }
      streakData.push({ index: i, winStreak: currentWinStreak, lossStreak: currentLossStreak });
    });
    
    // Build profit curve (cumulative)
    let cumulative = 0;
    const curve = trades.map((t, i) => {
      cumulative += t.profit;
      return { index: i, profit: cumulative, date: t.purchase_time };
    });
    setProfitCurve(curve);
    
    // Advanced analytics by hour
    const byHour = {};
    const byMarket = {};
    const byContractType = {};
    trades.forEach(t => {
      const hour = new Date(t.purchase_time * 1000).getHours();
      if (!byHour[hour]) byHour[hour] = { wins: 0, losses: 0, profit: 0 };
      byHour[hour].profit += t.profit;
      if (t.profit > 0) byHour[hour].wins++;
      else byHour[hour].losses++;
      
      const market = t.underlying || 'Unknown';
      if (!byMarket[market]) byMarket[market] = { wins: 0, losses: 0, profit: 0 };
      byMarket[market].profit += t.profit;
      if (t.profit > 0) byMarket[market].wins++;
      else byMarket[market].losses++;
      
      const cType = t.contract_type || 'Unknown';
      if (!byContractType[cType]) byContractType[cType] = { wins: 0, losses: 0, profit: 0 };
      byContractType[cType].profit += t.profit;
      if (t.profit > 0) byContractType[cType].wins++;
      else byContractType[cType].losses++;
    });
    setAdvancedAnalytics({ byHour, byMarket, byContractType, streakData });
    
    // Timeline insights
    const sortedByProfit = [...trades].sort((a, b) => a.profit - b.profit);
    const biggestLoss = sortedByProfit[0]?.profit < 0 ? sortedByProfit[0] : null;
    const sortedByDuration = [...trades].filter(t => t.profit > 0).sort((a, b) => 
      (a.sell_time - a.purchase_time) - (b.sell_time - b.purchase_time)
    );
    const fastestWin = sortedByDuration[0] || null;
    
    // Find risk streaks (3+ consecutive losses)
    const riskStreaks = [];
    let currentRiskStreak = [];
    trades.forEach((t, i) => {
      if (t.profit < 0) {
        currentRiskStreak.push({ ...t, index: i });
      } else {
        if (currentRiskStreak.length >= 3) {
          riskStreaks.push([...currentRiskStreak]);
        }
        currentRiskStreak = [];
      }
    });
    if (currentRiskStreak.length >= 3) riskStreaks.push(currentRiskStreak);
    setTimelineInsights({ biggestLoss, fastestWin, riskStreaks });
    
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
    
    // Calculate hot/cold status for heatmap
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const avg = total / 10;
    const hotColdStatus = {};
    Object.entries(stats).forEach(([digit, count]) => {
      const deviation = (count - avg) / (avg || 1);
      if (deviation > 0.3) hotColdStatus[digit] = 'hot';
      else if (deviation < -0.3) hotColdStatus[digit] = 'cold';
      else hotColdStatus[digit] = 'neutral';
    });
    setDigitHeatmap({ counts: stats, hotColdStatus });
  };

  // Run full analytics with the analyticsService
  const runFullAnalytics = useCallback(async (trades) => {
    if (!trades || trades.length === 0) {
      setFullAnalytics(null);
      return;
    }
    
    setAnalyticsLoading(true);
    try {
      // Fetch statements for deposit/withdrawal analysis
      let statementsData = statements;
      if (statementsData.length === 0) {
        try {
          const statementRes = await websocketService.getStatement({ limit: 500 });
          if (statementRes.statement?.transactions) {
            statementsData = statementRes.statement.transactions;
            setStatements(statementsData);
          }
        } catch (err) {
          console.error('Failed to fetch statements:', err);
        }
      }
      
      // Run the full analytics engine
      const results = analyticsService.runFullAnalysis({
        trades,
        statements: statementsData,
        accountBalance: userInfo?.balance || 0
      });
      
      setFullAnalytics(results);
    } catch (err) {
      console.error('Analytics error:', err);
    }
    setAnalyticsLoading(false);
  }, [statements, userInfo?.balance]);

  useEffect(() => {
    // Prevent double initialization (React StrictMode or re-renders)
    if (isInitialized.current) return;
    
    const initializeDashboard = async () => {
      try {
        if (!TokenService.isAuthenticated()) { navigate('/'); return; }
        const tokens = TokenService.getTokens();
        if (!tokens) { navigate('/'); return; }
        
        isInitialized.current = true; // Mark as initialized
        
        await websocketService.connect();
        const authResponse = await websocketService.authorize(tokens.token);
        if (authResponse.error) { 
          isInitialized.current = false;
          TokenService.clearTokens(); 
          navigate('/'); 
          return; 
        }
        if (authResponse.authorize) {
          const userData = {
            balance: authResponse.authorize.balance,
            currency: authResponse.authorize.currency,
            email: authResponse.authorize.email,
            fullname: authResponse.authorize.fullname,
            loginid: authResponse.authorize.loginid,
            is_virtual: authResponse.authorize.is_virtual === 1,
          };
          setUserInfo(userData);
          
          // Create/update user profile in Supabase ONCE (required for foreign key constraints)
          if (supabaseService.isSupabaseConfigured() && !profileSynced.current) {
            profileSynced.current = true;
            const { error } = await supabaseService.upsertUserProfile(userData);
            if (error) {
              console.error('Failed to create Supabase profile:', error);
              profileSynced.current = false; // Allow retry on error
            }
          }
        }
        setIsLoading(false);
      } catch (err) { 
        console.error('Dashboard error:', err); 
        isInitialized.current = false;
        TokenService.clearTokens(); 
        navigate('/'); 
      }
    };
    initializeDashboard();
  }, [navigate]); // Remove loadFromStorage from dependencies

  // Load data after userInfo is set
  useEffect(() => {
    if (userInfo?.loginid && !isLoading) {
      loadFromStorage();
    }
  }, [userInfo?.loginid, isLoading, loadFromStorage]);



  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcutsEnabled) return;
    
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'j':
            e.preventDefault();
            setActiveTab('journal');
            break;
          case 'd':
            e.preventDefault();
            setActiveTab('digit');
            break;
          case 't':
            e.preventDefault();
            setActiveTab('timeline');
            break;
          case 's':
            e.preventDefault();
            setActiveTab('sync');
            break;
          case 'a':
            e.preventDefault();
            setActiveTab('analytics');
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled]);

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
        
        // Run full analytics
        runFullAnalytics(trades);

        // Sync trades to Supabase if configured
        if (useSupabase && userInfo?.loginid) {
          // Ensure profile exists before syncing trades (foreign key requirement)
          await supabaseService.upsertUserProfile(userInfo);
          
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
      tags: journalTags 
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
    setNewJournalTitle(''); setNewJournalContent(''); setNewJournalMood('neutral'); setJournalTags([]);
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



  // Community posts - direct links since CORS prevents API access from browser
  const fetchCommunityPosts = useCallback(async () => {
    setCommunityLoading(true);
    setCommunityError(null);
    
    // Since the Deriv Community forum blocks CORS requests from browsers,
    // we provide curated community links instead of fetching live data
    const communityLinks = [
      { id: '1', title: '📌 Welcome to Deriv Community', user: 'Deriv Team', avatar: 'D', content: 'Join discussions about trading strategies, platform features, and connect with other traders!', likes: 500, comments: 200, views: 10000, time: 'pinned', url: DERIV_COMMUNITY_URL, pinned: true },
      { id: '2', title: 'Trading Strategies & Tips', user: 'Community', avatar: 'T', content: 'Share and discover trading strategies from experienced traders.', likes: 150, comments: 80, views: 3000, time: 'category', url: `${DERIV_COMMUNITY_URL}/c/strategies`, pinned: false },
      { id: '3', title: 'Deriv API Development', user: 'Developers', avatar: 'A', content: 'Technical discussions about Deriv API integration and development.', likes: 120, comments: 60, views: 2500, time: 'category', url: `${DERIV_COMMUNITY_URL}/c/deriv-api`, pinned: false },
      { id: '4', title: 'Platform Feedback & Suggestions', user: 'Community', avatar: 'F', content: 'Share your feedback and suggestions to help improve the platform.', likes: 90, comments: 40, views: 1800, time: 'category', url: `${DERIV_COMMUNITY_URL}/c/feedback`, pinned: false },
      { id: '5', title: 'Latest Discussions', user: 'Community', avatar: 'L', content: 'Browse the latest discussions and topics from the community.', likes: 200, comments: 100, views: 5000, time: 'live', url: `${DERIV_COMMUNITY_URL}/latest`, pinned: false },
    ];
    
    setCommunityPosts(communityLinks);
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
      className="min-h-screen bg-[#040404] text-white"
      style={{
        '--card-bg': 'rgba(255,255,255,0.05)',
        '--card-border': 'rgba(255,255,255,0.1)',
        '--text-secondary': '#9ca3af',
        '--accent-bg': 'rgba(255,255,255,0.05)'
      }}
    >
      <Toaster position="top-right" />
      
      {/* Inactivity Warning Modal */}
      {showInactivityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="p-6 rounded-2xl shadow-2xl max-w-sm mx-4 text-center bg-gray-900 border border-white/10">
            <Timer className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-bold mb-2">Session Expiring Soon</h3>
            <p className="text-sm mb-4 text-gray-400">
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
      
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-10 h-96 w-96 rounded-full bg-[#ff3355]/20 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-[#5d5dff]/10 blur-[200px]" />
      </div>

      <div className="relative z-10 flex">
        {/* Sidebar Overlay (for mobile) */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          ref={sidebarRef}
          className={`${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${
            sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          } w-64 fixed lg:relative z-30 min-h-screen border-r border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300 flex flex-col`}
        >
          {/* Logo with integrated toggle */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-lg font-bold shrink-0 text-white">
                N
              </div>
              {!sidebarCollapsed && <span className="font-semibold text-lg whitespace-nowrap hidden lg:inline">NexaTrade</span>}
              <span className="font-semibold text-lg whitespace-nowrap lg:hidden">NexaTrade</span>
            </div>
          </div>

          {userInfo && (
            <div className={`p-4 border-b border-white/10 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
              {(!sidebarCollapsed || window.innerWidth < 1024) && (
                <>
                  <p className="font-medium truncate">{userInfo.fullname || 'Trader'}</p>
                  <p className="text-sm truncate text-gray-400">{userInfo.loginid}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${userInfo.is_virtual ? 'bg-yellow-500/20 text-yellow-600' : 'bg-green-500/20 text-green-600'}`}>{userInfo.is_virtual ? 'Demo' : 'Real'}</span>
                    <span className="text-sm font-medium">{userInfo.currency} {(userInfo.balance ?? 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {sidebarCollapsed && <div className={`w-8 h-8 rounded-full mx-auto ${userInfo.is_virtual ? 'bg-yellow-500/20' : 'bg-green-500/20'} hidden lg:flex items-center justify-center text-xs`}>{userInfo.fullname?.[0] || 'T'}</div>}
            </div>
          )}

          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-[#ff3355]/20 to-transparent text-[#ff5f6d] border-l-2 border-[#ff3355]' : 'hover:bg-white/5 text-gray-400 hover:text-white'} ${sidebarCollapsed ? 'lg:justify-center' : ''}`} title={sidebarCollapsed ? tab.label : undefined}>
                {tab.icon}
                <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <LogOut className="w-5 h-5" />
              <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Logout</span>
            </button>
          </div>

          {/* Desktop toggle button */}
          <button 
            data-sidebar-toggle
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
            className="hidden lg:flex absolute top-1/2 -right-3 w-6 h-6 rounded-full items-center justify-center shadow-lg hover:scale-110 transition-transform z-40"
            style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-0'}`}>
          {/* Top Header Bar (mobile only shows hamburger in collapsed logo) */}
          <div className="sticky top-0 z-20 flex items-center gap-4 p-3 sm:p-4 border-b border-white/5 bg-black/20 backdrop-blur-xl">
            {/* Mobile hamburger */}
            <button 
              data-sidebar-toggle
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              title={mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base sm:text-lg truncate">{tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Cloud Status Indicator */}
              {supabaseStatus === 'connected' && (
                <div 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-500"
                  title="Data synced to cloud"
                >
                  <Cloud className="w-3 h-3" />
                  <span className="hidden sm:inline">Synced</span>
                </div>
              )}
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
                <StatCard icon={<Target className="w-5 h-5 text-white" />} label="Win Rate" value={`${(analytics.winRate ?? 0).toFixed(1)}%`} trend={(analytics.winRate ?? 0) >= 50 ? 'up' : 'down'} color="from-purple-500 to-pink-500" />
                <StatCard icon={<DollarSign className="w-5 h-5 text-white" />} label="Total Profit" value={`${(analytics.totalProfit ?? 0).toFixed(2)}`} trend={(analytics.totalProfit ?? 0) >= 0 ? 'up' : 'down'} color="from-orange-500 to-red-500" />
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
                <StatCard icon={<Target className="w-5 h-5 text-white" />} label="Win Rate" value={`${(analytics.winRate ?? 0).toFixed(1)}%`} trend={(analytics.winRate ?? 0) >= 50 ? 'up' : 'down'} color="from-green-500 to-emerald-500" />
                <StatCard icon={<DollarSign className="w-5 h-5 text-white" />} label="Total Profit" value={(analytics.totalProfit ?? 0).toFixed(2)} trend={(analytics.totalProfit ?? 0) >= 0 ? 'up' : 'down'} color="from-purple-500 to-pink-500" />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-white" />} label="Avg Profit/Trade" value={(analytics.avgProfit ?? 0).toFixed(2)} color="from-orange-500 to-red-500" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-medium mb-4">Win Rate Visualization</h3>
                  <div className="relative h-32 flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                        <circle cx="64" cy="64" r="56" stroke="url(#winGradient)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${analytics.winRate * 3.52} 352`} />
                        <defs><linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ff3355" /><stop offset="100%" stopColor="#ff8042" /></linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-bold">{(analytics.winRate ?? 0).toFixed(0)}%</span></div>
                    </div>
                  </div>
                </Card>
                <Card>
                  <h3 className="text-lg font-medium mb-4">Trading Streaks</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"><p className="text-3xl font-bold text-green-500">{analytics.winStreak}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Best Win Streak</p></div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-3xl font-bold text-red-500">{analytics.lossStreak}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Worst Loss Streak</p></div>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p className="text-3xl font-bold text-blue-500">{(analytics.bestTrade ?? 0).toFixed(2)}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Best Trade</p></div>
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"><p className="text-3xl font-bold text-purple-500">{(analytics.worstTrade ?? 0).toFixed(2)}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Worst Trade</p></div>
                  </div>
                </Card>
              </div>
              
              {/* Profit Curve */}
              {profitCurve.length > 0 && (
                <Card>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#ff5f6d]" />
                    Profit Curve
                  </h3>
                  <div className="h-48 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const maxProfit = Math.max(...profitCurve.map(p => p.profit), 1);
                        const minProfit = Math.min(...profitCurve.map(p => p.profit), 0);
                        const range = maxProfit - minProfit || 1;
                        const baseline = 50 - ((0 - minProfit) / range) * 50;
                        const points = profitCurve.map((p, i) => {
                          const x = (i / (profitCurve.length - 1 || 1)) * 100;
                          const y = 50 - ((p.profit - minProfit) / range) * 50;
                          return `${x},${y}`;
                        }).join(' ');
                        const areaPoints = `0,${baseline} ${points} 100,${baseline}`;
                        return (
                          <>
                            <line x1="0" y1={baseline} x2="100" y2={baseline} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
                            <polygon points={areaPoints} fill="url(#profitGradient)" />
                            <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute bottom-0 left-0 text-xs" style={{ color: 'var(--text-secondary)' }}>Start</div>
                    <div className="absolute bottom-0 right-0 text-xs" style={{ color: 'var(--text-secondary)' }}>Now</div>
                    <div className="absolute top-0 right-0 text-sm font-medium text-green-500">
                      {profitCurve.length > 0 && `${(profitCurve[profitCurve.length - 1]?.profit ?? 0) >= 0 ? '+' : ''}${(profitCurve[profitCurve.length - 1]?.profit ?? 0).toFixed(2)}`}
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Performance by Hour */}
              {Object.keys(advancedAnalytics.byHour).length > 0 && (
                <Card>
                  <h3 className="text-lg font-medium mb-4">Performance by Hour</h3>
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const data = advancedAnalytics.byHour[hour] || { wins: 0, losses: 0, profit: 0 };
                      const total = data.wins + data.losses;
                      const winRate = total > 0 ? (data.wins / total) * 100 : 0;
                      const bgColor = total === 0 ? 'bg-gray-500/20' : winRate >= 60 ? 'bg-green-500/40' : winRate >= 40 ? 'bg-yellow-500/40' : 'bg-red-500/40';
                      return (
                        <div key={hour} className={`p-2 rounded text-center ${bgColor}`} title={`${hour}:00 - WR: ${winRate.toFixed(0)}% (${total} trades)`}>
                          <p className="text-xs font-mono">{hour.toString().padStart(2, '0')}</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{total}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Green = &gt;60% WR, Yellow = 40-60%, Red = &lt;40%</p>
                </Card>
              )}
              
              {analytics.totalTrades === 0 && <Card><EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No analytics data" description="Sync your trades to see analytics" /></Card>}
              
              {/* === FULL ANALYTICS SECTION === */}
              {fullAnalytics && (
                <>
                  {/* Account Health Score */}
                  <Card>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-[#ff5f6d]" />
                      Account Health Score
                    </h3>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                            <circle 
                              cx="64" cy="64" r="56" 
                              stroke={fullAnalytics.accountHealth.score >= 70 ? '#22c55e' : fullAnalytics.accountHealth.score >= 40 ? '#eab308' : '#ef4444'}
                              strokeWidth="10" fill="none" strokeLinecap="round"
                              strokeDasharray={`${fullAnalytics.accountHealth.score * 3.52} 352`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold">{fullAnalytics.accountHealth.score}</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>/ 100</span>
                          </div>
                        </div>
                        <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                          fullAnalytics.accountHealth.grade === 'A+' || fullAnalytics.accountHealth.grade === 'A' ? 'bg-green-500/20 text-green-500' :
                          fullAnalytics.accountHealth.grade === 'B' ? 'bg-blue-500/20 text-blue-500' :
                          fullAnalytics.accountHealth.grade === 'C' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          Grade: {fullAnalytics.accountHealth.grade}
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        {fullAnalytics.accountHealth.strengths.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-green-500 mb-1">✓ Strengths</p>
                            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                              {fullAnalytics.accountHealth.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                            </ul>
                          </div>
                        )}
                        {fullAnalytics.accountHealth.weaknesses.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-500 mb-1">✗ Weaknesses</p>
                            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                              {fullAnalytics.accountHealth.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* Emotional Score */}
                  <Card>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-500" />
                      Emotional Trading Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <Gauge className={`w-8 h-8 mx-auto mb-2 ${
                          fullAnalytics.emotionalAnalysis.emotionalScore >= 70 ? 'text-green-500' :
                          fullAnalytics.emotionalAnalysis.emotionalScore >= 40 ? 'text-yellow-500' : 'text-red-500'
                        }`} />
                        <p className="text-3xl font-bold">{fullAnalytics.emotionalAnalysis.emotionalScore}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Emotional Score</p>
                        <p className={`text-xs mt-1 ${
                          fullAnalytics.emotionalAnalysis.emotionalStability === 'stable' ? 'text-green-500' :
                          fullAnalytics.emotionalAnalysis.emotionalStability === 'moderate' ? 'text-yellow-500' :
                          fullAnalytics.emotionalAnalysis.emotionalStability === 'unstable' ? 'text-orange-500' : 'text-red-500'
                        }`}>
                          {fullAnalytics.emotionalAnalysis.emotionalStability.toUpperCase()}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl ${fullAnalytics.emotionalAnalysis.revengeTradingDetected ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                        <AlertTriangle className={`w-6 h-6 mb-2 ${fullAnalytics.emotionalAnalysis.revengeTradingDetected ? 'text-red-500' : 'text-green-500'}`} />
                        <p className="font-medium">Revenge Trading</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {fullAnalytics.emotionalAnalysis.revengeTradingDetected 
                            ? `${fullAnalytics.emotionalAnalysis.revengeTradingInstances} instances detected` 
                            : 'Not detected'}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl ${fullAnalytics.emotionalAnalysis.overtradingDetected ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                        <Activity className={`w-6 h-6 mb-2 ${fullAnalytics.emotionalAnalysis.overtradingDetected ? 'text-orange-500' : 'text-green-500'}`} />
                        <p className="font-medium">Overtrading</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {fullAnalytics.emotionalAnalysis.overtradingDetected 
                            ? `Avg ${fullAnalytics.emotionalAnalysis.avgTradesPerSession?.toFixed(1)} trades/hr` 
                            : 'Trading pace is healthy'}
                        </p>
                      </div>
                    </div>
                    {fullAnalytics.emotionalAnalysis.majorFactors.length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm font-medium text-yellow-500 mb-1">Major Factors Affecting Score:</p>
                        <ul className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {fullAnalytics.emotionalAnalysis.majorFactors.map((f, i) => <li key={i}>• {f}</li>)}
                        </ul>
                      </div>
                    )}
                  </Card>

                  {/* Risk Management */}
                  <Card>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-blue-500" />
                      Risk Management
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <p className="text-2xl font-bold">{(fullAnalytics.riskAnalysis.avgRiskPercent ?? 0).toFixed(1)}%</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg Risk/Trade</p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <p className="text-2xl font-bold text-red-500">{(fullAnalytics.riskAnalysis.maxDrawdown ?? 0).toFixed(1)}%</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Max Drawdown</p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <p className="text-2xl font-bold">{(fullAnalytics.tradePerformance.profitFactor ?? 0).toFixed(2)}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Profit Factor</p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <p className={`text-2xl font-bold ${
                          fullAnalytics.riskAnalysis.riskBehavior === 'conservative' ? 'text-green-500' :
                          fullAnalytics.riskAnalysis.riskBehavior === 'moderate' ? 'text-blue-500' :
                          fullAnalytics.riskAnalysis.riskBehavior === 'high_risk' ? 'text-orange-500' : 'text-red-500'
                        }`}>{fullAnalytics.riskAnalysis.riskBehavior?.replace('_', ' ').toUpperCase()}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Risk Profile</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <p className="text-xl font-bold text-green-500">{(fullAnalytics.tradePerformance.avgWin ?? 0).toFixed(2)}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Average Win</p>
                      </div>
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xl font-bold text-red-500">{(fullAnalytics.tradePerformance.avgLoss ?? 0).toFixed(2)}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Average Loss</p>
                      </div>
                    </div>
                  </Card>

                  {/* Contract Type Performance */}
                  {Object.keys(fullAnalytics.tradePerformance.contractTypePerformance || {}).length > 0 && (
                    <Card>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-cyan-500" />
                        Performance by Contract Type
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(fullAnalytics.tradePerformance.contractTypePerformance).map(([type, data]) => (
                          <div key={type} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                            <div>
                              <p className="font-medium">{type}</p>
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.trades} trades</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${data.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                {data.winRate.toFixed(1)}% WR
                              </p>
                              <p className={`text-sm ${data.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {data.profit >= 0 ? '+' : ''}{data.profit.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* AI Recommendations */}
                  {fullAnalytics.recommendations.length > 0 && (
                    <Card>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        AI Recommendations
                      </h3>
                      <div className="space-y-3">
                        {fullAnalytics.recommendations.slice(0, 6).map((rec, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${
                            rec.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                            rec.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
                            'bg-blue-500/10 border-blue-500/30'
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                rec.type === 'critical' ? 'bg-red-500/20' :
                                rec.type === 'warning' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                              }`}>
                                {rec.type === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                                 rec.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                                 <Lightbulb className="w-4 h-4 text-blue-500" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{rec.message}</p>
                                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                                  → {rec.action}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Financial Flow (if statements available) */}
                  {fullAnalytics.financialFlow.depositCount > 0 && (
                    <Card>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <ArrowUpDown className="w-5 h-5 text-emerald-500" />
                        Deposits & Withdrawals Analysis
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                          <p className="text-xl font-bold text-green-500">{fullAnalytics.financialFlow.totalDeposits.toFixed(2)}</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Deposits</p>
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                          <p className="text-xl font-bold text-red-500">{fullAnalytics.financialFlow.totalWithdrawals.toFixed(2)}</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Withdrawals</p>
                        </div>
                        <div className={`p-4 rounded-xl ${fullAnalytics.financialFlow.netFlow >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                          <p className={`text-xl font-bold ${fullAnalytics.financialFlow.netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {fullAnalytics.financialFlow.netFlow >= 0 ? '+' : ''}{fullAnalytics.financialFlow.netFlow.toFixed(2)}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Net Flow</p>
                        </div>
                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                          <p className="text-xl font-bold">{fullAnalytics.financialFlow.fundingStabilityScore}</p>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Funding Score</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}
              
              {analyticsLoading && (
                <Card>
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-3 text-[#ff5f6d]" />
                    <span>Running advanced analytics...</span>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Digit Analyzer Tab */}
          {activeTab === 'digit' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Digit Analyzer</h1><p style={{ color: 'var(--text-secondary)' }}>Analyze digit patterns in your trades</p></div>
              
              {/* Digit Heatmap */}
              <Card>
                <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Digit Heatmap
                </h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                  {Object.entries(digitHeatmap.counts).map(([digit, count]) => {
                    const status = digitHeatmap.hotColdStatus[digit] || 'neutral';
                    const total = Object.values(digitHeatmap.counts).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 10;
                    const bgClass = status === 'hot' ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30 border-orange-500/50' 
                                  : status === 'cold' ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-blue-500/50' 
                                  : 'border-gray-500/30';
                    return (
                      <div key={digit} className={`relative p-4 rounded-2xl border-2 ${bgClass} transition-all duration-300 hover:scale-105`} style={{ backgroundColor: status === 'neutral' ? 'var(--accent-bg)' : undefined }}>
                        {status === 'hot' && <Flame className="absolute top-1 right-1 w-4 h-4 text-orange-500 animate-pulse" />}
                        {status === 'cold' && <Snowflake className="absolute top-1 right-1 w-4 h-4 text-blue-500" />}
                        <div className="text-center">
                          <p className="text-3xl font-bold">{digit}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{count}</p>
                          <p className={`text-xs font-medium ${status === 'hot' ? 'text-orange-500' : status === 'cold' ? 'text-blue-500' : 'text-gray-500'}`}>
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Hot (&gt;30% above avg)</div>
                  <div className="flex items-center gap-2"><Snowflake className="w-4 h-4 text-blue-500" /> Cold (&gt;30% below avg)</div>
                </div>
              </Card>
              
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
              <div><h1 className="text-2xl font-bold">Trade Timeline</h1><p style={{ color: 'var(--text-secondary)' }}>Your recent trading activity with insights</p></div>
              
              {/* Timeline Insights */}
              {(timelineInsights.biggestLoss || timelineInsights.fastestWin || timelineInsights.riskStreaks.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {timelineInsights.biggestLoss && (
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Biggest Loss</p>
                          <p className="text-xl font-bold text-red-500">{(timelineInsights.biggestLoss?.profit ?? 0).toFixed(2)}</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timelineInsights.biggestLoss.symbol}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {timelineInsights.fastestWin && (
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fastest Win</p>
                          <p className="text-xl font-bold text-green-500">+{(timelineInsights.fastestWin?.profit ?? 0).toFixed(2)}</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {Math.round((timelineInsights.fastestWin.sell_time - timelineInsights.fastestWin.purchase_time) / 60)}min
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {timelineInsights.riskStreaks.length > 0 && (
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                          <Flame className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Risk Streaks</p>
                          <p className="text-xl font-bold text-orange-500">{timelineInsights.riskStreaks.length}</p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>3+ loss streaks detected</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}
              
              {tradeHistory.length === 0 ? <Card><EmptyState icon={<Clock className="w-8 h-8" />} title="No trades yet" description="Sync your data to see your trade timeline" /></Card> : (
                <div className="space-y-4">
                  {tradeHistory.slice(0, 20).map((trade, idx) => {
                    const isBiggestLoss = timelineInsights.biggestLoss?.id === trade.id;
                    const isFastestWin = timelineInsights.fastestWin?.id === trade.id;
                    return (
                      <Card key={trade.id} className={isBiggestLoss ? 'ring-2 ring-red-500/50' : isFastestWin ? 'ring-2 ring-green-500/50' : ''}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${trade.profit >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                              {trade.profit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{trade.symbol}</p>
                                {isBiggestLoss && <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500">Biggest Loss</span>}
                                {isFastestWin && <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">Fastest Win</span>}
                              </div>
                              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{trade.shortcode?.slice(0, 30)}...</p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className={`text-lg font-bold ${(trade.profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{(trade.profit ?? 0) >= 0 ? '+' : ''}{(trade.profit ?? 0).toFixed(2)}</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(trade.sell_time * 1000).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 grid grid-cols-3 gap-4 text-sm" style={{ borderTop: '1px solid var(--card-border)' }}>
                          <div><p style={{ color: 'var(--text-secondary)' }}>Buy Price</p><p className="font-medium">{(trade.buy_price ?? 0).toFixed(2)}</p></div>
                          <div><p style={{ color: 'var(--text-secondary)' }}>Sell Price</p><p className="font-medium">{(trade.sell_price ?? 0).toFixed(2)}</p></div>
                          <div><p style={{ color: 'var(--text-secondary)' }}>Duration</p><p className="font-medium">{Math.round(((trade.sell_time ?? 0) - (trade.purchase_time ?? 0)) / 60)}min</p></div>
                        </div>
                      </Card>
                    );
                  })}
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
                  
                  {/* Tags Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setJournalTags(prev => 
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          )}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            journalTags.includes(tag) 
                              ? 'bg-gradient-to-r from-[#ff3355] to-[#ff8042] text-white' 
                              : ''
                          }`}
                          style={{ 
                            backgroundColor: journalTags.includes(tag) ? undefined : 'var(--accent-bg)',
                            border: journalTags.includes(tag) ? undefined : '1px solid var(--card-border)'
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  
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
              
              {/* Tag Filter */}
              {journalEntries.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Filter:</span>
                  </div>
                  <button
                    onClick={() => setSelectedTags([])}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${selectedTags.length === 0 ? 'bg-[#ff5f6d] text-white' : ''}`}
                    style={{ backgroundColor: selectedTags.length === 0 ? undefined : 'var(--accent-bg)', border: selectedTags.length === 0 ? undefined : '1px solid var(--card-border)' }}
                  >
                    All
                  </button>
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev => 
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${selectedTags.includes(tag) ? 'bg-[#ff5f6d] text-white' : ''}`}
                      style={{ backgroundColor: selectedTags.includes(tag) ? undefined : 'var(--accent-bg)', border: selectedTags.includes(tag) ? undefined : '1px solid var(--card-border)' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              
              {journalEntries.length === 0 ? <Card><EmptyState icon={<BookOpen className="w-8 h-8" />} title="No journal entries yet" description="Start documenting your trading journey" /></Card> : (
                <div className="space-y-4">
                  {journalEntries
                    .filter(entry => selectedTags.length === 0 || (entry.tags && entry.tags.some(t => selectedTags.includes(t))))
                    .map(entry => (
                    <Card key={entry.id}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3"><span className="text-2xl">{moodEmojis[entry.mood]}</span><div><h4 className="font-medium">{entry.title}</h4><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(entry.date).toLocaleDateString()}</p></div></div>
                        <button onClick={() => deleteJournalEntry(entry.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <p className="whitespace-pre-wrap">{entry.content}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                          {entry.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 rounded-full text-xs bg-[#ff5f6d]/20 text-[#ff5f6d]">{tag}</span>
                          ))}
                        </div>
                      )}
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
                  <Cloud className="w-5 h-5" /> Cloud Sync
                </h3>
                <SettingRow 
                  icon={supabaseStatus === 'connected' ? <Cloud className="w-5 h-5 text-green-500" /> : <CloudOff className="w-5 h-5" />} 
                  label="Cloud Status" 
                  value={supabaseStatus === 'connected' ? 'Your data syncs to the cloud automatically' : 'Data stored locally on this device'} 
                  action={
                    <span className={`text-xs px-3 py-1.5 rounded-full ${supabaseStatus === 'connected' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20'}`} style={{ color: supabaseStatus !== 'connected' ? 'var(--text-secondary)' : undefined }}>
                      {supabaseStatus === 'connected' ? 'Synced' : 'Local'}
                    </span>
                  }
                />
              </Card>
              
              {/* Keyboard Shortcuts */}
              <Card>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Keyboard className="w-5 h-5" /> Keyboard Shortcuts
                </h3>
                <SettingRow 
                  icon={<Keyboard className="w-5 h-5" />} 
                  label="Enable Shortcuts" 
                  value="Use keyboard shortcuts for navigation" 
                  action={
                    <button 
                      onClick={() => setKeyboardShortcutsEnabled(!keyboardShortcutsEnabled)} 
                      className={`w-14 h-8 rounded-full transition-colors ${keyboardShortcutsEnabled ? 'bg-[#ff3355]' : 'bg-gray-600'}`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white transition-transform mx-1 ${keyboardShortcutsEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  }
                />
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { keys: 'Ctrl+S', action: 'Sync Data' },
                    { keys: 'Ctrl+A', action: 'Analytics' },
                    { keys: 'Ctrl+D', action: 'Digit Analyzer' },
                    { keys: 'Ctrl+T', action: 'Timeline' },
                    { keys: 'Ctrl+J', action: 'Journal' },
                  ].map(shortcut => (
                    <div key={shortcut.keys} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--accent-bg)' }}>
                      <kbd className="px-2 py-1 rounded text-xs font-mono bg-black/30">{shortcut.keys}</kbd>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{shortcut.action}</span>
                    </div>
                  ))}
                </div>
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
