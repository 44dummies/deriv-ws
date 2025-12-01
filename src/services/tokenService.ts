const TOKEN_KEY = 'deriv_tokens';
const ACCOUNT_KEY = 'deriv_account';

export const TokenService = {
  setTokens: (tokens) => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  getTokens: () => {
    const tokens = localStorage.getItem(TOKEN_KEY);
    return tokens ? JSON.parse(tokens) : null;
  },

  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  },

  setAccount: (account) => {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  },

  getAccount: () => {
    const account = localStorage.getItem(ACCOUNT_KEY);
    return account ? JSON.parse(account) : null;
  },

  isAuthenticated: () => {
    return !!TokenService.getTokens();
  }
};
