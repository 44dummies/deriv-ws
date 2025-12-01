# Deriv Authentication App

A React application that implements Deriv OAuth authentication and WebSocket integration.

## Features

- OAuth authentication with Deriv API
- WebSocket connection for real-time data
- Display user account information
- Show all wallets and their balances
- Secure token management
- Logout functionality

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your app:
   - App ID: `114042` (already configured in `.env`)
   - The redirect URL is set to `http://localhost:3001/callback`

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser

## Usage

1. Click "Login with Deriv" on the login page
2. Authorize the application on Deriv's OAuth page
3. You'll be redirected back to the callback page
4. After successful authentication, you'll see the dashboard with:
   - Your account information (name, email, account ID, currency)
   - All your wallets with their balances
5. Click "Logout" to disconnect and return to login

## Environment Variables

The app uses the following environment variables (configured in `.env`):

- `REACT_APP_DERIV_APP_ID`: Your Deriv app ID (114042)
- `REACT_APP_REDIRECT_URL`: OAuth redirect URL
- `REACT_APP_DERIV_OAUTH_URL`: Deriv OAuth endpoint
- `REACT_APP_DERIV_WS_URL`: Deriv WebSocket endpoint

## Project Structure

```
src/
├── config.js                    # App configuration
├── services/
│   ├── tokenService.js         # Token management (localStorage)
│   └── websocketService.js     # WebSocket communication
├── pages/
│   ├── Login.js                # Login page
│   ├── Callback.js             # OAuth callback handler
│   └── Dashboard.js            # User dashboard
├── App.js                      # Main app with routing
├── index.js                    # App entry point
└── index.css                   # Global styles
```

## How It Works

1. **Login Flow**: User clicks login → redirected to Deriv OAuth → authorizes → redirected to callback
2. **Callback**: Extracts tokens from URL → stores in localStorage → clears URL → connects WebSocket
3. **Authorization**: Connects to Deriv WebSocket → authorizes with token → fetches user data
4. **Dashboard**: Displays user info → fetches account list → gets balances for each account
5. **Logout**: Disconnects WebSocket → clears localStorage → redirects to login

## Security

- Tokens are stored in localStorage
- Tokens are cleared from URL after extraction
- Protected routes ensure authentication
- WebSocket connection is closed on logout
