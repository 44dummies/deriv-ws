interface TokenData {
  token: string;
  account: string;
}

interface AccountData {
  [key: string]: any;
}

const TOKEN_KEY = 'deriv_tokens';
const ACCOUNT_KEY = 'deriv_account';

export const TokenService = {
  setTokens: (tokens: TokenData): void => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  getTokens: (): TokenData | null => {
    const tokens = localStorage.getItem(TOKEN_KEY);
    return tokens ? JSON.parse(tokens) : null;
  },

  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  },

  setAccount: (account: AccountData): void => {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  },

  getAccount: (): AccountData | null => {
    const account = localStorage.getItem(ACCOUNT_KEY);
    return account ? JSON.parse(account) : null;
  },

  isAuthenticated: (): boolean => {
    return !!TokenService.getTokens();
  }
};
