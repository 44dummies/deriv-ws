import * as React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { connect, propose, buy, addEventListener } from "@/lib/websocket-manager"

type ContractType = 'CALL' | 'PUT' | 'DIGIT' | 'DIGITDIFF' | 'ASIAN'

export default function TradePanel() {
  const [connected, setConnected] = useState(false)
  const [symbol, setSymbol] = useState('R_100')
  const [contractType, setContractType] = useState<ContractType>('CALL')
  const [amount, setAmount] = useState<number>(1)
  const [duration, setDuration] = useState<number>(5)
  const [durationUnit, setDurationUnit] = useState<'s'|'m'|'h'>('s')
  const [price, setPrice] = useState<number | ''>('')
  const [proposalId, setProposalId] = useState<string>('')
  const [lastResponse, setLastResponse] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string | null>(null)

  useEffect(() => {
    let unsub: (() => void) | null = null
    const init = async () => {
      try {
        await connect()
        setConnected(true)
        unsub = addEventListener('message', (r: any) => setLastResponse(r))
        // fetch active symbols to modernize UI and avoid demo data
        try {
          const resp: any = await (await import('@/lib/websocket-manager')).getActiveSymbols('basic')
          if (resp && resp.active_symbols) {
            // set first symbol if the default is missing
            const first = resp.active_symbols[0]?.symbol
            if (first) setSymbol(first)
          }
        } catch (e) {
          // ignore symbol fetch errors; keep default symbol
        }
      } catch (err) {
        console.error('[TradePanel] connect error:', err)
      }
    }

    init()

    return () => {
      if (unsub) unsub()
    }
  }, [])

  function validateProposal(): string | null {
    if (!symbol) return 'Symbol is required'
    if (!contractType) return 'Contract type is required'
    if (!amount || amount <= 0) return 'Amount must be > 0'
    if (!duration || duration <= 0) return 'Duration must be > 0'
    return null
  }

  async function handlePropose() {
    setErrors(null)
    const err = validateProposal()
    if (err) {
      setErrors(err)
      return
    }
    setBusy(true)
    try {
      const payload: any = {
        symbol,
        contract_type: contractType,
        amount,
        duration,
        duration_unit: durationUnit,
      }
      const resp = await propose(payload)
      setLastResponse(resp)
      // Try to extract proposal id
      const proposal_id = resp?.proposal?.id || resp?.proposal_id || resp?.echo_req?.proposal_id
      if (proposal_id) setProposalId(proposal_id)
    } catch (e) {
      console.error('[TradePanel] propose error:', e)
      setLastResponse({ error: String(e) })
    } finally {
      setBusy(false)
    }
  }

  async function handleBuy() {
    setErrors(null)
    if (!proposalId) {
      setErrors('proposal_id is required for buy')
      return
    }
    setBusy(true)
    try {
      const payload: any = { proposal_id: proposalId }
      if (price !== '') payload.price = Number(price)
      const resp = await buy(payload)
      setLastResponse(resp)
    } catch (e) {
      console.error('[TradePanel] buy error:', e)
      setLastResponse({ error: String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Connection</p>
            <p>{connected ? 'Connected' : 'Disconnected'}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Symbol</label>
            <input className="w-full p-2 border rounded mt-2" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm text-muted-foreground">Contract Type</label>
              <select className="w-full p-2 border rounded mt-2" value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)}>
                <option value="CALL">CALL</option>
                <option value="PUT">PUT</option>
                <option value="DIGIT">DIGIT</option>
                <option value="DIGITDIFF">DIGITDIFF</option>
                <option value="ASIAN">ASIAN</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Amount</label>
              <input type="number" className="w-full p-2 border rounded mt-2" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Duration</label>
              <input type="number" className="w-full p-2 border rounded mt-2" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground">Duration Unit</label>
              <select className="w-full p-2 border rounded mt-2" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as any)}>
                <option value="s">s</option>
                <option value="m">m</option>
                <option value="h">h</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Price (optional for buy)</label>
              <input type="number" className="w-full p-2 border rounded mt-2" value={price as any} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePropose} disabled={busy}>Send Proposal</Button>
            <Button variant="outline" onClick={handleBuy} disabled={busy}>Buy</Button>
          </div>

          {errors && <div className="text-destructive">{errors}</div>}

          <div>
            <p className="text-sm text-muted-foreground">Last Response</p>
            <pre className="p-2 bg-surface rounded text-xs overflow-auto">{JSON.stringify(lastResponse, null, 2)}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
