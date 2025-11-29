"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const handleLoginClick = () => {
    // Construct OAuth URL - user will add app_id and redirect_uri after
    // For now, we'll use the provided app_id (114042)
    const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID ?? "114042"
    const redirectUri = `${typeof window !== "undefined" ? window.location.origin : ""}/callback`
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}`

    if (!process.env.NEXT_PUBLIC_DERIV_APP_ID && typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('NEXT_PUBLIC_DERIV_APP_ID not set; using fallback app_id=114042. Set NEXT_PUBLIC_DERIV_APP_ID in .env.local')
    }

    window.location.href = oauthUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Deriv Login</CardTitle>
          <CardDescription>Authenticate with your Deriv account to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLoginClick} size="lg" className="w-full">
            Login with Deriv
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
