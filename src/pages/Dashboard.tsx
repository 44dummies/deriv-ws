import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  RefreshCw, BarChart3, Hash, Clock, Users, BookOpen, Settings,
  LogOut, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp,
  TrendingDown, DollarSign, Activity, Target, Award, MessageCircle, Heart,
  Wallet, ExternalLink, Shield, Cloud, CloudOff, Menu, Timer, User,
  Flame, AlertTriangle, Tag, Snowflake, Sparkles, Keyboard, Filter, Zap,
  Brain, HeartPulse, Gauge, Lightbulb, ArrowUpDown, PieChart, Scale,
  MessageSquare, Crown, Star, Send, ThumbsUp, Eye, Lock, Bot, Wifi, WifiOff, Home
} from 'lucide-react';

import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';
import supabaseService from '../services/supabaseService';
import analyticsService from '../services/analyticsService';
import chatroomService from '../services/chatroomService';
import realtimeService from '../services/realtimeService';
import aiInsightsService from '../services/aiInsightsService';
import realtimeSocket from '../services/realtimeSocket';
import apiClient from '../services/apiClient';
import { TierChatroom } from '../components/community';
import { NotificationBell } from '../components/trading';
import MobileNavigation from '../components/layout/MobileNavigation';

const STORAGE_KEYS = {
  JOURNAL: 'tradermind_journal',
  TRADES: 'tradermind_trades',
  THEME: 'tradermind_theme',
};


const AVATARS = [
  { id: 1, emoji: '🧑‍💼' }, { id: 2, emoji: '👨‍💻' }, { id: 3, emoji: '👩‍💻' },
  { id: 4, emoji: '🦊' }, { id: 5, emoji: '🦁' }, { id: 6, emoji: '🐺' },
  { id: 7, emoji: '🦅' }, { id: 8, emoji: '🐉' }, { id: 9, emoji: '🦈' },
  { id: 10, emoji: '🐂' }, { id: 11, emoji: '🎭' }, { id: 12, emoji: '🎩' },
  { id: 13, emoji: '🕶️' }, { id: 14, emoji: '🤖' }, { id: 15, emoji: '👽' },
  { id: 16, emoji: '🥷' }, { id: 17, emoji: '🧙‍♂️' }, { id: 18, emoji: '🦸' },
  { id: 19, emoji: '🧑‍🚀' }, { id: 20, emoji: '👑' }, { id: 21, emoji: '💎' },
  { id: 22, emoji: '🚀' }, { id: 23, emoji: '⚡' }, { id: 24, emoji: '🔥' },
  { id: 25, emoji: '💰' }, { id: 26, emoji: '📈' }, { id: 27, emoji: '🎯' },
  { id: 28, emoji: '🏆' }, { id: 29, emoji: '🌟' }, { id: 30, emoji: '🎲' }
];


const getAvatarEmoji = (profilePhoto) => {
  if (!profilePhoto) return '👤';
  if (profilePhoto.startsWith('avatar:')) {
    const id = parseInt(profilePhoto.split(':')[1]) || 1;
    const avatar = AVATARS.find(a => a.id === id);
    return avatar ? avatar.emoji : '👤';
  }
  return '👤';
};


const USE_REALTIME_BACKEND = process.env.REACT_APP_USE_REALTIME_BACKEND === 'true';

const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 
      glass-card transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ icon, label, value, trend, color = 'from-blue-500 to-purple-500' }) => (
  <div className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 glass-card overflow-hidden transition-all duration-300 hover:bg-white/5">
    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
      <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-lg shadow-black/20`}>
        {icon}
      </div>
      {trend && trend !== '' && (
        <div className={`flex items-center gap-0.5 text-[10px] sm:text-xs ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
          {trend === 'up' ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : trend === 'down' ? <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <span className="text-[9px] sm:text-[10px]">{trend}</span>}
        </div>
      )}
    </div>
    <p className="text-sm sm:text-xl font-bold truncate leading-tight text-white">{value}</p>
    <p className="text-[10px] sm:text-xs mt-0.5 truncate text-gray-400">{label}</p>
  </div>
);

const EmptyState = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 glass-card text-gray-400">
      {icon}
    </div>
    <h3 className="text-lg font-medium mb-2 text-white">{title}</h3>
    <p className="text-sm max-w-sm text-gray-400">{description}</p>
  </div>
);

