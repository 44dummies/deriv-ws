
import os
import json
import time
from detect_auto_disable import detect_auto_disable

DRIFT_REPORT = "drift_report.json"
STATUS_FILE = "../config/ai_status.json"

def run_fire_drill():
    print("🔥 INITIATING FIRE DRILL: GOVERNANCE SIMULATION 🔥")
    
    # Reset Status
    if os.path.exists(STATUS_FILE):
        os.remove(STATUS_FILE)
        
    print("\n--- SCENARIO 1: MASSIVE DRIFT INJECTION ---")
    fake_drift = {
        "timestamp": "2025-12-29T12:00:00",
        "alerts": ["CRITICAL: Win Rate Collapse Detected (-15%)"],
        "metrics": {"wr_drift": -0.15}
    }
    
    with open(DRIFT_REPORT, "w") as f:
        json.dump(fake_drift, f)
    print(">> Injected Fake Critical Drift Report.")
    
    print(">> Running Auto-Disable Check...")
    detect_auto_disable()
    
    # Verify Result
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, "r") as f:
            status = json.load(f)
        if status.get("status") == "DISABLED":
            print("✅ PASS: System Auto-Disabled correctly.")
        else:
            print(f"❌ FAIL: Status file exists but status is {status.get('status')}")
    else:
        print("❌ FAIL: Status file not created.")

    print("\n--- SCENARIO 2: CLEANUP & RECOVERY ---")
    # Simulate Admin Manual Override (Deleting status file or setting ENABLED)
    # Ideally use a script, but here we just clean up.
    if os.path.exists(STATUS_FILE):
        os.remove(STATUS_FILE)
    print(">> Admin clears status lock.")
    
    # Clean up fake report
    if os.path.exists(DRIFT_REPORT):
        os.remove(DRIFT_REPORT) 
        # Or restore valid one? For now just remove.

    print("\n✅ FIRE DRILL COMPLETE.")

if __name__ == "__main__":
    run_fire_drill()
