
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from scipy import stats
from comparative_analytics import fetch_attributed_signals

def detect_decay():
    print("Initiating Decay Detection Scan...")
    
    # 1. Fetch Deep History (as much as possible)
    data = fetch_attributed_signals()
    if not data:
        print("No data.")
        return

    df = pd.DataFrame(data)
    if 'outcome' not in df.columns:
        print("Outcomes not attributed yet.")
        return
        
    df['created_at'] = pd.to_datetime(df['created_at'])
    df = df.sort_values('created_at')
    
    # 2. Resample to Daily/Session Win Rates
    # We need a time series of performance metrics
    df.set_index('created_at', inplace=True)
    
    # Min 5 samples per bin to valid WR
    daily_stats = df.resample('D').agg(
        count=('outcome', 'count'),
        wins=('outcome', lambda x: (x == 'WIN').sum())
    )
    daily_stats = daily_stats[daily_stats['count'] > 5]
    
    if len(daily_stats) < 5:
        print(f"Not enough daily data points for trend analysis ({len(daily_stats)} days found).")
        return
        
    daily_stats['win_rate'] = daily_stats['wins'] / daily_stats['count']
    
    # 3. Linear Regression (Trend)
    # X = Day Index, Y = Win Rate
    x = np.arange(len(daily_stats))
    y = daily_stats['win_rate'].values
    
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    print(f"Trend Analysis over {len(daily_stats)} days:")
    print(f"Slope: {slope:.5f} / day")
    print(f"R-squared: {r_value**2:.4f}")
    
    decay_report = {
        "timestamp": datetime.now().isoformat(),
        "slope": slope,
        "days_analyzed": len(daily_stats),
        "alerts": []
    }

    # 4. Alert Logic
    # If Win Rate is dropping > 0.5% per day on average, that's bad.
    # -0.005 wr/day
    decay_threshold = -0.005
    
    if slope < decay_threshold:
        msg = f"⚠ DECAY DETECTED: Performance dropping at {slope*100:.3f}% per day."
        decay_report['alerts'].append(msg)
        print(msg)
    else:
        print("✅ Trend is stable or positive.")

    # 5. Output
    with open("decay_report.json", "w") as f:
        json.dump(decay_report, f, indent=2)
        
    if decay_report['alerts']:
        with open("drift_alerts.log", "a") as f:
            f.write(f"[{datetime.now().isoformat()}] {'; '.join(decay_report['alerts'])}\n")
        print("Decay alerts logged.")

if __name__ == "__main__":
    detect_decay()
