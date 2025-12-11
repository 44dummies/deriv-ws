# Deployment Guide

## enabling Redis on Railway (Required for Event-Driven Architecture)

1. **Go to your Railway project**
   - Run `npx railway add` in your terminal
   - Select **Database**
   - Select **Redis**
   - Press Enter to confirm

   *Alternatively, via the dashboard:*
   - Navigate to your project dashboard at [railway.app](https://railway.app)
   - Click **+ New Service** → **Database** → **Redis**

2. **Wait for Deployment**
   - Wait for the Redis service to initialize

3. **Get Connection URL**
   - Click on the newly created **Redis** service card
   - Navigate to the **Variables** tab
   - Find `REDIS_URL` (it starts with `redis://`)
   - Click the Copy icon

4. **Update Environment Variables**
   - Go to your **Node.js Server** service in Railway
   - Go to the **Variables** tab
   - Add a new variable: `REDIS_URL`
   - Paste the value you copied
   - Redeploy the server

## Verifying Setup

Once redeployed, check the server logs (Deployments -> View Logs). You should see:
```text
[MessageQueue] Connected to Redis
[Workers] All workers started
...
Event-Driven Architecture: ENABLED
```

If you see "Running in direct mode without queue", verify the `REDIS_URL` is correct.
