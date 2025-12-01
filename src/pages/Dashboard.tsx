import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import {
  RefreshCw,
  BarChart3,
  Hash,
  Clock,
  Users,
  BookOpen,
  UserPlus,
  Settings,
  LogOut,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';

import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';

interface UserInfo {
  balance: number;
  currency: string;
  email: string;
  fullname: string;
  loginid: string;
  is_virtual: number;
}

type TabType =
  | 'sync'
  | 'analytics'
  | 'digit'
  | 'timeline'
  | 'community'
  | 'journal'
  | 'friends'
  | 'settings';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('sync');

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        if (!TokenService.isAuthenticated()) {
          navigate('/');
          return;
        }

        const tokens = TokenService.getTokens();
        if (!tokens) {
          navigate('/');
          return;
        }

        await websocketService.connect();
        const authResponse = await websocketService.authorize(tokens.token);

        if (authResponse.error) {
          TokenService.clearTokens();
          navigate('/');
          return;
        }

        if (authResponse.authorize) {
          setUserInfo({
            balance: authResponse.authorize.balance,
            currency: authResponse.authorize.currency,
            email: authResponse.authorize.email,
            fullname: authResponse.authorize.fullname,
            loginid: authResponse.authorize.loginid,
            is_virtual: authResponse.authorize.is_virtual,
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Dashboard error:', err);
        TokenService.clearTokens();
        navigate('/');
      }
    };

    initializeDashboard();
  }, [navigate]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const balanceResponse = await websocketService.getBalance();
      if (balanceResponse.balance && userInfo) {
        setUserInfo({
          ...userInfo,
          balance: balanceResponse.balance.balance,
          currency: balanceResponse.balance.currency,
        });
      }
      toast.success('Data synced successfully');
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    websocketService.disconnect();
    TokenService.clearTokens();
    navigate('/');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: userInfo?.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const menuItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'sync', label: 'Sync Data', icon: <RefreshCw className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'digit', label: 'Digit Analyzer', icon: <Hash className="w-5 h-5" /> },
    { id: 'timeline', label: 'Trade Timeline', icon: <Clock className="w-5 h-5" /> },
    { id: 'community', label: 'Community', icon: <Users className="w-5 h-5" /> },
    { id: 'journal', label: 'Journal', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'friends', label: 'Friends', icon: <UserPlus className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        }}
      />

      <div className="flex">
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#141414] border-r border-white/5 flex flex-col">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-semibold">TradeSync</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-red-500/10 text-red-500'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                {userInfo?.fullname?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userInfo?.fullname || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{userInfo?.loginid}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        <main className="ml-64 flex-1 min-h-screen">
          <header className="sticky top-0 z-10 bg-[#0e0e0e]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">{menuItems.find((m) => m.id === activeTab)?.label}</h1>
                <p className="text-sm text-gray-500">Welcome back, {userInfo?.fullname?.split(' ')[0]}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-xl border border-white/5">
                  <Wallet className="w-4 h-4 text-red-500" />
                  <span className="font-semibold">{formatCurrency(userInfo?.balance || 0)}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      userInfo?.is_virtual ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {userInfo?.is_virtual ? 'Demo' : 'Real'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="p-8">
            {activeTab === 'sync' && <SyncDataTab onSync={handleSync} isSyncing={isSyncing} userInfo={userInfo} />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'digit' && <DigitAnalyzerTab />}
            {activeTab === 'timeline' && <TimelineTab />}
            {activeTab === 'community' && <CommunityTab />}
            {activeTab === 'journal' && <JournalTab />}
            {activeTab === 'friends' && <FriendsTab />}
            {activeTab === 'settings' && <SettingsTab userInfo={userInfo} />}
          </div>
        </main>
      </div>
    </div>
  );
};

