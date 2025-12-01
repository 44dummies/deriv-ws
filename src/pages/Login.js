import React from 'react';
import CONFIG from '../config';

const Login = () => {
  const handleLogin = () => {
    const authUrl = `${CONFIG.OAUTH_URL}?app_id=${CONFIG.APP_ID}&l=EN&brand=deriv`;
    window.location.href = authUrl;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Deriv Authentication</h1>
        <p style={styles.subtitle}>Connect your Deriv account to continue</p>
        <button onClick={handleLogin} style={styles.button}>
          Login with Deriv
        </button>
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
  title: {
    fontSize: '28px',
    marginBottom: '10px',
    color: '#333',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  button: {
    backgroundColor: '#ff444f',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: 'bold',
  },
};

export default Login;
