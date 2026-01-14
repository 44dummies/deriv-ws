# Railway Redis Setup Guide

## Step 1: Add Redis Database in Railway Dashboard

1. **Log in to Railway** at https://railway.app
2. **Navigate to your project** (TraderMind)
3. Click **"New"** button (top right)
4. Select **"Database"** → **"Add Redis"**

Railway will automatically:
- ✅ Create a Redis instance
- ✅ Generate a `REDIS_URL` environment variable
- ✅ Inject it into all services in your project
- ✅ Set up private networking

**Cost:** $5/month for 512MB Redis instance

## Step 2: Verify Environment Variable

After adding Redis, verify the variable is set:

1. Go to **api-gateway** service
2. Click **"Variables"** tab
3. You should see: `REDIS_URL` = `redis://default:***@redis.railway.internal:6379`

> **Note:** Railway automatically provides this variable to ALL services in your project.

## Step 3: Restart Services

Railway will auto-restart services after adding Redis, but to be sure:

1. Go to **api-gateway** service
2. Click **"Deployments"**
3. Click **"Redeploy"** on the latest deployment

## Step 4: Verify Connection

Check the deployment logs for:

```
[inf] RateLimiter Redis connected
```

If you see this, Redis is working! 🎉

## Alternative: Use External Redis Provider

If you prefer not to use Railway's Redis, you can use external providers:

### Option A: Upstash Redis (Serverless)

1. Sign up at https://console.upstash.com/
2. Create a new Redis database (select region closest to Railway)
3. Copy the connection URL:
   ```
   redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```
4. In Railway Dashboard → api-gateway → Variables:
   ```
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```

**Pricing:**
- Free tier: 10,000 commands/day
- Pay-as-you-go: $0.20 per 100K commands

### Option B: Redis Cloud

1. Sign up at https://redis.com/try-free/
2. Create a new database
3. Get connection string
4. Add to Railway environment variables

**Pricing:**
- Free tier: 30MB
- Paid: Starting at $7/month for 1GB

## Environment Variable Format

The `REDIS_URL` should follow this format:

```bash
# Standard Redis
redis://[username]:[password]@[host]:[port]

# Redis with TLS (recommended for external providers)
rediss://[username]:[password]@[host]:[port]

# Examples:
redis://default:abc123@redis.railway.internal:6379
rediss://default:xyzABC@redis-12345.upstash.io:6379
```

## Testing Locally with Redis

To test Redis integration on your local machine:

### Using Docker:
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Set environment variable
export REDIS_URL=redis://localhost:6379

# Run api-gateway
cd backend/api-gateway
pnpm run dev
```

### Using docker-compose:
```bash
# Already configured in docker-compose.yml
docker-compose up redis api-gateway
```

## Troubleshooting

### Issue: "RateLimiter Redis error" still appearing

**Solution 1:** Check REDIS_URL is set
```bash
# In Railway Dashboard → api-gateway → Variables
# Ensure REDIS_URL exists
```

**Solution 2:** Restart the service
```bash
# Railway Dashboard → api-gateway → Deployments → Redeploy
```

**Solution 3:** Check Redis service is running
```bash
# Railway Dashboard → Check Redis service status
# Should show "Active"
```

### Issue: Connection timeout

**Solution:** Ensure Redis is in the same Railway project
- Redis must be in the same project for private networking
- If using external Redis, check firewall rules

### Issue: Authentication failed

**Solution:** Verify REDIS_URL format
```bash
# Correct format:
redis://default:PASSWORD@HOST:6379

# Common mistakes:
redis://PASSWORD@HOST:6379  ❌ (missing username)
redis://HOST:6379           ❌ (missing auth for Railway Redis)
```

## Monitoring Redis

### Railway Dashboard
1. Go to Redis service
2. Click "Metrics" tab
3. Monitor:
   - Memory usage
   - Commands per second
   - Connected clients

### Via API Gateway Logs
```bash
# Successful connection:
[inf] RateLimiter Redis connected

# Throttled warning (once per minute if issues):
[wrn] Redis connection closed, using in-memory fallback
```

## Rate Limiting Behavior

### With Redis (Production)
- ✅ Global rate limits across all instances
- ✅ Persists through restarts
- ✅ Accurate counting in distributed environment
- ✅ Supports horizontal scaling

### Without Redis (Fallback)
- ⚠️ Per-instance rate limits only
- ⚠️ Resets on restart
- ⚠️ Not suitable for multiple instances
- ✅ Zero external dependencies

## Security Best Practices

1. **Never expose Redis to public internet**
   - Use Railway's private networking (automatic)
   - For external Redis, use VPC/private endpoints

2. **Use TLS for external connections**
   ```bash
   # Use rediss:// (with double 's') for TLS
   rediss://default:password@host:6379
   ```

3. **Rotate passwords regularly**
   - Railway: Regenerate Redis credentials
   - External: Update password in provider dashboard

4. **Monitor access**
   - Check connected clients in Redis metrics
   - Review unusual command patterns

## Cost Optimization

### Railway Redis
- **Smallest plan:** $5/month (512MB) - Suitable for most use cases
- **Upgrade when:** Memory usage > 80%

### Upstash (Serverless)
- **Free tier:** Great for development/low traffic
- **Production:** Estimate based on requests/day
  - 1M requests/month ≈ $6/month
  - Auto-scales with usage

## Migration Checklist

- [ ] Add Redis to Railway (or external provider)
- [ ] Verify `REDIS_URL` environment variable is set
- [ ] Deploy latest code with Redis fixes
- [ ] Check logs for "RateLimiter Redis connected"
- [ ] Test rate limiting (make 100+ requests in 1 minute)
- [ ] Monitor Redis metrics for 24 hours
- [ ] Set up alerts for Redis downtime

## Next Steps

After Redis is running:
1. ✅ Rate limiting will work globally
2. ✅ Error logs will be clean
3. ✅ Application will scale horizontally
4. Consider adding Redis for other features:
   - Session storage
   - Caching
   - Real-time analytics

---

**Questions?** Check Railway docs: https://docs.railway.app/databases/redis
