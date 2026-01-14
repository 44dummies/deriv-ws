# TraderMind Copilot Instructions

## System Architecture

**TraderMind** is an event-driven trading platform for the Deriv API. The system is strictly separated into isolated modules with clear boundaries:

- **Frontend**: React 18 + TypeScript + Vite + Zustand + TanStack Query + Socket.IO client
- **API Gateway**: Express + Socket.IO server (auth, routing, WebSocket proxy)
- **QuantEngine**: Pure quantitative trading pipeline (market data → signals → risk validation → execution)
- **Supabase**: PostgreSQL + Auth + RLS (row-level security enforced on all tables)
- **Redis**: Session state registry and market data cache

**Critical**: The AI layer has been removed from this codebase. All references to Python/FastAPI/ML models should be ignored or removed.

## Module Boundaries (Zero Trust)

Each module has strict read/write permissions. **Never violate these boundaries**:

| Module | Reads | Writes | NEVER Touches |
|--------|-------|--------|---------------|
| Frontend | Session state via WS | User actions via REST | Tokens, execution logic |
| API Gateway | Auth tokens (encrypted) | Session events, WS broadcasts | Direct DB writes (except auth) |
| QuantEngine | Ticks, session config | Signals → RiskGuard | Token decryption (ExecutionCore only) |
| ExecutionCore | Approved trades only | Supabase `trades` table | Signal generation, user state |

### Token Security Flow
```
User Login → OAuth → AES-256-GCM Encrypt → Supabase user_deriv_tokens table
                                    ↓
ExecutionCore (ONLY) → Decrypt → Deriv API → Immediate Discard
```

**Never** expose tokens to:
- Frontend (sends only user_id)
- WebSocket messages
- Logs (redact before logging)
- AI layer (removed, but this rule remains)

## pnpm Workspace Structure

This is a **pnpm monorepo** with strict workspace dependencies:

```yaml
packages:
  - "frontend"
  - "backend/*"      # api-gateway, quant-engine
  - "packages/*"     # risk-rules, schemas, shared-utils
```

### Common Commands

```bash
# Install all dependencies (must use pnpm, not npm)
pnpm install

# Build all workspaces
pnpm -r run build

# Run all services in dev mode (parallel)
pnpm -r --parallel run dev

# Lint/typecheck entire monorepo
pnpm -r run lint
pnpm -r exec tsc --noEmit

# Add dependency to specific workspace
pnpm --filter @tradermind/frontend add react-query
pnpm --filter @tradermind/api-gateway add express

# Security audit across all workspaces
pnpm audit --recursive
pnpm audit --audit-level=moderate  # Filter by severity
```

**Never** use `npm install` or `yarn` — this will break the lockfile.

## Database Schema (Supabase)

All tables use **Row-Level Security (RLS)**. Key tables:

- `users`: User profiles (linked to Supabase auth.users)
- `sessions`: Trading sessions (participants as JSONB array)
- `trades`: Executed trades (immutable audit log)
- `user_deriv_tokens`: Encrypted Deriv API tokens (AES-256-GCM)
- `analytics_views`: Materialized view for performance metrics
- `shadow_signals`: ML inference results (historical, read-only)

### Migration Rules

1. **Always** create a new timestamped migration file in `supabase/migrations/`
2. **Never** modify existing migrations (immutable)
3. Use format: `YYYYMMDDHHMMSS_description.sql`
4. Test locally first: `supabase db reset && supabase db push`
5. RLS policies must be explicit — no wildcard grants

Example migration pattern:
```sql
-- Enable RLS (default deny)
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Explicit policy (no wildcards)
CREATE POLICY "Users can read own data"
  ON new_table FOR SELECT
  USING (auth.uid() = user_id);
```

## WebSocket Architecture

**Socket.IO** handles real-time communication:

- **Client → Server**: `socket.emit('action', payload)`
- **Server → Client**: `socket.emit('event', data)` or `io.to(room).emit(...)`

### Critical Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `session:start` | Client → Server | Start a trading session |
| `session:state` | Server → Client | Session state updates |
| `tick:update` | Server → Client | Market tick data |
| `trade:executed` | Server → Client | Trade confirmation |

**Room structure**: Each session creates a Socket.IO room (`session_${sessionId}`) for broadcasting.

## Environment Variables (Zero-Trust)

**Required** for all services:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Service role (backend only)
SUPABASE_ANON_KEY=eyJhbG...          # Anon key (frontend only)
DERIV_TOKEN_KEY=32-byte-hex          # AES-256 encryption key
REDIS_URL=redis://localhost:6379
```

**Optional** (removed AI layer):
- ~~`ENABLE_AI_LAYER=true`~~ (deprecated)
- ~~`AI_LAYER_URL=http://localhost:8000`~~ (deprecated)

**Observability** (add for Sentry monitoring):
```env
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

## Error Handling Patterns

### Frontend (React)
```typescript
// Use TanStack Query for API calls
const { data, error, isLoading } = useQuery({
  queryKey: ['sessions'],
  queryFn: fetchSessions,
  retry: 3,
});

// Sentry error boundary (wrap <App />)
<Sentry.ErrorBoundary fallback={ErrorFallback}>
  <App />
