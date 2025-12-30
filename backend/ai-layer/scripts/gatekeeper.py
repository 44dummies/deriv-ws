
import sys
import os
import pandas as pd
from comparative_analytics import fetch_attributed_signals, calculate_metrics

# Strict Rules
MIN_SAMPLES = 50
MIN_WR_IMPROVEMENT = 0.005  # +0.5%
MAX_REGIME_REGRESSION = 0.05 # -5% tolerance per regime
MIN_HIGH_CONF_ACCURACY = 0.60

def evaluate_promotion(candidate_id, active_id=None): # active_id optional if we auto-detect
    print(f"Gatekeeper: Evaluating {candidate_id} for promotion...")
    
    data = fetch_attributed_signals()
    if not data:
        return False, "No data available."

    df = pd.DataFrame(data)
    
    # 1. Identify Active Model if not provided
    # Assuming the one with most samples that ISN'T candidate is active? 
    # Or purely by explicit ID.
    if not active_id:
        # Auto-detect: Find model with max samples != candidate
        counts = df['model_id'].value_counts()
        for mid in counts.index:
            if mid != candidate_id:
                active_id = mid
                break
    
    if not active_id:
        return False, "Could not identify Active model for comparison."

    print(f"Comparing against Active Model: {active_id}")

    cand_df = df[df['model_id'] == candidate_id]
    active_df = df[df['model_id'] == active_id]
    
    cand_metrics = calculate_metrics(cand_df)
    active_metrics = calculate_metrics(active_df)
    
    reasons = []
    passed = True
    
    # Rule 1: Minimum Samples
    count = cand_metrics['count']
    if count < MIN_SAMPLES:
        passed = False
        reasons.append(f"Insufficient samples: {count} < {MIN_SAMPLES}")
    else:
        print(f"✓ Samples: {count}")

    # Rule 2: Global Win Rate Improvement
    cand_wr = cand_metrics['win_rate']
    active_wr = active_metrics['win_rate']
    delta = cand_wr - active_wr
    
    if delta < MIN_WR_IMPROVEMENT:
        passed = False
        reasons.append(f"Win Rate not improved enough: {delta*100:+.2f}% < {MIN_WR_IMPROVEMENT*100}%")
    else:
        print(f"✓ Win Rate Delta: {delta*100:+.2f}%")

    # Rule 3: Regime Regression Check
    cand_regimes = cand_metrics.get('regime_wr', {})
    active_regimes = active_metrics.get('regime_wr', {})
    
    for r, awr in active_regimes.items():
        if r in cand_regimes:
            cwr = cand_regimes[r]
            regime_delta = cwr - awr
            if regime_delta < -MAX_REGIME_REGRESSION:
                passed = False
                reasons.append(f"Regime Regression in {r}: {regime_delta*100:+.2f}% (Tol: -{MAX_REGIME_REGRESSION*100}%)")
    
    if passed and not reasons: # If failed only due to other reasons, we might skip this log
        print("✓ Regime Stability Verified")

    # Rule 4: Calibration Stability
    high_conf_wr = cand_metrics['bucket_wr'].get('High', 0)
    if high_conf_wr < MIN_HIGH_CONF_ACCURACY:
        passed = False
        reasons.append(f"Unstable High Confidence Accuracy: {high_conf_wr*100:.1f}% < {MIN_HIGH_CONF_ACCURACY*100}%")
    else:
         print(f"✓ Calibration (High Conf): {high_conf_wr*100:.1f}%")

    return passed, reasons

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python gatekeeper.py <candidate_model_id> [active_model_id]")
        sys.exit(1)
        
    candidate = sys.argv[1]
    active = sys.argv[2] if len(sys.argv) > 2 else None
    
    success, errors = evaluate_promotion(candidate, active)
    
    if success:
        print("\n✅ PROMOTION APPROVED")
        sys.exit(0)
    else:
        print("\n❌ PROMOTION DENIED")
        for e in errors:
            print(f" - {e}")
        sys.exit(1)
