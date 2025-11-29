import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { connect, getActiveSymbols, subscribeTicks, addEventListener, request } from "@/lib/websocket-manager"

export default function TickWatcher() {
  const [symbols, setSymbols] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [lastTick, setLastTick] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let unsubMsg: (() => void) | null = null

    const init = async () => {
      setLoading(true)
      try {
        await connect()
        setConnected(true)

        // try to fetch active symbols via request helper
        const resp: any = await getActiveSymbols("basic")
        if (resp && resp.active_symbols) {
          const syms = resp.active_symbols.map((s: any) => s.symbol).slice(0, 200)
          setSymbols(syms)
        }

        // listen for ticks
        unsubMsg = addEventListener("message", (r: any) => {
          if (r.tick && r.tick.symbol && r.tick.quote) {
            if (r.tick.symbol === selected) {
              setLastTick(Number(r.tick.quote))
            }
          }
        })
      } catch (err) {
        console.error("[TickWatcher] init error:", err)
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (unsubMsg) unsubMsg()
    }
  }, [selected])

  const handleSubscribe = () => {
    if (!selected) return
    subscribeTicks(selected)
    setLastTick(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tick Watcher</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Symbol</label>
            <div className="mt-2">
              <select
                className="w-full p-2 border rounded"
                value={selected ?? ""}
                onChange={(e) => setSelected(e.target.value || null)}
              >
                <option value="">-- select symbol --</option>
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubscribe} disabled={!selected}>
              Subscribe
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Clear
            </Button>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Connection</p>
            <p>{connected ? "Connected" : "Disconnected"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Last Tick</p>
            <p className="text-lg font-medium">{lastTick !== null ? lastTick.toFixed(5) : "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
