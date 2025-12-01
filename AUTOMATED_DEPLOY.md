# 🚀 Automated Deployment Guide

Everything is now automated! Here's what to do:

## First Time Setup

### 1. Set up GitHub Repository
```bash
./setup-github.sh
```
Then:
- Go to https://github.com/new
- Create repository: `deriv-auth-app`
- Run: `git push -u origin main`

## Deploy Updates (Every time you make changes)

### Option 1: Just run the deploy script
```bash
./deploy.sh
```

This will:
- ✅ Build production version
- ✅ Commit all changes
- ✅ Push to GitHub
- ✅ Show next steps

### Option 2: Manual deployment
```bash
npm run build
git add .
git commit -m "Your message"
git push
```

## Vercel Auto-Deployment

Once you connect Vercel to your GitHub repo:
1. Every push will auto-deploy
2. You just need to run `./deploy.sh`
3. Vercel handles the rest!

## Environment Variables (Set once in Vercel)

Go to your Vercel project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `REACT_APP_DERIV_APP_ID` | `114042` (or your app ID) |
| `REACT_APP_REDIRECT_URL` | `https://deriv-ws.vercel.app/callback` |
| `REACT_APP_DERIV_OAUTH_URL` | `https://oauth.deriv.com/oauth2/authorize` |
| `REACT_APP_DERIV_WS_URL` | `wss://ws.derivws.com/websockets/v3` |

## Deriv OAuth Setup (One time)

Register these URLs at https://app.deriv.com/account/api-token:
- `http://localhost:3000/callback` (for local testing)
- `https://deriv-ws.vercel.app/callback` (production)

## Your Workflow Now:

1. Make code changes
2. Run `./deploy.sh`
3. Done! ✨

Vercel will automatically build and deploy when you push to GitHub.

## Quick Commands

```bash
# Deploy everything
./deploy.sh

# Start local dev server
npm start

# Build locally
npm run build

# Check what will be deployed
git status
```

## Troubleshooting

**"No GitHub remote"**
→ Run `./setup-github.sh` first

**"Failed to push"**
→ Make sure you created the repo on GitHub and ran:
```bash
git push -u origin main
```

**App not working after deploy**
→ Check environment variables are set in Vercel
→ Make sure callback URLs are registered with Deriv
