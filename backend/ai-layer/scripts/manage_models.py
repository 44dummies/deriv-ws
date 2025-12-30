
import os
import json
import hashlib
import stat
from datetime import datetime

MODEL_DIR = "models"
MANIFEST_FILE = os.path.join(MODEL_DIR, "manifest.json")

def calculate_checksum(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def lock_file(file_path):
    """Enforce Read-Only permissions (0o444)"""
    os.chmod(file_path, stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)

def load_manifest():
    if os.path.exists(MANIFEST_FILE):
        with open(MANIFEST_FILE, "r") as f:
            return json.load(f)
    return {"models": []}

def save_manifest(manifest):
    with open(MANIFEST_FILE, "w") as f:
        json.dump(manifest, f, indent=2)

def scan_models():
    print("# Model Artifact Registry Manager")
    manifest = load_manifest()
    known_models = {entry["filename"]: entry for entry in manifest["models"]}
    
    if not os.path.exists(MODEL_DIR):
        print(f"Error: {MODEL_DIR} does not exist.")
        return

    files = [f for f in os.listdir(MODEL_DIR) if f.endswith(".pkl")]
    updated = False

    for filename in files:
        filepath = os.path.join(MODEL_DIR, filename)
        checksum = calculate_checksum(filepath)
        
        # Load Companion Metadata if exists
        meta_filename = filename.replace('.pkl', '.json')
        meta_filepath = os.path.join(MODEL_DIR, meta_filename)
        metadata = {}
        if os.path.exists(meta_filepath):
            with open(meta_filepath, 'r') as f:
                metadata = json.load(f)

        # Check if version exists
        if filename in known_models:
            entry = known_models[filename]
            if entry["checksum"] != checksum:
                print(f"🔴 CRITICAL VIOLATION: Model {filename} has mutated!")
                print(f"   Expected: {entry['checksum']}")
                print(f"   Actual:   {checksum}")
            else:
                print(f"✅ Verified: {filename}")
                lock_file(filepath)
        else:
            # New Model
            print(f"🆕 Discovered: {filename}")
            
            entry = {
                "model_id": filename.replace(".pkl", ""),
                "filename": filename,
                "algorithm": "XGBoost", # Inferred or from meta
                "training_dataset_version": metadata.get("dataset_checksum", "UNKNOWN"),
                "hyperparameters": metadata.get("hyperparameters", {}), # If captured
                "checksum": checksum,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "locked": True
            }
            manifest["models"].append(entry)
            updated = True
            
            # LOCK IT
            lock_file(filepath)
            print(f"🔒 Locked {filename} (Read-Only)")

    if updated:
        save_manifest(manifest)
        print("\nManifest updated.")
    else:
        print("\nManifest up to date.")

if __name__ == "__main__":
    scan_models()
