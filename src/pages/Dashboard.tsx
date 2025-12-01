import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';

interface Account {
  account_type: string;
  created_at: number;
  currency: string;
  is_disabled: number;
  is_virtual: number;
  landing_company_name: string;
  loginid: string;
}

interface UserInfo {
  balance: number;
  country: string;
  currency: string;
  email: string;
  fullname: string;
  loginid: string;
  [key: string]: any;
}

interface BalanceInfo {
  balance: number;
  currency: string;
  loginid: string;
  [key: string]: any;
}

interface BalanceMap {
  [loginid: string]: BalanceInfo;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [balances, setBalances] = useState<BalanceMap>({});

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
        
        if (authResponse.authorize) {
          setUserInfo(authResponse.authorize as UserInfo);
          TokenService.setAccount(authResponse.authorize);
        }

        const accountsResponse = await websocketService.getAccountList();
        if (accountsResponse.account_list) {
          setAccountList(accountsResponse.account_list as Account[]);
          
          const balanceResponse = await websocketService.getBalance();
          if (balanceResponse.balance) {
            const balanceMap: BalanceMap = {
              [balanceResponse.balance.loginid]: balanceResponse.balance as BalanceInfo,
            };
            setBalances(balanceMap);
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Dashboard initialization error:', err);
        setError(err.message || 'Failed to load dashboard');
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [navigate]);

  const handleLogout = () => {
    websocketService.disconnect();
    TokenService.clearTokens();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-deriv-dark to-black">
        <div className="card max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-4 border-deriv-red/20 border-t-deriv-red rounded-full animate-spin"></div>
          </div>
          <p className="text-center text-gray-700 font-medium text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-deriv-dark to-black">
        <div className="card max-w-md w-full text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-deriv-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-gray-900 via-deriv-dark to-black">
      <div className="max-w-6xl mx-auto">
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-deriv-red to-red-400 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {userInfo?.fullname || 'Trader'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-deriv-red to-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Login ID</p>
                <p className="font-semibold text-gray-800">{userInfo?.loginid || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold text-gray-800 truncate">{userInfo?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Currency</p>
                <p className="font-semibold text-gray-800">{userInfo?.currency || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Accounts & Balances</h2>
          {accountList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No accounts found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accountList.map((account) => (
                <div
                  key={account.loginid}
                  className="p-4 rounded-xl border-2 border-gray-200 hover:border-deriv-red/30 transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-semibold text-gray-700 px-3 py-1 bg-gray-200 rounded-lg">
                      {account.account_type || 'Account'}
                    </span>
                    <span className="text-lg font-bold text-deriv-red">
                      {account.currency}
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">Login ID</p>
                    <p className="font-mono text-sm text-gray-700">{account.loginid}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Balance</p>
                    <p className="text-xl font-bold text-gray-800">
                      {balances[account.loginid]
                        ? `${balances[account.loginid].currency} ${balances[account.loginid].balance.toFixed(2)}`
                        : 'Loading...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
