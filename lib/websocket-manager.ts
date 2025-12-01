// Singleton WebSocket manager for Deriv API
let wsInstance: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
let isIntentionallyClosed = false

// Prefer an environment-provided app id for deployments. Uses NEXT_PUBLIC_ prefix
// so the value is available on the client when Next.js bundles the app.
// Read from build-time env injected by Next.js. This should be available
// in client bundles as `process.env.NEXT_PUBLIC_DERIV_APP_ID`.
const APP_ID: string = (process.env.NEXT_PUBLIC_DERIV_APP_ID as string) ?? "114042"
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`

if (!process.env.NEXT_PUBLIC_DERIV_APP_ID) {
  // Helpful runtime hint — only log in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[WebSocket] NEXT_PUBLIC_DERIV_APP_ID not set; using fallback APP_ID=114042. Set NEXT_PUBLIC_DERIV_APP_ID in .env.local')
  }
}

export interface WebSocketMessage {
  authorize?: string
  balance?: number
  account?: string
  ping?: number
  [key: string]: any
}

export interface WebSocketResponse {
  authorize?: {
    loginid: string
    email: string
    fullname: string
    account_list: Array<{
      loginid: string
      currency: string
      is_virtual: number
      account_type: string
      status: string
    }>
  }
  balance?: {
    balance: number
    currency: string
    loginid: string
  }
  error?: {
    code: string
    message: string
  }
  pong?: number
  [key: string]: any
}

type MessageHandler = (response: WebSocketResponse) => void
type ErrorHandler = (error: Event) => void
type CloseHandler = () => void

const listeners: {
  message: MessageHandler[]
  error: ErrorHandler[]
  close: CloseHandler[]
} = {
  message: [],
  error: [],
  close: [],
}

// Pending request map for request/response style RPC over the websocket
const pendingRequests: Map<
  string,
  {
    resolve: (value: any) => void
    reject: (reason?: any) => void
    timer: ReturnType<typeof setTimeout>
  }
> = new Map()

function setupPing() {
  // Clear existing ping interval
  if (pingInterval) clearInterval(pingInterval)

  // Send ping every 30 seconds
  pingInterval = setInterval(() => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({ ping: 1 }))
    }
  }, 30000)
}

function setupReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout)

  if (isIntentionallyClosed) return

  reconnectTimeout = setTimeout(() => {
    console.log("[WebSocket] Attempting to reconnect...")
    connect()
  }, 5000)
}

export function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      resolve()
      return
    }

    try {
      wsInstance = new WebSocket(WS_URL)

      wsInstance.onopen = () => {
        console.log("[WebSocket] Connected")
        setupPing()
        resolve()
      }

      wsInstance.onmessage = (event) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data)
          // Resolve pending request if response echoes our req_id
          try {
            const echoReq = (response as any).echo_req
            const reqId = (response as any).req_id || (echoReq && echoReq.req_id)
            if (reqId && pendingRequests.has(reqId)) {
              const p = pendingRequests.get(reqId)!
              clearTimeout(p.timer)
              pendingRequests.delete(reqId)
              p.resolve(response)
            }
          } catch (e) {
            // ignore
          }

          listeners.message.forEach((handler) => handler(response))
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error)
        }
      }

      wsInstance.onerror = (error) => {
        console.error("[WebSocket] Error:", error)
        listeners.error.forEach((handler) => handler(error))
        reject(error)
      }

      wsInstance.onclose = () => {
        console.log("[WebSocket] Disconnected")
        if (pingInterval) clearInterval(pingInterval)
        listeners.close.forEach((handler) => handler())

        if (!isIntentionallyClosed) {
          setupReconnect()
        }
      }
    } catch (error) {
      console.error("[WebSocket] Connection error:", error)
      reject(error)
    }
  })
}

export function send(message: WebSocketMessage): void {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify(message))
  } else {
    console.error("[WebSocket] Connection not ready")
  }
}

// Send a request and return a promise that resolves when a matching response arrives
export function request(message: WebSocketMessage, timeout = 8000): Promise<WebSocketResponse> {
  return new Promise((resolve, reject) => {
    const req_id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const payload = { ...message, req_id }

    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected"))
      return
    }

    const timer = setTimeout(() => {
      pendingRequests.delete(req_id)
      reject(new Error("Request timed out"))
    }, timeout)

    pendingRequests.set(req_id, { resolve, reject, timer })
    wsInstance.send(JSON.stringify(payload))
  })
}

// Helpers for common Deriv API calls
export async function getActiveSymbols(product_type = "basic"): Promise<any> {
  return request({ active_symbols: "brief", product_type })
}

export function subscribeTicks(symbol: string): () => void {
  // Subscribe via send (server will stream ticks). Consumers should use addEventListener to receive them.
  send({ ticks: symbol, subscribe: 1 })

  // Return unsubscribe function
  return () => {
    send({ unsubscribe: "ticks", ticks: symbol })
  }
}

// Proposal helper: callers provide the proposal payload fields.
// Example usage: propose({ symbol: 'R_100', contract_type: 'CALL', amount: 1, duration: 5, duration_unit: 's' })
export function propose(payload: Record<string, any>, timeout = 8000): Promise<WebSocketResponse> {
  return request({ proposal: 1, ...payload }, timeout)
}

// Buy helper: provide buy payload fields. Often you pass a proposal_id or include the proposal in the request.
// Example: buy({ proposal_id: '<id>', price: 1 }) or buy({ contract_type: 'CALL', amount: 1, symbol: 'R_100' })
export function buy(payload: Record<string, any>, timeout = 8000): Promise<WebSocketResponse> {
  return request({ buy: 1, ...payload }, timeout)
}

export function authorize(token: string): void {
  send({ authorize: token })
}

export function getBalance(loginId: string): void {
  send({ balance: 1, account: loginId })
}

export function disconnect(): void {
  isIntentionallyClosed = true
  if (reconnectTimeout) clearTimeout(reconnectTimeout)
  if (pingInterval) clearInterval(pingInterval)
  if (wsInstance) {
    wsInstance.close()
    wsInstance = null
  }
}

export function addEventListener(
  type: "message" | "error" | "close",
  handler: MessageHandler | ErrorHandler | CloseHandler,
): () => void {
  listeners[type].push(handler as any)

  // Return unsubscribe function
  return () => {
    listeners[type] = (listeners[type] as Array<any>).filter((h) => h !== handler) as any
  }
}

export function isConnected(): boolean {
  return wsInstance !== null && wsInstance.readyState === WebSocket.OPEN
}

export function getConnection(): WebSocket | null {
  return wsInstance
}
