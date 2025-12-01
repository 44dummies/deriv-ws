# Deriv App Setup Instructions

## Important: You need to register your redirect URL first!

### Step 1: Register Your App on Deriv

1. Go to: https://app.deriv.com/account/api-token
2. Log in to your Deriv account
3. Scroll down to "API Token" section
4. Click on "Manage" or create a new app
5. **App ID**: Use `114042` (your existing app ID)
6. **Redirect URL**: Enter `http://localhost:3000/callback`
7. Save the settings

### Step 2: Verify Your App ID

Make sure your app ID `114042` has the redirect URL registered. If you don't have access to this app ID or it's not yours, you'll need to:

1. Create a new app at: https://app.deriv.com/account/api-token
2. Give it a name (e.g., "My Auth App")
3. Set redirect URL to: `http://localhost:3000/callback`
4. Copy the new App ID
5. Update the `.env` file with your new App ID

### Step 3: Update .env File (if needed)

If you created a new app, edit `.env` file and change:
```
REACT_APP_DERIV_APP_ID=YOUR_NEW_APP_ID
```

### Step 4: Restart the App

After updating the app settings on Deriv:
```bash
cd ~/Documents/deriv-auth-app
npm start
```

### Common Issues:

- **"Missing valid app_id"**: Your app_id is not registered or invalid
- **"Invalid redirect_uri"**: The redirect URL doesn't match what's registered
- **Solution**: Make sure BOTH the app_id and redirect_url are correctly registered on Deriv's portal

### Alternative: Use Deriv API Token Instead

If you want to skip OAuth and use API tokens directly:
1. Go to: https://app.deriv.com/account/api-token
2. Generate a new API token
3. Use that token directly in the app (let me know if you want this approach)
