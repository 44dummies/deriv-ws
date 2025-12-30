
import os
import json
import sys
import argparse
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MANIFEST_PATH = os.path.join(MODEL_DIR, "manifest.json")
ACTIVE_POINTER_PATH = os.path.join(MODEL_DIR, "active_model.json")

def load_json(path):
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return {}

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

def rollback(target_model_filename):
    print(f"# Model Rollback: Reverting to {target_model_filename}")
    
    # 1. Verify Existence
    model_path = os.path.join(MODEL_DIR, target_model_filename)
    if not os.path.exists(model_path):
        print(f"Error: Target model {target_model_filename} not found.")
        sys.exit(1)

    # 2. Update Manifest
    manifest = load_json(MANIFEST_PATH)
    models = manifest.get('models', [])
    updated_target = False
    updated_current = False
    
    for entry in models:
        # Deactivate Current
        if entry.get('state') == 'ACTIVE':
            entry['state'] = 'ROLLED_BACK'
            entry['rolled_back_at'] = datetime.utcnow().isoformat() + "Z"
            print(f"Deactivating: {entry['filename']}")
            updated_current = True
            
        # Activate Target
        if entry['filename'] == target_model_filename:
            entry['state'] = 'ACTIVE'
            entry['promoted_at'] = datetime.utcnow().isoformat() + "Z" # Re-promotion
            entry['rollback_target'] = True
            print(f"Activating: {entry['filename']}")
            updated_target = True
            
            # Helper for active pointer
            target_algo = entry.get('algorithm', 'UNKNOWN')
    
    if not updated_target:
        print("Error: Target model not found in manifest.")
        sys.exit(1)
        
    save_json(MANIFEST_PATH, manifest)

    # 3. Update Active Pointer
    pointer = {
        "active_model": target_model_filename,
        "algorithm": target_algo,
        "promoted_at": datetime.utcnow().isoformat() + "Z",
        "reason": "ROLLBACK"
    }
    save_json(ACTIVE_POINTER_PATH, pointer)
    print(f"✅ Rollback Complete. Active Model is now: {target_model_filename}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 rollback_model.py <target_model_filename>")
        print("Example: python3 rollback_model.py model_v1_3.pkl")
        sys.exit(1)
    
    rollback(sys.argv[1])
