
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from comparative_analytics import fetch_attributed_signals

# Configuration
TARGET_WIN_RATE = 0.56  # We want > 56% WR to be safe (break-even is usually ~53-55% depending on payout)
MIN_SAMPLES_PER_BUCKET = 10
BUCKET_STEP = 0.05

def analyze_buckets(df):
    """
    Analyze win rates in granular confidence buckets.
    """
    # Create bins from 0.0 to 1.0 with step
    bins = np.arange(0.0, 1.05, BUCKET_STEP)
    labels = [f"{round(b, 2)}-{round(b+BUCKET_STEP, 2)}" for b in bins[:-1]]
    
    df['conf_fine'] = pd.cut(df['confidence'].astype(float), bins=bins, labels=labels, include_lowest=True)
    
    # Aggregation
    stats = df.groupby('conf_fine').agg(
        count=('outcome', 'count'),
        wins=('outcome', lambda x: (x == 'WIN').sum())
    )
    
    stats['win_rate'] = stats['wins'] / stats['count']
    stats = stats.fillna(0)
    
    return stats

def find_optimal_threshold(stats):
    """
    Find the lowest threshold where ALL buckets above it meet criteria
    OR simply the specific threshold where checking > THRESHOLD yields aggregate WR > TARGET.
    
    Approach 2 (Cumulative) is safer: "If we set MinConf = X, what is the aggregate WR?"
    """
    candidates = []
    
    # Iterate through possible thresholds (using bin lower bounds)
    possible_thresholds = np.arange(0.50, 0.95, 0.05)
    
    # We need the original DF logic or re-aggregate from stats?
    # Stats is bucketed. Re-aggregating from stats is approximation but okay if buckets are fine.
    # Better to return the raw bin edges.
    
    best_threshold = 0.60 # Default fallback
    
    # Let's do it manually on the stats index
    # Note: stats index is strings "0.5-0.55". Hard to parse back.
    # Let's rely on the buckets being ordered.
    
    # Actually, Cumulative is best calculated on raw DF, but we passed DF to analyze.
    # Let's iterate thresholds on the DF in the main loop instead of this helper.
    pass

def propose_thresholds():
    print("Fetching attributed signals...")
    data = fetch_attributed_signals()
    if not data:
        print("No data found.")
        return

    df = pd.DataFrame(data)
    
    # Filter for Shadow/Active?
    # We normally train thresholds on the BEST model (likely Shadow if it's the challenger).
    # For now, let's analyze ALL valid signals to find market physics, 
    # OR strictly analyzing the Champion model to tune it effectively?
    # Context: "Adaptive Thresholds" usually applies to the ACTIVE strategy.
    # So we should filter for the Active model or the one intended to be tuned.
    # Let's assume we tune "All" for now or the most high volume one.
    
    # Check "regime"
    regimes = df['regime'].unique() if 'regime' in df.columns else ['ALL']
    
    proposal = {
        "version": f"th_proposal_{datetime.now().strftime('%Y%m%d_%H%M')}",
        "created_at": datetime.now().isoformat(),
        "rationale": [],
        "config": {
            "confidence": {},
            # We only tune min_confidence in this v1 script
        }
    }
    
    # Global Analysis (Default Regime)
    print("\n--- Global Analysis ---")
    best_global_th = 0.60
    
    for th in np.arange(0.50, 0.90, 0.05):
        subset = df[df['confidence'].astype(float) >= th]
        if len(subset) < 20:
            continue
        
        wr = (subset['outcome'] == 'WIN').mean()
        print(f"MinConf {th:.2f}: WR {wr*100:.1f}% ({len(subset)} samples)")
        
        if wr >= TARGET_WIN_RATE:
            best_global_th = th
            # We want the lowest threshold that meets the target to maximize separate Opportunity/Risk
            # But usually we pick the first one that crosses.
            # AND we want to ensure stability (higher thresholds don't drop off).
            # Simple greedy: lowest th > target.
            break
            
    proposal['config']['confidence']['min'] = float(round(best_global_th, 2))
    proposal['rationale'].append(f"Global: Set MinConf to {best_global_th:.2f} to achieve > {TARGET_WIN_RATE*100}% WR.")

    # Regime Specific (Future/Advanced)
    # If we had regime support in ThresholdResolver, we'd output specific overrides.
    # "If regime == 'HIGH_VOL', min = 0.70"
    
    # Output
    filename = "threshold_proposal.json"
    with open(filename, "w") as f:
        json.dump(proposal, f, indent=2)
        
    print(f"\nProposal saved to {filename}")
    print(json.dumps(proposal, indent=2))

if __name__ == "__main__":
    propose_thresholds()
