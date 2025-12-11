# Trading Bot Architecture

## System Overview

TraderMind's trading bot is a **multi-account automated trading engine** that executes trades across multiple Deriv accounts simultaneously using signal-based strategies, risk management, and individual TP/SL management.

## Core Architecture

```
                    Admin Dashboard
     (Create Sessions, Start/Stop Bot, Monitor Trades)
                         |
          ---------------v---------------
         |     Bot Manager (botManager.js)     |
         |   - Orchestrates all bot operations |
         |   - Manages session lifecycle       |
         |   - Session auto-stop timer         |
          ----------------+------------------
                         |
          ---------------v---------------
         |  Signal Worker (signalWorker.js)    |
         |  - Analyzes market data             |
         |  - Generates trading signals        |
         |  - Risk Engine evaluation           |
          ----------------+------------------
                         |
          ---------------v---------------
         |   Risk Engine (RiskEngine.js)       |
         |  - Daily loss limits ($50 default)  |
         |  - Exposure control                 |
         |  - Trade blocking when limits hit   |
          ----------------+------------------
                         |
          ---------------v---------------
         |  Trade Executor (tradeExecutor.js)  |
         |  - Executes trades via Deriv API    |
         |  - Individual TP/SL per participant |
         |  - Trade analysis notifications     |
          -----------------------------------
```

## Data Flow

```
User Login (OAuth)
       |
       v
+------------------+
| Callback.tsx     | Stores derivDemoToken & derivRealToken in sessionStorage
+--------+---------+
         |
         v
+------------------+
| Dashboard.tsx    | User sees available sessions
+--------+---------+
         | Accept Session (passes deriv_token)
         v
+----------------------------------+
| POST /user/sessions/:id/accept   | Stores token in session_participants.deriv_token
+--------+-------------------------+
         |
         v
+----------------------------------+
| Admin starts bot                 | POST /admin/sessions/:id/start
+--------+-------------------------+
         |
         v
+----------------------------------+
| SignalWorker                     |
| 1. Collects market ticks         |
| 2. Generates trading signal      |
| 3. Queries daily loss from DB    |
| 4. RiskEngine evaluates trade    |
| 5. If allowed, passes to executor|
+--------+-------------------------+
         |
         v
+----------------------------------+
| TradeExecutor                    |
| 1. Gets active participants      |
| 2. Uses participant.deriv_token  |
| 3. Connects to Deriv WebSocket   |
| 4. Executes trades per signal    |
| 5. Monitors TP/SL individually   |
| 6. Sends trade notifications     |
+----------------------------------+
```

## Risk Management

### Risk Engine Integration

The RiskEngine is integrated into the SignalWorker and evaluates every trade before execution:

```javascript
// Before each trade:
const riskContext = {
    dailyLoss,           // Queried from trades table
    currentExposure,     // Active connections count
    signal: { type, symbol, confidence }
};

const riskCheck = await riskEngine.evaluateRisk(riskContext);

if (!riskCheck.allowed) {
    // Trade blocked, logged to trading_activity_logs
    return;
}
```

### Risk Rules

| Rule | Default | Description |
|------|---------|-------------|
| Max Daily Loss | $50 | Blocks trades when daily loss exceeds limit |
| Max Exposure | $1000 | Maximum simultaneous exposure |
| Max Drawdown | 10% | Percentage-based drawdown limit |

Configuration: `server/src/services/trading-engine/config.js`

## Session Auto-Stop Timer

Sessions with `duration_minutes` set will automatically stop when the time expires:

```javascript
// In BotManager.startBot():
if (session.duration_minutes > 0) {
    this.sessionTimer = setTimeout(async () => {
        await this.stopBot();
        // Logs event to trading_activity_logs
        // Emits 'session_ended' to connected clients
    }, session.duration_minutes * 60 * 1000);
}
```

## Database Schema

### trading_sessions_v2 (Admin creates)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| admin_id | UUID | Creator |
| name | String | Session name |
| type | String | day/one_time/recovery |
| mode | String | real/demo |
| min_balance | Number | Minimum balance to join |
| default_tp | Number | Default take profit |
| default_sl | Number | Default stop loss |
| duration_minutes | Number | Auto-stop duration |
| status | String | pending/running/completed/stopped |

### session_participants (Users join)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to trading_sessions_v2 |
| user_id | UUID | FK to user_profiles |
| deriv_token | String | User's Deriv API token |
| tp | Number | User's take profit |
| sl | Number | User's stop loss |
| current_pnl | Number | Running P&L |
| status | String | active/completed/stopped |

### trades
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to session |
| user_id | UUID | FK to user |
| contract_id | String | Deriv contract ID |
| profit_loss | Number | Trade result |
| status | String | open/win/loss/tp_hit/sl_hit |
| created_at | Timestamp | Trade time |

## Trade Execution Flow

### 1. Signal Generated
```javascript
signal = {
  market: 'R_100',     // Volatility index
  side: 'OVER',        // Trade direction
  digit: 4,            // Digit prediction
  confidence: 0.75     // Signal strength (0-1)
}
```

