interface TokenData {
  token: string;
  account: string;
}

interface AccountData {
  [key: string]: any;
}

const TOKEN_KEY = 'deriv_tokens';
const ACCOUNT_KEY = 'deriv_account';

// Use sessionStorage so session ends when browser tab is closed
// User must explicitly log out or close tab to end session
export const TokenService = {
  setTokens: (tokens: TokenData): void => {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  getTokens: (): TokenData | null => {
    const tokens = sessionStorage.getItem(TOKEN_KEY);
    return tokens ? JSON.parse(tokens) : null;
  },

  clearTokens: (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ACCOUNT_KEY);
  },

  setAccount: (account: AccountData): void => {
    sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  },

  getAccount: (): AccountData | null => {
    const account = sessionStorage.getItem(ACCOUNT_KEY);
    return account ? JSON.parse(account) : null;
  },

  isAuthenticated: (): boolean => {
    return !!TokenService.getTokens();
  }
};
