
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

def promote(model_filename):
    print(f"# Model Promotion Gate: {model_filename}")
    
    # 1. Verify Existence
    model_path = os.path.join(MODEL_DIR, model_filename)
    if not os.path.exists(model_path):
        print(f"Error: Model file {model_filename} not found.")
        sys.exit(1)
        
    # 2. Check Validation Status
    meta_path = model_path.replace('.pkl', '.json')
    if not os.path.exists(meta_path):
        print("Error: Model metadata not found. Cannot verify validation status.")
        sys.exit(1)
    
    meta = load_json(meta_path)
    status = meta.get('validation_status', 'UNKNOWN')
    print(f"Validation Status: {status}")
    
    if status != 'PASSED':
        print("⛔ BLOCKING PROMOTION: Model has not passed Replay Validation.")
        sys.exit(1)

    # 3. Update Manifest
    manifest = load_json(MANIFEST_PATH)
    models = manifest.get('models', [])
    updated = False
    
    for entry in models:
        if entry['filename'] == model_filename:
            entry['state'] = 'ACTIVE'
            entry['promoted_at'] = datetime.utcnow().isoformat() + "Z"
            updated = True
        elif entry.get('state') == 'ACTIVE':
             entry['state'] = 'ARCHIVED'
             entry['archived_at'] = datetime.utcnow().isoformat() + "Z"
    
    if not updated:
        print("Error: Model not found in registry (manifest). Run manage_models.py first?")
        sys.exit(1)
        
    save_json(MANIFEST_PATH, manifest)
    print("✅ Manifest updated: Set to ACTIVE.")

    # 4. Update Active Pointer
    pointer = {
        "active_model": model_filename,
        "algorithm": meta.get('algorithm', 'UNKNOWN'),
        "promoted_at": datetime.utcnow().isoformat() + "Z"
    }
    save_json(ACTIVE_POINTER_PATH, pointer)
    print(f"✅ Active Pointer updated: {ACTIVE_POINTER_PATH}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 promote_model.py <model_filename>")
        sys.exit(1)
    
    promote(sys.argv[1])