### 2. Risk Check
```javascript
const riskCheck = await riskEngine.evaluateRisk({
    dailyLoss: 25,        // Today's losses
    currentExposure: 100, // Current open trades value
    signal
});
// Returns { allowed: true } or { allowed: false, reasons: [...] }
```

### 3. Get Active Participants
```javascript
const { data: participants } = await supabase
  .from('session_participants')
  .select('*')
  .eq('session_id', sessionId)
  .eq('status', 'active');
```

### 4. Execute Trade Per Participant
```javascript
for (const participant of participants) {
  const apiToken = participant.deriv_token;
  const ws = await getConnection(participant.user_id, apiToken);
  const result = await executeSingleTrade(participant, apiToken, signal, session);
  startTPSLMonitor(result, participant, session);
  sendNotification(participant.user_id, {
    type: 'trade_executed',
    data: { contractId, stake, confidence: signal.confidence }
  });
}
```

### 5. TP/SL Monitoring
```javascript
// Monitor each trade individually via WebSocket
if (currentPnL >= participant.tp) {
  closeTrade(trade, 'TP_REACHED', currentPnL);
}
if (currentPnL <= -participant.sl) {
  closeTrade(trade, 'SL_REACHED', currentPnL);
}
```

## API Endpoints

### Admin Routes (/api/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /sessions | List all sessions |
| POST | /sessions | Create new session |
| POST | /sessions/:id/start | Start bot for session |
| POST | /sessions/:id/stop | Stop bot |
| POST | /sessions/:id/pause | Pause trading |
| POST | /sessions/:id/resume | Resume trading |

### User Routes (/api/user)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /dashboard | Get user dashboard data |
| POST | /sessions/:id/accept | Join session (sends deriv_token) |
| POST | /sessions/:id/leave | Leave session |
| GET | /notifications | Get trade notifications |
| PUT | /tpsl | Update TP/SL settings |

### Trading V2 Routes (/api/trading-v2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /status | Bot connection status |
| GET | /metrics | Real-time trading metrics |
| GET | /logs | Activity logs |
| GET | /signals | Latest signal analysis |

## Key Files

| File | Purpose |
|------|---------|
| `server/src/services/botManager.js` | Orchestrates bot lifecycle, auto-stop timer |
| `server/src/services/tradeExecutor.js` | Executes trades, monitors TP/SL |
| `server/src/services/signalWorker.js` | Generates signals, risk checks |
| `server/src/services/strategyEngine.js` | Markov, RSI, trend analysis |
| `server/src/services/tickCollector.js` | WebSocket market data |
| `server/src/services/trading-engine/risk/RiskEngine.js` | Risk evaluation |
| `server/src/services/trading-engine/risk/Indicators.js` | Technical indicators |
| `server/src/routes/admin/bot.js` | Admin bot control endpoints |
| `server/src/routes/trading_v2.js` | Trading metrics API |

## Notification Flow

```
Trade Executed
      |
      v
+----------------------------------+
| tradeExecutor.sendNotification() |
| -> Insert into notifications     |
+--------+-------------------------+
         |
         v
+----------------------------------+
| Socket.IO emit to user           |
| -> Real-time notification        |
+----------------------------------+
```

## Bot Status Indicators

| Status | Meaning |
|--------|---------|
| Live | Bot is actively trading |
| Stopped | Bot is not running |
| Paused | Bot is paused (can resume) |
| No Participants | Session has no active users |
| Risk Blocked | Trade blocked by RiskEngine |

## Security Architecture

### Token Security
```
+--------------------------------------------+
|                  BROWSER                   |
+---------------------+----------------------+
|  React Memory       |  HttpOnly Cookie     |
|  +--------------+   |  +------------------+|
|  | accessToken  |   |  |  refreshToken    ||
|  |  (15 min)    |   |  | (7 days, secure) ||
|  +--------------+   |  +------------------+|
+---------------------+----------------------+
```

### Deriv Token Storage
- Frontend: Stored in sessionStorage during OAuth
- Backend: Stored in session_participants.deriv_token when user joins
- Bot: Reads directly from session_participants table

## Configuration

### Risk Settings (trading-engine/config.js)
```javascript
risk: {
    maxDrawdown: 0.1,     // 10%
    maxExposure: 1000,    // $1000
    maxDailyLoss: 50,     // $50
}
```

### Strategy Settings (config/strategyConfig.js)
```javascript
{
    minConfidence: 0.6,
    smartDelayMs: 1500,
    drawdownGuard: { enabled: true, maxDrawdownPct: 10 }
}
```

## Metrics API Response

```javascript
// GET /api/trading-v2/metrics
{
    metrics: [...],  // Hourly balance/equity data
    summary: {
        totalTrades: 45,
        winRate: 62.5,
        netPnL: 125.50,
        profitFactor: 1.85,
        grossProfit: 250.00,
        grossLoss: 135.00
    }
}
```
