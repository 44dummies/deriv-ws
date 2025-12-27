const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
);

// Use Vite's import.meta.env for reliable environment variable access
// Fallback to production URLs only if env vars are missing (Safety Net)

export const APP_ID: string = import.meta.env.VITE_DERIV_APP_ID || '114042';
export const REDIRECT_URL: string = import.meta.env.VITE_REDIRECT_URL || (isLocal ? `${window.location.origin}/callback` : 'https://www.tradermind.site/callback');
export const WS_URL: string = import.meta.env.VITE_DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3';
// Explicitly prefer VITE_SERVER_URL -> then try REACT_APP_SERVER_URL (legacy) -> finally fallback
export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL || import.meta.env.REACT_APP_SERVER_URL || (isLocal ? 'http://localhost:3001' : 'https://tradermind-server.up.railway.app');
export const OAUTH_URL: string = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`;

interface Config {
    APP_ID: string;
    REDIRECT_URL: string;
    OAUTH_URL: string;
    WS_URL: string;
    SERVER_URL: string;
    API_URL: string;
}

const CONFIG: Config = {
    APP_ID,
    REDIRECT_URL,
    OAUTH_URL,
    WS_URL,
    SERVER_URL,
    API_URL: `${SERVER_URL}/api`,
};

export default CONFIG;
