import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [accountList, setAccountList] = useState([]);
  const [balances, setBalances] = useState({});

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is authenticated
        if (!TokenService.isAuthenticated()) {
          navigate('/');
          return;
        }

        const tokens = TokenService.getTokens();
        
        // Connect to WebSocket if not already connected
        if (!websocketService.ws || websocketService.ws.readyState !== WebSocket.OPEN) {
          await websocketService.connect();
          const authResponse = await websocketService.authorize(tokens.token);
          
          if (authResponse.authorize) {
            setUserInfo(authResponse.authorize);
            TokenService.setAccount(authResponse.authorize);
          }
        } else {
          const account = TokenService.getAccount();
          setUserInfo(account);
        }

        // Get account list
        const accountsResponse = await websocketService.getAccountList();
        if (accountsResponse.account_list) {
          setAccountList(accountsResponse.account_list);
          
          // Get balance for each account
          const balancePromises = accountsResponse.account_list.map(async (account) => {
            try {
              const balanceResponse = await websocketService.getBalance();
              return {
                loginid: account.loginid,
                balance: balanceResponse.balance,
              };
            } catch (err) {
              console.error(`Failed to get balance for ${account.loginid}:`, err);
              return {
                loginid: account.loginid,
                balance: null,
              };
            }
          });

          const balanceResults = await Promise.all(balancePromises);
          const balanceMap = {};
          balanceResults.forEach(result => {
            balanceMap[result.loginid] = result.balance;
          });
          setBalances(balanceMap);
        }

        setLoading(false);
      } catch (err) {
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
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button onClick={handleLogout} style={styles.button}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        {/* User Information */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Account Information</h2>
          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <span style={styles.label}>Name:</span>
              <span style={styles.value}>
                {userInfo?.fullname || 'N/A'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>Email:</span>
              <span style={styles.value}>
                {userInfo?.email || 'N/A'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>Account ID:</span>
              <span style={styles.value}>
                {userInfo?.loginid || 'N/A'}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.label}>Currency:</span>
              <span style={styles.value}>
                {userInfo?.currency || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Wallets/Accounts */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Wallets & Balances</h2>
          {accountList.length === 0 ? (
            <p style={styles.noData}>No accounts found</p>
          ) : (
            <div style={styles.walletGrid}>
              {accountList.map((account) => (
                <div key={account.loginid} style={styles.walletCard}>
                  <div style={styles.walletHeader}>
                    <span style={styles.walletType}>
                      {account.account_type || 'Account'}
                    </span>
                    <span style={styles.walletCurrency}>
                      {account.currency}
                    </span>
                  </div>
                  <div style={styles.walletId}>{account.loginid}</div>
                  <div style={styles.walletBalance}>
                    {balances[account.loginid] !== undefined && balances[account.loginid] !== null
                      ? `${balances[account.loginid].currency} ${balances[account.loginid].balance}`
                      : 'Loading...'}
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  dashboard: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '32px',
    color: '#333',
    margin: 0,
  },
  logoutButton: {
    backgroundColor: '#ff444f',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '24px',
    color: '#333',
    marginBottom: '20px',
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '4px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #e0e0e0',
  },
  label: {
    fontWeight: 'bold',
    color: '#666',
  },
  value: {
    color: '#333',
  },
  walletGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  walletCard: {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
  },
  walletHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  walletType: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'capitalize',
  },
  walletCurrency: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ff444f',
  },
  walletId: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '10px',
  },
  walletBalance: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    padding: '20px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #ff444f',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  button: {
    backgroundColor: '#ff444f',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  errorTitle: {
    fontSize: '24px',
    color: '#333',
    marginBottom: '10px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
  },
};

export default Dashboard;
