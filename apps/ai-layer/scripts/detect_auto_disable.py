
import os
import json
import pandas as pd
from datetime import datetime

DRIFT_REPORT = "drift_report.json"
DECAY_REPORT = "decay_report.json"
REGIME_REPORT = "regime_report.json"
STATUS_FILE = "../config/ai_status.json"

def detect_auto_disable():
    print("Initiating Auto-Disable Check...")
    
    triggers = []
    
    # 1. Check Drift
    if os.path.exists(DRIFT_REPORT):
        with open(DRIFT_REPORT, "r") as f:
            drift = json.load(f)
            # Check for CRITICAL alerts
            for alert in drift.get('alerts', []):
                if "CRITICAL" in alert:
                    triggers.append(f"Drift: {alert}")
                    
    # 2. Check Decay
    if os.path.exists(DECAY_REPORT):
        with open(DECAY_REPORT, "r") as f:
            decay = json.load(f)
            # Decay is always considered serious if it generated an alert
            for alert in decay.get('alerts', []):
                triggers.append(f"Decay: {alert}")

    # 3. Check Regime
    if os.path.exists(REGIME_REPORT):
        with open(REGIME_REPORT, "r") as f:
            regime = json.load(f)
            # Unknown bucket dominance is critical
            if regime.get('alerts'):
                for alert in regime['alerts']:
                    if "UNKNOWN REGIME" in alert or "VOLATILITY EXPANSION" in alert:
                        triggers.append(f"Regime: {alert}")

    # 4. Action
    if triggers:
        print("⛔ CRITICAL ISSUES DETECTED. TRIGGERING AUTO-DISABLE.")
        for t in triggers:
            print(f"  - {t}")
            
        status = {
            "status": "DISABLED",
            "reason": "; ".join(triggers),
            "timestamp": datetime.now().isoformat(),
            "triggered_by": "detect_auto_disable.py"
        }
        
        # Write Lock
        with open(STATUS_FILE, "w") as f:
            json.dump(status, f, indent=2)
            
        print(f"✅ AI Locked Out. Status updated in {STATUS_FILE}")
        
    else:
        print("✅ System Healthy. AI status unchanged.")

if __name__ == "__main__":
    detect_auto_disable()
