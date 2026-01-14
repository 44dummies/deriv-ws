# Redis Setup for TraderMind (Railway Deployment)

## Problem
The API Gateway is experiencing continuous Redis connection errors because Redis is not configured in production.

## Solution Options

### Option 1: Add Redis to Railway (Recommended)

1. **Install Railway Redis Plugin**
   ```bash
   # In Railway dashboard:
   # 1. Go to your project
   # 2. Click "New" → "Database" → "Add Redis"
   # 3. Railway will automatically create REDIS_URL environment variable
   ```

2. **Connect to API Gateway service**
   - Railway automatically injects `REDIS_URL` into all services
   - No manual configuration needed

3. **Verify Connection**
   ```bash
   # In Railway logs, you should see:
   [inf] RateLimiter Redis connected
   ```

### Option 2: Use External Redis (Upstash/Redis Cloud)

1. **Create Redis Instance**
   - **Upstash**: https://upstash.com (Free tier: 10K commands/day)
   - **Redis Cloud**: https://redis.com/try-free/ (30MB free)

2. **Get Connection URL**
   ```
   Format: redis://default:password@host:port
   Example: redis://default:abc123@fly-redis.upstash.io:6379
   ```

3. **Add to Railway Environment**
   ```bash
   # Railway Dashboard → api-gateway service → Variables
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:6379
   ```

### Option 3: Disable Redis (Development Only)

If you want to run without Redis temporarily:

```bash
# Railway Dashboard → api-gateway service → Variables
# Simply don't set REDIS_URL

# The rate limiter will automatically use in-memory fallback
# WARNING: In-memory rate limiting doesn't work across multiple instances
```

## Current Behavior

### With Redis Connection Errors (Current State)
- ✅ API still works (in-memory fallback)
- ⚠️ Rate limiting only works per-instance (not global)
- ❌ Logs are spammed with errors (now fixed with throttling)

### With Redis Connected
- ✅ Global rate limiting across all instances
- ✅ Persistent rate limit counters (survive restarts)
- ✅ Better performance under high load

## Verification

After setting up Redis, check logs for:
```
[inf] RateLimiter Redis connected
```

If you see this once per minute (throttled):
```
[wrn] Redis error in rate limiter
```

It means Redis is still not reachable.

## Recommended Production Setup

For production deployments:
1. **Use Railway Redis** (easiest, $5/month)
2. Or **Upstash Redis** (serverless, pay-per-use)
3. Set `REDIS_URL` in environment variables
4. Restart api-gateway service

## Cost Comparison

| Option | Free Tier | Paid Plan |
|--------|-----------|-----------|
| Railway Redis | None | $5/month (512MB) |
| Upstash Redis | 10K cmd/day | $0.20 per 100K commands |
| Redis Cloud | 30MB | $7/month (1GB) |
| In-Memory (No Redis) | Free | Free (Not recommended) |

## Security Notes

- Never expose Redis to public internet
- Use Railway's private network (automatic with Railway Redis)
- For external Redis, use TLS: `rediss://` prefix
- Rotate Redis passwords regularly

## Next Steps

1. Choose Redis option above
2. Set `REDIS_URL` environment variable
3. Redeploy api-gateway service
4. Monitor logs for "RateLimiter Redis connected"
