
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score
import joblib
import os
import json
import numpy as np
from datetime import datetime

# Configuration
DATASET_PATH = 'datasets/composite_20251229_122408.csv' # Use Composite!
if not os.path.exists(DATASET_PATH): 
    # Fallback if composite doesn't exist (e.g. testing)
    DATASET_PATH = 'datasets/training_snapshot_v1.csv'

MODEL_DIR = 'models'
MODEL_NAME = 'model_v1_4.pkl' # Increment Version
MANIFEST_PATH = 'datasets/manifest.json'
MODEL_MANIFEST_PATH = 'models/manifest.json'

def get_latest_model_path():
    if not os.path.exists(MODEL_MANIFEST_PATH):
        return None
    with open(MODEL_MANIFEST_PATH, 'r') as f:
        manifest = json.load(f)
    
    models = manifest.get('models', [])
    if not models:
        return None
    
    # Sort by creation or rely on append order. Append order is usually chronological.
    latest = models[-1]
    return os.path.join(MODEL_DIR, latest['filename'])

def calculate_drift(new_model, old_model_path, feature_names):
    if not old_model_path or not os.path.exists(old_model_path):
        print("No previous model found for drift check. Skipping.")
        return None

    try:
        old_model = joblib.load(old_model_path)
        
        # XGBoost Feature Importances
        new_imps = new_model.feature_importances_
        
        # Handle case where old model might verify different features or types
        # As output by sklearn API wrapper
        try:
            old_imps = old_model.feature_importances_
        except AttributeError:
            print("Old model does not have feature_importances_. Skipping.")
            return None

        if len(new_imps) != len(old_imps):
             print("Feature dimension mismatch. Cannot compare.")
             return None

        # Calculate Absolute Drift
        delta = np.abs(new_imps - old_imps)
        max_drift = np.max(delta)
        mean_drift = np.mean(delta)
        
        drift_report = {
             "max_drift": float(max_drift),
             "mean_drift": float(mean_drift),
             "deltas": {name: float(d) for name, d in zip(feature_names, delta)}
        }
        
        print(f"Drift Check: Max Delta = {max_drift:.4f} (Threshold 0.5)")
        if max_drift > 0.5:
             print("⚠️ WARNING: SIGNIFICANT MODEL DRIFT DETECTED!")
        else:
             print("✅ Model Stability within limits.")
             
        return drift_report

    except Exception as e:
        print(f"Drift check failed: {e}")
        return None

def train():
    print(f"# Starting Offline Training: {MODEL_NAME}")
    print(f"Dataset: {DATASET_PATH}")
    
    # 1. Load Data
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset not found at {DATASET_PATH}")
        return

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} records.")

    # 2. Prepare Features & Target
    feature_cols = ['rsi', 'adx', 'ema_fast', 'ema_slow', 'volatility', 'momentum']
    X = df[feature_cols]
    y = df['target_win']

    if len(y.unique()) < 2:
        print("Warning: Dataset is mono-class. Injecting synthetic samples...")
        synthetic_neg = X.iloc[0:1].copy()
        synthetic_neg['rsi'] = 85 
        X = pd.concat([X, synthetic_neg], ignore_index=True)
        y = pd.concat([y, pd.Series([0 if y.iloc[0] == 1 else 1])], ignore_index=True)

    # 3. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Train XGBoost with Regularization
    # reg_lambda (L2), reg_alpha (L1)
    params = {
        'use_label_encoder': False,
        'eval_metric': 'logloss',
        'objective': 'binary:logistic',
        'reg_alpha': 0.1,  # L1 Regularization
        'reg_lambda': 1.0, # L2 Regularization (Defaut 1, but stated explicit)
        'max_depth': 4     # Constrain complexity
    }
    
    model = xgb.XGBClassifier(**params)
    model.fit(X_train, y_train)

    # 5. Evaluate
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, zero_division=0)
    rec = recall_score(y_test, preds, zero_division=0)

    print("\n## Model Performance")
    print(f"- Accuracy: {acc:.2f}")

    # 6. Drift Check
    old_model_path = get_latest_model_path()
    drift_metrics = calculate_drift(model, old_model_path, feature_cols)

    # 7. Save Model
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    
    save_path = os.path.join(MODEL_DIR, MODEL_NAME)
    joblib.dump(model, save_path)
    print(f"\n✅ Model saved to: {save_path}")

    # Fetch Dataset Checksum
    dataset_checksum = "UNKNOWN"
    dataset_filename = os.path.basename(DATASET_PATH)
    
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r') as f:
            manifest = json.load(f)
            for entry in manifest.get('datasets', []):
                if entry['filename'] == dataset_filename:
                    dataset_checksum = entry['checksum']
                    break

    # Save metadata
    meta = {
        'version': 'v1.4',
        'algorithm': 'XGBoost',
        'hyperparameters': params,
        'dataset_path': DATASET_PATH,
        'dataset_checksum': dataset_checksum, 
        'training_timestamp': datetime.utcnow().isoformat() + "Z",
        'metrics': {'accuracy': acc, 'precision': prec, 'recall': rec},
        'drift_metrics': drift_metrics
    }
    with open(save_path.replace('.pkl', '.json'), 'w') as f:
        json.dump(meta, f, indent=2)

if __name__ == "__main__":
    train()

