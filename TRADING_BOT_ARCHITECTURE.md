# Trading Bot Architecture

## System Overview

TraderMind's trading bot is a sophisticated **multi-account automated trading engine** that executes trades across multiple Deriv accounts simultaneously using predefined strategies and risk management rules.

## Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│     (Create Sessions, Start/Stop Bot, Monitor Trades)      │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ───────────────▼──────────────
        │     Bot Manager (botManager.js)     │
        │   - Orchestrates all bot operations   │
        │   - Manages session lifecycle         │
         ────────────────┬───────────────
                        │
         ───────────────▼──────────────
        │  Session Manager (sessionManager.js) │
        │  - Manages active trading sessions    │
        │  - Tracks participant accounts        │
         ────────────────┬───────────────
                        │
         ───────────────▼──────────────
        │  Trade Executor (tradeExecutor.js)   │
        │  - Executes trades via Deriv API     │
        │  - Applies strategies and risk mgmt   │
         ────────────────┬───────────────
                        │
         ───────────────▼──────────────
        │  Signal Worker (signalWorker.js)     │
        │  - Analyzes market data               │
        │  - Generates trading signals          │
         ─────────────────────────────────
```

## How the Trading Bot Works

### 1. Session Creation

An admin creates a trading session with parameters:

```javascript
{
  name: "Morning Scalp Session",
  session_type: "day",           // day | one_time | recovery
  mode: "real",                  // real | demo
  strategy: "DFPM",              // Strategy to use
  volatility_index: "R_100",     // Market to trade
  contract_type: "DIGITEVEN",    // Contract type
  initial_stake: 1.0,            // Starting stake
  martingale_multiplier: 2.0,    // Stake multiplier after loss
  profit_threshold: 10.0,        // Take Profit ($)
  loss_threshold: 5.0            // Stop Loss ($)
}
```

### 2. User Invitation

- Admin invites user accounts to the session
- Users receive invitation notifications
- Users accept invitations with their TP/SL preferences
- Participants are added to `session_participants` table

### 3. Bot Startup

When admin clicks "Start Bot":

```javascript
// 1. Find active or pending session
const session = await getSession();

// 2. Initialize bot manager
await botManager.startBot(sessionId);

// 3. Connect to Deriv WebSocket for each account
for (account of accounts) {
  connectDerivWebSocket(account.derivToken);
}

// 4. Start signal worker
signalWorker.start(strategy, market);

// 5. Begin trade loop
executeTradeLoop();
```

### 4. Trade Execution Loop

The bot continuously runs this cycle:

```
1. Get Signal from Strategy
   ↓
2. Check if Trade Allowed
   ↓
3. Execute Trade Across All Accounts
   ↓
4. Monitor Contract Settlement
   ↓
5. Update Account Balances
   ↓
6. Check TP/SL Conditions
   ↓
7. Apply Martingale (if loss)
   ↓
8. Log Trade Results
   ↓
9. Broadcast to Clients
   ↓
10. Wait for Next Signal
```

## Trading Strategies

### DFPM (Digit Frequency Pattern Matching)
**Concept**: Analyzes historical digit patterns to predict next digit.

```javascript
// Looks at last N digits
const lastDigits = [7, 3, 9, 2, 4];

// Finds most/least frequent
const digitFreq = {
  0: 5, 1: 12, 2: 8, 3: 15, 4: 6,
  5: 7, 6: 9, 7: 14, 8: 11, 9: 10
};

// Prediction: Digit 3 (most frequent) or 4 (least frequent)
const signal = {
  contract: "DIGITMATCH",
  prediction: 3,
  confidence: 0.75
};
```

### VCS (Volatility Compression Strategy)
**Concept**: Detects periods of low volatility followed by breakouts.

```javascript
// Calculate recent volatility
const volatility = calculateVolatility(ticks);

if (volatility < threshold) {
  // Compression detected
  const signal = {
    contract: "CALL",  // Expect upward breakout
    confidence: 0.68
  };
}
```

### DER (Digit Even/Odd Ratio)
**Concept**: Balances even/odd digit distribution.

```javascript
const last100 = getLastDigits(100);
const evenCount = countEven(last100);  // 58
const oddCount = countOdd(last100);    // 42

// Imbalance detected
if (evenCount > oddCount + 10) {
  return { contract: "DIGITODD", confidence: 0.72 };
}
```

### TPC (Tick Pattern Correlation)
**Concept**: Identifies repeating tick sequences.

```javascript
const pattern = [+1, +2, -1, +3]; // Recent tick movements
const historicalMatches = findSimilarPatterns(pattern);

// If pattern repeats, predict next move
const nextMove = averageNextMove(historicalMatches);
```

### Recovery Mode Strategies (DTP, DPB, MTD, RDS)
Used when session enters recovery mode after hitting stop loss:

- **DTP** (Digit Trend Pattern): Follows digit momentum
- **DPB** (Digit Pattern Break): Detects pattern reversals
- **MTD** (Multi-Timeframe Digit): Analyzes digits across timeframes
- **RDS** (Recovery Digit Sequence): Specialized recovery sequences

## Trade Execution Flow

### 1. Signal Generation
```javascript
const signal = signalWorker.getLatestSignal();
// { contract: "DIGITEVEN", prediction: 4, confidence: 0.75 }
```

### 2. Risk Check
```javascript
// Check if account has sufficient balance
if (account.balance < stake) return;

