# Deployment Guide: Railway + Vercel

This guide explains how to deploy the TraderMind backend infrastructure to **Railway** and the frontend to **Vercel**.

## Architecture

**Traffic Flow:**
```
[User Browser]
   ↓ (HTTPS)
[Vercel Frontend] (React SPA)
   ↓ (WSS / HTTPS)
[Railway API Gateway] (Node.js)
   ↓ (Internal Private Network)
[Railway Quant Engine] [Railway AI Layer] [Supabase DB] [Railway Redis]
```

---

## 1. Backend Deployment (Railway)

We use **Railway** for all backend services (`api-gateway`, `quant-engine`, `ai-layer`) and Redis.

### Prerequisites
- [Railway CLI](https://docs.railway.app/guides/cli) installed (`npm i -g @railway/cli`)
- Railway Account

### Setup & Deploy
1.  **Login**: `railway login`
2.  **Link Project**: `railway link` (Select your project)
3.  **Environment Variables**:
    Set these in the Railway Dashboard or via CLI:
    - `NODE_ENV=production`
    - `PORT=3000` (for API Gateway)
    - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
    - `REDIS_URL` (Railway provides this if you add a Redis service)
    - `DERIV_APP_ID` & `DERIV_API_TOKEN`
    - `CORS_ORIGIN` (Your Vercel URL, e.g., `https://your-app.vercel.app`. No trailing slash)

4.  **Deployment**:
    The project is configured with `railway.toml` to build specific Dockerfiles for each service.
    - **Method A (Recommended)**: Connect your GitHub repo to Railway. Pushes to `main` trigger auto-deploy.
    - **Method B (Manual)**: Run `railway up` in the root directory.

### Service Configuration (`railway.toml`)
- **api-gateway**: Uses `Dockerfile.api-gateway`
- **quant-engine**: Uses `Dockerfile.quant-engine`
- **ai-layer**: Uses `Dockerfile.ai-layer`

---

## 2. Frontend Deployment (Vercel)

We use **Vercel** for the React Frontend.

### Setup
1.  Import the repository into Vercel.
2.  **Root Directory**: Set to `frontend` (NOT `apps/frontend`).
3.  **Framework Preset**: Vite.

### Environment Variables
Go to Vercel Project Settings > Environment Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_GATEWAY_URL` | `https://your-railway-app.up.railway.app` | **CRITICAL**: The URL of your deployed API Gateway. |
| `VITE_DERIV_APP_ID` | `Your_App_ID` | App ID from [Deriv API Manager](https://api.deriv.com/apps/modules). Must allow your Vercel domain as redirect. |

### SPA Routing
A `vercel.json` file is present in `frontend/` to handle client-side routing (rewrites all 404s to `index.html`).

---

## 3. Database (Supabase)

1.  **Migrations**:
    Run migrations to set up tables (`trading_sessions`, `participants`, etc.).
    ```bash
    supabase db push
    ```
    (Or copy SQL from `supabase/migrations/` to the Supabase SQL Editor).

2.  **Policies**:
    RLS policies are defined in the migration files to secure data access.

---

## 4. Verification

After deployment:
1.  **Check Backend Health**: `curl https://your-railway-app.up.railway.app/health` -> `{"status":"healthy"}`.
2.  **Check Frontend**: Open Vercel URL -> Login -> Should redirect to Dashboard.
