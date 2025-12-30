
import os
import json
import hashlib
import pandas as pd
import stat
from datetime import datetime, timedelta

DATASET_DIR = "datasets"
MANIFEST_FILE = os.path.join(DATASET_DIR, "manifest.json")

def load_manifest():
    if os.path.exists(MANIFEST_FILE):
        with open(MANIFEST_FILE, "r") as f:
            return json.load(f)
    return {"datasets": []}

def save_manifest(manifest):
    with open(MANIFEST_FILE, "w") as f:
        json.dump(manifest, f, indent=2)

def calculate_checksum(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def lock_file(file_path):
    os.chmod(file_path, stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)

def compose(days_window=30):
    print(f"# Composing Dataset (Window: {days_window} days + Anchors)")
    manifest = load_manifest()
    
    anchors = []
    window_sets = []
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_window)
    
    for entry in manifest["datasets"]:
        # Skip previously composed datasets to avoid recursion loop?
        # Or maybe composed datasets have a different tag.
        # For now, we assume source datasets are "raw" snapshots.
        if "composite" in entry.get("tags", []):
            continue

        is_anchor = "ANCHOR" in entry.get("tags", [])
        created_at = datetime.fromisoformat(entry["created_at"].replace("Z", "+00:00"))
        
        # Make created_at offset-naive for comparison if needed, or ensure cutoff is aware.
        # simpler: string comparison if ISO.
        
        if is_anchor:
            anchors.append(entry)
        elif created_at.replace(tzinfo=None) >= cutoff_date:
            window_sets.append(entry)
            
    print(f"Found {len(anchors)} Anchors and {len(window_sets)} Recent Datasets.")
    
    # Load and Merge
    dfs = []
    constituent_ids = []
    
    all_sources = anchors + window_sets
    # Unique by ID
    seen_ids = set()
    unique_sources = []
    for s in all_sources:
        if s['dataset_id'] not in seen_ids:
            unique_sources.append(s)
            seen_ids.add(s['dataset_id'])
    
    for source in unique_sources:
        path = os.path.join(DATASET_DIR, source["filename"])
        print(f"Loading: {source['filename']} ({'ANCHOR' if 'ANCHOR' in source.get('tags',[]) else 'WINDOW'})")
        try:
            df = pd.read_csv(path)
            dfs.append(df)
            constituent_ids.append(source["dataset_id"])
        except Exception as e:
            print(f"Error loading {path}: {e}")

    if not dfs:
        print("No data found.")
        return

    merged_df = pd.concat(dfs, ignore_index=True)
    merged_df.drop_duplicates(inplace=True)
    
    # Save Composite
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    new_filename = f"composite_{timestamp}.csv"
    new_path = os.path.join(DATASET_DIR, new_filename)
    
    merged_df.to_csv(new_path, index=False)
    print(f"Saved Composite: {new_filename} ({len(merged_df)} rows)")
    
    # Lock & Register
    lock_file(new_path)
    checksum = calculate_checksum(new_path)
    
    new_entry = {
        "dataset_id": new_filename.replace(".csv", ""),
        "filename": new_filename,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "checksum": checksum,
        "row_count": len(merged_df),
        "schema_version": "v1",
        "tags": ["composite"],
        "constituents": constituent_ids,
        "locked": True
    }
    
    manifest["datasets"].append(new_entry)
    save_manifest(manifest)
    print("Manifest updated.")

if __name__ == "__main__":
    compose()
