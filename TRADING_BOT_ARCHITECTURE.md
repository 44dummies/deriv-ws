# Trading Bot Architecture

## System Overview

TraderMind's trading bot is a **multi-account automated trading engine** that executes trades across multiple Deriv accounts simultaneously using signal-based strategies and individual TP/SL management.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│     (Create Sessions, Start/Stop Bot, Monitor Trades)      │
└───────────────────────┬─────────────────────────────────────┘
                        │
         ───────────────▼───────────────
        │     Bot Manager (botManager.js)     │
        │   - Orchestrates all bot operations │
        │   - Manages session lifecycle       │
         ────────────────┬──────────────
                        │
         ───────────────▼───────────────
        │  Trade Executor (tradeExecutor.js)  │
        │  - Executes trades via Deriv API    │
        │  - Individual TP/SL per participant │
        │  - Trade analysis notifications     │
         ────────────────┬──────────────
                        │
         ───────────────▼───────────────
        │  Signal Worker (signalWorker.js)    │
        │  - Analyzes market data             │
        │  - Generates trading signals        │
         ─────────────────────────────────
```

## Data Flow

```
User Login (OAuth)
       │
       ▼
┌──────────────────┐
│ Callback.tsx     │ Stores derivDemoToken & derivRealToken in sessionStorage
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Dashboard.tsx    │ User sees available sessions
└────────┬─────────┘
         │ Accept Session (passes deriv_token)
         ▼
┌──────────────────────────────────┐
│ POST /user/sessions/:id/accept   │ Stores token in session_participants.deriv_token
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Admin starts bot                 │ POST /admin/sessions/:id/start
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ TradeExecutor                    │
│ 1. Gets active participants      │
│ 2. Uses participant.deriv_token  │
│ 3. Connects to Deriv WebSocket   │
│ 4. Executes trades per signal    │
│ 5. Monitors TP/SL individually   │
│ 6. Sends trade notifications     │
└──────────────────────────────────┘
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
| status | String | pending/running/completed/stopped |

### session_participants (Users join)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to trading_sessions_v2 |
| user_id | UUID | FK to user_profiles |
| **deriv_token** | String | User's Deriv API token (stored at accept) |
| tp | Number | User's take profit |
| sl | Number | User's stop loss |
| current_pnl | Number | Running P&L |
| status | String | active/completed/stopped |

## Trade Execution Flow

### 1. Signal Generated
```javascript
signal = {
  side: 'EVEN',      // Trade direction
  digit: 4,          // Digit prediction
  confidence: 0.75   // Signal strength (0-1)
}
```

### 2. Get Active Participants
```javascript
const { data: participants } = await supabase
  .from('session_participants')
  .select('*')
  .eq('session_id', sessionId)
  .eq('status', 'active');
```

### 3. Execute Trade Per Participant
```javascript
for (const participant of participants) {
  // Use stored deriv_token directly
  const apiToken = participant.deriv_token;
  
  // Connect to Deriv WebSocket
  const ws = await getConnection(participant.user_id, apiToken);
  
  // Execute trade
  const result = await executeSingleTrade(participant, apiToken, signal, session);
  
  // Start TP/SL monitor
  startTPSLMonitor(result, participant, session);
  
  // Send notification to user
  sendNotification(participant.user_id, {
    type: 'trade_executed',
    message: `Trade executed: ${signal.side} ${signal.digit}`,
    data: { contractId, stake, confidence: signal.confidence }
  });
}
```

### 4. TP/SL Monitoring
```javascript
// Monitor each trade individually
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

## Security Architecture

### Token Security (Production-Grade)
```
┌────────────────────────────────────────────────────────┐
│                      BROWSER                           │
├─────────────────────┬──────────────────────────────────┤
│  React Memory       │  HttpOnly Cookie                 │
│  ┌─────────────┐    │  ┌─────────────────────────────┐ │
│  │ accessToken │    │  │      refreshToken           │ │
│  │  (15 min)   │    │  │   (7 days, JS can't read)   │ │
│  └─────────────┘    │  └─────────────────────────────┘ │
└─────────────────────┴──────────────────────────────────┘
```

### Deriv Token Storage
- **Frontend**: Stored in sessionStorage during OAuth
- **Backend**: Stored in session_participants.deriv_token when user joins session
- **Bot**: Reads directly from session_participants

## Key Files

| File | Purpose |
|------|---------|
| `server/src/services/botManager.js` | Orchestrates bot lifecycle |
| `server/src/services/tradeExecutor.js` | Executes trades, monitors TP/SL |
| `server/src/services/signalWorker.js` | Generates trading signals |
| `server/src/routes/admin/bot.js` | Admin bot control endpoints |
| `server/src/routes/user/sessions.js` | User session endpoints |
| `src/pages/admin/AdminDashboard.tsx` | Admin UI |
| `src/pages/Dashboard.tsx` | User dashboard |

## Notification Flow

```
Trade Executed
      │
      ▼
┌──────────────────────────────────┐
│ tradeExecutor.sendNotification() │
│ → Insert into trading_notifications│
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ NotificationBell.tsx             │
│ → Fetches /user/notifications    │
│ → Displays trade analysis        │
└──────────────────────────────────┘
```

## Bot Status Indicators

| Status | Meaning |
|--------|---------|
| 🟢 Live | Bot is actively trading |
| 🔴 Stopped | Bot is not running |
| ⏸️ Paused | Bot is paused (can resume) |
| ⚠️ No Participants | Session has no active users |