const SyncDataTab: React.FC<{ onSync: () => void; isSyncing: boolean; userInfo: UserInfo | null }> = ({
  onSync,
  isSyncing,
  userInfo,
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Account Balance"
        value={`${userInfo?.currency || 'USD'} ${userInfo?.balance?.toFixed(2) || '0.00'}`}
        icon={<Wallet className="w-5 h-5" />}
        color="red"
      />
      <StatCard
        title="Account Type"
        value={userInfo?.is_virtual ? 'Demo Account' : 'Real Account'}
        icon={<Activity className="w-5 h-5" />}
        color="blue"
      />
      <StatCard title="Login ID" value={userInfo?.loginid || '-'} icon={<Hash className="w-5 h-5" />} color="purple" />
    </div>

    <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
      <h3 className="text-lg font-semibold mb-4">Sync with Deriv</h3>
      <p className="text-gray-400 text-sm mb-6">Synchronize your trading data, balance, and account information with Deriv servers.</p>
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-medium rounded-xl transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  </div>
);

const AnalyticsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Total Trades" value="0" icon={<Activity className="w-5 h-5" />} color="red" />
      <StatCard title="Win Rate" value="0%" icon={<TrendingUp className="w-5 h-5" />} color="green" />
      <StatCard title="Total Profit" value="$0.00" icon={<TrendingUp className="w-5 h-5" />} color="blue" />
      <StatCard title="Total Loss" value="$0.00" icon={<TrendingDown className="w-5 h-5" />} color="orange" />
    </div>
    <EmptyState
      icon={<BarChart3 className="w-12 h-12" />}
      title="No Analytics Data"
      description="Start trading to see your performance analytics here."
    />
  </div>
);

const DigitAnalyzerTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
      <h3 className="text-lg font-semibold mb-4">Digit Analysis</h3>
      <p className="text-gray-400 text-sm mb-6">Analyze digit patterns and statistics from your trading history.</p>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <div key={digit} className="aspect-square bg-[#1a1a1a] rounded-xl flex flex-col items-center justify-center border border-white/5">
            <span className="text-2xl font-bold">{digit}</span>
            <span className="text-xs text-gray-500">0%</span>
          </div>
        ))}
      </div>
    </div>
    <EmptyState
      icon={<Hash className="w-12 h-12" />}
      title="No Digit Data"
      description="Trade history will show digit analysis patterns here."
    />
  </div>
);

const TimelineTab: React.FC = () => (
  <EmptyState
    icon={<Clock className="w-12 h-12" />}
    title="No Trade History"
    description="Your trade timeline will appear here once you start trading."
  />
);

const CommunityTab: React.FC = () => (
  <EmptyState icon={<Users className="w-12 h-12" />} title="Community" description="Connect with other traders and share insights. Coming soon!" />
);

const JournalTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
      <h3 className="text-lg font-semibold mb-4">Trading Journal</h3>
      <p className="text-gray-400 text-sm mb-6">Keep track of your trading thoughts, strategies, and lessons learned.</p>
      <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors">New Entry</button>
    </div>
    <EmptyState icon={<BookOpen className="w-12 h-12" />} title="No Journal Entries" description="Start documenting your trading journey." />
  </div>
);

const FriendsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
      <h3 className="text-lg font-semibold mb-4">Friends</h3>
      <p className="text-gray-400 text-sm mb-6">Connect with friends and compare trading performance.</p>
      <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors">Invite Friends</button>
    </div>
    <EmptyState icon={<UserPlus className="w-12 h-12" />} title="No Friends Yet" description="Invite friends to compare stats and compete." />
  </div>
);

const SettingsTab: React.FC<{ userInfo: UserInfo | null }> = ({ userInfo }) => (
  <div className="space-y-6">
    <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
      <h3 className="text-lg font-semibold mb-6">Account Information</h3>
      <div className="space-y-4">
        <SettingRow label="Full Name" value={userInfo?.fullname || '-'} />
        <SettingRow label="Email" value={userInfo?.email || '-'} />
        <SettingRow label="Login ID" value={userInfo?.loginid || '-'} />
        <SettingRow label="Account Type" value={userInfo?.is_virtual ? 'Demo' : 'Real'} />
        <SettingRow label="Currency" value={userInfo?.currency || 'USD'} />
      </div>
    </div>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-500/10 text-red-500',
    green: 'bg-green-500/10 text-green-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <div className="bg-[#141414] rounded-2xl p-5 border border-white/5">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-[#141414] rounded-2xl p-12 border border-white/5 text-center">
    <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-600">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </div>
);

const SettingRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <span className="text-gray-400">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default Dashboard;
