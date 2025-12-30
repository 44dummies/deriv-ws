import json
import random

OUTPUT_FILE = "datasets/admin_qa_refusals.jsonl"

SYMBOLS = ["R_10", "R_25", "R_50", "R_75", "R_100"]
TIMEFRAMES = ["1m", "5m", "15m"]

# 1. REFUSAL PATTERNS (Discipline)
# -------------------------------------------------------------------------
TRADING_INTENTS = [
    "Buy now?", "Should I sell?", "Open a long position?", "What's the entry price?",
    "Give me a signal.", "Is this a good trade?", "Construct a call option.",
    "Execute trade on R_100.", "Auto-trade this setup.", "Can you trade for me?"
]

REFUSAL_RESPONSES = [
    {
        "summary": "Request rejected: Actionable trading advice is outside system constraints.",
        "confidence_analysis": "N/A",
        "risk_assessment": "Operational Risk: Action request violates safety protocols.",
        "anomalies": ["policy_violation"],
        "notes": "I am an evaluation engine only. I do not provide entry, exit, or execution advice."
    },
    {
        "summary": "Execution authority denied.",
        "confidence_analysis": "N/A",
        "risk_assessment": "N/A",
        "anomalies": [],
        "notes": "My role is strictly limited to market evaluation and risk assessment. I cannot direct trading actions."
    }
]

# 2. ADMIN Q&A PATTERNS (Explanation Structure)
# -------------------------------------------------------------------------
QA_TEMPLATES = [
    {
        "q": "Why is confidence decaying for {symbol} on {tf}?",
        "a": {
            "summary": "Decay driven by increasing signal noise.",
            "confidence_analysis": "Rising volatility ({vol}) combined with RSI divergence ({rsi}) has reduced the statistical reliability of the trend.",
            "risk_assessment": "Elevated risk of false positives.",
            "anomalies": ["volatility_expansion"],
            "notes": "Market regime appears to be shifting from Trend to Range."
        }
    },
    {
        "q": "Explain the anomaly score for {symbol}.",
        "a": {
            "summary": "Anomaly detected due to statistical deviation.",
            "confidence_analysis": "Current price action deviates {sigma} sigma from the mean, triggering the anomaly detector.",
            "risk_assessment": "High likelihood of mean reversion or breakout failure.",
            "anomalies": ["statistical_deviation", "price_shock"],
            "notes": "Recommendation: Await normalization of volatility."
        }
    }
]

def generate_qa_refusals():
    data = []
    
    # Generate 500 Refusals
    for _ in range(500):
        intent = random.choice(TRADING_INTENTS)
        response = random.choice(REFUSAL_RESPONSES)
        
        data.append({
            "instruction": f"Admin: {intent}",
            "input": "",
            "output": json.dumps(response)
        })

    # Generate 2000 QA Pairs
    for _ in range(2000):
        template = random.choice(QA_TEMPLATES)
        symbol = random.choice(SYMBOLS)
        tf = random.choice(TIMEFRAMES)
        
        # Fill dynamic values
        question = template["q"].format(symbol=symbol, tf=tf)
        answer = template["a"].copy()
        
        # Mutate answer slightly for variety
        vol = round(random.uniform(0.8, 1.5), 2)
        rsi = random.randint(70, 90)
        sigma = round(random.uniform(2.5, 4.0), 1)
        
        answer["confidence_analysis"] = answer["confidence_analysis"].format(vol=vol, rsi=rsi, sigma=sigma)
        
        data.append({
            "instruction": f"Admin: {question}",
            "input": f"Context: {symbol} {tf} | Vol: {vol} | RSI: {rsi}",
            "output": json.dumps(answer)
        })
        
    return data

def main():
    import os
    os.makedirs("datasets", exist_ok=True)
    
    print("Generating Admin Q&A and Refisal examples...")
    dataset = generate_qa_refusals()
    
    with open(OUTPUT_FILE, "w") as f:
        for record in dataset:
            f.write(json.dumps(record) + "\n")
            
    print(f"Generated {len(dataset)} records to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
