
import os
import json
import sys
from datetime import datetime

STATUS_FILE = "../config/ai_status.json"

def emergency_stop():
    print("🚨 INITIATING EMERGENCY STOP SEQUENCE 🚨")
    print("This will DISABLE all AI Signal Processing immediately.")
    
    confirm = input("Type 'STOP' to confirm: ")
    if confirm != "STOP":
        print("Aborted.")
        return

    status = {
        "status": "DISABLED",
        "reason": "ADMIN_KILL_SWITCH_ACTIVATED",
        "timestamp": datetime.now().isoformat(),
        "actor": "ADMIN", 
        "mode": "RULE_ONLY_ENFORCED"
    }
    
    # Atomic write attempt (write temp then rename) not strictly necessary for JSON but good practice
    # For MVP direct write is fine.
    try:
        with open(STATUS_FILE, "w") as f:
            json.dump(status, f, indent=2)
        print(f"✅ SYSTEM LOCKED. AI is now DISABLED. Check {STATUS_FILE}")
    except Exception as e:
        print(f"❌ FAILED TO EXECUTE KILL SWITCH: {e}")
        sys.exit(1)

if __name__ == "__main__":
    emergency_stop()
