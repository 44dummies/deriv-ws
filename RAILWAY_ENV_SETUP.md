# Railway Environment Variables Setup Guide

**⚠️ CRITICAL**: These environment variables MUST be set in Railway for the platform to function.

---

## 🔴 Required Variables (Platform Won't Work Without These)

### 1. Database Connection (Supabase)
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Where to find**:
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Settings → API
- Copy `URL` and `service_role` key (NOT the `anon` key)

---

### 2. Session Security
```bash
SESSION_SECRET=<64-character-hex-string>
```
**How to generate**:
```bash
openssl rand -hex 32
```
**Purpose**: Signs JWT tokens for session authentication

---

### 3. CORS Configuration (Frontend Access)
```bash
# Production frontend URL
CORS_ORIGIN=https://deriv-ws-frontend.vercel.app

# Allow Vercel preview deployments (e.g., https://deriv-ws-frontend-abc123-user.vercel.app)
ALLOW_VERCEL_PREVIEWS=true

# WebSocket CORS (should match frontend URL)
FRONTEND_URL=https://deriv-ws-frontend.vercel.app
```
**Why this matters**:
- Without `CORS_ORIGIN`, frontend can't access API
- Without `ALLOW_VERCEL_PREVIEWS=true`, preview deployments will fail with CORS errors

---

### 4. Environment Detection
```bash
NODE_ENV=production
```
**Critical**: This enables:
- Secure cookies (`secure: true`)
- Cross-origin cookies (`sameSite: none`)
- Production error handling

**Alternative**: Railway automatically sets `RAILWAY_ENVIRONMENT=production`, so this is optional but recommended.

---

### 5. Token Encryption (For Deriv API)
```bash
DERIV_TOKEN_KEY=<64-character-hex-string>
```
**How to generate**:
```bash
openssl rand -hex 32
```
**Purpose**: Encrypts Deriv API tokens using AES-256-GCM before storing in database

---

## 🟡 Optional But Recommended

### 6. Redis (Rate Limiting & Session State)
```bash
REDIS_URL=redis://default:password@host:port
```
**How to add**:
1. Railway Dashboard → Your Project → "+ New"
2. Select "Database" → "Redis"
3. Copy connection URL from "Connect" tab
4. Paste into `REDIS_URL`

**Without Redis**: System uses in-memory fallback (works but not scalable)

---

### 7. Error Tracking (Sentry)
```bash
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
```
**How to get**:
1. Create account at [Sentry.io](https://sentry.io)
2. Create new project (Node.js)
3. Copy DSN from project settings

---

### 8. Monitoring & Observability
```bash
# Enable detailed logging
LOG_LEVEL=info

# Sentry sampling rates
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1  # 10% of sessions
```

---

## 🔵 Development Only (Don't Set in Production)
```bash
# These should NOT be set in Railway:
PORT=3000  # Railway assigns this automatically
ENABLE_LEGACY_ROUTES=false  # Security risk
ENABLE_AI_LAYER=false  # AI layer removed from codebase
```

---

## How to Set Environment Variables in Railway

### Method 1: Railway Dashboard (Recommended)
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project (`awake-reflection`)
3. Click on the service (`awake-reflection`)
4. Go to "Variables" tab
5. Click "New Variable"
6. Add each variable from the list above
7. Click "Deploy" to restart with new variables

### Method 2: Railway CLI
```bash
# Install Railway CLI
npx @railway/cli login

# Set variables (one at a time)
railway variables set CORS_ORIGIN=https://deriv-ws-frontend.vercel.app
railway variables set ALLOW_VERCEL_PREVIEWS=true
railway variables set NODE_ENV=production

# Redeploy
railway up
```

---

## Verification Checklist

After setting all variables, verify they're working:

### 1. Check Health Endpoint
```bash
curl https://awake-reflection-production-f31e.up.railway.app/health
# Should return: {"status":"healthy","service":"api-gateway"}
```

### 2. Check CORS Headers
```bash
curl -X OPTIONS \
  -H "Origin: https://deriv-ws-frontend.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://awake-reflection-production-f31e.up.railway.app/api/v1/auth/session \
  -v
  
# Should see:
# Access-Control-Allow-Origin: https://deriv-ws-frontend.vercel.app
# Access-Control-Allow-Credentials: true
```

### 3. Check Logs for Errors
```bash
npx @railway/cli logs

# Should NOT see:
# ❌ "SESSION_SECRET environment variable is required"
# ❌ "Missing required environment variables"
# ❌ "Not allowed by CORS"
```

---

## Common Issues & Solutions

### Issue: "Not allowed by CORS"
**Solution**: Set `CORS_ORIGIN` and `ALLOW_VERCEL_PREVIEWS=true`

### Issue: "SESSION_SECRET environment variable is required"
**Solution**: Generate and set `SESSION_SECRET` (see section 2)

### Issue: Authentication keeps failing (401)
**Cause**: `NODE_ENV` not set to `production`, cookies not secure
**Solution**: Set `NODE_ENV=production` in Railway

### Issue: Redis connection errors flooding logs
**Solution**: Either:
- Add Redis to Railway (recommended for production)
- OR leave as-is (in-memory fallback works but logs will show warnings)

---

## Priority Order for Setting Variables

**Set these first** (platform won't start without them):
1. ✅ `SUPABASE_URL`
2. ✅ `SUPABASE_SERVICE_ROLE_KEY`
3. ✅ `SESSION_SECRET`

**Set these next** (for authentication to work):
4. ✅ `CORS_ORIGIN`
5. ✅ `ALLOW_VERCEL_PREVIEWS`
6. ✅ `NODE_ENV=production`

**Set these later** (optional but improves experience):
7. 🔄 `REDIS_URL` (add Redis database in Railway)
8. 🔄 `SENTRY_DSN` (for error tracking)
9. 🔄 `DERIV_TOKEN_KEY` (required only when users connect Deriv accounts)

---

## Security Notes

- **Never commit** `.env` files to git
- **Never share** `SUPABASE_SERVICE_ROLE_KEY` (has admin access)
- **Never share** `SESSION_SECRET` (can forge login tokens)
- **Rotate secrets** every 90 days minimum
- Use Railway's "Variables" tab (encrypted at rest)

---

## Related Documentation

- [PRODUCTION_AUDIT_REPORT.md](PRODUCTION_AUDIT_REPORT.md) - Current production issues
- [backend/api-gateway/src/index.ts](backend/api-gateway/src/index.ts#L48-L59) - Env var validation
- [Railway Docs: Environment Variables](https://docs.railway.app/develop/variables)

---

**Last Updated**: 2026-01-14  
**Status**: 🔄 Awaiting Railway environment variable configuration
