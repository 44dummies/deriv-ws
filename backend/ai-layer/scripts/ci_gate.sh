#!/bin/bash
set -e

echo "🔒 Starting AI Safety CI Gate..."

# 1. Verify Dataset Integrity
echo "Step 1: Verifying Dataset Integrity..."
python3 scripts/manage_datasets.py

# 2. Verify Model Integrity
echo "Step 2: Verifying Model Integrity..."
python3 scripts/manage_models.py

# 3. Replay Validation (Non-Regression)
# This checks if the latest candidate regresses against anchors
echo "Step 3: Running Replay Validation (Non-Regression)..."
python3 scripts/evaluate_replay.py

if [ $? -eq 0 ]; then
    echo "✅ CI GATE PASSED: System is safe to deploy."
    exit 0
else
    echo "⛔ CI GATE FAILED: Regression or Integrity Error detected."
    exit 1
fi
