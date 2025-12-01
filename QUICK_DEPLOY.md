# QUICK FIX: Register These URLs with Deriv

## The Problem
App ID `114042` is either not registered to your account or doesn't have the correct redirect URLs.

## URLs to Register at https://app.deriv.com/account/api-token

### For Local Development:
```
http://localhost:3000/callback
```

### For Production (after Vercel deployment):
```
https://[YOUR-APP-NAME].vercel.app/callback
```

You'll replace `[YOUR-APP-NAME]` with the actual Vercel URL you get after deployment.

---

## Quick Deployment to Vercel (Via Website - No CLI needed)

### 1. Create GitHub Repo (if you don't have one)
```bash
cd /home/dzaddy/Documents/deriv-auth-app
git init
git add .
git commit -m "Initial commit"
gh repo create deriv-auth-app --public --source=. --push
```

OR manually:
- Go to github.com/new
- Create repo named `deriv-auth-app`
- Run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/deriv-auth-app.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2. Deploy to Vercel
1. Visit: https://vercel.com/new
2. Import your GitHub repository
3. Click Deploy
4. **COPY THE URL** you get (e.g., `https://deriv-auth-app-abc123.vercel.app`)

### 3. Add Environment Variables in Vercel
1. Go to your project settings in Vercel
2. Click "Environment Variables"
3. Add these:

| Name | Value |
|------|-------|
| `REACT_APP_DERIV_APP_ID` | `114042` (or create new app and use that ID) |
| `REACT_APP_REDIRECT_URL` | `https://your-vercel-url.vercel.app/callback` |
| `REACT_APP_DERIV_OAUTH_URL` | `https://oauth.deriv.com/oauth2/authorize` |
| `REACT_APP_DERIV_WS_URL` | `wss://ws.derivws.com/websockets/v3` |

4. Click "Redeploy" to apply changes

### 4. Register Your URLs with Deriv
1. Go to: https://app.deriv.com/account/api-token
2. Log in to your Deriv account

**If app 114042 is yours:**
- Find app 114042
- Add redirect URLs:
  - `http://localhost:3000/callback`
  - `https://your-vercel-url.vercel.app/callback`

**If app 114042 is NOT yours (recommended):**
- Click "Register application"
- App Name: "My Auth App"
- Redirect URLs (add both):
  - `http://localhost:3000/callback`
  - `https://your-vercel-url.vercel.app/callback`
- Click Save
- **COPY THE NEW APP ID**
- Update Vercel environment variable `REACT_APP_DERIV_APP_ID` with the new app ID
- Update local `.env` file with the new app ID
- Redeploy in Vercel

---

## Your Production Build is Ready!

The `build/` folder contains your production-ready app. You can:
1. Deploy the `build/` folder directly to any static hosting
2. Use Vercel (recommended - easiest)
3. Use Netlify, GitHub Pages, or any other static host

The build is in: `/home/dzaddy/Documents/deriv-auth-app/build/`
