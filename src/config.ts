interface Config {
  APP_ID: string;
  REDIRECT_URL: string;
  OAUTH_URL: string;
  WS_URL: string;
  SERVER_URL: string;
}

export const APP_ID = process.env.REACT_APP_DERIV_APP_ID || '114042';
export const REDIRECT_URL = process.env.REACT_APP_REDIRECT_URL || 'https://www.tradermind.site/callback';
export const WS_URL = process.env.REACT_APP_DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3';
export const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
// Note: redirect_uri is configured in Deriv app settings, not in the OAuth URL
export const OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=en&brand=deriv`;

const CONFIG: Config = {
  APP_ID,
  REDIRECT_URL,
  OAUTH_URL,
  WS_URL,
  SERVER_URL,
};

export default CONFIG;
