
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from scipy.stats import ks_2samp
from comparative_analytics import fetch_attributed_signals

# Governance config
CONFIG_PATH = "../config/governance_metrics.json"

def detect_drift():
    print("Initiating Drift Detection Scan...")
    
    # 1. Load Baselines
    try:
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
            baseline_wr = config['metrics']['win_rate']['baseline']
            # baseline_pnl = config['baselines']['global_avg_pnl'] # If needed
    except FileNotFoundError:
        print("⚠ Governance config missing. Run establish_baselines.py first.")
        return

    # 2. Fetch Recent Data (Last 24h ideally, or just last N samples)
    # Using fetch_attributed_signals which gets last 2000.
    # We will treat the last 200 as "Recent" and the rest as "Reference" for KS test?
    # Or Reference is implicit in the distribution?
    # Better: Split the fetched data into Reference (Oldest 80%) and Current (Newest 20%)
    data = fetch_attributed_signals()
    if not data:
        print("No data.")
        return

    df = pd.DataFrame(data)
    df = df.sort_values('created_at')
    
    if len(df) < 100:
        print("Not enough samples for drift calculation.")
        return

    # Split
    split_idx = int(len(df) * 0.8)
    ref_df = df.iloc[:split_idx]
    curr_df = df.iloc[split_idx:]
    
    print(f"Reference Set: {len(ref_df)} samples")
    print(f"Current Set:   {len(curr_df)} samples")
    
    drift_report = {
        "timestamp": datetime.now().isoformat(),
        "alerts": [],
        "metrics": {}
    }

    # 3. Confidence Drift (Mean Shift)
    ref_conf = ref_df['confidence'].astype(float)
    curr_conf = curr_df['confidence'].astype(float)
    
    conf_mean_diff = curr_conf.mean() - ref_conf.mean()
    drift_report['metrics']['confidence_drift'] = round(conf_mean_diff, 4)
    
    print(f"Confidence Shift: {conf_mean_diff:+.4f}")
    if abs(conf_mean_diff) > 0.1:
        drift_report['alerts'].append(f"Confidence distribution shifted by {conf_mean_diff:.2f}")

    # 4. Win Rate Drift (Performance)
    # Only if outcome is available
    if 'outcome' in df.columns:
        # Check Win Rate of Current vs Baseline
        wins = (curr_df['outcome'] == 'WIN').sum()
        curr_wr = wins / len(curr_df)
        
        wr_drift = curr_wr - (baseline_wr if baseline_wr else 0.5)
        drift_report['metrics']['wr_drift'] = round(wr_drift, 4)
        print(f"Win Rate Shift: {wr_drift*100:+.2f}% (Current: {curr_wr*100:.1f}%)")
        
        warn_dev = config['metrics']['win_rate']['bounds']['warning_deviation']
        crit_dev = config['metrics']['win_rate']['bounds']['critical_deviation']
        
        if wr_drift < -crit_dev:
             drift_report['alerts'].append("CRITICAL: Win Rate Collapse Detected")
        elif wr_drift < -warn_dev:
             drift_report['alerts'].append("WARNING: Win Rate Degradation")

    # 5. Feature Drift (KS Test) - Optional if we have features in metadata
    # ... (Assuming features stored in metadata, complex to parse efficiently here. Skipping for MVP unless requested)
    
    # 6. Regime Drift (Frequency)
    if 'regime' in df.columns:
        ref_counts = ref_df['regime'].value_counts(normalize=True)
        curr_counts = curr_df['regime'].value_counts(normalize=True)
        
        # Check if dominant regime changed
        ref_dom = ref_counts.idxmax() if not ref_counts.empty else "N/A"
        curr_dom = curr_counts.idxmax() if not curr_counts.empty else "N/A"
        
        print(f"Regime Shift: {ref_dom} -> {curr_dom}")
        if ref_dom != curr_dom:
             drift_report['alerts'].append(f"Dominant Regime Changed: {ref_dom} -> {curr_dom}")

    # Output
    with open("drift_report.json", "w") as f:
        json.dump(drift_report, f, indent=2)
        
    if drift_report['alerts']:
        print("❗ DRIFT ALERTS:")
        for a in drift_report['alerts']:
            print(f"  - {a}")
        
        # Log to file
        with open("drift_alerts.log", "a") as f:
            f.write(f"[{datetime.now().isoformat()}] {'; '.join(drift_report['alerts'])}\n")
    else:
        print("✅ System Stable.")

if __name__ == "__main__":
    detect_drift()
