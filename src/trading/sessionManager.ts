/**
 * Session Manager - Handles trading session lifecycle
 * 
 * Manages Day, One-Time, and Recovery sessions
 * Coordinates between accounts and trading engine
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TradingSession,
  SessionType,
  SessionStatus,
  SessionInvitation,
  TradingAccount,
  AccountStatus,
  CreateSessionRequest,
  JoinSessionRequest,
  ContractType,
  RecoveryState,
  SESSION_DEFAULTS,
  TradeExecution,
} from './types';

// ============================================
// SESSION STORE (In-memory for now, will sync with backend)
// ============================================

class SessionStore {
  private sessions: Map<string, TradingSession> = new Map();
  private invitations: SessionInvitation[] = [];
  private recoveryStates: Map<string, RecoveryState> = new Map();
  private listeners: Array<(event: SessionEvent) => void> = [];
  
  // Session CRUD
  createSession(request: CreateSessionRequest, adminId: string): TradingSession {
    const session: TradingSession = {
      id: uuidv4(),
      type: request.type,
      name: request.name,
      symbol: request.symbol,
      contractType: request.contractType,
      stakingMode: request.stakingMode,
      baseStake: request.baseStake,
      martingaleMultiplier: request.martingaleMultiplier || 2,
      maxMartingaleSteps: request.maxMartingaleSteps || 5,
      minimumBalance: request.minimumBalance,
      status: 'pending',
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      participantIds: [],
      totalTrades: 0,
      winCount: 0,
      lossCount: 0,
      totalProfit: 0,
      createdBy: adminId,
      manualOverrideActive: false,
    };
    
    this.sessions.set(session.id, session);
    
    // Create invitations for specified accounts
    request.inviteAccountIds.forEach(accountId => {
      this.createInvitation(session.id, accountId);
    });
    
    this.emit({ type: 'session_created', session });
    
    return session;
  }
  
  getSession(sessionId: string): TradingSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAllSessions(): TradingSession[] {
    return Array.from(this.sessions.values());
  }
  
  getActiveSessions(): TradingSession[] {
    return this.getAllSessions().filter(s => 
      s.status === 'active' || s.status === 'pending' || s.status === 'recovery'
    );
  }
  
  updateSession(sessionId: string, updates: Partial<TradingSession>): TradingSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const updated = { ...session, ...updates };
    this.sessions.set(sessionId, updated);
    
    this.emit({ type: 'session_updated', session: updated });
    
    return updated;
  }
  
  // Session lifecycle
  startSession(sessionId: string): TradingSession | null {
    return this.updateSession(sessionId, {
      status: 'active',
      startedAt: Date.now(),
    });
  }
  
  pauseSession(sessionId: string): TradingSession | null {
    return this.updateSession(sessionId, { status: 'paused' });
  }
  
  resumeSession(sessionId: string): TradingSession | null {
    return this.updateSession(sessionId, { status: 'active' });
  }
  
  stopSession(sessionId: string): TradingSession | null {
    return this.updateSession(sessionId, {
      status: 'stopped',
      endedAt: Date.now(),
    });
  }
  
  completeSession(sessionId: string): TradingSession | null {
    return this.updateSession(sessionId, {
      status: 'completed',
      endedAt: Date.now(),
    });
  }
  
  // Trade tracking
  recordTrade(sessionId: string, trade: TradeExecution): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const updates: Partial<TradingSession> = {
      totalTrades: session.totalTrades + 1,
      totalProfit: session.totalProfit + trade.profit,
    };
    
    if (trade.outcome === 'win') {
      updates.winCount = session.winCount + 1;
    } else if (trade.outcome === 'loss') {
      updates.lossCount = session.lossCount + 1;
    }
    
    this.updateSession(sessionId, updates);
  }
  
  // Invitation management
  createInvitation(sessionId: string, accountId: string): SessionInvitation {
    const invitation: SessionInvitation = {
      sessionId,
      accountId,
      sentAt: Date.now(),
      status: 'pending',
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minute expiry
    };
    
    this.invitations.push(invitation);
    this.emit({ type: 'invitation_created', invitation });
    
    return invitation;
  }
  
  getInvitationsForAccount(accountId: string): SessionInvitation[] {
    return this.invitations.filter(i => 
      i.accountId === accountId && i.status === 'pending'
    );
  }
  
  getPendingInvitations(sessionId: string): SessionInvitation[] {
    return this.invitations.filter(i => 
      i.sessionId === sessionId && i.status === 'pending'
    );
  }
  
  acceptInvitation(sessionId: string, accountId: string): boolean {
    const invitation = this.invitations.find(i => 
      i.sessionId === sessionId && i.accountId === accountId && i.status === 'pending'
    );
    
    if (!invitation) return false;
    
    // Check if expired
    if (Date.now() > invitation.expiresAt) {
      invitation.status = 'expired';
      return false;
    }
    
    invitation.status = 'accepted';
    
    // Add to session participants
    const session = this.sessions.get(sessionId);
    if (session) {
      this.updateSession(sessionId, {
        participantIds: [...session.participantIds, accountId],
      });
    }
    
    this.emit({ type: 'invitation_accepted', invitation });
    
    return true;
  }
  
  declineInvitation(sessionId: string, accountId: string): boolean {
    const invitation = this.invitations.find(i => 
      i.sessionId === sessionId && i.accountId === accountId && i.status === 'pending'
    );
    
    if (!invitation) return false;
    
    invitation.status = 'declined';
    this.emit({ type: 'invitation_declined', invitation });
    
    return true;
  }
  
  // Remove account from session
  removeParticipant(sessionId: string, accountId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.updateSession(sessionId, {
      participantIds: session.participantIds.filter(id => id !== accountId),
    });
    
    this.emit({ type: 'participant_removed', sessionId, accountId });
    
    return true;
  }
  
  // Recovery state management
  getRecoveryState(accountId: string): RecoveryState | undefined {
    return this.recoveryStates.get(accountId);
  }
  
  startRecovery(accountId: string, lossAmount: number): RecoveryState {
    const state: RecoveryState = {
      isActive: true,
      lossToRecover: lossAmount,
      recoveredAmount: 0,
      attemptCount: 0,
      startedAt: Date.now(),
      currentStake: 0,
    };
    
    this.recoveryStates.set(accountId, state);
    this.emit({ type: 'recovery_started', accountId, state });
    
    return state;
  }
  
  updateRecovery(accountId: string, updates: Partial<RecoveryState>): RecoveryState | null {
    const state = this.recoveryStates.get(accountId);
    if (!state) return null;
    
    const updated = { ...state, ...updates };
    this.recoveryStates.set(accountId, updated);
    
    if (updated.recoveredAmount >= updated.lossToRecover * 0.5) {
      // Recovery complete (50% recovered)
      updated.isActive = false;
      this.emit({ type: 'recovery_complete', accountId, state: updated });
    }
    
    return updated;
  }
  
  endRecovery(accountId: string): void {
    const state = this.recoveryStates.get(accountId);
    if (state) {
      state.isActive = false;
      this.emit({ type: 'recovery_ended', accountId, state });
    }
  }
  
  // Admin override
  setManualOverride(sessionId: string, direction: 'CALL' | 'PUT'): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.updateSession(sessionId, {
      manualOverrideActive: true,
      forcedDirection: direction,
    });
    
    this.emit({ type: 'manual_override', sessionId, direction });
    
    return true;
  }
  
  clearManualOverride(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.updateSession(sessionId, {
      manualOverrideActive: false,
      forcedDirection: undefined,
    });
    
    return true;
  }
  
  // Event system
  subscribe(callback: (event: SessionEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  private emit(event: SessionEvent): void {
    this.listeners.forEach(l => l(event));
  }
  
  // Cleanup
  cleanupExpiredInvitations(): void {
    const now = Date.now();
    this.invitations.forEach(i => {
      if (i.status === 'pending' && now > i.expiresAt) {
        i.status = 'expired';
      }
    });
  }
}

// ============================================
// SESSION EVENT TYPES
// ============================================

type SessionEvent =
  | { type: 'session_created'; session: TradingSession }
  | { type: 'session_updated'; session: TradingSession }
  | { type: 'invitation_created'; invitation: SessionInvitation }
  | { type: 'invitation_accepted'; invitation: SessionInvitation }
  | { type: 'invitation_declined'; invitation: SessionInvitation }
  | { type: 'participant_removed'; sessionId: string; accountId: string }
  | { type: 'recovery_started'; accountId: string; state: RecoveryState }
  | { type: 'recovery_complete'; accountId: string; state: RecoveryState }
  | { type: 'recovery_ended'; accountId: string; state: RecoveryState }
  | { type: 'manual_override'; sessionId: string; direction: 'CALL' | 'PUT' };

// ============================================
// SESSION MANAGER CLASS
// ============================================

export class SessionManager {
  private store: SessionStore;
  private accountUpdateCallback?: (accountId: string, updates: Partial<TradingAccount>) => void;
  
  constructor() {
    this.store = new SessionStore();
    
    // Start cleanup interval
    setInterval(() => {
      this.store.cleanupExpiredInvitations();
    }, 30000); // Every 30 seconds
  }
  
  // Hook for account updates
  onAccountUpdate(callback: (accountId: string, updates: Partial<TradingAccount>) => void): void {
    this.accountUpdateCallback = callback;
  }
  
  // Subscribe to session events
  subscribe(callback: (event: SessionEvent) => void): () => void {
    return this.store.subscribe(callback);
  }
  
  // Create a new session
  createSession(request: CreateSessionRequest, adminId: string): TradingSession {
    // Validate minimum balance based on session type
    const minBalance = SESSION_DEFAULTS[request.type.toUpperCase() as keyof typeof SESSION_DEFAULTS]?.minimumBalance || 50;
    
    if (request.minimumBalance < minBalance) {
      throw new Error(`Minimum balance for ${request.type} session is ${minBalance}`);
    }
    
    return this.store.createSession(request, adminId);
  }
  
  // Get session by ID
  getSession(sessionId: string): TradingSession | undefined {
    return this.store.getSession(sessionId);
  }
  
  // Get all active sessions
  getActiveSessions(): TradingSession[] {
    return this.store.getActiveSessions();
  }
  
  // Get sessions for a specific account
  getSessionsForAccount(accountId: string): TradingSession[] {
    return this.store.getAllSessions().filter(s => 
      s.participantIds.includes(accountId)
    );
  }
  
  // Accept session invitation
  acceptSession(
    sessionId: string, 
    accountId: string, 
    takeProfit: number, 
    stopLoss: number
  ): boolean {
    const accepted = this.store.acceptInvitation(sessionId, accountId);
    
    if (accepted && this.accountUpdateCallback) {
      this.accountUpdateCallback(accountId, {
        isInSession: true,
        sessionId,
        takeProfit,
        stopLoss,
        currentProfit: 0,
        status: 'active',
      });
    }
    
    return accepted;
  }
  
  // Decline session invitation
  declineSession(sessionId: string, accountId: string): boolean {
    return this.store.declineInvitation(sessionId, accountId);
  }
  
  // Leave an active session
  leaveSession(sessionId: string, accountId: string): boolean {
    const removed = this.store.removeParticipant(sessionId, accountId);
    
    if (removed && this.accountUpdateCallback) {
      this.accountUpdateCallback(accountId, {
        isInSession: false,
        sessionId: null,
        status: 'idle',
      });
    }
    
    return removed;
  }
  
  // Get pending invitations for an account
  getPendingInvitations(accountId: string): SessionInvitation[] {
    return this.store.getInvitationsForAccount(accountId);
  }
  
  // Admin: Start session
  startSession(sessionId: string): TradingSession | null {
    const session = this.store.getSession(sessionId);
    
    if (!session) return null;
    if (session.participantIds.length === 0) {
      throw new Error('Cannot start session with no participants');
    }
    
    return this.store.startSession(sessionId);
  }
  
  // Admin: Pause session
  pauseSession(sessionId: string): TradingSession | null {
    return this.store.pauseSession(sessionId);
  }
  
  // Admin: Resume session
  resumeSession(sessionId: string): TradingSession | null {
    return this.store.resumeSession(sessionId);
  }
  
  // Admin: Stop session
  stopSession(sessionId: string): TradingSession | null {
    const session = this.store.stopSession(sessionId);
    
    // Update all participant accounts
    if (session && this.accountUpdateCallback) {
      session.participantIds.forEach(accountId => {
        this.accountUpdateCallback!(accountId, {
          isInSession: false,
          sessionId: null,
          status: 'idle',
        });
      });
    }
    
    return session;
  }
  
  // Admin: Force direction override
  setManualOverride(sessionId: string, direction: 'CALL' | 'PUT'): boolean {
    return this.store.setManualOverride(sessionId, direction);
  }
  
  // Admin: Clear override
  clearManualOverride(sessionId: string): boolean {
    return this.store.clearManualOverride(sessionId);
  }
  
  // Record a trade result
  recordTrade(sessionId: string, trade: TradeExecution): void {
    this.store.recordTrade(sessionId, trade);
  }
  
  // Handle TP/SL events
  handleTakeProfit(sessionId: string, accountId: string): void {
    this.store.removeParticipant(sessionId, accountId);
    
    if (this.accountUpdateCallback) {
      this.accountUpdateCallback(accountId, {
        isInSession: false,
        sessionId: null,
        status: 'tp_reached',
      });
    }
  }
  
  handleStopLoss(sessionId: string, accountId: string, lossAmount: number): void {
    const session = this.store.getSession(sessionId);
    
    if (session?.type === 'day' || session?.type === 'one_time') {
      // Check if recovery is enabled
      const recoveryState = this.store.startRecovery(accountId, lossAmount);
      
      // Update session to recovery mode for this account
      this.store.updateSession(sessionId, { status: 'recovery' });
      
      if (this.accountUpdateCallback) {
        this.accountUpdateCallback(accountId, {
          status: 'sl_reached',
        });
      }
    } else {
      // Just remove from session
      this.store.removeParticipant(sessionId, accountId);
      
      if (this.accountUpdateCallback) {
        this.accountUpdateCallback(accountId, {
          isInSession: false,
          sessionId: null,
          status: 'sl_reached',
        });
      }
    }
  }
  
  // Recovery management
  getRecoveryState(accountId: string): RecoveryState | undefined {
    return this.store.getRecoveryState(accountId);
  }
  
  updateRecoveryProgress(accountId: string, profit: number): void {
    const state = this.store.getRecoveryState(accountId);
    if (!state || !state.isActive) return;
    
    this.store.updateRecovery(accountId, {
      recoveredAmount: state.recoveredAmount + profit,
      attemptCount: state.attemptCount + 1,
    });
  }
  
  endRecovery(accountId: string): void {
    this.store.endRecovery(accountId);
    
    if (this.accountUpdateCallback) {
      this.accountUpdateCallback(accountId, {
        status: 'idle',
      });
    }
  }
  
  // Session stats
  getSessionStats(sessionId: string): {
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    participants: number;
  } | null {
    const session = this.store.getSession(sessionId);
    if (!session) return null;
    
    const winRate = session.totalTrades > 0 
      ? (session.winCount / session.totalTrades) * 100 
      : 0;
    
    const avgProfit = session.totalTrades > 0 
      ? session.totalProfit / session.totalTrades 
      : 0;
    
    return {
      winRate,
      totalProfit: session.totalProfit,
      avgProfit,
      participants: session.participantIds.length,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
