# Immediate Action Checklist

**Status**: 🔴 URGENT - Platform non-functional  
**Time to Fix**: ~15 minutes  
**Last Commit**: `427fc0e` (auth cookie fixes pushed)

---

## ✅ Step 1: Set Environment Variables in Railway (5 min)

Go to: [Railway Dashboard](https://railway.app/dashboard) → `awake-reflection` project → `awake-reflection` service → **Variables** tab

### Add These Variables:
```bash
# 1. Core Authentication (REQUIRED)
SESSION_SECRET=<generate with: openssl rand -hex 32>

# 2. Database Connection (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# 3. CORS Configuration (REQUIRED FOR FRONTEND)
CORS_ORIGIN=https://deriv-ws-frontend.vercel.app
ALLOW_VERCEL_PREVIEWS=true
FRONTEND_URL=https://deriv-ws-frontend.vercel.app

# 4. Environment Detection (REQUIRED)
NODE_ENV=production

# 5. Token Encryption (OPTIONAL - for Deriv trading)
DERIV_TOKEN_KEY=<generate with: openssl rand -hex 32>
```

**After adding all variables**, click **"Deploy"** in Railway to restart the service.

---

## ✅ Step 2: Verify Deployment (3 min)

### Check if new code is deployed:
```bash
npx @railway/cli logs | grep "Sentry monitoring initialized"
```
**Expected**: Should see this log message from the latest code.

### Check for Redis error spam:
```bash
npx @railway/cli logs | grep "Redis" | tail -20
```
**Expected**: Errors should be throttled (max 1 per minute), not every 2 seconds.

---

## ✅ Step 3: Test Authentication (5 min)

### From your browser (on Vercel frontend):
1. Sign in with Deriv OAuth
2. Open DevTools → Network tab
3. Look for `/api/v1/auth/session` request
4. Check **Response Headers** for:
   ```
   Set-Cookie: session=...; Secure; HttpOnly; SameSite=None
   ```
5. Check **Response Status**: Should be `200` (not `401`)

### Test CORS manually:
```bash
curl -X OPTIONS \
  -H "Origin: https://deriv-ws-frontend.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://awake-reflection-production-f31e.up.railway.app/api/v1/auth/session \
  -v

# Expected headers in response:
# Access-Control-Allow-Origin: https://deriv-ws-frontend.vercel.app
# Access-Control-Allow-Credentials: true
```

---

## ✅ Step 4: Verify All Endpoints Working (2 min)

Test these endpoints from the frontend (should all return `200`, not `401`):
- ✅ `GET /api/v1/auth/session`
- ✅ `GET /api/v1/sessions`
- ✅ `GET /api/v1/stats/user-summary`
- ✅ `GET /api/v1/trades`

---

## 🔄 Optional: Add Redis to Railway (5 min)

### Why?
- Eliminates Redis connection error logs
- Enables production-grade rate limiting
- Allows horizontal scaling (multiple instances)

### How?
1. Railway Dashboard → Your Project → "+ New"
2. Select "Database" → "Redis"
3. Wait for provisioning (~2 min)
4. Go to Redis service → "Connect" tab
5. Copy `REDIS_URL`
6. Go back to `awake-reflection` service → Variables
7. Add: `REDIS_URL=<paste connection string>`
8. Deploy

---

## 🚨 If Issues Persist

### Authentication still failing?
1. Check Railway logs: `npx @railway/cli logs | grep "401\|auth"`
2. Verify `NODE_ENV=production` is set
3. Check if `SESSION_SECRET` is set (not empty)
4. Test with: `curl -v https://awake-reflection-production-f31e.up.railway.app/api/v1/csrf-token`

### CORS still blocking?
1. Check `CORS_ORIGIN` includes your exact Vercel URL
2. Verify `ALLOW_VERCEL_PREVIEWS=true` is set
3. Check response headers include `Access-Control-Allow-Credentials: true`

### Redis errors still flooding?
1. Wait 5 minutes after deploy (Railway might be caching)
2. Check logs for "RateLimiter Redis connected" (means it's working)
3. If still seeing errors, code may not have deployed (check commit hash in logs)

---

## Expected Results After All Steps

### ✅ Success Indicators:
- [ ] Redis errors reduced to max 1 per minute (or zero if Redis added)
- [ ] CORS errors completely gone from logs
- [ ] Authentication working (can access all `/api/v1/*` endpoints)
- [ ] Frontend can load sessions, trades, and user stats
- [ ] WebSocket connections established successfully

### ❌ Failure Indicators (Re-check Steps):
- Still seeing CORS errors → Environment variables not set
- Still getting 401 errors → `NODE_ENV` not set OR `SESSION_SECRET` missing
- Redis errors every 2 seconds → Old code still deployed (force redeploy)

---

## Need Help?

**Documentation**:
- [PRODUCTION_AUDIT_REPORT.md](PRODUCTION_AUDIT_REPORT.md) - Full technical audit
- [RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md) - Detailed environment variable guide

**Quick Support**:
- Railway logs: `npx @railway/cli logs`
- Check deployment: `npx @railway/cli status`
- Redeploy manually: Railway Dashboard → Service → "Deploy" button

---

**Last Updated**: 2026-01-14 11:15 UTC  
**Commit**: `427fc0e` (auth cookie fixes pushed)  
**Status**: 🔄 Awaiting Railway configuration
