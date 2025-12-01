interface Config {
  APP_ID: string;
  REDIRECT_URL: string;
  OAUTH_URL: string;
  WS_URL: string;
}

const CONFIG: Config = {
  APP_ID: process.env.REACT_APP_DERIV_APP_ID || '114042',
  REDIRECT_URL: process.env.REACT_APP_REDIRECT_URL || 'http://localhost:3000/callback',
  OAUTH_URL: process.env.REACT_APP_DERIV_OAUTH_URL || 'https://oauth.deriv.com/oauth2/authorize',
  WS_URL: process.env.REACT_APP_DERIV_WS_URL || 'wss://ws.derivws.com/websockets/v3',
};

export default CONFIG;
