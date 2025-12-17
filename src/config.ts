const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const APP_ID: string = process.env.REACT_APP_DERIV_APP_ID || '114042';
export const REDIRECT_URL: string = process.env.REACT_APP_REDIRECT_URL || (isLocal ? 'http://localhost:5173/callback' : 'https://www.tradermind.site/callback');
export const WS_URL: string = process.env.REACT_APP_DERIV_WS_URL || 'wss://ws.binaryws.com/websockets/v3';
export const SERVER_URL: string = process.env.REACT_APP_SERVER_URL || (isLocal ? 'http://localhost:3001' : 'https://tradermind-server.up.railway.app');
export const OAUTH_URL: string = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`;

interface Config {
    APP_ID: string;
    REDIRECT_URL: string;
    OAUTH_URL: string;
    WS_URL: string;
    SERVER_URL: string;
}

const CONFIG: Config = {
    APP_ID,
    REDIRECT_URL,
    OAUTH_URL,
    WS_URL,
    SERVER_URL,
};

export default CONFIG;
