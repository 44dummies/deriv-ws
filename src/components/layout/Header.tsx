import React, { useEffect, useState } from 'react';
import { 
  Bell, Settings, LogOut, Wallet, 
  User, ChevronDown, Moon, Sun, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTradingStore } from '../../store/tradingStore';
import websocketService from '../../services/websocketService';
import { TokenService } from '../../services/tokenService';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { 
    userInfo, 
    balance, 
    currency, 
    setBalance,
    notifications,
    theme,
    setTheme,
  } = useTradingStore();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Subscribe to balance updates
    const subscribeBalance = async () => {
      try {
        await websocketService.subscribeBalance((data) => {
          if (data.balance) {
            setBalance(data.balance.balance, data.balance.currency);
          }
        });
      } catch (error) {
        console.error('Error subscribing to balance:', error);
      }
    };

    subscribeBalance();
  }, [setBalance]);

  const handleLogout = () => {
    websocketService.disconnect();
    TokenService.clearTokens();
    navigate('/');
  };

  const refreshBalance = async () => {
    setIsRefreshing(true);
    try {
      const response = await websocketService.getBalance();
      if (response.balance) {
        setBalance(response.balance.balance, response.balance.currency);
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 px-4 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-deriv-red to-red-600 rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Deriv Trader</h1>
          <p className="text-xs text-gray-500">
            {userInfo?.is_virtual ? 'Demo Account' : 'Real Account'}
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Balance */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl">
          <Wallet className="w-5 h-5 text-deriv-red" />
          <div>
            <p className="text-xs text-gray-500">Balance</p>
            <p className="text-lg font-bold text-white">{formatCurrency(balance)}</p>
          </div>
          <button
            onClick={refreshBalance}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 hover:bg-gray-800 rounded-xl transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-gray-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-400" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-deriv-red text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50">
              <div className="p-3 border-b border-gray-700">
                <h3 className="font-medium text-white">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-gray-500 text-sm">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className="p-3 border-b border-gray-700/50 hover:bg-gray-700/50">
                      <p className="text-sm text-white">{notification.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-white">{userInfo?.fullname || 'User'}</p>
              <p className="text-xs text-gray-500">{userInfo?.loginid}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50">
              <div className="p-3 border-b border-gray-700">
                <p className="text-sm font-medium text-white">{userInfo?.email}</p>
                <p className="text-xs text-gray-500">{userInfo?.loginid}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
