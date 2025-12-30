
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from comparative_analytics import fetch_attributed_signals

# Mock function to get market metadata since we don't have a direct "MarketData" DB table easy to query yet.
# We will Infer regime from the signals' input features if possible, or just use the labeled 'regime'.
# Better: Calculate Volatility from price history in `price_history` table?
# `fetch_attributed_signals` gets `shadow_signals`. We also need `price_history` for true Volatility check.
# But let's use the 'volatility' feature stored in `metadata->technicals` of the signal if available.

def fetch_signals_with_technicals():
    # We need to parse the JSONB metadata
    # The `fetch_attributed_signals` returns raw rows.
    data = fetch_attributed_signals()
    return data

def detect_regime_shift():
    print("Initiating Regime Shift Scan...")
    
    data = fetch_signals_with_technicals()
    if not data:
        print("No data.")
        return

    df = pd.DataFrame(data)
    df['created_at'] = pd.to_datetime(df['created_at'])
    df = df.sort_values('created_at')
    
    # Extract volatility from metadata if possible
    # metadata is a dict or json string? In pandas it might be auto-parsed or string.
    # We'll assume it needs parsing if string.
    
    volatilities = []
    regimes = []
    
    for _, row in df.iterrows():
        meta = row.get('metadata')
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except:
                meta = {}
        
        # features might be in 'technicals' or root of meta
        tech = meta.get('technicals', {})
        vol = tech.get('volatility', 0)
        volatilities.append(vol)
        
        # Regime often logged in separate column 'regime'
        regimes.append(row.get('regime', 'UNKNOWN'))
        
    df['volatility'] = volatilities
    df['regime_label'] = regimes
    
    # 1. Volatility Expansion Monitor
    # Look at last 100 samples vs previous 500
    if len(df) < 200:
        print("Not enough data for regime analysis.")
        return
        
    split_idx = int(len(df) * 0.8)
    ref_vol = df['volatility'].iloc[:split_idx].mean()
    curr_vol = df['volatility'].iloc[split_idx:].mean()
    
    print(f"Reference Volatility: {ref_vol:.5f}")
    print(f"Current Volatility:   {curr_vol:.5f}")
    
    ratio = curr_vol / ref_vol if ref_vol > 0 else 1.0
    
    alerts = []
    
    if ratio > 2.0:
        msg = f"⚠ VOLATILITY EXPANSION: Current Vol is {ratio:.1f}x of Reference. Possible Regime Shock."
        alerts.append(msg)
    elif ratio < 0.5:
        msg = f"ℹ Volatility Compression: Market is quieting down ({ratio:.1f}x)."
        print(msg)
        
    # 2. Regime Instability (Flickering)
    # Count how many times regime changed in the last N samples
    recent_regimes = df['regime_label'].iloc[split_idx:]
    changes = (recent_regimes != recent_regimes.shift()).sum()
    
    flicker_rate = changes / len(recent_regimes)
    print(f"Regime Flicker Rate: {flicker_rate*100:.1f}%")
    
    if flicker_rate > 0.3: # Changing every 3rd tick/signal?
        msg = f"⚠ UNSTABLE REGIME: High flicker rate ({flicker_rate*100:.1f}%). Market undecided."
        alerts.append(msg)

    # 3. UNKNOWN Regime detection
    # If explicit 'UNKNOWN' label is dominant
    unknown_count = (recent_regimes == 'UNKNOWN').sum()
    if unknown_count / len(recent_regimes) > 0.5:
        msg = "⚠ UNKNOWN REGIME DOMINANCE: Model cannot classify current market."
        alerts.append(msg)

    # Output
    report = {
        "timestamp": datetime.now().isoformat(),
        "volatility_ratio": ratio,
        "flicker_rate": flicker_rate,
        "alerts": alerts
    }
    
    with open("regime_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    if alerts:
        print("❗ REGIME ALERTS:")
        for a in alerts:
            print(f"  - {a}")
        with open("drift_alerts.log", "a") as f:
            f.write(f"[{datetime.now().isoformat()}] {'; '.join(alerts)}\n")
    else:
        print("✅ Regime Stable.")

if __name__ == "__main__":
    detect_regime_shift()
