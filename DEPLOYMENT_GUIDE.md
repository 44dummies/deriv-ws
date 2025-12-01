# Deploy to Vercel - Step by Step Instructions

## IMPORTANT: Register These Redirect URLs

You need to register your app at: https://app.deriv.com/account/api-token

### For Local Development:
```
http://localhost:3000/callback
```

### For Production (Vercel):
After deploying, you'll get a URL like `https://your-app-name.vercel.app`
Register this redirect URL:
```
https://your-app-name.vercel.app/callback
```

---

## Option 1: Deploy via Vercel Website (Recommended)

### Step 1: Create a GitHub Repository
1. Go to https://github.com/new
2. Name it: `deriv-auth-app`
3. Click "Create repository"

### Step 2: Push Your Code
```bash
cd /home/dzaddy/Documents/deriv-auth-app
git remote add origin https://github.com/YOUR_USERNAME/deriv-auth-app.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Import Project"
4. Select your `deriv-auth-app` repository
5. Click "Deploy"
6. **IMPORTANT**: After deployment, go to Settings → Environment Variables
7. Add these variables:
   - `REACT_APP_DERIV_APP_ID` = `114042` (or your new app ID)
   - `REACT_APP_REDIRECT_URL` = `https://your-app-name.vercel.app/callback`
   - `REACT_APP_DERIV_OAUTH_URL` = `https://oauth.deriv.com/oauth2/authorize`
   - `REACT_APP_DERIV_WS_URL` = `wss://ws.derivws.com/websockets/v3`
8. Redeploy the app

### Step 4: Register the Production URL
1. Copy your Vercel URL (e.g., `https://deriv-auth-app-abc123.vercel.app`)
2. Go to https://app.deriv.com/account/api-token
3. If using app ID `114042`:
   - You need access to this app ID
   - Add redirect URL: `https://your-vercel-url.vercel.app/callback`
4. If `114042` is not yours:
   - Click "Register application"
   - Name: "My Deriv Auth App"
   - Redirect URL: `https://your-vercel-url.vercel.app/callback`
   - Also add: `http://localhost:3000/callback` (for local dev)
   - Copy the new App ID
   - Update the environment variable `REACT_APP_DERIV_APP_ID` in Vercel with your new App ID

---

## Option 2: Deploy via Vercel CLI (Alternative)

If you have good network connection, try:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd /home/dzaddy/Documents/deriv-auth-app
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? deriv-auth-app
# - Directory? ./
# - Override settings? No

# After deployment, add environment variables
vercel env add REACT_APP_DERIV_APP_ID production
# Enter: 114042 (or your app ID)

vercel env add REACT_APP_REDIRECT_URL production
# Enter: https://your-app-name.vercel.app/callback

vercel env add REACT_APP_DERIV_OAUTH_URL production
# Enter: https://oauth.deriv.com/oauth2/authorize

vercel env add REACT_APP_DERIV_WS_URL production
# Enter: wss://ws.derivws.com/websockets/v3

# Redeploy with environment variables
vercel --prod
```

---

## Current Issue: App ID 114042

The error "missing a valid app_id" means:
1. App ID `114042` doesn't belong to you, OR
2. The redirect URL is not registered for this app ID

### Solution:
Go to https://app.deriv.com/account/api-token and either:
- **Option A**: If you have access to app `114042`, add the redirect URLs
- **Option B**: Create a NEW app and update the app ID in your `.env` file

---

## After Deployment Checklist

1. ✓ App deployed to Vercel
2. ✓ Environment variables added in Vercel
3. ✓ Get your Vercel URL (e.g., `https://deriv-auth-app-xyz.vercel.app`)
4. ✓ Register redirect URL at Deriv: `https://your-url.vercel.app/callback`
5. ✓ Test the login flow

---

## Need Help?

If app ID `114042` is not yours, create a new one at:
https://app.deriv.com/account/api-token

Then update your `.env` with the new app ID.
