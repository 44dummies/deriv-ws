
import os
import json
import pandas as pd
import joblib
import sys
from sklearn.metrics import accuracy_score, recall_score, precision_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "datasets")
MODEL_DIR = os.path.join(BASE_DIR, "models")
DATA_MANIFEST = os.path.join(DATASET_DIR, "manifest.json")
MODEL_MANIFEST = os.path.join(MODEL_DIR, "manifest.json")

def load_json(path):
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return {}

def get_models():
    manifest = load_json(MODEL_MANIFEST)
    models = manifest.get("models", [])
    if len(models) < 2:
        print("Not enough models to compare. Need at least 2.")
        return None, None
    
    # Sort by created_at just to be safe, though list is append-only
    # Assuming last is candidate, second-to-last is baseline
    candidate = models[-1]
    baseline = models[-2]
    
    return candidate, baseline

def get_anchors():
    manifest = load_json(DATA_MANIFEST)
    datasets = manifest.get("datasets", [])
    anchors = [d for d in datasets if "ANCHOR" in d.get("tags", [])]
    return anchors

def evaluate(model_path, dataset_path):
    model = joblib.load(model_path)
    df = pd.read_csv(dataset_path)
    
    feature_cols = ['rsi', 'adx', 'ema_fast', 'ema_slow', 'volatility', 'momentum']
    X = df[feature_cols]
    y = df['target_win']
    
    preds = model.predict(X)
    return {
        "accuracy": accuracy_score(y, preds),
        "recall": recall_score(y, preds, zero_division=0)
    }

def main():
    print("# Replay Validation Harness")
    
    cand_meta, base_meta = get_models()
    if not cand_meta:
        sys.exit(0) # Skip if not enough models
        
    print(f"Candidate: {cand_meta['filename']}")
    print(f"Baseline:  {base_meta['filename']}")
    
    cand_path = os.path.join(MODEL_DIR, cand_meta['filename'])
    base_path = os.path.join(MODEL_DIR, base_meta['filename'])
    
    anchors = get_anchors()
    if not anchors:
        print("No Anchors found. Skipping Replay Validation.")
        sys.exit(0)
        
    print(f"Testing on {len(anchors)} Anchor Datasets...")
    
    failed = False
    
    for anchor in anchors:
        dataset_path = os.path.join(DATASET_DIR, anchor['filename'])
        print(f"\nEvaluating on Anchor: {anchor['filename']}")
        
        try:
            metrics_cand = evaluate(cand_path, dataset_path)
            metrics_base = evaluate(base_path, dataset_path)
            
            print(f"  Candidate Accuracy: {metrics_cand['accuracy']:.4f}")
            print(f"  Baseline Accuracy:  {metrics_base['accuracy']:.4f}")
            
            # Rules
            # 1. Accuracy Drop > 5%
            acc_delta = metrics_cand['accuracy'] - metrics_base['accuracy']
            if acc_delta < -0.05:
                print(f"  🔴 FAIL: Accuracy Regression ({acc_delta:.2%})")
                failed = True
            else:
                print(f"  ✅ PASS: Accuracy Delta {acc_delta:.2%}")
                
        except Exception as e:
            print(f"  Error evaluating: {e}")
            failed = True

    if failed:
        print("\n⛔ REPLAY VALIDATION FAILED. Model is not safe to promote.")
        sys.exit(1)
    else:
        print("\n✅ REPLAY VALIDATION PASSED. Model is robust.")
        
        # Record Validation in Metadata
        meta_path = cand_path.replace('.pkl', '.json')
        if os.path.exists(meta_path):
            try:
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                
                meta['validation_status'] = 'PASSED'
                meta['validation_timestamp'] = pd.Timestamp.utcnow().isoformat()
                
                with open(meta_path, 'w') as f:
                    json.dump(meta, f, indent=2)
                print(f"📝 Updated metadata: {meta_path}")
            except Exception as e:
                print(f"Warning: Could not update metadata: {e}")
        
        sys.exit(0)

if __name__ == "__main__":
    main()