</Sentry.ErrorBoundary>
```

### Backend (Express)
```typescript
// API Gateway: Sentry middleware (before routes)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Routes use try-catch with Sentry.captureException
try {
  const result = await riskyOperation();
  res.json(result);
} catch (error) {
  logger.error('Operation failed', { error });
  Sentry.captureException(error);
  res.status(500).json({ error: 'Internal server error' });
}

// Error handler (after routes)
app.use(Sentry.Handlers.errorHandler());
```

## Testing Strategy

- **Unit tests**: `vitest` in all workspaces
- **Integration tests**: `tests/integration.test.ts` (API + DB)
- **E2E tests**: Cypress (`frontend/cypress/e2e/`)

Run tests:
```bash
pnpm -r run test           # All unit tests
pnpm --filter frontend run test:e2e  # Cypress E2E
```

## Docker Deployment

**Development**: `docker-compose.yml` (excludes AI layer)
**Production**: `docker-compose.prod.yml`

Services:
- `frontend`: Nginx serving static Vite build
- `api-gateway`: Node.js Express server
- `quant-engine`: Standalone quantitative trading pipeline
- `redis`: Session state cache

**Build** individual services:
```bash
docker build -f Dockerfile.api-gateway -t tradermind-api .
docker build -f Dockerfile.quant -t tradermind-quant .
```

## Code Style Conventions

1. **TypeScript strict mode**: All workspaces use `"strict": true`
2. **ESLint**: Use `@typescript-eslint/recommended` rules
3. **File naming**: 
   - Components: `PascalCase.tsx` (e.g., `SessionCard.tsx`)
   - Services: `PascalCase.ts` (e.g., `SessionRegistry.ts`)
   - Utilities: `camelCase.ts` (e.g., `logger.ts`)
4. **Import style**: Use `.js` extensions in TypeScript (ESM requirement)
   ```typescript
   import { logger } from './utils/logger.js';  // ✓ Correct
   import { logger } from './utils/logger';     // ✗ Wrong
   ```
5. **Logging**: Use Pino logger, never `console.log` in production code
   ```typescript
   logger.info('Session started', { sessionId, userId });
   logger.error('Execution failed', { error, context });
   ```

## Observability Setup

### Security Auditing (pnpm)

Run recursive vulnerability scans across all workspaces:

```bash
pnpm install                      # Update lockfile
pnpm audit --recursive            # Scan all packages
pnpm audit --audit-level=moderate # Filter by severity
pnpm audit --fix                  # Auto-fix if available
```

**Schedule**: Run before every production deployment and weekly in CI.

### Sentry Configuration

#### Frontend (React)
Install and initialize in [frontend/src/main.tsx](../frontend/src/main.tsx):

```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
  environment: import.meta.env.MODE,
});
```

Wrap app with error boundary:
```typescript
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

#### API Gateway (Node/Express)
Already installed `@sentry/node` — initialize in [backend/api-gateway/src/index.ts](../backend/api-gateway/src/index.ts):

```typescript
import * as Sentry from '@sentry/node';

// First middleware (before routes)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... routes ...

// Last middleware (after routes, before custom error handler)
app.use(Sentry.Handlers.errorHandler());
```

**Environment variables**:
```env
# Frontend (.env or Vite)
VITE_SENTRY_DSN=https://...@sentry.io/...

# Backend (.env)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

## Common Pitfalls

1. **Redis connection leaks**: Always reuse the same `ioredis` instance (see `SessionRegistry.ts`)
2. **WebSocket memory leaks**: Call `socket.off()` in React cleanup functions
3. **RLS bypass attempts**: Never use service role key in frontend — it bypasses RLS
4. **Token exposure**: Always redact tokens in logs using `redactSensitive()` utility
5. **Concurrent DB writes**: Use optimistic locking or Redis locks for session updates
6. **AI layer references**: Remove any imports/calls to FastAPI/Python services (deprecated)

## Key Files Reference

- Architecture: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- Tech stack: [docs/TECH_STACK.md](../docs/TECH_STACK.md)
- API reference: [docs/API_REFERENCE.md](../docs/API_REFERENCE.md)
- Session lifecycle: [backend/api-gateway/src/services/SessionRegistry.ts](../backend/api-gateway/src/services/SessionRegistry.ts)
- Trade execution: [backend/api-gateway/src/services/ExecutionCore.ts](../backend/api-gateway/src/services/ExecutionCore.ts)
- WebSocket server: [backend/api-gateway/src/services/WebSocketServer.ts](../backend/api-gateway/src/services/WebSocketServer.ts)

## Quick Start Checklist

- [ ] `pnpm install` (never use npm/yarn)
- [ ] Copy `.env.example` → `.env` and fill required vars
- [ ] `pnpm -r run build` (build all workspaces)
- [ ] `pnpm audit --recursive` (check vulnerabilities)
- [ ] Start Supabase: `supabase start` (or use cloud project)
- [ ] Start Redis: `redis-server` or Docker
- [ ] `pnpm -r --parallel run dev` (all services)
- [ ] Test health: `curl http://localhost:3000/health`

---

**Remember**: This is a security-critical trading platform. Always validate inputs, redact sensitive data, and enforce module boundaries.
