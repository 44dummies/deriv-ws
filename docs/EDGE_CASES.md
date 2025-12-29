# TraderMind Edge Cases

## Session Lifecycle Edge Cases

| Scenario | Expected Behavior | PRD Reference |
|----------|-------------------|---------------|
| User joins session mid-trade | Join blocked until next signal | Section 13.2 |
| User balance drops below minimum | User removed from next execution cycle | FR-014 |
| Admin disconnects | Session continues unless kill switch triggered | Section 13.2 |
| Max participants reached | New join requests rejected | FR-013 |
| User opts out mid-session | User marked OPTED_OUT, no more trades | FR-018 |
| Session breaches global loss threshold | Auto-terminate session | FR-015 |
| Strategy version mismatch | Session blocked | FR-016 |
| Server restart | SessionRegistry rebuilds from Redis | Section 11 |
| Participant execution timeout | User marked FAILED, session continues | Section 13.2 |
| All participants fail | Session paused, alert sent | — |

## Market Event Edge Cases

| Scenario | Expected Behavior | PRD Reference |
|----------|-------------------|---------------|
| Duplicate WebSocket ticks | Deduplicated by timestamp hash | Section 13.2 |
| Network partition (Deriv WS) | Session auto-paused | Section 13.2 |
| Deriv API rate limit | Backoff retry, queue trades | — |
| Market closed | No signals generated | — |
| Invalid tick data | Logged and discarded | — |
| Tick latency > 1000ms | Tick marked stale, optional discard | — |

## Signal & Execution Edge Cases

| Scenario | Expected Behavior | PRD Reference |
|----------|-------------------|---------------|
| AI unavailable | Rule-only trading continues | Section 11 |
| AI latency > 100ms | Signal dropped, rule-only fallback | Section 9 |
| Low AI confidence | Signal rejected by QuantEngine | Section 8.5 |
| Model version mismatch | Session blocked | Section 11 |
| Replay attack | Rejected by idempotency key | SR-003 |
| Duplicate execution request | Rejected at ExecutionCore | SR-004 |
| Partial fills | Normalized to TradeResult with flags | Section 13.2 |
| Token decryption failure | Trade failed, user notified | — |
| Deriv API timeout | Trade marked FAILED, retry queue | — |

## Risk Boundary Edge Cases

| Scenario | Expected Behavior | PRD Reference |
|----------|-------------------|---------------|
| User limit < Session limit | User limit wins | Section 13.3 |
| Session limit < Strategy limit | Session limit wins | Section 13.3 |
| AI suggests but confidence low | AI rejection, no override | Section 13.3 |
| User drawdown at threshold | All trades blocked for user | FR-019 |
| Daily loss limit reached | User removed from session | — |

## WebSocket Event Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Client reconnects | Re-join session room, sync state |
| Multiple tabs open | Each tab has separate socket |
| Event delivery failure | Retry with exponential backoff |
| Out-of-order events | Client-side reordering by timestamp |
| Stale session state | Force refresh on reconnect |
