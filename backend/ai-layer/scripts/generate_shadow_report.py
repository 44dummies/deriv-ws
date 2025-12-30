
import os
import requests
import pandas as pd
import numpy as np
from comparative_analytics import fetch_attributed_signals, calculate_metrics

# Re-use config
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def calculate_risk_metrics(df):
    if df.empty:
        return {"max_drawdown": 0, "max_consecutive_losses": 0}
        
    # Sort chronologically
    df['created_at'] = pd.to_datetime(df['created_at'])
    df = df.sort_values('created_at')
    
    # Cumulative PnL
    df['pnl'] = pd.to_numeric(df['realized_pnl'], errors='coerce').fillna(0)
    df['cum_pnl'] = df['pnl'].cumsum()
    
    # Drawdown
    df['peak'] = df['cum_pnl'].cummax()
    df['drawdown'] = df['cum_pnl'] - df['peak']
    max_drawdown = df['drawdown'].min()
    
    # Consecutive Losses
    # Identify streaks of LOSS
    df['is_loss'] = df['outcome'] == 'LOSS'
    # Group by streak
    # Shift to find where value changes
    df['streak_id'] = (df['is_loss'] != df['is_loss'].shift()).cumsum()
    streaks = df[df['is_loss']].groupby('streak_id').size()
    max_consecutive_losses = streaks.max() if not streaks.empty else 0
    
    return {
        "max_drawdown": max_drawdown,
        "max_consecutive_losses": max_consecutive_losses
    }

def generate_final_report():
    print("Generating Final Shadow Campaign Report...")
    data = fetch_attributed_signals()
    if not data:
        print("No data.")
        return

    df = pd.DataFrame(data)
    models = df['model_id'].unique()
    
    md = "# Shadow Campaign Final Audit\n\n"
    md += f"**Date**: {pd.Timestamp.now()}\n\n"
    
    for m in models:
        m_df = df[df['model_id'] == m]
        metrics = calculate_metrics(m_df)
        risk = calculate_risk_metrics(m_df)
        
        md += f"## Model: {m}\n"
        md += "### Performance\n"
        md += f"- **Total Signals**: {metrics['count']}\n"
        md += f"- **Win Rate**: {metrics['win_rate']*100:.2f}%\n"
        md += f"- **Total PnL**: {metrics['total_pnl']:.4f}\n"
        
        md += "### Risk Assessment\n"
        md += f"- **Max Drawdown**: {risk['max_drawdown']:.4f}\n"
        md += f"- **Max Consecutive Losses**: {risk['max_consecutive_losses']}\n"
        
        md += "### Regime Breakdown\n"
        for r, wr in metrics.get('regime_wr', {}).items():
             md += f"- **{r}**: {wr*100:.1f}%\n"
        
        md += "\n---\n"
        
    filename = "shadow_campaign_final_report.md"
    with open(filename, "w") as f:
        f.write(md)
        
    print(f"Report saved to {filename}")

if __name__ == "__main__":
    generate_final_report()
