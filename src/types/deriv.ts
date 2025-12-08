// ============================================
// Deriv API Types
// Based on https://api.deriv.com/api-explorer
// ============================================

// ============================================
// WebSocket Message Types
// ============================================

export interface DerivRequest {
    req_id?: number;
    passthrough?: Record<string, unknown>;
}

export interface DerivResponse<T = unknown> {
    req_id?: number;
    msg_type: string;
    error?: DerivError;
    echo_req?: Record<string, unknown>;
    [key: string]: T | unknown;
}

export interface DerivError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// ============================================
// Authorization
// ============================================

export interface AuthorizeRequest extends DerivRequest {
    authorize: string;
    add_to_login_history?: 0 | 1;
}

export interface AuthorizeResponse extends DerivResponse {
    authorize?: {
        loginid: string;
        account_list?: AccountListItem[];
        balance: number;
        currency: string;
        email: string;
        fullname: string;
        is_virtual: 0 | 1;
        landing_company_fullname: string;
        landing_company_name: string;
        local_currencies?: Record<string, LocalCurrency>;
        user_id: number;
        scopes?: string[];
    };
}

export interface AccountListItem {
    loginid: string;
    currency: string;
    is_disabled: 0 | 1;
    is_virtual: 0 | 1;
    landing_company_name: string;
}

export interface LocalCurrency {
    fractional_digits: number;
}

// ============================================
// Balance
// ============================================

export interface BalanceRequest extends DerivRequest {
    balance: 1;
    subscribe?: 0 | 1;
    account?: string;
}

export interface BalanceResponse extends DerivResponse {
    balance?: {
        balance: number;
        currency: string;
        loginid: string;
        id?: string;
    };
    subscription?: {
        id: string;
    };
}

// ============================================
// Ticks
// ============================================

export interface TicksRequest extends DerivRequest {
    ticks: string | string[];
    subscribe?: 0 | 1;
}

export interface TicksResponse extends DerivResponse {
    tick?: Tick;
    subscription?: {
        id: string;
    };
}

export interface Tick {
    ask: number;
    bid: number;
    epoch: number;
    id: string;
    pip_size: number;
    quote: number;
    symbol: string;
}

// ============================================
// Ticks History
// ============================================

export interface TicksHistoryRequest extends DerivRequest {
    ticks_history: string;
    adjust_start_time?: 0 | 1;
    count?: number;
    end: 'latest' | number;
    granularity?: number;
    start?: number;
    style?: 'candles' | 'ticks';
    subscribe?: 0 | 1;
}

export interface TicksHistoryResponse extends DerivResponse {
    candles?: Candle[];
    history?: {
        prices: number[];
        times: number[];
    };
    pip_size?: number;
}

export interface Candle {
    close: number;
    epoch: number;
    high: number;
    low: number;
    open: number;
}

// ============================================
// Contracts / Trading
// ============================================

export interface BuyRequest extends DerivRequest {
    buy: string;
    price: number;
    parameters?: ContractParameters;
}

export interface ContractParameters {
    amount: number;
    basis: 'payout' | 'stake';
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: 's' | 'm' | 'h' | 'd' | 't';
    symbol: string;
    barrier?: string;
    barrier2?: string;
    date_expiry?: number;
    date_start?: number;
    multiplier?: number;
    selected_tick?: number;
}

export interface BuyResponse extends DerivResponse {
    buy?: {
        buy_price: number;
        contract_id: number;
        longcode: string;
        payout: number;
        purchase_time: number;
        shortcode: string;
        start_time: number;
        transaction_id: number;
        balance_after: number;
    };
}

export interface SellRequest extends DerivRequest {
    sell: number; // contract_id
    price: number;
}

export interface SellResponse extends DerivResponse {
    sell?: {
        balance_after: number;
        contract_id: number;
        reference_id: number;
        sold_for: number;
        transaction_id: number;
    };
}

// ============================================
// Proposal
// ============================================

