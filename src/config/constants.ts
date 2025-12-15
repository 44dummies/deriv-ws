/**
 * Application Constants
 *
 * Centralized configuration for the application.
 * Note: Secrets should be loaded from environment variables.
 */

export const CONFIG = {
    // API Configuration
    API_URL: process.env.REACT_APP_SERVER_URL || 'https://tradermind-server.up.railway.app/api',
    WS_URL: process.env.REACT_APP_WS_URL || 'https://tradermind-server.up.railway.app',

    // Trading Defaults
    TRADING: {
        DEFAULT_MARKET: 'R_100',
        DEFAULT_STAKE: 0.35,
        DEFAULT_ASSET_TYPE: 'digital',
        DEFAULT_DURATION: 5,
        DEFAULT_DURATION_UNIT: 't', // ticks
        MARKET_TIERS: ['R_100', 'R_75', 'R_50', 'R_25'] as const,
    },

    // UI Configuration
    UI: {
        PING_INTERVAL: 10000,
        TOAST_DURATION: 3000,
        CURRENCY_SYMBOL: 'USD', // Default fallback
    }
};

export const MARKETS = {
    R_100: 'Volatility 100',
    R_75: 'Volatility 75',
    R_50: 'Volatility 50',
    R_25: 'Volatility 25',
    R_10: 'Volatility 10',
};
