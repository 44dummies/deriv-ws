"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getTokens, getFirstToken, clearTokens } from "@/lib/token-manager"
import {
  connect,
  disconnect,
  send,
  addEventListener,
  isConnected,
  type WebSocketResponse,
} from "@/lib/websocket-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import TickWatcher from "@/components/ui/tick-watcher"
import TradePanel from "@/components/ui/trade-panel"
import { AlertCircle, Loader2, LogOut } from "lucide-react"

interface UserProfile {
  loginid: string
  email: string
  fullname: string
  accounts: Array<{
    loginid: string
    currency: string
    account_type: string
    status: string
    balance?: number
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<{ [loginId: string]: number }>({})

  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Check if tokens exist
        const tokens = getTokens()
        if (tokens.length === 0) {
          router.push("/login")
          return
        }

        // Connect to WebSocket
        await connect()

        // Get first token and authorize
        const firstToken = getFirstToken()
        if (!firstToken) {
          setError("No valid token found")
          setLoading(false)
          return
        }

        // Send authorize request
        send({ authorize: firstToken })

        // Set up message listener
        const unsubscribe = addEventListener("message", handleWebSocketMessage)

        // Cleanup function
        return () => {
          unsubscribe()
        }
      } catch (err) {
        console.error("[Dashboard] Initialization error:", err)
        setError("Failed to connect to WebSocket")
        setLoading(false)
      }
    }

    initializeConnection()

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount, keep connection alive
    }
  }, [router])

  const handleWebSocketMessage = (response: WebSocketResponse) => {
    console.log("[Dashboard] Received:", response)

    // Handle authorization response
    if (response.authorize) {
      const { loginid, email, fullname, account_list } = response.authorize

      const accounts = account_list.map((account) => ({
        loginid: account.loginid,
        currency: account.currency,
        account_type: account.account_type,
        status: account.status,
        balance: undefined,
      }))

      setProfile({
        loginid,
        email,
        fullname,
        accounts,
      })

      // Request balance for each account
      accounts.forEach((account) => {
        send({ balance: 1, account: account.loginid })
      })

      setLoading(false)
    }

    // Handle authorization error
    if (response.error && !response.balance) {
      setError(`Authorization failed: ${response.error.message}`)
      clearTokens()
      setTimeout(() => router.push("/login"), 2000)
      setLoading(false)
    }

    // Handle balance response
    if (response.balance) {
      const { balance, loginid } = response.balance
      setBalances((prev) => ({
        ...prev,
        [loginid]: balance,
      }))

      // Update profile with balance
      setProfile((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          accounts: prev.accounts.map((acc) => (acc.loginid === loginid ? { ...acc, balance } : acc)),
        }
      })
    }

    // Handle balance error
    if (response.error && response.balance !== undefined) {
      console.error("[Dashboard] Balance error:", response.error)
    }
  }

  const handleLogout = () => {
    disconnect()
    clearTokens()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your account information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
            <Button onClick={() => router.push("/login")} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No profile data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Manage your Deriv accounts</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{profile.fullname}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Login ID</p>
                <p className="font-medium">{profile.loginid}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WebSocket Status</p>
                <p className="font-medium">
                  {isConnected() ? (
                    <span className="text-green-600">Connected</span>
                  ) : (
                    <span className="text-yellow-600">Connecting...</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts and Wallets */}
        <div>
          <h2 className="text-xl font-bold mb-4">Your Accounts</h2>
          <div className="space-y-4">
            {profile.accounts.map((account) => (
              <Card key={account.loginid}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{account.loginid}</CardTitle>
                      <CardDescription>
                        Type: {account.account_type} • Status: {account.status}
                      </CardDescription>
                    </div>
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                      {account.currency}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="text-lg font-bold">
                        {account.balance !== undefined
                          ? `${account.balance.toFixed(2)} ${account.currency}`
                          : "Loading..."}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tick watcher */}
        <div>
          <h2 className="text-xl font-bold mb-4">Market Ticks</h2>
          <TickWatcher />
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Trade</h2>
          <TradePanel />
        </div>
      </div>
    </div>
  )
}
