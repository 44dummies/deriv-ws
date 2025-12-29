
import os
import requests
import pandas as pd
import json
from datetime import datetime

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase Credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def fetch_signals(limit=1000):
    """Fetch recent signals from shadow_signals table"""
    url = f"{SUPABASE_URL}/rest/v1/shadow_signals?select=*&order=created_at.desc&limit={limit}"
    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        print(f"Error fetching data: {response.text}")
        return []
    return response.json()

def analyze_rivalry(data):
    if not data:
        print("No data found.")
        return

    df = pd.DataFrame(data)
    
    # Check if we have input_hash
    if 'input_hash' not in df.columns:
        print("Data schema missing input_hash")
        return

    print(f"\nLoaded {len(df)} signals.")
    
    # 1. Pivot by input_hash to align comparison
    # We want rows: input_hash | live_signal | shadow_signal | live_conf | shadow_conf
    
    # First, identify the models
    models = df['model_id'].unique()
    print(f"Models found: {models}")
    
    if len(models) < 2:
        print("Not enough models for comparison (need at least 2).")
        return

    # Let's assume most frequent is LIVE, others are SHADOW
    # Or rely on metadata->mode_override if we had it, but model_id is safer
    
    # Group by input_hash
    groups = df.groupby('input_hash')
    
    comparisons = []
    
    for input_hash, group in groups:
        if len(group) < 2:
            continue # No comparison possible
            
        # We need to pick two distinct models to compare. 
        # For simplicity, let's compare the first two unique models found in this group.
        unique_models = group['model_id'].unique()
        if len(unique_models) < 2:
            continue
            
        m1 = unique_models[0]
        m2 = unique_models[1]
        
        row1 = group[group['model_id'] == m1].iloc[0]
        row2 = group[group['model_id'] == m2].iloc[0]
        
        match = (row1['signal_bias'] == row2['signal_bias'])
        conf_delta = float(row1['confidence']) - float(row2['confidence'])
        
        comparisons.append({
            'hash': input_hash,
            'm1': m1,
            'm2': m2,
            'm1_bias': row1['signal_bias'],
            'm2_bias': row2['signal_bias'],
            'match': match,
            'conf_delta': conf_delta
        })
        
    res_df = pd.DataFrame(comparisons)
    
    if res_df.empty:
        print("No overlapping input comparisons found.")
        return
        
    print("\n--- RIVALRY REPORT ---")
    agreement_rate = res_df['match'].mean() * 100
    print(f"Agreement Rate: {agreement_rate:.2f}%")
    
    avg_delta = res_df['conf_delta'].abs().mean()
    print(f"Avg Confidence Divergence: {avg_delta:.4f}")
    
    disagreements = res_df[~res_df['match']]
    print(f"Disagreements: {len(disagreements)}")
    
    if not disagreements.empty:
        print("\nTop Disagreements:")
        print(disagreements[['m1', 'm1_bias', 'm2', 'm2_bias', 'conf_delta']].head())

if __name__ == "__main__":
    data = fetch_signals()
    analyze_rivalry(data)
