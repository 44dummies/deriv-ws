
import os
import requests
import pandas as pd
from datetime import datetime, timedelta

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    print("Env variables missing. skipping.")
    exit(0)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def fetch_pending_signals():
    # Signals without outcome
    url = f"{SUPABASE_URL}/rest/v1/shadow_signals?select=*&outcome=is.null&limit=100"
    resp = requests.get(url, headers=HEADERS)
    return resp.json()

def fetch_price(market, timestamp_str):
    # Find price at timestamp + 60s (approx)
    # Convert ISO
    ts = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    target_time = ts + timedelta(seconds=60)
    
    # Range query: target +/- 2 seconds
    start = (target_time - timedelta(seconds=2)).isoformat()
    end = (target_time + timedelta(seconds=2)).isoformat()
    
    url = f"{SUPABASE_URL}/rest/v1/price_history?select=price&market=eq.{market}&timestamp=gte.{start}&timestamp=lte.{end}&limit=1"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    if data:
        return data[0]['price']
    return None

def update_signal(id, outcome, exit_price, pnl):
    url = f"{SUPABASE_URL}/rest/v1/shadow_signals?id=eq.{id}"
    payload = {
        "outcome": outcome,
        "exit_price": exit_price,
        "realized_pnl": pnl
    }
    requests.patch(url, headers=HEADERS, json=payload)

def process_attribution():
    signals = fetch_pending_signals()
    print(f"Processing {len(signals)} pending signals...")
    
    for sig in signals:
        if not sig.get('entry_price'):
            print(f"Skipping {sig['id']}: No entry price")
            continue
            
        entry = float(sig['entry_price'])
        market = sig['market']
        
        exit_price = fetch_price(market, sig['created_at'])
        
        if exit_price:
            bias = sig['signal_bias']
            pnl = 0
            outcome = "DRAW"
            
            if bias == 'CALL':
                pnl = exit_price - entry
            elif bias == 'PUT':
                pnl = entry - exit_price
                
            if pnl > 0:
                outcome = "WIN"
            elif pnl < 0:
                outcome = "LOSS"
                
            print(f"Signal {sig['id']} ({bias}): Entry {entry} -> Exit {exit_price} = {outcome}")
            update_signal(sig['id'], outcome, exit_price, pnl)
        else:
            # Too early?
            pass

if __name__ == "__main__":
    process_attribution()
