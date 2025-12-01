"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { saveTokens } from "@/lib/token-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState("Processing OAuth callback...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // If an authorization `code` is present in the query, exchange it server-side
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          setStatus('Exchanging authorization code...')
          try {
            const resp = await fetch('/api/auth/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            })

            if (!resp.ok) {
              const detail = await resp.json().catch(() => ({}))
              setError(`Token exchange failed: ${(detail && detail.error) || resp.status}`)
              return
            }

            // Exchange succeeded; server has set an HttpOnly cookie.
            // Clean URL and redirect to dashboard.
            window.history.replaceState({}, document.title, window.location.pathname)
            setStatus('Authentication complete. Redirecting...')
            setTimeout(() => router.push('/dashboard'), 500)
            return
          } catch (e) {
            console.error('[Callback] Exchange error:', e)
            setError('Failed to exchange authorization code')
            return
          }
        }

        // Fall back: support implicit/fragment tokens (access_token in hash)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const tokens: Array<{ [key: string]: string }> = []

        hashParams.forEach((value, key) => {
          const lower = key.toLowerCase()
          if (lower === 'access_token' || lower === 'token' || lower === 'authorize') {
            tokens.push({ token: value })
          } else {
            tokens.push({ [key]: value })
          }
        })

        if (tokens.length === 0) {
          setError('No valid tokens or code found in callback URL')
          return
        }

        // Persist to localStorage (legacy / implicit flow)
        saveTokens(tokens as any)
        window.history.replaceState({}, document.title, window.location.pathname)
        setStatus('Tokens received successfully. Redirecting to dashboard...')
        setTimeout(() => router.push('/dashboard'), 500)
      } catch (err) {
        console.error('[Callback] Error:', err)
        setError('Failed to process callback')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>OAuth Callback</CardTitle>
          <CardDescription>{error ? "Error" : "Processing"}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error ? (
            <div className="text-destructive">
              <p className="font-medium mb-4">{error}</p>
              <a href="/login" className="text-primary hover:underline">
                Return to login
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground">{status}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
