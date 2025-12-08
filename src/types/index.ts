// ============================================
// User & Authentication Types
// ============================================

export interface UserInfo {
    loginid: string;
    email?: string;
    fullname?: string;
    balance: number;
    currency: string;
    is_virtual: boolean;
}

export interface UserProfile {
    id?: string;
    deriv_id: string;
    username?: string;
    display_name?: string;
    profile_photo?: string;
    bio?: string;
    email?: string;
    is_admin?: boolean;
    role?: 'user' | 'admin';
    is_profile_complete?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface TokenData {
    account: string;
    token: string;
    currency: string;
}

export interface BackendAuthResponse {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
}

// ============================================
// Trading Types
// ============================================

export type SessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type StakingMode = 'fixed' | 'martingale' | 'percentage';
export type SessionType = 'day' | 'week' | 'month' | 'custom';

export interface TradingSession {
    id: string;
    session_name: string;
    status: SessionStatus;
    strategy_name: string;
    volatility_index: string;
    contract_type: string;
    staking_mode: StakingMode;
    initial_stake: number;
    max_stake?: number;
    martingale_multiplier?: number;
    profit_threshold: number;
    loss_threshold: number;
    max_trades?: number;
    duration_minutes?: number;
    total_trades?: number;
    winning_trades?: number;
    losing_trades?: number;
    net_pnl?: number;
    started_at?: string;
    ended_at?: string;
    created_at?: string;
}

export interface Trade {
    id: string;
    session_id: string;
    contract_id?: string;
    contract_type: string;
    stake: number;
    prediction?: string | number;
    entry_digit?: number;
    exit_digit?: number;
    result: 'win' | 'loss' | 'pending';
    profit: number;
    created_at?: string;
}

export interface TradingAccount {
    id: string;
    user_id: string;
    deriv_account_id: string;
    balance: number;
    currency: string;
    is_virtual: boolean;
    is_active: boolean;
    created_at?: string;
}

export interface BotStatus {
    isRunning: boolean;
    sessionId?: string;
    currentStrategy?: string;
    lastTrade?: Trade;
}

// ============================================
// Community Types
// ============================================

export interface CommunityPost {
    id: string;
    content: string;
    postType?: string;
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    likeCount: number;
    commentCount: number;
    viewCount?: number;
    liked: boolean;
    reactions?: Record<string, number>;
    createdAt: string;
    author: PostAuthor;
}

export interface PostAuthor {
    id: string;
    derivId?: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: PostAuthor;
}

// ============================================
// Analytics Types
// ============================================

export interface Analytics {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    bestTrade: number;
    worstTrade: number;
    winStreak: number;
    lossStreak: number;
}

export interface DigitStats {
    [digit: number]: number;
}

export interface ProfitCurvePoint {
    index: number;
    profit: number;
    date?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

// ============================================
// Component Props Types
// ============================================

export interface ChildrenProps {
    children: React.ReactNode;
}

export interface UserProps {
    user?: UserInfo | null;
}
