// Token storage and management
const STORAGE_KEY = "deriv_tokens"

export interface TokenData {
  token: string
  [key: string]: string
}

export function saveTokens(tokens: TokenData[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  }
}

export function getTokens(): TokenData[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function getFirstToken(): string | null {
  const tokens = getTokens()
  return tokens.length > 0 ? tokens[0].token || tokens[0][Object.keys(tokens[0])[0]] : null
}

export function clearTokens(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function hasTokens(): boolean {
  return getTokens().length > 0
}