export interface ProposalRequest extends DerivRequest {
    proposal: 1;
    amount: number;
    basis: 'payout' | 'stake';
    contract_type: string;
    currency: string;
    duration: number;
    duration_unit: 's' | 'm' | 'h' | 'd' | 't';
    symbol: string;
    barrier?: string;
    subscribe?: 0 | 1;
}

export interface ProposalResponse extends DerivResponse {
    proposal?: {
        ask_price: number;
        contract_type: string;
        date_expiry: number;
        date_start: number;
        display_value: string;
        id: string;
        longcode: string;
        payout: number;
        spot: number;
        spot_time: number;
    };
    subscription?: {
        id: string;
    };
}

// ============================================
// Profit Table
// ============================================

export interface ProfitTableRequest extends DerivRequest {
    profit_table: 1;
    date_from?: number;
    date_to?: number;
    description?: 0 | 1;
    limit?: number;
    offset?: number;
    sort?: 'ASC' | 'DESC';
}

export interface ProfitTableResponse extends DerivResponse {
    profit_table?: {
        count: number;
        transactions: ProfitTableTransaction[];
    };
}

export interface ProfitTableTransaction {
    app_id?: number;
    buy_price: number;
    contract_id: number;
    duration_type?: string;
    longcode: string;
    payout: number;
    purchase_time: number;
    sell_price: number;
    sell_time: number;
    shortcode: string;
    transaction_id: number;
}

// ============================================
// Statement
// ============================================

export interface StatementRequest extends DerivRequest {
    statement: 1;
    action_type?: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'escrow' | 'adjustment' | 'virtual_credit' | 'transfer';
    date_from?: number;
    date_to?: number;
    description?: 0 | 1;
    limit?: number;
    offset?: number;
}

export interface StatementResponse extends DerivResponse {
    statement?: {
        count: number;
        transactions: StatementTransaction[];
    };
}

export interface StatementTransaction {
    action_type: string;
    amount: number;
    balance_after: number;
    contract_id?: number;
    longcode?: string;
    payout?: number;
    purchase_time?: number;
    reference_id: number;
    shortcode?: string;
    transaction_id: number;
    transaction_time: number;
}

// ============================================
// Active Symbols
// ============================================

export interface ActiveSymbolsRequest extends DerivRequest {
    active_symbols: 'brief' | 'full';
    product_type?: 'basic';
}

export interface ActiveSymbolsResponse extends DerivResponse {
    active_symbols?: ActiveSymbol[];
}

export interface ActiveSymbol {
    allow_forward_starting: 0 | 1;
    display_name: string;
    exchange_is_open: 0 | 1;
    is_trading_suspended: 0 | 1;
    market: string;
    market_display_name: string;
    pip: number;
    submarket: string;
    submarket_display_name: string;
    symbol: string;
    symbol_type: string;
}

// ============================================
// Contracts For Symbol
// ============================================

export interface ContractsForRequest extends DerivRequest {
    contracts_for: string;
    currency?: string;
    landing_company?: string;
    product_type?: 'basic';
}

export interface ContractsForResponse extends DerivResponse {
    contracts_for?: {
        available: ContractForSymbol[];
        close?: number;
        feed_license?: string;
        hit_count?: number;
        open?: number;
        spot?: number;
    };
}

export interface ContractForSymbol {
    barrier_category: string;
    barriers: number;
    contract_category: string;
    contract_category_display: string;
    contract_type: string;
    exchange_name: string;
    expiry_type: string;
    market: string;
    max_contract_duration: string;
    min_contract_duration: string;
    sentiment: string;
    start_type: string;
    submarket: string;
    underlying_symbol: string;
}

// ============================================
// WebSocket Connection Types
// ============================================

export type DerivMessageHandler = (response: DerivResponse) => void;

export interface DerivWebSocketConfig {
    app_id: number;
    endpoint?: string;
    language?: string;
    brand?: string;
}
