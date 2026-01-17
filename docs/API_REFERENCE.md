# API Reference

## REST Endpoints

All API routes are prefixed with `/api/v1`.

### Authentication
- `GET /auth/login` - Initiates OAuth flow.
- `GET /auth/callback` - Handling OAuth callback.
- `GET /auth/me` - Returns current authenticated user context.

### Sessions
- `GET /sessions` - List active trading sessions.
- `POST /sessions` - Create a new trading session.
  - **Body**: `{ name: string, risk_level: string, strategy: string }`
- `GET /sessions/:id` - Get details of a specific session.
- `POST /sessions/:id/stop` - Stop an active session.

### Trades
- `GET /trades` - Get recent trade history.
- `POST /trades/execute` - Execute a manual trade.
  - **Body**: `{ market: string, direction: 'CALL'|'PUT', stake: number, duration: number }`
- `POST /trades/sync` - Force sync of open trade statuses from Deriv.

### User
- `GET /user-summary` - Returns aggregated stats (PnL, win rate, active sessions).

---

## WebSocket Events

The platform uses Socket.IO. Clients should connect to the root namespace.

### Client -> Server (Emitted by Frontend)

| Event | Payload | Purpose |
|-------|---------|---------|
| `subscribe_market` | `{ symbol: string }` | Subscribe to live ticks for a specific market. |
| `unsubscribe_market` | `{ symbol: string }` | Unsubscribe from a market. |
| `join_session` | `{ sessionId: string }` | Join a session room to receive focused updates. |

### Server -> Client (Received by Frontend)

| Event | Payload | Purpose |
|-------|---------|---------|
| `tick_update` | `{ symbol, quote, epoch }` | Real-time market price update. |
| `session_update` | `{ id, status, pnl }` | Updates on session state changes. |
| `trade_executed` | `{ id, market, stake, status }` | Notification when a trade is placed. |
| `trade_settled` | `{ id, profit, status: 'WIN'|'LOSS' }` | Notification when a trade completes. |
| `signal_generated` | `{ market, action, confidence }` | (Debug/Admin) Raw signal from QuantEngine. |
| `error` | `{ message, code }` | General error notification. |
