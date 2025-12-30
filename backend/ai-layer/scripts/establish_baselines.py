
import os
import json
import pandas as pd
from datetime import datetime
from comparative_analytics import fetch_attributed_signals, calculate_metrics

CONFIG_PATH = "../config/governance_metrics.json"

def establish_baselines():
    print("Establish Baselines from History...")
    
    # 1. Fetch Data
    data = fetch_attributed_signals()
    if not data:
        print("No data found to establish baselines.")
        return

    df = pd.DataFrame(data)
    
    # 2. Calculate Global Metrics
    metrics = calculate_metrics(df)
    
    global_wr = metrics['win_rate']
    total_pnl = metrics['total_pnl']
    count = metrics['count']
    
    print(f"Global WR: {global_wr*100:.2f}%")
    print(f"Total PnL: {total_pnl}")
    print(f"Count: {count}")
    
    # 3. Calculate Signal Frequency (Approximate)
    # Group by hour? Need timestamps.
    if 'created_at' in df.columns:
        df['created_at'] = pd.to_datetime(df['created_at'])
        duration_hours = (df['created_at'].max() - df['created_at'].min()).total_seconds() / 3600
        if duration_hours > 0:
            freq = count / duration_hours
        else:
            freq = count
    else:
        freq = 0
        
    print(f"Signal Freq: {freq:.2f} / hr")
    
    # 4. Update Schema
    try:
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
    except FileNotFoundError:
        print(f"Config not found at {CONFIG_PATH}")
        return

    config['last_updated'] = datetime.now().isoformat()
    
    # Set Baselines
    config['metrics']['win_rate']['baseline'] = round(global_wr, 4)
    config['metrics']['signal_frequency']['baseline'] = round(freq, 2)
    
    config['baselines']['global_win_rate'] = round(global_wr, 4)
    config['baselines']['global_avg_pnl'] = round(metrics['avg_pnl'], 4)
    
    # Write back
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)
        
    print(f"✅ Baselines updated in {CONFIG_PATH}")
    print(json.dumps(config, indent=2))

if __name__ == "__main__":
    establish_baselines()
