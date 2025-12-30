
import os
import json
import pandas as pd
import numpy as np
from comparative_analytics import fetch_attributed_signals, calculate_metrics

def calculate_drawdown(df):
    """Calculate Max Drawdown from a PnL series."""
    if df.empty: return 0
    pnl = pd.to_numeric(df['realized_pnl'], errors='coerce').fillna(0)
    cum_pnl = pnl.cumsum()
    peak = cum_pnl.cummax()
    drawdown = cum_pnl - peak
    return drawdown.min()

def replay_thresholds():
    print("Loading proposal...")
    try:
        with open("threshold_proposal.json", "r") as f:
            proposal = json.load(f)
    except FileNotFoundError:
        print("No threshold_proposal.json found. Run Day 3 script first.")
        return

    proposed_min_conf = proposal['config']['confidence']['min']
    print(f"Proposed Min Confidence: {proposed_min_conf}")

    print("Fetching history...")
    data = fetch_attributed_signals()
    if not data:
        print("No data.")
        return
    
    df = pd.DataFrame(data)
    df['confidence'] = df['confidence'].astype(float)
    
    # 1. Baseline (Current Reality)
    # Note: History contains signals that MIGHT have been filtered by the OLD threshold if we only logged filtered ones.
    # But ShadowLogger records EVERYTHING (it has no filter? check code... QuantEngine emits everything? 
    # Actually QuantEngine emits 'shadow_signal' only if mode='SHADOW'.
    # Does Shadow Mode enforce threshold? 
    # In QuantEngine.ts: "if (aiSignal.confidence >= minConfidence) emit('ai_signal')" <- Active
    # But for Shadow: "this.executeShadowModels..." -> inside logic -> it emits 'shadow_signal' if response.mode === 'SHADOW'.
    # AI Service usually returns prediction regardless of high/low confidence, filter is in QuantEngine?
    # Actually `aiServiceClient.infer` returns everything.
    # So `shadow_signals` table *should* contain filtering?
    # QuantEngine.ts line 232 checks minConfidence for Active.
    # Shadow execution is parallel. 
    # In `executeShadowModels`, it simply calls infer and emits. It does NOT check minConfidence before emitting.
    # So `shadow_signals` contains RAW predictions (Unfiltered).
    # PERFECT.
    
    # So "Baseline" is actually "What if we used the OLD default (0.6)?"
    BASELINE_CONF = 0.60 
    
    # Simulation Logic
    # Baseline Filter
    df_base = df[df['confidence'] >= BASELINE_CONF]
    metrics_base = calculate_metrics(df_base)
    base_dd = calculate_drawdown(df_base)
    
    # Proposed Filter
    df_sim = df[df['confidence'] >= proposed_min_conf]
    metrics_sim = calculate_metrics(df_sim)
    sim_dd = calculate_drawdown(df_sim)
    
    # Comparison
    print("\n--- Replay Results ---")
    print(f"Metrics\t\tBaseline ({BASELINE_CONF})\tProposed ({proposed_min_conf})")
    print("-" * 60)
    print(f"Count\t\t{metrics_base['count']}\t\t{metrics_sim['count']}")
    print(f"Win Rate\t{metrics_base['win_rate']*100:.1f}%\t\t{metrics_sim['win_rate']*100:.1f}%")
    print(f"Total PnL\t{metrics_base['total_pnl']:.4f}\t\t{metrics_sim['total_pnl']:.4f}")
    print(f"Max DD\t\t{base_dd:.4f}\t\t{sim_dd:.4f}")
    
    # Validation Logic
    passed = True
    reasons = []
    
    # Rule 1: Win Rate must not decrease (or must be > target)
    if metrics_sim['win_rate'] < metrics_base['win_rate'] - 0.01: # allow small noise 1%?
        passed = False
        reasons.append(f"Win Rate degraded (Delta {metrics_sim['win_rate'] - metrics_base['win_rate']:.2f})")
    
    # Rule 2: PnL should not decrease drastically (unless we trade much less for safety)
    # If WR goes up but PnL goes down (due to volume drop), is it better?
    # Safety-focused: Yes, if Total PnL is positive.
    if metrics_sim['total_pnl'] < metrics_base['total_pnl'] * 0.8 and metrics_sim['total_pnl'] > 0:
        # Warning only
        reasons.append("Warning: Total PnL dropped >20% (Volume tradeoff).")
        
    # Rule 3: Tail Risk (Drawdown)
    # If Simulated DD is deeper than Baseline, we introduced risk.
    if sim_dd < base_dd * 1.1: # DD is negative number. e.g. -110 < -100 is worse.
        # Allow 10% drift?
        reasons.append(f"Max Drawdown worsened ({sim_dd:.2f} vs {base_dd:.2f})")
        passed = False

    output = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "proposal_ver": proposal.get("version"),
        "baseline": {
            "threshold": BASELINE_CONF,
            "win_rate": metrics_base['win_rate'],
            "total_pnl": metrics_base['total_pnl'],
            "max_drawdown": base_dd
        },
        "simulated": {
            "threshold": proposed_min_conf,
            "win_rate": metrics_sim['win_rate'],
            "total_pnl": metrics_sim['total_pnl'],
            "max_drawdown": sim_dd
        },
        "passed": passed,
        "reasons": reasons
    }
    
    print("\n--- Validation Outcome ---")
    if passed:
        print("✅ PASSED: Proposal improves/maintains safety profile.")
    else:
        print("❌ FAILED: " + "; ".join(reasons))
        
    with open("replay_validation.json", "w") as f:
        json.dump(output, f, indent=2)

if __name__ == "__main__":
    replay_thresholds()
