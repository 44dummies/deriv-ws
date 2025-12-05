/**
 * Session Manager - Handles trading session lifecycle
 * 
 * Manages Day, One-Time, and Recovery sessions
 * Coordinates between accounts and trading engine
 */

import { v4 as uuidv4 } from 'uuid';
import { SESSION_DEFAULTS } from './types.js';

// ============================================
// SESSION STORE (In-memory for now, will sync with backend)
// ============================================

class SessionStore {
  constructor() {
    /** @type {Map<string, import('./types.js').TradingSession>} */
    this.sessions = new Map();
    /** @type {import('./types.js').SessionInvitation[]} */
    this.invitations = [];
    /** @type {Map<string, import('./types.js').RecoveryState>} */
    this.recoveryStates = new Map();
    /** @type {Array<(event: SessionEvent) => void>} */
    this.listeners = [];
  }
  
  /**
   * Create a new session
   * @param {import('./types.js').CreateSessionRequest} request
   * @param {string} adminId
   * @returns {import('./types.js').TradingSession}
   */
  createSession(request, adminId) {
    /** @type {import('./types.js').TradingSession} */
    const session = {
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
  
  /**
   * Get session by ID
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | undefined}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Get all sessions
   * @returns {import('./types.js').TradingSession[]}
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }
  
  /**
   * Get active sessions
   * @returns {import('./types.js').TradingSession[]}
   */
  getActiveSessions() {
    return this.getAllSessions().filter(s => 
      s.status === 'active' || s.status === 'pending' || s.status === 'recovery'
    );
  }
  
  /**
   * Update a session
   * @param {string} sessionId
   * @param {Partial<import('./types.js').TradingSession>} updates
   * @returns {import('./types.js').TradingSession | null}
   */
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const updated = { ...session, ...updates };
    this.sessions.set(sessionId, updated);
    
    this.emit({ type: 'session_updated', session: updated });
    
    return updated;
  }
  
  // Session lifecycle
  /**
   * Start a session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  startSession(sessionId) {
    return this.updateSession(sessionId, {
      status: 'active',
      startedAt: Date.now(),
    });
  }
  
  /**
   * Pause a session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  pauseSession(sessionId) {
    return this.updateSession(sessionId, { status: 'paused' });
  }
  
  /**
   * Resume a session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  resumeSession(sessionId) {
    return this.updateSession(sessionId, { status: 'active' });
  }
  
  /**
   * Stop a session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  stopSession(sessionId) {
    return this.updateSession(sessionId, {
      status: 'stopped',
      endedAt: Date.now(),
    });
  }
  
  /**
   * Complete a session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  completeSession(sessionId) {
    return this.updateSession(sessionId, {
      status: 'completed',
      endedAt: Date.now(),
    });
  }
  
  /**
   * Record a trade
   * @param {string} sessionId
   * @param {import('./types.js').TradeExecution} trade
   */
  recordTrade(sessionId, trade) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const updates = {
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
  
  /**
   * Create an invitation
   * @param {string} sessionId
   * @param {string} accountId
   * @returns {import('./types.js').SessionInvitation}
   */
  createInvitation(sessionId, accountId) {
    /** @type {import('./types.js').SessionInvitation} */
    const invitation = {
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
  
  /**
   * Get invitations for account
   * @param {string} accountId
   * @returns {import('./types.js').SessionInvitation[]}
   */
  getInvitationsForAccount(accountId) {
    return this.invitations.filter(i => 
      i.accountId === accountId && i.status === 'pending'
    );
  }
  
  /**
   * Get pending invitations for session
   * @param {string} sessionId
   * @returns {import('./types.js').SessionInvitation[]}
   */
  getPendingInvitations(sessionId) {
    return this.invitations.filter(i => 
      i.sessionId === sessionId && i.status === 'pending'
    );
  }
  
  /**
   * Accept an invitation
   * @param {string} sessionId
   * @param {string} accountId
   * @returns {boolean}
   */
  acceptInvitation(sessionId, accountId) {
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
  
  /**
   * Decline an invitation
   * @param {string} sessionId
   * @param {string} accountId
   * @returns {boolean}
   */
  declineInvitation(sessionId, accountId) {
    const invitation = this.invitations.find(i => 
      i.sessionId === sessionId && i.accountId === accountId && i.status === 'pending'
    );
    
    if (!invitation) return false;
    
    invitation.status = 'declined';
    this.emit({ type: 'invitation_declined', invitation });
    
    return true;
  }
  
  /**
   * Remove a participant from session
   * @param {string} sessionId
   * @param {string} accountId
   * @returns {boolean}
   */
  removeParticipant(sessionId, accountId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.updateSession(sessionId, {
      participantIds: session.participantIds.filter(id => id !== accountId),
    });
    
    this.emit({ type: 'participant_removed', sessionId, accountId });
    
    return true;
  }
  
  /**
   * Get recovery state for account
   * @param {string} accountId
   * @returns {import('./types.js').RecoveryState | undefined}
   */
  getRecoveryState(accountId) {
    return this.recoveryStates.get(accountId);
  }
  
  /**
   * Start recovery mode
   * @param {string} accountId
   * @param {number} lossAmount
   * @returns {import('./types.js').RecoveryState}
   */
  startRecovery(accountId, lossAmount) {
    /** @type {import('./types.js').RecoveryState} */
    const state = {
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
  
  /**
   * Update recovery state
   * @param {string} accountId
   * @param {Partial<import('./types.js').RecoveryState>} updates
   * @returns {import('./types.js').RecoveryState | null}
   */
  updateRecovery(accountId, updates) {
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
  
  /**
   * End recovery mode
   * @param {string} accountId
   */
  endRecovery(accountId) {
    const state = this.recoveryStates.get(accountId);
    if (state) {
      state.isActive = false;
      this.emit({ type: 'recovery_ended', accountId, state });
    }
  }
  
  /**
   * Set manual override
   * @param {string} sessionId
   * @param {'CALL' | 'PUT'} direction
   * @returns {boolean}
   */
  setManualOverride(sessionId, direction) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.updateSession(sessionId, {
      manualOverrideActive: true,
      forcedDirection: direction,
    });
    
    this.emit({ type: 'manual_override', sessionId, direction });
    
    return true;
  }
  
  /**
   * Clear manual override
   * @param {string} sessionId
   * @returns {boolean}
   */
  clearManualOverride(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    this.updateSession(sessionId, {
      manualOverrideActive: false,
      forcedDirection: undefined,
    });
    
    return true;
  }
  
  /**
   * Subscribe to events
   * @param {(event: SessionEvent) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  /**
   * Emit an event
   * @param {SessionEvent} event
   */
  emit(event) {
    this.listeners.forEach(l => l(event));
  }
  
  /**
   * Cleanup expired invitations
   */
  cleanupExpiredInvitations() {
    const now = Date.now();
    this.invitations.forEach(i => {
      if (i.status === 'pending' && now > i.expiresAt) {
        i.status = 'expired';
      }
    });
  }
}

// ============================================
// SESSION EVENT TYPES (JSDoc)
// ============================================

/**
 * @typedef {Object} SessionEventCreated
 * @property {'session_created'} type
 * @property {import('./types.js').TradingSession} session
 */

/**
 * @typedef {Object} SessionEventUpdated
 * @property {'session_updated'} type
 * @property {import('./types.js').TradingSession} session
 */

/**
 * @typedef {Object} SessionEventInvitationCreated
 * @property {'invitation_created'} type
 * @property {import('./types.js').SessionInvitation} invitation
 */

/**
 * @typedef {Object} SessionEventInvitationAccepted
 * @property {'invitation_accepted'} type
 * @property {import('./types.js').SessionInvitation} invitation
 */

/**
 * @typedef {Object} SessionEventInvitationDeclined
 * @property {'invitation_declined'} type
 * @property {import('./types.js').SessionInvitation} invitation
 */

/**
 * @typedef {Object} SessionEventParticipantRemoved
 * @property {'participant_removed'} type
 * @property {string} sessionId
 * @property {string} accountId
 */

/**
 * @typedef {Object} SessionEventRecoveryStarted
 * @property {'recovery_started'} type
 * @property {string} accountId
 * @property {import('./types.js').RecoveryState} state
 */

/**
 * @typedef {Object} SessionEventRecoveryComplete
 * @property {'recovery_complete'} type
 * @property {string} accountId
 * @property {import('./types.js').RecoveryState} state
 */

/**
 * @typedef {Object} SessionEventRecoveryEnded
 * @property {'recovery_ended'} type
 * @property {string} accountId
 * @property {import('./types.js').RecoveryState} state
 */

/**
 * @typedef {Object} SessionEventManualOverride
 * @property {'manual_override'} type
 * @property {string} sessionId
 * @property {'CALL' | 'PUT'} direction
 */

/**
 * @typedef {SessionEventCreated | SessionEventUpdated | SessionEventInvitationCreated | SessionEventInvitationAccepted | SessionEventInvitationDeclined | SessionEventParticipantRemoved | SessionEventRecoveryStarted | SessionEventRecoveryComplete | SessionEventRecoveryEnded | SessionEventManualOverride} SessionEvent
 */

// ============================================
// SESSION MANAGER CLASS
// ============================================

export class SessionManager {
  constructor() {
    /** @type {SessionStore} */
    this.store = new SessionStore();
    /** @type {((accountId: string, updates: Partial<import('./types.js').TradingAccount>) => void) | undefined} */
    this.accountUpdateCallback = undefined;
    
    // Start cleanup interval
    setInterval(() => {
      this.store.cleanupExpiredInvitations();
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Hook for account updates
   * @param {(accountId: string, updates: Partial<import('./types.js').TradingAccount>) => void} callback
   */
  onAccountUpdate(callback) {
    this.accountUpdateCallback = callback;
  }
  
  /**
   * Subscribe to session events
   * @param {(event: SessionEvent) => void} callback
   * @returns {() => void}
   */
  subscribe(callback) {
    return this.store.subscribe(callback);
  }
  
  /**
   * Create a new session
   * @param {import('./types.js').CreateSessionRequest} request
   * @param {string} adminId
   * @returns {import('./types.js').TradingSession}
   */
  createSession(request, adminId) {
    // Validate minimum balance based on session type
    const typeKey = request.type.toUpperCase();
    const defaults = SESSION_DEFAULTS[typeKey] || SESSION_DEFAULTS.DAY;
    const minBalance = defaults.minimumBalance || 50;
    
    if (request.minimumBalance < minBalance) {
      throw new Error(`Minimum balance for ${request.type} session is ${minBalance}`);
    }
    
    return this.store.createSession(request, adminId);
  }
  
  /**
   * Get session by ID
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | undefined}
   */
  getSession(sessionId) {
    return this.store.getSession(sessionId);
  }
  
  /**
   * Get all active sessions
   * @returns {import('./types.js').TradingSession[]}
   */
  getActiveSessions() {
    return this.store.getActiveSessions();
  }
  
  /**
   * Get sessions for a specific account
   * @param {string} accountId
   * @returns {import('./types.js').TradingSession[]}
   */
  getSessionsForAccount(accountId) {
    return this.store.getAllSessions().filter(s => 
      s.participantIds.includes(accountId)
    );
  }
  
  /**
   * Accept session invitation
   * @param {string} sessionId
   * @param {string} accountId
   * @param {number} takeProfit
   * @param {number} stopLoss
   * @returns {boolean}
   */
  acceptSession(sessionId, accountId, takeProfit, stopLoss) {
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
  
  /**
   * Decline session invitation
   * @param {string} sessionId
   * @param {string} accountId
   * @returns {boolean}
   */
  declineSession(sessionId, accountId) {
    return this.store.declineInvitation(sessionId, accountId);
  }
  
  /**
   * Leave an active session
   * @param {string} sessionId
   * @param {string} accountId
   * @returns {boolean}
   */
  leaveSession(sessionId, accountId) {
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
  
  /**
   * Get pending invitations for an account
   * @param {string} accountId
   * @returns {import('./types.js').SessionInvitation[]}
   */
  getPendingInvitations(accountId) {
    return this.store.getInvitationsForAccount(accountId);
  }
  
  /**
   * Admin: Start session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  startSession(sessionId) {
    const session = this.store.getSession(sessionId);
    
    if (!session) return null;
    if (session.participantIds.length === 0) {
      throw new Error('Cannot start session with no participants');
    }
    
    return this.store.startSession(sessionId);
  }
  
  /**
   * Admin: Pause session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  pauseSession(sessionId) {
    return this.store.pauseSession(sessionId);
  }
  
  /**
   * Admin: Resume session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  resumeSession(sessionId) {
    return this.store.resumeSession(sessionId);
  }
  
  /**
   * Admin: Stop session
   * @param {string} sessionId
   * @returns {import('./types.js').TradingSession | null}
   */
  stopSession(sessionId) {
    const session = this.store.stopSession(sessionId);
    
    // Update all participant accounts
    if (session && this.accountUpdateCallback) {
      session.participantIds.forEach(accountId => {
        this.accountUpdateCallback(accountId, {
          isInSession: false,
          sessionId: null,
          status: 'idle',
        });
      });
    }
    
    return session;
  }
  
  /**
   * Admin: Force direction override
   * @param {string} sessionId
   * @param {'CALL' | 'PUT'} direction
   * @returns {boolean}
   */
  setManualOverride(sessionId, direction) {
    return this.store.setManualOverride(sessionId, direction);
  }
  
  /**
   * Admin: Clear override
   * @param {string} sessionId
   * @returns {boolean}
   */
  clearManualOverride(sessionId) {
    return this.store.clearManualOverride(sessionId);
  }
  
  /**
   * Record a trade result
   * @param {string} sessionId
   * @param {import('./types.js').TradeExecution} trade
   */
  recordTrade(sessionId, trade) {
    this.store.recordTrade(sessionId, trade);
  }
  
  /**
   * Handle TP events
   * @param {string} sessionId
   * @param {string} accountId
   */
  handleTakeProfit(sessionId, accountId) {
    this.store.removeParticipant(sessionId, accountId);
    
    if (this.accountUpdateCallback) {
      this.accountUpdateCallback(accountId, {
        isInSession: false,
        sessionId: null,
        status: 'tp_reached',
      });
    }
  }
  
  /**
   * Handle SL events
   * @param {string} sessionId
   * @param {string} accountId
   * @param {number} lossAmount
   */
  handleStopLoss(sessionId, accountId, lossAmount) {
    const session = this.store.getSession(sessionId);
    
    if (session?.type === 'day' || session?.type === 'one_time') {
      // Check if recovery is enabled
      this.store.startRecovery(accountId, lossAmount);
      
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
  
  /**
   * Get recovery state
   * @param {string} accountId
   * @returns {import('./types.js').RecoveryState | undefined}
   */
  getRecoveryState(accountId) {
    return this.store.getRecoveryState(accountId);
  }
  
  /**
   * Update recovery progress
   * @param {string} accountId
   * @param {number} profit
   */
  updateRecoveryProgress(accountId, profit) {
    const state = this.store.getRecoveryState(accountId);
    if (!state || !state.isActive) return;
    
    this.store.updateRecovery(accountId, {
      recoveredAmount: state.recoveredAmount + profit,
      attemptCount: state.attemptCount + 1,
    });
  }
  
  /**
   * End recovery mode
   * @param {string} accountId
   */
  endRecovery(accountId) {
    this.store.endRecovery(accountId);
    
    if (this.accountUpdateCallback) {
      this.accountUpdateCallback(accountId, {
        status: 'idle',
      });
    }
  }
  
  /**
   * Get session stats
   * @param {string} sessionId
   * @returns {{ winRate: number; totalProfit: number; avgProfit: number; participants: number } | null}
   */
  getSessionStats(sessionId) {
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
