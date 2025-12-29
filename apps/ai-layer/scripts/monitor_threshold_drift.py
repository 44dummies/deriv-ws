
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from comparative_analytics import fetch_attributed_signals, calculate_metrics

def monitor_drift():
    print("Initiating Drift Monitor...")
    
    # 1. Load Expectation (Validation Report)
    try:
        with open("replay_validation.json", "r") as f:
            validation = json.load(f)
            expected_wr = validation['simulated']['win_rate']
            active_threshold = validation['simulated']['threshold']
    except FileNotFoundError:
        print("⚠ No validation report found. Cannot check against expectations.")
        return

    print(f"Active Threshold (Expected): {active_threshold}")
    print(f"Expected Win Rate: {expected_wr*100:.1f}%")

    # 2. Fetch Recent Data (Live/Shadow)
    # Ideally filter for recent timestamps, but fetch_attributed_signals fetches limit=2000.
    # We assume this is "recent enough" for this MVP.
    data = fetch_attributed_signals()
    if not data:
        print("No recent data.")
        return

    df = pd.DataFrame(data)
    
    # Filter by Active Threshold to see how it's actually performing
    df['confidence'] = df['confidence'].astype(float)
    df_active = df[df['confidence'] >= active_threshold]
    
    if len(df_active) < 10:
        print("Not enough samples to detect drift.")
        return

    metrics = calculate_metrics(df_active)
    actual_wr = metrics['win_rate']
    
    print(f"Actual Win Rate (Recent): {actual_wr*100:.1f}%")
    
    # 3. Drift Logic
    drift = expected_wr - actual_wr
    print(f"Drift: {drift*100:+.2f}%")
    
    alerts = []
    
    # Alert if WR drops more than 5% absolute
    if drift > 0.05:
        msg = f"⚠ CRITICAL: Win Rate Drift Detected! Expected {expected_wr*100:.1f}%, Got {actual_wr*100:.1f}%"
        alerts.append(msg)
        print(msg)
    elif drift > 0.02:
        msg = f"⚠ WARNING: Minor negative drift. Monitor closely."
        alerts.append(msg)
        print(msg)
    else:
        print("✅ Performance within expected bounds.")

    # 4. Regime Check (Optional - if we had regime target)
    # For now just log current regime dominance
    if 'regime' in df.columns:
        top_regime = df['regime'].mode()[0]
        print(f"Dominant Regime: {top_regime}")
        
    # 5. Output Log
    if alerts:
        with open("drift_alerts.log", "a") as f:
            f.write(f"[{datetime.now().isoformat()}] {'; '.join(alerts)}\n")
        print("Alerts logged to drift_alerts.log")

if __name__ == "__main__":
    monitor_drift()
