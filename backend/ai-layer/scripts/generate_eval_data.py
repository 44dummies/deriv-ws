import json
import random
import math
import os

SYMBOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"]
TIMEFRAMES = ["1m", "5m", "15m"]
REGIMES = ["trend", "range", "chop", "overextended"]

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "../datasets/market_evaluation.jsonl")

def clamp(x, a=0, b=1):
    return max(a, min(b, x))

def generate_record():
    regime = random.choice(REGIMES)
    volatility = clamp(random.gauss(0.7, 0.2))
    rsi = clamp(random.gauss(55, 15), 10, 90)

    confidence = clamp(
        0.9
        - abs(50 - rsi) / 100
        - volatility * 0.3
    )

    anomaly = clamp(
        abs(volatility - 0.7)
        + abs(rsi - 50) / 100
    )

    decay = clamp(anomaly * 0.6)

    evaluation = (
        "favorable" if confidence > 0.7 and anomaly < 0.2
        else "neutral" if confidence > 0.5
        else "unfavorable"
    )

    risk = (
        "low" if anomaly < 0.1
        else "medium" if anomaly < 0.3
        else "high"
    )

    return {
        "symbol": random.choice(SYMBOLS),
        "timeframe": random.choice(TIMEFRAMES),
        "price": round(random.uniform(1000, 20000), 2),
        "volatility": round(volatility, 2),
        "rsi": round(rsi, 1),
        "ema_trend": random.choice(["bullish", "bearish", "neutral"]),
        "macd_state": random.choice(["positive", "negative", "flat"]),
        "atr": round(random.uniform(5, 25), 2),
        "market_regime": regime,
        "quant_confidence": round(confidence, 2),
        "confidence_decay": round(decay, 2),
        "anomaly_score": round(anomaly, 2),
        "evaluation": evaluation,
        "risk_level": risk,
        "explanation_tag": regime
    }

def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    print(f"Generating 50,000 records to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        for _ in range(50000):
            f.write(json.dumps(generate_record()) + "\n")
    print("Done.")

if __name__ == "__main__":
    main()
