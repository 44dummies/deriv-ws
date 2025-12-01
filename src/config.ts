interface Config {
  APP_ID: string;
  REDIRECT_URL: string;
  OAUTH_URL: string;
  WS_URL: string;
}

export const APP_ID = process.env.REACT_APP_DERIV_APP_ID || '114042';
export const REDIRECT_URL = process.env.REACT_APP_REDIRECT_URL || 'http://localhost:3000/callback';
export const OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=en&brand=deriv`;
export const WS_URL = process.env.REACT_APP_DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3';

const CONFIG: Config = {
  APP_ID,
  REDIRECT_URL,
  OAUTH_URL,
  WS_URL,
};

export default CONFIG;
