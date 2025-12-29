
import os
import json
import sys
from datetime import datetime

CONFIG_FILE = "../config/model_config.json"

def revert_model():
    print("Initiating Model Reversion Sequence...")
    
    if not os.path.exists(CONFIG_FILE):
        print(f"Config file not found: {CONFIG_FILE}")
        return

    try:
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
            
        current = config.get("active_model")
        previous = config.get("previous_model")
        
        if not previous:
            print("No previous model version recorded. Cannot revert.")
            return
            
        print(f"Current Model:  {current}")
        print(f"Reverting to:   {previous}")
        
        confirm = input("Type 'REVERT' to confirm: ")
        if confirm != "REVERT":
            print("Aborted.")
            return
            
        # Swap
        config["active_model"] = previous
        config["previous_model"] = current # Store "bad" model as previous in case we need to re-roll fwd? 
                                          # Or keep it as history? Let's just swap for toggle effect.
        config["last_updated"] = datetime.now().isoformat()
        config["revert_reason"] = "Manual Admin Action"
        
        with open(CONFIG_FILE, "w") as f:
            json.dump(config, f, indent=2)
            
        print(f"✅ Model Reverted to {previous}. Service restart may be required depending on deployment.")
        
    except Exception as e:
        print(f"❌ Failed to revert model: {e}")
        sys.exit(1)

if __name__ == "__main__":
    revert_model()
