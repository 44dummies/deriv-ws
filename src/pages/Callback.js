import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenService } from '../services/tokenService';
import websocketService from '../services/websocketService';

const Callback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token1 = urlParams.get('token1');
        const acct1 = urlParams.get('acct1');

        if (!token1 || !acct1) {
          throw new Error('Missing authentication tokens');
        }

        // Store tokens in localStorage
        TokenService.setTokens({
          token: token1,
          account: acct1,
        });

        setStatus('Connecting to Deriv...');

        // Connect to WebSocket
        await websocketService.connect();

        setStatus('Authorizing...');

        // Authorize with the token
        const authResponse = await websocketService.authorize(token1);

        if (authResponse.authorize) {
          // Store account info
          TokenService.setAccount(authResponse.authorize);
        }

        // Clear tokens from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        setStatus('Success! Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);

      } catch (err) {
        console.error('Callback error:', err);
        setError(err.message || 'Authentication failed');
        TokenService.clearTokens();
        
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {error ? (
          <>
            <div style={styles.errorIcon}>✗</div>
            <h2 style={styles.errorTitle}>Authentication Failed</h2>
            <p style={styles.errorMessage}>{error}</p>
            <p style={styles.redirect}>Redirecting to login...</p>
          </>
        ) : (
          <>
            <div style={styles.spinner}></div>
            <p style={styles.status}>{status}</p>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%',
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
  status: {
    fontSize: '16px',
    color: '#666',
  },
  errorIcon: {
    fontSize: '60px',
    color: '#ff444f',
    marginBottom: '20px',
  },
  errorTitle: {
    fontSize: '24px',
    color: '#333',
    marginBottom: '10px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '10px',
  },
  redirect: {
    fontSize: '14px',
    color: '#999',
  },
};

export default Callback;
