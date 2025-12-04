interface Config {
  APP_ID: string;
  REDIRECT_URL: string;
  OAUTH_URL: string;
  WS_URL: string;
  SERVER_URL: string;
}

export const APP_ID = process.env.REACT_APP_DERIV_APP_ID || '114042';
export const REDIRECT_URL = process.env.REACT_APP_REDIRECT_URL || 'https:
export const WS_URL = process.env.REACT_APP_DERIV_WS_URL || 'wss:
export const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http:
export const OAUTH_URL = `https:

const CONFIG: Config = {
  APP_ID,
  REDIRECT_URL,
  OAUTH_URL,
  WS_URL,
  SERVER_URL,
};

export default CONFIG;
