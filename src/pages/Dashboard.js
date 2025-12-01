import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  RefreshCw, BarChart3, Hash, Clock, Users, BookOpen, UserPlus, Settings,
  LogOut, Sun, Moon, ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp,
  TrendingDown, DollarSign, Activity, Target, Award, MessageCircle, Heart,
  Share2, Wallet, ExternalLink, Shield
} from 'lucide-react';

import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';

const STORAGE_KEYS = {
  JOURNAL: 'nexatrade_journal',
  FRIENDS: 'nexatrade_friends',
  TRADES: 'nexatrade_trades',
  THEME: 'nexatrade_theme',
};

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ icon, label, value, trend, color = 'from-blue-500 to-purple-500' }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-gray-400 mt-1">{label}</p>
  </div>
);

const EmptyState = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-gray-500">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 max-w-sm">{description}</p>
  </div>
);

const SettingRow = ({ icon, label, value, action }) => (
  <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <div>
        <p className="font-medium">{label}</p>
        {value && <p className="text-sm text-gray-500">{value}</p>}
      </div>
    </div>
    {action}
  </div>
);

const mockCommunityPosts = [
  { id: '1', user: 'TraderPro', avatar: '🎯', content: 'Just hit 75% win rate this week! Volatility indices are on fire 🔥', likes: 42, comments: 8, time: '2h ago' },
  { id: '2', user: 'CryptoKing', avatar: '👑', content: 'New strategy for BOOM/CRASH working great. Will share analysis soon.', likes: 28, comments: 15, time: '4h ago' },
  { id: '3', user: 'RiskMaster', avatar: '🛡️', content: 'Remember: Never risk more than 2% per trade. Consistency > big wins', likes: 156, comments: 23, time: '6h ago' },
  { id: '4', user: 'DigiAnalyst', avatar: '📊', content: 'Digit 7 showing unusual patterns on R_100. Anyone else noticing this?', likes: 19, comments: 31, time: '8h ago' },
];

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

  const loadFromStorage = useCallback(() => {
    const savedJournal = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    const savedFriends = localStorage.getItem(STORAGE_KEYS.FRIENDS);
    const savedTrades = localStorage.getItem(STORAGE_KEYS.TRADES);
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedJournal) setJournalEntries(JSON.parse(savedJournal));
    if (savedFriends) setFriends(JSON.parse(savedFriends));
    if (savedTrades) {
      const trades = JSON.parse(savedTrades);
      setTradeHistory(trades);
      calculateAnalytics(trades);
      calculateDigitStats(trades);
    }
    if (savedTheme) setIsDarkMode(savedTheme === 'dark');
  }, []);

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
      }
      toast.success('Data synced successfully!');
    } catch (err) { console.error('Sync error:', err); toast.error('Failed to sync data'); }
    setSyncing(false);
  };

  const addJournalEntry = () => {
    if (!newJournalTitle.trim() || !newJournalContent.trim()) { toast.error('Please fill in title and content'); return; }
    const entry = { id: Date.now().toString(), date: new Date().toISOString(), title: newJournalTitle, content: newJournalContent, mood: newJournalMood, tags: [] };
    const updated = [entry, ...journalEntries];
    setJournalEntries(updated);
    saveToStorage(STORAGE_KEYS.JOURNAL, updated);
    setNewJournalTitle(''); setNewJournalContent(''); setNewJournalMood('neutral');
    toast.success('Journal entry added!');
  };

  const deleteJournalEntry = (id) => {
    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    saveToStorage(STORAGE_KEYS.JOURNAL, updated);
    toast.success('Entry deleted');
  };

  const addFriend = () => {
    if (!newFriendName.trim() || !newFriendId.trim()) { toast.error('Please fill in name and login ID'); return; }
    const friend = { id: Date.now().toString(), name: newFriendName, loginid: newFriendId, winRate: Math.random() * 40 + 50, status: Math.random() > 0.5 ? 'online' : 'offline', addedAt: new Date().toISOString() };
    const updated = [friend, ...friends];
    setFriends(updated);
    saveToStorage(STORAGE_KEYS.FRIENDS, updated);
    setNewFriendName(''); setNewFriendId('');
    toast.success('Friend added!');
  };

  const removeFriend = (id) => {
    const updated = friends.filter(f => f.id !== id);
    setFriends(updated);
    saveToStorage(STORAGE_KEYS.FRIENDS, updated);
    toast.success('Friend removed');
  };

  const toggleTheme = () => { setIsDarkMode(!isDarkMode); localStorage.setItem(STORAGE_KEYS.THEME, !isDarkMode ? 'dark' : 'light'); };
  const handleLogout = () => { TokenService.clearTokens(); websocketService.disconnect(); navigate('/'); };

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
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#040404] text-white' : 'bg-gray-100 text-gray-900'}`}>
      <Toaster position="top-right" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-10 h-96 w-96 rounded-full bg-[#ff3355]/20 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-[#5d5dff]/10 blur-[200px]" />
      </div>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} min-h-screen border-r border-white/10 bg-black/20 backdrop-blur-xl transition-all duration-300 flex flex-col`}>
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff3355] to-[#ff8042] flex items-center justify-center text-lg font-bold shrink-0 text-white">N</div>
              {!sidebarCollapsed && <span className="font-semibold text-lg">NexaTrade</span>}
            </div>
          </div>

          {userInfo && (
            <div className={`p-4 border-b border-white/10 ${sidebarCollapsed ? 'text-center' : ''}`}>
              {!sidebarCollapsed && (
                <>
                  <p className="font-medium truncate">{userInfo.fullname || 'Trader'}</p>
                  <p className="text-sm text-gray-400 truncate">{userInfo.loginid}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${userInfo.is_virtual ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{userInfo.is_virtual ? 'Demo' : 'Real'}</span>
                    <span className="text-sm font-medium">{userInfo.currency} {userInfo.balance.toFixed(2)}</span>
                  </div>
                </>
              )}
              {sidebarCollapsed && <div className={`w-8 h-8 rounded-full mx-auto ${userInfo.is_virtual ? 'bg-yellow-500/20' : 'bg-green-500/20'} flex items-center justify-center text-xs`}>{userInfo.fullname?.[0] || 'T'}</div>}
            </div>
          )}

          <nav className="flex-1 p-2 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-[#ff3355]/20 to-transparent text-[#ff5f6d] border-l-2 border-[#ff3355]' : 'hover:bg-white/5 text-gray-400 hover:text-white'} ${sidebarCollapsed ? 'justify-center' : ''}`} title={sidebarCollapsed ? tab.label : undefined}>
                {tab.icon}
                {!sidebarCollapsed && <span>{tab.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2">
            <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {!sidebarCollapsed && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <LogOut className="w-5 h-5" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>

          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#ff3355] flex items-center justify-center text-white shadow-lg">
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto min-h-screen">
          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold">Sync Data</h1><p className="text-gray-400">Synchronize your Deriv trading data</p></div>
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
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span>Balance</span></div><span className="text-green-400">Connected</span></div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span>Trade History</span></div><span className="text-green-400">{tradeHistory.length} trades synced</span></div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" /><span>Account</span></div><span className="text-green-400">{userInfo?.loginid}</span></div>
                </div>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-400">Your trading performance overview</p></div>
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
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-white/10" />
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
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"><p className="text-3xl font-bold text-green-400">{analytics.winStreak}</p><p className="text-sm text-gray-400">Best Win Streak</p></div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"><p className="text-3xl font-bold text-red-400">{analytics.lossStreak}</p><p className="text-sm text-gray-400">Worst Loss Streak</p></div>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"><p className="text-3xl font-bold text-blue-400">{analytics.bestTrade.toFixed(2)}</p><p className="text-sm text-gray-400">Best Trade</p></div>
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"><p className="text-3xl font-bold text-purple-400">{analytics.worstTrade.toFixed(2)}</p><p className="text-sm text-gray-400">Worst Trade</p></div>
                  </div>
                </Card>
              </div>
              {analytics.totalTrades === 0 && <Card><EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No analytics data" description="Sync your trades to see analytics" /></Card>}
            </div>
          )}

          {/* Digit Analyzer Tab */}
          {activeTab === 'digit' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Digit Analyzer</h1><p className="text-gray-400">Analyze digit patterns in your trades</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-6">Digit Frequency Distribution</h3>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
                  {Object.entries(digitStats).map(([digit, count]) => {
                    const total = Object.values(digitStats).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={digit} className="text-center">
                        <div className="relative h-32 rounded-xl bg-white/5 overflow-hidden mb-2" style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <div className="w-full bg-gradient-to-t from-[#ff3355] to-[#ff8042] transition-all duration-500" style={{ height: `${Math.max(percentage, 5)}%` }} />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-1 font-bold">{digit}</div>
                        <p className="text-xs text-gray-400">{count}</p>
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
                      <div key={digit} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-500/20 text-orange-400'}`}>{digit}</div>
                        <div className="flex-1"><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#ff3355] to-[#ff8042]" style={{ width: `${(count / Math.max(...Object.values(digitStats))) * 100}%` }} /></div></div>
                        <span className="text-sm text-gray-400">{count} times</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <h3 className="text-lg font-medium mb-4">Cold Digits</h3>
                  <div className="space-y-3">
                    {Object.entries(digitStats).sort(([,a], [,b]) => a - b).slice(0, 3).map(([digit, count]) => (
                      <div key={digit} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">{digit}</div>
                        <div className="flex-1"><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(count / Math.max(...Object.values(digitStats), 1)) * 100}%` }} /></div></div>
                        <span className="text-sm text-gray-400">{count} times</span>
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
              <div><h1 className="text-2xl font-bold">Trade Timeline</h1><p className="text-gray-400">Your recent trading activity</p></div>
              {tradeHistory.length === 0 ? <Card><EmptyState icon={<Clock className="w-8 h-8" />} title="No trades yet" description="Sync your data to see your trade timeline" /></Card> : (
                <div className="space-y-4">
                  {tradeHistory.slice(0, 20).map((trade) => (
                    <Card key={trade.id} className="hover:border-white/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${trade.profit >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{trade.profit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}</div>
                          <div><p className="font-medium">{trade.symbol}</p><p className="text-sm text-gray-400">{trade.shortcode?.slice(0, 30)}...</p></div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">{new Date(trade.sell_time * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-sm">
                        <div><p className="text-gray-500">Buy Price</p><p className="font-medium">{trade.buy_price.toFixed(2)}</p></div>
                        <div><p className="text-gray-500">Sell Price</p><p className="font-medium">{trade.sell_price.toFixed(2)}</p></div>
                        <div><p className="text-gray-500">Time</p><p className="font-medium">{new Date(trade.sell_time * 1000).toLocaleTimeString()}</p></div>
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
              <div><h1 className="text-2xl font-bold">Community</h1><p className="text-gray-400">Connect with other NexaTrade traders</p></div>
              <div className="space-y-4">
                {mockCommunityPosts.map(post => (
                  <Card key={post.id}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">{post.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2"><span className="font-medium">{post.user}</span><span className="text-sm text-gray-500">{post.time}</span></div>
                        <p className="text-gray-300 mb-4">{post.content}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <button className="flex items-center gap-2 hover:text-[#ff5f6d] transition-colors"><Heart className="w-4 h-4" /> {post.likes}</button>
                          <button className="flex items-center gap-2 hover:text-blue-400 transition-colors"><MessageCircle className="w-4 h-4" /> {post.comments}</button>
                          <button className="flex items-center gap-2 hover:text-green-400 transition-colors"><Share2 className="w-4 h-4" /> Share</button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Journal Tab */}
          {activeTab === 'journal' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Trading Journal</h1><p className="text-gray-400">Document your trading journey</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-4">New Entry</h3>
                <div className="space-y-4">
                  <input type="text" value={newJournalTitle} onChange={(e) => setNewJournalTitle(e.target.value)} placeholder="Entry title..." className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ff3355] outline-none transition-colors" />
                  <textarea value={newJournalContent} onChange={(e) => setNewJournalContent(e.target.value)} placeholder="What did you learn today? What went well? What could improve?" rows={4} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ff3355] outline-none transition-colors resize-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Mood:</span>
                      {['great', 'good', 'neutral', 'bad'].map(mood => (
                        <button key={mood} onClick={() => setNewJournalMood(mood)} className={`w-10 h-10 rounded-xl text-lg transition-all ${newJournalMood === mood ? 'bg-white/20 scale-110' : 'bg-white/5 hover:bg-white/10'}`}>{moodEmojis[mood]}</button>
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
                        <div className="flex items-center gap-3"><span className="text-2xl">{moodEmojis[entry.mood]}</span><div><h4 className="font-medium">{entry.title}</h4><p className="text-sm text-gray-400">{new Date(entry.date).toLocaleDateString()}</p></div></div>
                        <button onClick={() => deleteJournalEntry(entry.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <p className="text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-6">
              <div><h1 className="text-2xl font-bold">Friends</h1><p className="text-gray-400">Your trading network</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-4">Add Friend</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} placeholder="Friend's name..." className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ff3355] outline-none transition-colors" />
                  <input type="text" value={newFriendId} onChange={(e) => setNewFriendId(e.target.value)} placeholder="Deriv Login ID..." className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ff3355] outline-none transition-colors" />
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
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a] ${friend.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                          </div>
                          <div><p className="font-medium">{friend.name}</p><p className="text-sm text-gray-400">{friend.loginid}</p><div className="flex items-center gap-2 mt-1"><Award className="w-4 h-4 text-yellow-400" /><span className="text-sm">{friend.winRate.toFixed(1)}% Win Rate</span></div></div>
                        </div>
                        <button onClick={() => removeFriend(friend.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
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
              <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-400">Manage your NexaTrade preferences</p></div>
              <Card>
                <h3 className="text-lg font-medium mb-4">Account Information</h3>
                <SettingRow icon={<Users className="w-5 h-5" />} label="Full Name" value={userInfo?.fullname || 'Not set'} />
                <SettingRow icon={<Shield className="w-5 h-5" />} label="Login ID" value={userInfo?.loginid} />
                <SettingRow icon={<Wallet className="w-5 h-5" />} label="Account Type" value={userInfo?.is_virtual ? 'Demo Account' : 'Real Account'} />
                <SettingRow icon={<DollarSign className="w-5 h-5" />} label="Currency" value={userInfo?.currency} />
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
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
