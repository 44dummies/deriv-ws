
import os
import json
import sys
from datetime import datetime

STATE_FILE = "../config/global_trading_state.json"

def pause_all():
    print("⏸ PAUSING ALL TRADING SESSIONS ⏸")
    
    confirm = input("Type 'PAUSE' to confirm: ")
    if confirm != "PAUSE":
        print("Aborted.")
        return

    state = {
        "trading_paused": True,
        "reason": "ADMIN_PAUSE",
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
        print(f"✅ GLOBAL PAUSE ACTVIATED. Check {STATE_FILE}")
    except Exception as e:
        print(f"❌ Failed to pause sessions: {e}")
        sys.exit(1)

if __name__ == "__main__":
    pause_all()
