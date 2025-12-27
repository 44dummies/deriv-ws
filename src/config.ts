const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
);

export const APP_ID: string = '114042'; // Hardcoded for production reliability
export const REDIRECT_URL: string = isLocal ? `${window.location.origin}/callback` : 'https://www.tradermind.site/callback';
export const WS_URL: string = 'wss://ws.derivws.com/websockets/v3';
export const SERVER_URL: string = isLocal ? 'http://localhost:3001' : 'https://tradermind-server.up.railway.app';
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