const SettingRow = ({ icon, label, value, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 border-b border-white/5 last:border-0 gap-2 sm:gap-0">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 glass-card text-gray-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm sm:text-base text-gray-200">{label}</p>
        {value && <p className="text-xs sm:text-sm truncate text-gray-400">{value}</p>}
      </div>
    </div>
    {action && <div className="ml-10 sm:ml-0">{action}</div>}
  </div>
);


const DERIV_COMMUNITY_URL = 'https://community.deriv.com';


const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const WARNING_BEFORE_LOGOUT = 60 * 1000;

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('sync');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Sync tab with URL search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Desktop sidebar visibility
  const [tradeHistory, setTradeHistory] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [digitStats, setDigitStats] = useState({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 });
  const [analytics, setAnalytics] = useState({
    totalTrades: 0, winRate: 0, totalProfit: 0, avgProfit: 0,
    bestTrade: 0, worstTrade: 0, winStreak: 0, lossStreak: 0
  });
  const [syncing, setSyncing] = useState(false);
  const [newJournalTitle, setNewJournalTitle] = useState('');
  const [newJournalContent, setNewJournalContent] = useState('');
  const [newJournalMood, setNewJournalMood] = useState('neutral');
  const [communityPosts, setCommunityPosts] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState(null);
  const [useSupabase, setUseSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);


  const [profitCurve, setProfitCurve] = useState([]);
  const [advancedAnalytics, setAdvancedAnalytics] = useState({
    byHour: {}, byMarket: {}, byContractType: {}, streakData: []
  });
  const [digitHeatmap, setDigitHeatmap] = useState({
    counts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    hotColdStatus: {}
  });
  const [timelineInsights, setTimelineInsights] = useState({
    biggestLoss: null, fastestWin: null, riskStreaks: []
  });
  const [journalTags, setJournalTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags] = useState(['#overtrading', '#perfect-entry', '#bad-day', '#strategyA', '#scalping', '#martingale']);
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(true);


  const [backendToken, setBackendToken] = useState(null);


  const [fullAnalytics, setFullAnalytics] = useState(null);
  const [statements, setStatements] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);


  const [assignedRooms, setAssignedRooms] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [communityFeed, setCommunityFeed] = useState([]);
  const [userReputation, setUserReputation] = useState({ score: 0, level: 'Newbie', badges: [] });
  const [chatroomLoading, setChatroomLoading] = useState(false);
  const [chatroomSubTab, setChatroomSubTab] = useState('assigned');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState([]);


  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [tradeAlerts, setTradeAlerts] = useState([]);
  const [roomInsights, setRoomInsights] = useState(null);
  const [roomSentiment, setRoomSentiment] = useState(null);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [quickResponses, setQuickResponses] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [personalizedRecs, setPersonalizedRecs] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const realtimeUnsubRef = useRef(null);


  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeMode, setRealtimeMode] = useState(USE_REALTIME_BACKEND);
  const socketUnsubsRef = useRef([]);


  const [derivWsConnected, setDerivWsConnected] = useState(false);

  // Trading session state
  const [tp, setTp] = useState(10);
  const [sl, setSl] = useState(5);
  const [savingTpSl, setSavingTpSl] = useState(false);
  const [acceptingSession, setAcceptingSession] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [tradingLoading, setTradingLoading] = useState(false);

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [nextSyncTime, setNextSyncTime] = useState(null);
  const autoSyncIntervalRef = useRef(null);
  const lastSyncAttempt = useRef(0);
  const syncBackoffTime = useRef(300000);
  const AUTO_SYNC_INTERVAL = 300000;
  const MIN_SYNC_GAP = 60000;

  const sidebarRef = useRef(null);
  const isInitialized = useRef(false);
  const profileSynced = useRef(false);
  const logoutTimerRef = useRef(null);
  const hadWsDisconnectedRef = useRef(false);


  const handleLogout = useCallback(() => {
    TokenService.clearTokens();
    websocketService.disconnect();
    navigate('/');
  }, [navigate]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
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

        toast.error('Session expired due to inactivity');
        handleLogout();
      } else if (timeSinceActivity >= INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT) {

        setShowInactivityWarning(true);
      }
    }, 10000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(checkInactivity);
    };
  }, [lastActivity, handleLogout]);


  useEffect(() => {
    const checkSupabase = () => {
      const isConfigured = supabaseService.isSupabaseConfigured();
      setUseSupabase(isConfigured);
      setSupabaseStatus(isConfigured ? 'connected' : 'offline');
    };
    checkSupabase();
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && mobileSidebarOpen) {

        const isToggleButton = event.target.closest('[data-sidebar-toggle]');
        if (!isToggleButton) {
          setMobileSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSidebarOpen]);


  const loadFromStorage = useCallback(async () => {

    if (useSupabase && userInfo?.loginid) {
      try {

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

        // OLD TRADE SYNC DISABLED - Using new trading system
        // const { data: tradesData } = await supabaseService.getTradeHistory(userInfo.loginid);
        setTradeHistory([]); // Will be populated by new trading system
        return;
      } catch (err) {
        console.error('Supabase load error:', err);

      }
    }


    const savedJournal = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    const savedTrades = localStorage.getItem(STORAGE_KEYS.TRADES);
    if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
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


    let cumulative = 0;
    const curve = trades.map((t, i) => {
      cumulative += t.profit;
      return { index: i, profit: cumulative, date: t.purchase_time };
    });
    setProfitCurve(curve);


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


    const sortedByProfit = [...trades].sort((a, b) => a.profit - b.profit);
    const biggestLoss = sortedByProfit[0]?.profit < 0 ? sortedByProfit[0] : null;
    const sortedByDuration = [...trades].filter(t => t.profit > 0).sort((a, b) =>
      (a.sell_time - a.purchase_time) - (b.sell_time - b.purchase_time)
    );
    const fastestWin = sortedByDuration[0] || null;


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
    const stats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    trades.forEach(trade => {
      const priceStr = trade.sell_price.toString();
      const lastDigit = parseInt(priceStr[priceStr.length - 1]) || 0;
      stats[lastDigit]++;
    });
    setDigitStats(stats);


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


  const runFullAnalytics = useCallback(async (trades) => {
    if (!trades || trades.length === 0) {
      setFullAnalytics(null);
      return;
    }

    setAnalyticsLoading(true);
    try {

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

    if (isInitialized.current) return;

    const initializeDashboard = async () => {
      try {
        if (!TokenService.isAuthenticated()) { navigate('/'); return; }
        const tokens = TokenService.getTokens();
        if (!tokens) { navigate('/'); return; }

        isInitialized.current = true;

        await websocketService.connect();
        setDerivWsConnected(true);


        const authResponse = await websocketService.authorize(tokens.token, true);
        if (authResponse.error) {
          isInitialized.current = false;
          setDerivWsConnected(false);
          TokenService.clearTokens();
          navigate('/');
          return;
        }

        if (authResponse.authorize) {

          console.log('Full Deriv authorize response:', JSON.stringify(authResponse.authorize, null, 2));


          let loginid = authResponse.authorize.loginid;


          if (!loginid && authResponse.authorize.account_list && authResponse.authorize.account_list.length > 0) {
            loginid = authResponse.authorize.account_list[0].loginid;
          }


          if (!loginid && authResponse.authorize.user_id) {
            loginid = authResponse.authorize.user_id;
          }

          console.log('Extracted loginid:', loginid);

          // Current account balance - set demo or real based on account type
          const currentBalance = authResponse.authorize.balance || 0;
          const isDemo = authResponse.authorize.is_virtual === 1;

          const userData = {
            balance: currentBalance,
            currency: authResponse.authorize.currency,
            email: authResponse.authorize.email,
            fullname: authResponse.authorize.fullname,
            loginid: loginid,
            is_virtual: isDemo,
            // Set the appropriate balance based on current account type
            demo_balance: isDemo ? currentBalance : 0,
            real_balance: isDemo ? 0 : currentBalance,
          };

          console.log('Auth response data:', {
            loginid: loginid,
            email: authResponse.authorize.email,
            fullname: authResponse.authorize.fullname,
            isDemo: isDemo,
            currentBalance: currentBalance,
            demoBalance: userData.demo_balance,
            realBalance: userData.real_balance
          });

          // Save to sessionStorage FIRST so admin dashboard can access it
          sessionStorage.setItem('userInfo', JSON.stringify(userData));

          setUserInfo(userData);

          // Try to fetch all account balances from Deriv API to get BOTH demo and real
          try {
            const allBalancesRes = await websocketService.getAllBalances();
            console.log('All balances response:', JSON.stringify(allBalancesRes, null, 2));

            if (allBalancesRes.balance?.accounts) {
              const accounts = allBalancesRes.balance.accounts;
              let demoBalance = 0;
              let realBalance = 0;

              Object.entries(accounts).forEach(([loginid, accountData]: [string, any]) => {
                console.log('Initial account:', loginid, accountData);
                if (accountData.demo_account === 1 || loginid.startsWith('VRTC')) {
                  demoBalance = accountData.balance || 0;
                } else {
                  realBalance = accountData.balance || 0;
                }
              });

              setUserInfo(prev => {
                const updated = prev ? {
                  ...prev,
                  demo_balance: demoBalance,
                  real_balance: realBalance
                } : null;
                // Save to sessionStorage for admin dashboard access
                if (updated) {
                  sessionStorage.setItem('userInfo', JSON.stringify(updated));
                }
                return updated;
              });

              console.log('Initial balances set - Demo:', demoBalance, 'Real:', realBalance);
            }
          } catch (balErr) {
            console.error('Failed to fetch initial all balances:', balErr);
          }

          if (supabaseService.isSupabaseConfigured() && !profileSynced.current && loginid) {
            profileSynced.current = true;
            const { error } = await supabaseService.upsertUserProfile(userData);
            if (error) {
              console.error('Failed to create Supabase profile:', error);
              profileSynced.current = false;
            }
          }


          try {
            console.log('Attempting backend auth with data:', {
              loginid: loginid,
              email: userData.email,
              fullname: userData.fullname
            });

            if (!loginid) {
              console.error('No loginid available for backend auth. Full auth response:', authResponse.authorize);
            } else {
              const authPayload = {
                derivUserId: loginid,
                loginid: loginid,
                email: userData.email || undefined,
                currency: userData.currency || undefined,
                fullname: userData.fullname || undefined
              };
              console.log('Sending auth payload:', authPayload);

              const backendAuthResponse = await apiClient.loginWithDeriv(authPayload);
              console.log('Backend authentication successful');


              if (backendAuthResponse.accessToken) {
                setBackendToken(backendAuthResponse.accessToken);
                console.log('Backend token saved');
              }
            }
          } catch (backendErr) {
            console.error('Backend auth failed (Community features may not work):', backendErr);
            console.warn('Backend auth error message:', backendErr.message);
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
  }, [navigate]);


  useEffect(() => {
    if (userInfo?.loginid && !isLoading) {
      loadFromStorage();
    }
  }, [userInfo?.loginid, isLoading, loadFromStorage]);


  useEffect(() => {
    const loadUserProfile = async () => {
      try {

        const token = sessionStorage.getItem('accessToken');
        if (!token) {
          console.log('No token available for profile load');
          return;
        }

        const response = await apiClient.get<any>('/users/settings');
        if (response?.profile) {
          setUserProfile({
            username: response.profile.username,
            displayName: response.profile.display_name || response.profile.fullname,
            profilePhoto: response.profile.profile_photo,
            isProfileComplete: response.profile.is_profile_complete,
            role: response.profile.role,
            is_admin: response.profile.is_admin
          });

          // Note: Admin redirect is handled in Callback.js after login
          // Dashboard is accessible to admins if they manually navigate here
        }
      } catch (error) {
        console.log('Could not load user profile:', error);
      }
    };


    if (userInfo?.loginid && backendToken) {
      loadUserProfile();
    }
  }, [userInfo?.loginid, backendToken]);


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


  const handleSilentSync = useCallback(async () => {
    if (syncing || !derivWsConnected) {
      return;
    }


    const now = Date.now();
    if (now - lastSyncAttempt.current < MIN_SYNC_GAP) {
      return;
    }
    lastSyncAttempt.current = now;

    try {

      try {
        const balanceRes = await websocketService.getBalance();
        if (balanceRes.balance) {
          setUserInfo(prev => prev ? { ...prev, balance: balanceRes.balance.balance } : null);
        }

        // Fetch all account balances from Deriv API
        try {
          const allBalancesRes = await websocketService.getAllBalances();
          console.log('All balances response:', allBalancesRes);

          if (allBalancesRes.balance?.accounts) {
            // accounts is an object with loginid as keys
            const accounts = allBalancesRes.balance.accounts;
            let demoBalance = 0;
            let realBalance = 0;

            Object.entries(accounts).forEach(([loginid, accountData]: [string, any]) => {
              console.log('Account:', loginid, accountData);
              if (accountData.demo_account === 1 || loginid.startsWith('VRTC')) {
                demoBalance = accountData.balance || 0;
              } else {
                realBalance = accountData.balance || 0;
              }
            });

            setUserInfo(prev => prev ? {
              ...prev,
              demo_balance: demoBalance,
              real_balance: realBalance
            } : null);

            console.log('Set balances - Demo:', demoBalance, 'Real:', realBalance);
          }
        } catch (allBalErr) {
          console.error('Failed to get all balances:', allBalErr);
        }
      } catch (balanceErr) {
        console.error('Balance fetch error:', balanceErr);
      }


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
        runFullAnalytics(trades);

        if (useSupabase && userInfo?.loginid) {
          await supabaseService.upsertUserProfile(userInfo);
          // Trade history now handled by new trading system API
        }
      }


      syncBackoffTime.current = AUTO_SYNC_INTERVAL;
      setLastSyncTime(new Date());
      setNextSyncTime(new Date(Date.now() + AUTO_SYNC_INTERVAL));
    } catch (err) {

      if (err?.code === 'RateLimit' || err?.message?.includes('rate limit')) {
        syncBackoffTime.current = Math.min(syncBackoffTime.current * 2, 600000);
        setNextSyncTime(new Date(Date.now() + syncBackoffTime.current));
      }
    }
  }, [syncing, derivWsConnected, useSupabase, userInfo, saveToStorage, calculateAnalytics, calculateDigitStats, runFullAnalytics]);

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


        runFullAnalytics(trades);


        if (useSupabase && userInfo?.loginid) {

          await supabaseService.upsertUserProfile(userInfo);

          // OLD TRADE SYNC DISABLED - Using new trading system
          // const { error } = await supabaseService.syncTradeHistory(userInfo.loginid, trades);
        }
      }
      setLastSyncTime(new Date());
      setNextSyncTime(new Date(Date.now() + AUTO_SYNC_INTERVAL));
      toast.success(useSupabase ? 'Data synced to cloud!' : 'Data synced!');
    } catch (err) { console.error('Sync error:', err); toast.error('Failed to sync data'); }
    setSyncing(false);
  };


  useEffect(() => {
    if (autoSyncEnabled && userInfo && !isLoading && derivWsConnected) {

      const initialTimeout = setTimeout(() => {
        handleSilentSync();
      }, 5000);


      const scheduleNextSync = () => {
        autoSyncIntervalRef.current = setTimeout(() => {
          handleSilentSync();
          scheduleNextSync();
        }, syncBackoffTime.current);
      };


      const scheduleTimeout = setTimeout(() => {
        scheduleNextSync();
      }, 10000);

      return () => {
        clearTimeout(initialTimeout);
        clearTimeout(scheduleTimeout);
        if (autoSyncIntervalRef.current) {
          clearTimeout(autoSyncIntervalRef.current);
        }
      };
    }
  }, [autoSyncEnabled, userInfo, isLoading, derivWsConnected, handleSilentSync]);

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

    if (useSupabase && userInfo?.loginid) {
      const { error } = await supabaseService.deleteJournalEntry(id, userInfo.loginid);
      if (error) console.error('Supabase delete error:', error);
    }

    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    saveToStorage(STORAGE_KEYS.JOURNAL, updated);
    toast.success('Entry deleted');
  };




  const fetchCommunityPosts = useCallback(async () => {
    setCommunityLoading(true);
    setCommunityError(null);



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


  const initializeChatrooms = useCallback(async () => {
    setChatroomLoading(true);
    try {

      realtimeService.initialize();


      const userAnalytics = fullAnalytics || {
        accountHealth: { score: 50 },
        emotionalScore: { score: 50 },
        riskManagement: { riskLevel: 'moderate' },
        emotionalPatterns: { patterns: [] },
        profitLoss: { winRate: 50, totalProfit: 0 }
      };


      const rooms = chatroomService.getUserAssignedRooms(userAnalytics);
      setAssignedRooms(rooms);


      try {
        const feedData = await apiClient.getCommunityFeed({ limit: 20 }) as any;
        if (feedData?.posts) {
          const feed = feedData.posts.map(post => ({
            id: post.id,
            userId: post.author?.username,
            userName: post.author?.displayName || post.author?.username,
            avatar: post.author?.avatarUrl || post.author?.displayName?.[0]?.toUpperCase() || '?',
            content: post.content,
            title: post.title,
            type: post.category,
            tags: post.tags || [],
            time: new Date(post.createdAt).toLocaleString(),
            timestamp: post.createdAt,
            likes: post.upvotes || 0,
            comments: post.commentCount || 0,
            views: post.viewCount || 0
          }));
          setCommunityFeed(feed);
        }
      } catch (error) {
        console.error('Failed to load community feed:', error);

        const feed = chatroomService.getCommunityPosts();
        setCommunityFeed(feed);
      }


      const userId = userInfo?.loginid || 'demo_user';
      const rep = chatroomService.getUserReputation(userId);
      setUserReputation(rep);


      const topics = chatroomService.getTrendingTopics();
      setTrendingTopics(topics);


      const stats = chatroomService.getCommunityStats();
      setCommunityStats(stats);


      const allRooms = chatroomService.getAllRooms();
      const recs = aiInsightsService.generatePersonalizedRecommendations(userAnalytics, allRooms);
      setPersonalizedRecs(recs);


      const alerts = realtimeService.getTradeAlerts(5);
      setTradeAlerts(alerts);


      realtimeService.subscribe('newTradeAlert', (alert) => {
        setTradeAlerts(prev => [alert, ...prev.slice(0, 4)]);
      });

    } catch (error) {
      console.error('Failed to initialize chatrooms:', error);
    }
    setChatroomLoading(false);
  }, [fullAnalytics, userInfo]);

  const enterChatRoom = useCallback(async (room) => {

    if (realtimeMode && realtimeConnected) {
      try {

        const messages = await apiClient.getChatroomMessages(room.id) as any[];
        setChatMessages(messages.map((m: any) => ({
          id: m.id,
          content: m.content,
          userName: m.user?.displayName || m.user?.username,
          avatar: m.user?.avatarUrl || '👤',
          userId: m.user?.id,
          time: new Date(m.createdAt).toLocaleTimeString(),
          timestamp: m.createdAt,
          reactions: m.reactions || []
        })));

        setActiveChatRoom(room);


        realtimeSocket.joinRoom(room.id);

        return;
      } catch (error) {
        console.error('Failed to load messages from backend:', error);

      }
    }


    const result = chatroomService.enterRoom(room.id, userInfo?.loginid);
    if (result.success) {
      setActiveChatRoom({
        ...room,
        activeTraders: result.room.activeTraders
      });
      setChatMessages(result.room.messages);
    } else {

      setActiveChatRoom(room);
      const messages = chatroomService.getMessages(room.id);
      setChatMessages(messages);
    }


    realtimeService.initialize();


    const users = realtimeService.getOnlineUsers(room.id);
    setOnlineUsers(users);
    setOnlineCount(users.length);


    if (realtimeUnsubRef.current) {
      realtimeUnsubRef.current();
    }
    realtimeUnsubRef.current = realtimeService.subscribeToRoom(room.id, (eventType, data) => {
      switch (eventType) {
        case 'typing':
          setTypingUsers(data.typingUsers || []);
          break;
        case 'userJoined':
        case 'userLeft':
        case 'userStatus':
          setOnlineUsers(realtimeService.getOnlineUsers(room.id));
          break;
        case 'onlineCount':
          setOnlineCount(data.count);
          break;
        case 'message':
          setChatMessages(prev => [...prev, data.message]);
          break;
        default:
          break;
      }
    });


    const messages = chatroomService.getMessages(room.id);
    const insights = aiInsightsService.generateRoomInsights(room.id, messages, room.type);
    setRoomInsights(insights);
    setRoomSentiment(insights?.sentiment || null);


    setQuickResponses(chatroomService.getQuickResponses(room.id));


    setTradeAlerts(realtimeService.getTradeAlerts(5));
  }, [userInfo, realtimeMode, realtimeConnected]);

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim() || !activeChatRoom) return;

    const userId = userInfo?.loginid || 'demo_user';
    const userName = userInfo?.fullname || 'Trader';


    if (realtimeMode && realtimeConnected) {
      realtimeSocket.sendMessage(activeChatRoom.id, chatInput);
      realtimeSocket.sendTyping(activeChatRoom.id, false);
      setChatInput('');
      return;
    }



    realtimeService.setUserTyping(activeChatRoom.id, userId, false);


    const newMessage = chatroomService.sendMessage(activeChatRoom.id, userId, userName, chatInput, userProfile?.profilePhoto || undefined);

    if (newMessage) {
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');


      realtimeService.pushMessage(activeChatRoom.id, newMessage);


      if (activeChatRoom.id === 'ai-coaching' || activeChatRoom.id === 'ai-smart-trading') {
        setTimeout(() => {
          const aiResponse = chatroomService.sendAICoachingMessage(activeChatRoom.id, chatInput, fullAnalytics);
          setChatMessages(prev => [...prev, aiResponse]);
        }, 1000);
      }


      setTimeout(() => {
        const messages = chatroomService.getMessages(activeChatRoom.id);
        const insights = aiInsightsService.generateRoomInsights(activeChatRoom.id, messages, activeChatRoom.type);
        setRoomInsights(insights);
        setRoomSentiment(insights?.sentiment || null);
      }, 500);
    }
  }, [chatInput, activeChatRoom, userInfo, fullAnalytics, realtimeMode, realtimeConnected]);


  const handleChatInputChange = useCallback((e) => {
    setChatInput(e.target.value);


    if (realtimeMode && realtimeConnected && activeChatRoom) {
      realtimeSocket.sendTyping(activeChatRoom.id, e.target.value.length > 0);
      return;
    }


    if (activeChatRoom && userInfo?.loginid) {
      realtimeService.setUserTyping(activeChatRoom.id, userInfo.loginid, e.target.value.length > 0);
    }
  }, [activeChatRoom, userInfo, realtimeMode, realtimeConnected]);

  const leaveChatRoom = useCallback(() => {

    if (realtimeMode && realtimeConnected && activeChatRoom) {
      realtimeSocket.leaveRoom(activeChatRoom.id);
    }


    if (activeChatRoom) {
      chatroomService.exitRoom(activeChatRoom.id);

      if (realtimeUnsubRef.current) {
        realtimeUnsubRef.current();
        realtimeUnsubRef.current = null;
      }
    }
    setActiveChatRoom(null);
    setChatMessages([]);
    setTypingUsers([]);
    setOnlineUsers([]);
    setRoomInsights(null);
    setRoomSentiment(null);
  }, [activeChatRoom]);

  const createCommunityPost = useCallback(async () => {
    if (!newPostContent.trim()) return;

    try {
      const result = await apiClient.createPost({
        title: newPostContent.trim().substring(0, 100),
        content: newPostContent.trim(),
        category: 'discussion',
        tags: newPostTags
      }) as any;

      if (result) {

        const feedData = await apiClient.getCommunityFeed({ limit: 20 }) as any;
        if (feedData?.posts) {
          setCommunityFeed(feedData.posts.map((post: any) => ({
            id: post.id,
            userId: post.author?.username,
            userName: post.author?.displayName || post.author?.username,
            avatar: post.author?.avatarUrl || post.author?.displayName?.[0]?.toUpperCase() || '?',
            content: post.content,
            title: post.title,
            type: post.category,
            tags: post.tags || [],
            time: new Date(post.createdAt).toLocaleString(),
            timestamp: post.createdAt,
            likes: post.upvotes || 0,
            comments: post.commentCount || 0,
            views: post.viewCount || 0
          })));
        }
        setNewPostContent('');
        setNewPostTags([]);
        toast.success('Post shared with the community!');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error(error.message || 'Failed to create post');
    }
  }, [newPostContent, newPostTags]);


  useEffect(() => {
    if (activeTab === 'community' && assignedRooms.length === 0) {
      initializeChatrooms();
    }
  }, [activeTab, assignedRooms.length, initializeChatrooms]);


  useEffect(() => {
    if (!realtimeMode || activeTab !== 'community') return;

    const connectToBackend = async () => {
      try {

        if (userInfo?.loginid) {
          const result = await apiClient.loginWithDeriv({
            derivUserId: userInfo.loginid,
            loginid: userInfo.loginid,
            email: userInfo.email,
            currency: userInfo.currency,
            country: userInfo.country,
            fullname: userInfo.fullname
          });


          await realtimeSocket.connect(result.accessToken);
          setRealtimeConnected(true);
          toast.success('Connected to live chat!', { icon: '🔌' });


          const unsub1 = realtimeSocket.onMessage((msg) => {
            if (activeChatRoom && msg.roomId === activeChatRoom.id) {
              setChatMessages(prev => [...prev, {
                id: msg.id,
                content: msg.content,
                userName: msg.user?.displayName || msg.user?.username,
                avatar: msg.user?.avatarUrl || '👤',
                time: 'Just now',
                timestamp: msg.createdAt,
                reactions: msg.reactions || []
              }]);
            }
          });

          const unsub2 = realtimeSocket.onTyping((data) => {
            if (activeChatRoom && data.roomId === activeChatRoom.id) {
              setTypingUsers(data.isTyping
                ? prev => [...new Set([...prev, data.username])]
                : prev => prev.filter(u => u !== data.username)
              );
            }
          });

          const unsub3 = realtimeSocket.onPresence((data) => {
            if (activeChatRoom && data.roomId === activeChatRoom.id) {
              setOnlineCount(data.count || 0);
              setOnlineUsers(data.users || []);
            }
          });

          const unsub4 = realtimeSocket.onConnectionChange((connected) => {
            setRealtimeConnected(connected);
            if (!connected) {
              toast.error('Chat connection lost', { icon: '⚠️' });
            }
          });

          socketUnsubsRef.current = [unsub1, unsub2, unsub3, unsub4];


          try {
            const rooms = await apiClient.getChatrooms() as any[];
            if (rooms.length > 0) {
              setAssignedRooms(rooms.map((r: any) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                icon: r.icon || '💬',
                type: r.type,
                level: r.level,
                fitScore: r.fitScore,
                activeNow: r.memberCount
              })));
            }
          } catch (err) {
            console.warn('Could not load rooms from backend, using local:', err);
          }
        }
      } catch (error) {
        console.error('Failed to connect to real-time backend:', error);

        setRealtimeMode(false);
      }
    };

    connectToBackend();

    return () => {
      socketUnsubsRef.current.forEach(unsub => unsub?.());
      socketUnsubsRef.current = [];
    };
  }, [activeTab, realtimeMode, userInfo, activeChatRoom]);


  useEffect(() => {
    if (activeTab === 'community' && communityPosts.length === 0) {
      fetchCommunityPosts();
    }
  }, [activeTab, communityPosts.length, fetchCommunityPosts]);

  // Load trading session data
  const loadTradingData = useCallback(async () => {
    setTradingLoading(true);
    try {
      const response = await apiClient.get<any>('/user/dashboard');
      if (response) {
        setCurrentSession(response.currentSession || null);
        setAvailableSessions(response.availableSessions || []);
        if (response.settings) {
          setTp(response.settings.default_tp || 10);
          setSl(response.settings.default_sl || 5);
        }
      }
    } catch (error) {
      console.error('Failed to load trading data:', error);
    }
    setTradingLoading(false);
  }, []);

  // Load trading data when trading tab is active
  useEffect(() => {
    if (activeTab === 'trading') {
      loadTradingData();
    }
  }, [activeTab, loadTradingData]);

  // Save TP/SL settings
  const handleSaveTPSL = async () => {
    if (tp <= 0 || sl <= 0) {
      toast.error('TP and SL must be greater than 0');
      return;
    }
    setSavingTpSl(true);
    try {
      await apiClient.put('/user/tpsl', { tp, sl });
      toast.success('Settings saved');
      loadTradingData();
    } catch (error) {
      toast.error(error.message || 'Failed to save settings');
    }
    setSavingTpSl(false);
  };

  // Accept trading session
  const handleAcceptSession = async (sessionId, sessionMode?: string, minBalance?: number) => {
    if (!sessionId) {
      console.error('Session ID is undefined. Available sessions:', availableSessions);
      toast.error('Cannot join session: Invalid session ID');
      return;
    }

    // Check user balance against session minimum balance
    const isDemo = sessionMode?.toLowerCase()?.includes('demo');
    const userBalance = isDemo ? (userInfo?.demo_balance || 0) : (userInfo?.real_balance || 0);

    if (minBalance && userBalance < minBalance) {
      toast.error(
        `💰 Your ${isDemo ? 'demo' : 'real'} balance ($${userBalance.toFixed(2)}) is below the session minimum ($${minBalance}). ` +
        `Please wait for a session with a lower minimum balance requirement.`,
        { duration: 6000 }
      );
      return;
    }

    // Select correct token based on session mode
    const demoToken = sessionStorage.getItem('derivDemoToken');
    const realToken = sessionStorage.getItem('derivRealToken') || sessionStorage.getItem('derivToken');

    console.log('Session mode:', sessionMode, 'isDemo:', isDemo);
    console.log('Available tokens - Demo:', !!demoToken, 'Real:', !!realToken);
    console.log('User balance - Demo:', userInfo?.demo_balance, 'Real:', userInfo?.real_balance);

    let derivToken;
    if (isDemo) {
      derivToken = demoToken;
      if (!derivToken) {
        toast.error('No DEMO account token found. Please logout and login again.');
        return;
      }
    } else {
      derivToken = realToken;
      if (!derivToken) {
        toast.error('No trading account token found. Please logout and login again.');
        return;
      }
    }

    setAcceptingSession(true);
    try {
      await apiClient.post(`/user/sessions/${sessionId}/accept`, {
        tp,
        sl,
        derivToken
      });
      toast.success('✅ Successfully joined session!');
      loadTradingData();
    } catch (error) {
      toast.error(error.message || 'Failed to join session');
    }
    setAcceptingSession(false);
  };

  // Leave session
  const handleLeaveSession = async () => {
    if (!window.confirm('Are you sure you want to leave the current session?')) {
      return;
    }
    try {
      await apiClient.post(`/user/sessions/${currentSession?.sessionId}/leave`, {});
      toast.success('Left session');
      loadTradingData();
    } catch (error) {
      toast.error(error.message || 'Failed to leave session');
    }
  };

  const tabs = [
    { id: 'sync', icon: <RefreshCw className="w-5 h-5" />, label: 'Sync Data' },
    { id: 'trading', icon: <Target className="w-5 h-5" />, label: 'Trading' },
    { id: 'analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics' },
    { id: 'digit', icon: <Hash className="w-5 h-5" />, label: 'Digit Analyzer' },
    { id: 'timeline', icon: <Clock className="w-5 h-5" />, label: 'Trade Timeline' },
    { id: 'community', icon: <Users className="w-5 h-5" />, label: 'Community' },
    { id: 'journal', icon: <BookOpen className="w-5 h-5" />, label: 'Journal' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings', navigateTo: '/settings' },
  ];

  const moodEmojis = { great: '🚀', good: '😊', neutral: '😐', bad: '😔' };


  useEffect(() => {

    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    if (userInfo) {

      const DAY = 24 * 60 * 60 * 1000;
      logoutTimerRef.current = setTimeout(() => {
        try {
          toast('Session expired after 24 hours, logging out...', { icon: '⏳' });
        } catch (e) { }
        handleLogout();
      }, DAY);
    }

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [userInfo, handleLogout]);


  useEffect(() => {
    const unsub = websocketService.onConnectionChange((state) => {
      if (state === 'closed') {
        hadWsDisconnectedRef.current = true;
        setDerivWsConnected(false);
      } else if (state === 'open') {
        setDerivWsConnected(true);
        if (hadWsDisconnectedRef.current) {

          hadWsDisconnectedRef.current = false;
          try {
            toast('Connection restored. Please login again for security.', { icon: '🔒' });
          } catch (e) { }
          handleLogout();
        }
      }
    });

    return () => { if (typeof unsub === 'function') unsub(); };
  }, [handleLogout]);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#0a0a0f] text-white flex transition-all duration-300 ${sidebarOpen ? 'lg:pr-[280px]' : ''} relative overflow-hidden`}>
        {/* Liquid Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#3b82f6]/15 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#8b5cf6]/15 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 z-10 relative items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 animate-pulse text-white" style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-accent))` }}>T</div>
            <p style={{ color: 'var(--theme-text-secondary)' }}>Loading TraderMind...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundColor: '#0a0a0f',
        color: 'var(--theme-text)',
        '--card-bg': 'rgba(255,255,255,0.05)',
        '--card-border': 'rgba(255,255,255,0.1)',
        '--text-secondary': 'rgba(255,255,255,0.5)',
        '--accent-bg': 'rgba(255,255,255,0.05)'
      } as React.CSSProperties}
    >
      {/* Liquid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#3b82f6]/15 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#8b5cf6]/15 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Toaster position="top-right" />

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

        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-10 h-96 w-96 rounded-full bg-[#ff3355]/20 blur-[160px]" />
          <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-[#5d5dff]/10 blur-[200px]" />
        </div>

        <div className="relative z-10 flex">
          { }
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          {/* Desktop Sidebar completely removed - using horizontal tabs instead */}

          <main className="flex-1 overflow-auto min-h-screen transition-all duration-300 pb-[80px] lg:pb-0">
            {/* Header with branding and user info */}
            <div className="sticky top-0 z-20 border-b border-white/5 bg-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 md:p-4">
                {/* Logo */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-sm sm:text-lg font-bold text-white">
                    T
                  </div>
                  <span className="font-semibold text-sm sm:text-lg hidden sm:inline">TraderMind</span>
                </div>

                <div className="flex-1 min-w-0" />

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Notification Bell */}
                  <NotificationBell socket={realtimeSocket.socket} />

                  {/* Supabase Status */}
                  {supabaseStatus === 'connected' && (
                    <div
                      className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs bg-green-500/20 text-green-500"
                      title="Data synced to cloud"
                    >
                      <Cloud className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                  )}

                  {/* User Info */}
                  {userInfo && (
                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/5">
                      <span className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded ${userInfo.is_virtual ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                        {userInfo.is_virtual ? 'Demo' : 'Real'}
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{userInfo.currency} {userInfo.balance?.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Logout button - desktop only */}
                  <button
                    onClick={handleLogout}
                    className="hidden lg:flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs sm:text-sm"
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xl:inline">Logout</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Tab Bar - Desktop Only */}
              <nav className="hidden lg:flex items-center gap-1 px-4 pb-2 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.navigateTo) {
                        navigate(tab.navigateTo);
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium ${activeTab === tab.id && !tab.navigateTo
                      ? 'bg-gradient-to-r from-[#ff3355]/20 to-[#ff8042]/10 text-[#ff5f6d] border border-[#ff3355]/30'
                      : 'hover:bg-white/5 text-gray-400 hover:text-white'
                      }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-2 sm:p-3 md:p-6">
              { }
              {activeTab === 'sync' && (
                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-base sm:text-xl md:text-2xl font-bold">Live Sync</h1>
                        <p className="text-[10px] sm:text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>Auto syncs every minute</p>
                      </div>
                      <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 text-white text-xs sm:text-sm">
                        <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'Sync' : 'Sync'}</span>
                      </button>
                    </div>

                    {/* Auto-sync toggle - compact */}
                    <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        {autoSyncEnabled && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                        <span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Auto-sync {autoSyncEnabled ? 'on' : 'off'}
                          {lastSyncTime && autoSyncEnabled && <span className="hidden sm:inline"> • Last: {lastSyncTime.toLocaleTimeString()}</span>}
                        </span>
                      </div>
                      <button
                        onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                        className={`w-8 h-4 sm:w-10 sm:h-5 rounded-full transition-colors relative ${autoSyncEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white transition-transform ${autoSyncEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <StatCard
                      icon={<Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                      label="Real Balance"
                      value={`${userInfo?.currency || 'USD'} ${(userInfo?.real_balance !== undefined ? userInfo.real_balance : (userInfo?.is_virtual ? 0 : userInfo?.balance || 0)).toFixed(2)}`}
                      trend=""
                      color="from-green-500 to-emerald-500"
                    />
                    <StatCard
                      icon={<Activity className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
                      label="Demo Balance"
                      value={`${userInfo?.currency || 'USD'} ${(userInfo?.demo_balance !== undefined ? userInfo.demo_balance : (userInfo?.is_virtual ? userInfo?.balance || 0 : 0)).toFixed(2)}`}
                      trend=""
                      color="from-blue-500 to-indigo-500"
                    />
                    <StatCard icon={<Target className="w-3 h-3 sm:w-4 sm:h-4 text-white" />} label="Win Rate" value={`${(analytics.winRate ?? 0).toFixed(1)}%`} trend={(analytics.winRate ?? 0) >= 50 ? 'up' : 'down'} color="from-purple-500 to-pink-500" />
                    <StatCard icon={<DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-white" />} label="Total Profit" value={`$${(analytics.totalProfit ?? 0).toFixed(0)}`} trend={(analytics.totalProfit ?? 0) >= 0 ? 'up' : 'down'} color="from-orange-500 to-red-500" />
                  </div>
                  <Card>
                    <h3 className="text-base sm:text-lg font-medium mb-4">Connection Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${derivWsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                          <span className="text-sm sm:text-base">Deriv WebSocket</span>
                        </div>
                        <span className={`text-sm ${derivWsConnected ? 'text-green-500' : 'text-red-500'}`}>
                          {derivWsConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-sm sm:text-base">Trade History</span>
                        </div>
                        <span className="text-green-500 text-sm">{tradeHistory.length} trades</span>
                      </div>
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${useSupabase ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
                          <span className="text-sm sm:text-base">Cloud Storage</span>
                        </div>
                        <span className={`text-sm ${useSupabase ? 'text-green-500' : 'text-yellow-500'}`}>{useSupabase ? 'Enabled' : 'Local only'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${realtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                          <span className="text-sm sm:text-base">Chat Server</span>
                        </div>
                        <span className={`text-sm ${realtimeConnected ? 'text-green-500' : 'text-gray-500'}`}>
                          {realtimeConnected ? 'Connected' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-sm sm:text-base">Account</span>
                        </div>
                        <span className="text-green-500 text-sm truncate max-w-[120px] sm:max-w-none">{userInfo?.loginid}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Trading Tab */}
              {activeTab === 'trading' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Trading Sessions</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your TP/SL and active sessions</p>
                  </div>

                  {tradingLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <>
                      {/* Current Session Status */}
                      <Card>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium">Session Status</h3>
                          {currentSession?.userStatus && (
                            <span className={`px-3 py-1 rounded-full text-sm ${currentSession.userStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                              currentSession.userStatus === 'removed_tp' ? 'bg-blue-500/20 text-blue-400' :
                                currentSession.userStatus === 'removed_sl' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                              }`}>
                              {currentSession.userStatus === 'active' ? 'Active' :
                                currentSession.userStatus === 'removed_tp' ? 'TP Hit ✓' :
                                  currentSession.userStatus === 'removed_sl' ? 'SL Hit' :
                                    currentSession.userStatus}
                            </span>
                          )}
                        </div>

                        {currentSession ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span style={{ color: 'var(--text-secondary)' }}>Session</span>
                              <span className="font-medium">{currentSession.sessionName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ color: 'var(--text-secondary)' }}>Type</span>
                              <span className="capitalize">{currentSession.sessionType}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ color: 'var(--text-secondary)' }}>Current P&L</span>
                              <span className={`font-medium ${(currentSession.currentPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${(currentSession.currentPnl || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ color: 'var(--text-secondary)' }}>Your TP</span>
                              <span className="text-green-400">${currentSession.tp}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span style={{ color: 'var(--text-secondary)' }}>Your SL</span>
                              <span className="text-red-400">${currentSession.sl}</span>
                            </div>
                            {currentSession.userStatus === 'active' && (
                              <button
                                onClick={handleLeaveSession}
                                className="w-full mt-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                              >
                                Leave Session
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                            Not currently in any trading session
                          </p>
                        )}
                      </Card>

                      {/* TP/SL Settings */}
                      <Card>
                        <h3 className="text-lg font-medium mb-4">Take Profit / Stop Loss</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                              Take Profit ($)
                            </label>
                            <div className="relative">
                              <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                              <input
                                type="number"
                                value={tp}
                                onChange={(e) => setTp(parseFloat(e.target.value) || 0)}
                                min="1"
                                step="0.5"
                                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                              Stop Loss ($)
                            </label>
                            <div className="relative">
                              <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                              <input
                                type="number"
                                value={sl}
                                onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
                                min="1"
                                step="0.5"
                                className="w-full pl-10 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleSaveTPSL}
                          disabled={savingTpSl}
                          className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
                        >
                          {savingTpSl ? 'Saving...' : 'Update Settings'}
                        </button>
                        {currentSession?.sessionStatus === 'pending' && (
                          <p className="text-center mt-3 text-sm text-yellow-500 animate-pulse">
                            ⏳ Waiting for admin to start session...
                          </p>
                        )}
                      </Card>

                      {/* Available Sessions - Always show, but filter out current */}
                      {availableSessions.length > 0 && (
                        <Card>
                          <h3 className="text-lg font-medium mb-4">Available Sessions</h3>
                          <div className="space-y-3">
                            {availableSessions
                              .filter(s => !currentSession || (s.id !== currentSession.sessionId && s.session_id !== currentSession.sessionId))
                              .map(session => {
                                // Support both formats: direct fields or nested trading_sessions
                                const sessionId = session.id || session.session_id;
                                const sessionDetails = session.trading_sessions || session;

                                return (
                                  <div
                                    key={sessionId}
                                    className="p-4 rounded-xl border"
                                    style={{ backgroundColor: 'var(--accent-bg)', borderColor: 'var(--card-border)' }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium">{sessionDetails.name}</h4>
                                      <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 capitalize">
                                        {sessionDetails.type}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                      <div>
                                        <span className="block text-xs">Min Balance</span>
                                        <span style={{ color: 'var(--text-primary)' }}>${sessionDetails.min_balance}</span>
                                      </div>
                                      <div>
                                        <span className="block text-xs">Default TP</span>
                                        <span className="text-green-400">${sessionDetails.default_tp}</span>
                                      </div>
                                      <div>
                                        <span className="block text-xs">Default SL</span>
                                        <span className="text-red-400">${sessionDetails.default_sl}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAcceptSession(sessionId, sessionDetails.mode || sessionDetails.type, sessionDetails.min_balance)}
                                      disabled={acceptingSession || session.hasJoined}
                                      className="w-full py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                      {session.hasJoined ? (
                                        <>✓ Already Joined</>
                                      ) : acceptingSession ? (
                                        'Joining...'
                                      ) : (
                                        <>✓ Accept Trading Session</>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            {availableSessions.filter(s => !currentSession || (s.id !== currentSession.sessionId && s.session_id !== currentSession.sessionId)).length === 0 && (
                              <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                                No other sessions available
                              </p>
                            )}
                          </div>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-4 sm:space-y-6">
                  <div><h1 className="text-xl sm:text-2xl font-bold">Analytics</h1><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your trading performance overview</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} label="Total Trades" value={analytics.totalTrades} trend="" color="from-blue-500 to-cyan-500" />
                    <StatCard icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} label="Win Rate" value={`${(analytics.winRate ?? 0).toFixed(1)}%`} trend={(analytics.winRate ?? 0) >= 50 ? 'up' : 'down'} color="from-green-500 to-emerald-500" />
                    <StatCard icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} label="Total Profit" value={(analytics.totalProfit ?? 0).toFixed(2)} trend={(analytics.totalProfit ?? 0) >= 0 ? 'up' : 'down'} color="from-purple-500 to-pink-500" />
                    <StatCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />} label="Avg Profit/Trade" value={(analytics.avgProfit ?? 0).toFixed(2)} trend="" color="from-orange-500 to-red-500" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <Card>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Win Rate Visualization</h3>
                      <div className="relative h-28 sm:h-32 flex items-center justify-center">
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                            <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                            <circle cx="64" cy="64" r="56" stroke="url(#winGradient)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${analytics.winRate * 3.52} 352`} />
                            <defs><linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ff3355" /><stop offset="100%" stopColor="#ff8042" /></linearGradient></defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl sm:text-2xl font-bold">{(analytics.winRate ?? 0).toFixed(0)}%</span></div>
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Trading Streaks</h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div className="p-3 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/20"><p className="text-2xl sm:text-3xl font-bold text-green-500">{analytics.winStreak}</p><p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Best Win Streak</p></div>
                        <div className="p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-2xl sm:text-3xl font-bold text-red-500">{analytics.lossStreak}</p><p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Worst Loss Streak</p></div>
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p className="text-3xl font-bold text-blue-500">{(analytics.bestTrade ?? 0).toFixed(2)}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Best Trade</p></div>
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"><p className="text-3xl font-bold text-purple-500">{(analytics.worstTrade ?? 0).toFixed(2)}</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Worst Trade</p></div>
                      </div>
                    </Card>
                  </div>

                  { }
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

                  { }
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

                  { }
                  {fullAnalytics && (
                    <>
                      { }
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
                            <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${fullAnalytics.accountHealth.grade === 'A+' || fullAnalytics.accountHealth.grade === 'A' ? 'bg-green-500/20 text-green-500' :
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

                      { }
                      <Card>
                        <h3 className="text-base sm:text-lg font-medium mb-4 flex items-center gap-2">
                          <Brain className="w-5 h-5 text-purple-500" />
                          Emotional Trading Analysis
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                          <div className="p-3 sm:p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--accent-bg)' }}>
                            <Gauge className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${fullAnalytics.emotionalAnalysis.emotionalScore >= 70 ? 'text-green-500' :
                              fullAnalytics.emotionalAnalysis.emotionalScore >= 40 ? 'text-yellow-500' : 'text-red-500'
                              }`} />
                            <p className="text-2xl sm:text-3xl font-bold">{fullAnalytics.emotionalAnalysis.emotionalScore}</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Emotional Score</p>
                            <p className={`text-[10px] sm:text-xs mt-1 font-medium truncate ${fullAnalytics.emotionalAnalysis.emotionalStability === 'stable' ? 'text-green-500' :
                              fullAnalytics.emotionalAnalysis.emotionalStability === 'moderate' ? 'text-yellow-500' :
                                fullAnalytics.emotionalAnalysis.emotionalStability === 'unstable' ? 'text-orange-500' : 'text-red-500'
                              }`}>
                              {fullAnalytics.emotionalAnalysis.emotionalStability.toUpperCase()}
                            </p>
                          </div>
                          <div className={`p-3 sm:p-4 rounded-xl ${fullAnalytics.emotionalAnalysis.revengeTradingDetected ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                            <AlertTriangle className={`w-5 sm:w-6 h-5 sm:h-6 mb-2 ${fullAnalytics.emotionalAnalysis.revengeTradingDetected ? 'text-red-500' : 'text-green-500'}`} />
                            <p className="font-medium text-sm sm:text-base">Revenge Trading</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {fullAnalytics.emotionalAnalysis.revengeTradingDetected
                                ? `${fullAnalytics.emotionalAnalysis.revengeTradingInstances} instances detected`
                                : 'Not detected'}
                            </p>
                          </div>
                          <div className={`p-3 sm:p-4 rounded-xl ${fullAnalytics.emotionalAnalysis.overtradingDetected ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                            <Activity className={`w-5 sm:w-6 h-5 sm:h-6 mb-2 ${fullAnalytics.emotionalAnalysis.overtradingDetected ? 'text-orange-500' : 'text-green-500'}`} />
                            <p className="font-medium text-sm sm:text-base">Overtrading</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {fullAnalytics.emotionalAnalysis.overtradingDetected
                                ? `Avg ${fullAnalytics.emotionalAnalysis.avgTradesPerSession?.toFixed(1)} trades/hr`
                                : 'Trading pace is healthy'}
                            </p>
                          </div>
                        </div>
                        {fullAnalytics.emotionalAnalysis.majorFactors.length > 0 && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-xs sm:text-sm font-medium text-yellow-500 mb-1">Major Factors Affecting Score:</p>
                            <ul className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {fullAnalytics.emotionalAnalysis.majorFactors.map((f, i) => <li key={i}>• {f}</li>)}
                            </ul>
                          </div>
                        )}
                      </Card>

                      { }
                      <Card>
                        <h3 className="text-base sm:text-lg font-medium mb-4 flex items-center gap-2">
                          <Scale className="w-5 h-5 text-blue-500" />
                          Risk Management
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                          <div className="p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                            <p className="text-xl sm:text-2xl font-bold">{(fullAnalytics.riskAnalysis.avgRiskPercent ?? 0).toFixed(1)}%</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Avg Risk/Trade</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                            <p className="text-xl sm:text-2xl font-bold text-red-500">{(fullAnalytics.riskAnalysis.maxDrawdown ?? 0).toFixed(1)}%</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Max Drawdown</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                            <p className="text-xl sm:text-2xl font-bold">{(fullAnalytics.tradePerformance.profitFactor ?? 0).toFixed(2)}</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Profit Factor</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                            <p className={`text-base sm:text-xl lg:text-2xl font-bold leading-tight truncate ${fullAnalytics.riskAnalysis.riskBehavior === 'conservative' ? 'text-green-500' :
                              fullAnalytics.riskAnalysis.riskBehavior === 'moderate' ? 'text-blue-500' :
                                fullAnalytics.riskAnalysis.riskBehavior === 'high_risk' ? 'text-orange-500' : 'text-red-500'
                              }`}>{fullAnalytics.riskAnalysis.riskBehavior?.replace('_', ' ').toUpperCase()}</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Risk Profile</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                          <div className="p-3 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-lg sm:text-xl font-bold text-green-500">{(fullAnalytics.tradePerformance.avgWin ?? 0).toFixed(2)}</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Average Win</p>
                          </div>
                          <div className="p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-lg sm:text-xl font-bold text-red-500">{(fullAnalytics.tradePerformance.avgLoss ?? 0).toFixed(2)}</p>
                            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Average Loss</p>
                          </div>
                        </div>
                      </Card>

                      { }
                      {Object.keys(fullAnalytics.tradePerformance.contractTypePerformance || {}).length > 0 && (
                        <Card>
                          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-cyan-500" />
                            Performance by Contract Type
                          </h3>
                          <div className="space-y-3">
                            {Object.entries(fullAnalytics.tradePerformance.contractTypePerformance).map(([type, data]: [string, any]) => (
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

                      { }
                      {fullAnalytics.recommendations.length > 0 && (
                        <Card>
                          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                            AI Recommendations
                          </h3>
                          <div className="space-y-3">
                            {fullAnalytics.recommendations.slice(0, 6).map((rec, i) => (
                              <div key={i} className={`p-4 rounded-xl border ${rec.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                                rec.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
                                  'bg-blue-500/10 border-blue-500/30'
                                }`}>
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rec.type === 'critical' ? 'bg-red-500/20' :
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

                      { }
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

              { }
              {activeTab === 'digit' && (
                <div className="space-y-6">
                  <div><h1 className="text-2xl font-bold">Digit Analyzer</h1><p style={{ color: 'var(--text-secondary)' }}>Analyze digit patterns in your trades</p></div>

                  { }
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
                        {Object.entries(digitStats).sort(([, a], [, b]) => b - a).slice(0, 3).map(([digit, count], i) => (
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
                        {Object.entries(digitStats).sort(([, a], [, b]) => a - b).slice(0, 3).map(([digit, count]) => (
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

              { }
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div><h1 className="text-2xl font-bold">Trade Timeline</h1><p style={{ color: 'var(--text-secondary)' }}>Your recent trading activity with insights</p></div>

                  { }
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

              { }
              {activeTab === 'community' && (
                <TierChatroom
                  user={{
                    id: userInfo?.loginid,
                    deriv_account_id: userInfo?.loginid,
                    username: userInfo?.fullname || userInfo?.loginid
                  }}
                  analytics={{
                    winRate: analytics?.winRate || 0,
                    totalTrades: tradeHistory?.length || 0,
                    profitLoss: analytics?.totalProfit || 0
                  }}
                />
              )}

              { }
              {activeTab === 'journal' && (
                <div className="space-y-4 sm:space-y-6">
                  <div><h1 className="text-xl sm:text-2xl font-bold">Trading Journal</h1><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Document your trading journey</p></div>
                  <Card>
                    <h3 className="text-base sm:text-lg font-medium mb-4">New Entry</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <input type="text" value={newJournalTitle} onChange={(e) => setNewJournalTitle(e.target.value)} placeholder="Entry title..." className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:border-[#ff3355] outline-none transition-colors text-sm sm:text-base" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }} />
                      <textarea value={newJournalContent} onChange={(e) => setNewJournalContent(e.target.value)} placeholder="What did you learn today? What went well? What could improve?" rows={3} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:border-[#ff3355] outline-none transition-colors resize-none text-sm sm:text-base" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }} />

                      { }
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                          <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Tags:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {availableTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => setJournalTags(prev =>
                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                              )}
                              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm transition-all ${journalTags.includes(tag)
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

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Mood:</span>
                          {['great', 'good', 'neutral', 'bad'].map(mood => (
                            <button key={mood} onClick={() => setNewJournalMood(mood)} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-base sm:text-lg transition-all ${newJournalMood === mood ? 'scale-110' : ''}`} style={{ backgroundColor: newJournalMood === mood ? 'var(--card-border)' : 'var(--accent-bg)' }}>{moodEmojis[mood]}</button>
                          ))}
                        </div>
                        <button onClick={addJournalEntry} className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#ff3355] to-[#ff8042] font-medium hover:opacity-90 transition-opacity text-white text-sm sm:text-base w-full sm:w-auto justify-center"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Add Entry</button>
                      </div>
                    </div>
                  </Card>

                  { }
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

            </div>
          </main>

          {/* Bottom Sheet - Mobile Only */}
          {mobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />

              {/* Bottom Sheet */}
              <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden transform transition-transform duration-300 ease-out">
                <div className="bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col">
                  {/* Handle Bar */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 rounded-full bg-white/30" />
                  </div>

                  {/* User Info Section */}
                  {userInfo && (
                    <div className="px-6 py-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-white/20 flex items-center justify-center text-3xl">
                            {getAvatarEmoji(userProfile?.profilePhoto)}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-black ${derivWsConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate text-white">
                            {userProfile?.displayName || userInfo.fullname || 'Trader'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            ID: {userInfo.loginid}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${userInfo.is_virtual ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                              {userInfo.is_virtual ? 'Demo' : 'Real'}
                            </span>
                            <span className="text-sm font-medium text-white">
                              {userInfo.currency} {(userInfo.balance ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Items */}
                  <nav className="flex-1 overflow-y-auto px-4 py-2">
                    <div className="space-y-1">
                      {tabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            if (tab.navigateTo) {
                              navigate(tab.navigateTo);
                            } else {
                              setActiveTab(tab.id);
                            }
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === tab.id && !tab.navigateTo
                            ? 'bg-gradient-to-r from-[#ff3355]/20 to-transparent text-[#ff5f6d] border-l-4 border-[#ff3355]'
                            : 'hover:bg-white/5 text-gray-300 hover:text-white active:scale-[0.98]'
                            }`}
                        >
                          <span className="flex-shrink-0">{tab.icon}</span>
                          <span className="font-medium">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </nav>

                  {/* Logout Button */}
                  <div className="p-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        setMobileSidebarOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all active:scale-[0.98]"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-semibold">Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mobile Bottom Navigation */}
          <MobileNavigation
            items={tabs.map(tab => ({
              label: tab.id === 'sync' ? 'Home' : tab.label,
              icon: tab.id === 'sync' ? <Home size={20} /> : tab.icon,
              onClick: () => {
                if (tab.navigateTo) {
                  navigate(tab.navigateTo);
                } else {
                  setActiveTab(tab.id);
                  // Scroll to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              },
              isActive: activeTab === tab.id
            }))}
            onMoreClick={() => setMobileSidebarOpen(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
