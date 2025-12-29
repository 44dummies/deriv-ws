
import os
import requests
import pandas as pd
import json
import numpy as np

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    print("Env variables missing. skipping.")
    exit(0)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def fetch_attributed_signals():
    # Signals with outcome
    url = f"{SUPABASE_URL}/rest/v1/shadow_signals?select=*&outcome=not.is.null&limit=2000"
    resp = requests.get(url, headers=HEADERS)
    return resp.json()

def calculate_metrics(df):
    total = len(df)
    if total == 0:
        return {}
    
    wins = df[df['outcome'] == 'WIN']
    losses = df[df['outcome'] == 'LOSS']
    
    win_rate = len(wins) / total
    
    # PnL (assuming realized_pnl is populated)
    # Handle possible none/strings
    df['realized_pnl'] = pd.to_numeric(df['realized_pnl'], errors='coerce').fillna(0)
    total_pnl = df['realized_pnl'].sum()
    avg_pnl = df['realized_pnl'].mean()
    
    # Confidence bucket
    # Bucket into Low (0-0.5), Mid (0.5-0.75), High (0.75-1.0)
    df['conf_bucket'] = pd.cut(df['confidence'].astype(float), bins=[0, 0.5, 0.75, 1.0], labels=['Low', 'Mid', 'High'])
    bucket_wr = df.groupby('conf_bucket')['outcome'].apply(lambda x: (x == 'WIN').mean() if len(x) > 0 else 0).to_dict()
    
    # Regime breakdown
    # Check if regime exists
    regime_wr = {}
    if 'regime' in df.columns:
        regime_wr = df.groupby('regime')['outcome'].apply(lambda x: (x == 'WIN').mean() if len(x) > 0 else 0).to_dict()

    return {
        "count": total,
        "win_rate": win_rate,
        "total_pnl": total_pnl,
        "avg_pnl": avg_pnl,
        "bucket_wr": bucket_wr,
        "regime_wr": regime_wr
    }

def generate_report(metrics_by_model, comparison):
    md = "# Comparative Analytics Report\n\n"
    md += f"Generated at: {pd.Timestamp.now()}\n\n"
    
    md += "## Model Performance\n"
    for model, metrics in metrics_by_model.items():
        md += f"### Model: {model}\n"
        md += f"- **Samples**: {metrics['count']}\n"
        md += f"- **Win Rate**: {metrics['win_rate']*100:.2f}%\n"
        md += f"- **Total PnL**: {metrics['total_pnl']:.4f}\n"
        md += f"- **Avg PnL**: {metrics['avg_pnl']:.4f}\n"
        md += "- **Confidence Buckets**:\n"
        for b, wr in metrics['bucket_wr'].items():
            md += f"  - {b}: {wr*100:.1f}%\n"
        md += "- **Regime Performance**:\n"
        for r, wr in metrics.get('regime_wr', {}).items():
             md += f"  - {r}: {wr*100:.1f}%\n"
        md += "\n"
        
    md += "## Comparison (Delta)\n"
    if comparison:
        md += f"**Basis**: {comparison['basis_count']} common input hashes.\n\n"
        md += f"- **Win Rate Delta**: {comparison['wr_delta']*100:+.2f}% (Challenger vs Champion)\n"
        md += f"- **PnL Delta**: {comparison['pnl_delta']:+.4f}\n"
    else:
        md += "No direct comparison possible (insufficient overlap).\n"
        
    with open("shadow_analytics_report.md", "w") as f:
        f.write(md)
    print("Report written to shadow_analytics_report.md")

def run_analytics():
    data = fetch_attributed_signals()
    if not data:
        print("No attributed signals found.")
        return

    df = pd.DataFrame(data)
    
    # 1. Metrics by Model
    metrics_by_model = {}
    models = df['model_id'].unique()
    
    for m in models:
        m_df = df[df['model_id'] == m]
        metrics_by_model[m] = calculate_metrics(m_df)
        
    # 2. Comparison (Assuming 2 models: Active & Shadow)
    # We need to find the "active" one. Let's assume most frequent or first.
    # Or strict naming if available.
    comparison = None
    if len(models) >= 2:
        # Sort by count desc to find main ones
        sorted_models = sorted(models, key=lambda m: metrics_by_model[m]['count'], reverse=True)
        champion = sorted_models[0]
        challenger = sorted_models[1]
        
        # Filter for common hashes
        champ_df = df[df['model_id'] == champion]
        chal_df = df[df['model_id'] == challenger]
        
        common_hashes = set(champ_df['input_hash']).intersection(set(chal_df['input_hash']))
        
        if len(common_hashes) > 0:
            c_champ = champ_df[champ_df['input_hash'].isin(common_hashes)]
            c_chal = chal_df[chal_df['input_hash'].isin(common_hashes)]
            
            champ_wr = (c_champ['outcome'] == 'WIN').mean()
            chal_wr = (c_chal['outcome'] == 'WIN').mean()
            
            champ_pnl = pd.to_numeric(c_champ['realized_pnl'], errors='coerce').fillna(0).sum()
            chal_pnl = pd.to_numeric(c_chal['realized_pnl'], errors='coerce').fillna(0).sum()
            
            comparison = {
                "champion": champion,
                "challenger": challenger,
                "basis_count": len(common_hashes),
                "wr_delta": chal_wr - champ_wr,
                "pnl_delta": chal_pnl - champ_pnl
            }
            
    # Output
    generate_report(metrics_by_model, comparison)
    
    # JSON output
    out = {
        "metrics": metrics_by_model,
        "comparison": comparison,
        "timestamp": pd.Timestamp.now().isoformat()
    }
    with open("shadow_analytics.json", "w") as f:
        json.dump(out, f, indent=2, default=str)

if __name__ == "__main__":
    run_analytics()
