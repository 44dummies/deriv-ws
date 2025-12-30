
import os
import json
import hashlib
import stat
from datetime import datetime

DATASET_DIR = "datasets"
MANIFEST_FILE = os.path.join(DATASET_DIR, "manifest.json")

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
    return {"datasets": []}

def save_manifest(manifest):
    with open(MANIFEST_FILE, "w") as f:
        json.dump(manifest, f, indent=2)

def scan_datasets():
    print("# Dataset Versioning Manager")
    manifest = load_manifest()
    known_files = {entry["filename"]: entry for entry in manifest["datasets"]}
    
    # 1. Scan for new files
    if not os.path.exists(DATASET_DIR):
        print(f"Error: {DATASET_DIR} does not exist.")
        return

    files = [f for f in os.listdir(DATASET_DIR) if f.endswith(".csv")]
    
    updated = False

    for filename in files:
        filepath = os.path.join(DATASET_DIR, filename)
        checksum = calculate_checksum(filepath)
        
        # Check if version exists
        if filename in known_files:
            entry = known_files[filename]
            if entry["checksum"] != checksum:
                print(f"🔴 CRITICAL VIOLATION: Dataset {filename} has mutated!")
                print(f"   Expected: {entry['checksum']}")
                print(f"   Actual:   {checksum}")
                # In strict mode, we might throw error. For now, strict warning.
            else:
                print(f"✅ Verified: {filename}")
                lock_file(filepath) # Re-enforce lock
        else:
            # New File
            print(f"🆕 Discovered: {filename}")
            
            # Count rows
            with open(filepath, 'r') as f:
                row_count = sum(1 for row in f) - 1 # Minus header

            entry = {
                "dataset_id": filename.replace(".csv", ""),
                "filename": filename,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "checksum": checksum,
                "row_count": row_count,
                "schema_version": "v1",
                "locked": True
            }
            manifest["datasets"].append(entry)
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
    scan_datasets()