// Check if TP/SL reached
if (account.pnl >= takeProfit) return "TP_REACHED";
if (account.pnl <= -stopLoss) return "SL_REACHED";
```

### 3. Execute Trade
```javascript
// Send buy request to Deriv
ws.send({
  buy: 1,
  price: stake,
  parameters: {
    contract_type: "DIGITEVEN",
    symbol: "R_100",
    duration: 5,
    duration_unit: "t",
    barrier: "4"
  }
});
```

### 4. Monitor Contract
```javascript
// Wait for contract settlement
ws.on('proposal_open_contract', (contract) => {
  if (contract.is_sold) {
    const profit = contract.profit;
    updateAccountBalance(accountId, profit);
    recordTrade(contract);
  }
});
```

### 5. Martingale Logic
```javascript
if (profit < 0) {
  // Loss - increase stake
  nextStake = currentStake * martingaleMultiplier;
} else {
  // Win - reset to base stake
  nextStake = baseSt ake;
}
```

## Session Types

### Day Session
- Runs for 24 hours
- Resets daily
- Suitable for consistent profit targets

### One-Time Session
- Runs until TP or SL is hit
- No time limit
- Ideal for specific profit goals

### Recovery Session
- Activates when SL is hit in main session
- Uses aggressive strategies (DTP, DPB, MTD, RDS)
- Attempts to recover losses
- Higher risk, higher reward

## Recovery Mechanism

When a session hits Stop Loss:

```javascript
// 1. Stop main session
await sessionManager.stopSession(sessionId);

// 2. Calculate recovery target
const lostAmount = Math.abs(session.net_pnl);
const recoveryTarget = lostAmount * 1.2; // 120% of loss

// 3. Create recovery session
const recoverySession = await createSession({
  session_type: "recovery",
  strategy: "DTP",
  profit_threshold: recoveryTarget,
  initial_stake: lostAmount * 0.1, // 10% of loss
  martingale_multiplier: 2.5 // More aggressive
});

// 4. Auto-start recovery
await botManager.startBot(recoverySession.id);
```

## Real-Time Communication

### WebSocket Events

**To Clients:**
```javascript
// Trade executed
socket.emit('trade_executed', {
  sessionId,
  accountId,
  contractId,
  stake,
  prediction
});

// Trade result
socket.emit('trade_result', {
  contractId,
  result: 'won' | 'lost',
  profit,
  newBalance
});

// Session status
socket.emit('session_update', {
  sessionId,
  status: 'running' | 'paused' | 'completed',
  totalPnL,
  tradeCount
});
```

## Risk Management

### Per-Account Limits
```javascript
const limits = {
  maxStake: account.balance * 0.1,        // 10% of balance
  maxDailyLoss: account.balance * 0.2,    // 20% of balance
  maxConsecutiveLosses: 5,                // Stop after 5 losses
  minBalance: 10                          // Minimum balance required
};
```

### Session Limits
```javascript
const sessionLimits = {
  maxParticipants: 100,
  maxTradesPerAccount: 1000,
  maxSessionDuration: 24 * 60 * 60 * 1000  // 24 hours
};
```

## Database Schema (Simplified)

```sql
-- Trading sessions
trading_sessions
  id, admin_id, session_name, session_type, status,
  strategy_name, volatility_index, contract_type,
  initial_stake, profit_threshold, loss_threshold,
  net_pnl, total_trades, winning_trades

-- Participant accounts
session_participants
  session_id, account_id, user_id, status,
  take_profit, stop_loss, current_pnl

-- Trade logs
trades
  id, session_id, account_id, contract_id,
  strategy, stake, prediction, result, profit

-- Recovery sessions
recovery_sessions
  id, original_session_id, recovery_target,
  current_progress, status
```

## Error Handling

```javascript
try {
  await executeTrade(account, signal);
} catch (error) {
  if (error.code === 'InsufficientBalance') {
    // Skip this account
    logger.warn(`Insufficient balance for ${account.id}`);
  } else if (error.code === 'RateLimit') {
    // Wait and retry
    await sleep(5000);
    retry();
  } else if (error.code === 'InvalidToken') {
    // Disconnect account
    await disconnectAccount(account.id);
  } else {
    // Critical error - stop session
    await emergencyStop(sessionId);
  }
}
```

## Performance Optimizations

1. **Parallel Trade Execution**: All accounts trade simultaneously
2. **Connection Pooling**: Reuse WebSocket connections
3. **Signal Caching**: Cache strategy signals for 200ms
4. **Database Batching**: Batch insert trades every 10 seconds
5. **Memory Management**: Clear old tick data every minute

## Monitoring & Analytics

Admin dashboard provides real-time metrics:

- Active sessions count
- Total trades executed
- Overall win rate
- Net P&L across all accounts
- Bot uptime
- Strategy performance comparison
- Per-account performance

## Security Considerations

1. **Token Encryption**: Deriv tokens encrypted at rest
2. **Rate Limiting**: Max 5 requests/second per account
3. **Admin Auth**: JWT-based admin authentication
4. **Balance Verification**: Cross-check balances with Deriv API
5. **Audit Logs**: All bot actions logged

## Future Enhancements

- Machine learning strategy optimization
- Multi-strategy portfolio trading
- Social trading (copy trading)
- Advanced chart analysis
- Custom strategy builder
