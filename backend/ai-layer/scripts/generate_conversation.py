import json
import random

OUTPUT_FILE = "datasets/general_conversation.jsonl"

# 1. TRADING CONCEPTS (Educational)
CONCEPTS = [
    {
        "q": "What is RSI?",
        "a": "RSI (Relative Strength Index) is a momentum oscillator that measures the speed and change of price movements. It oscillates between 0 and 100. Traditionally, an RSI above 70 is considered overbought, and below 30 is considered oversold."
    },
    {
        "q": "Explain implied volatility.",
        "a": "Implied volatility represents the market's view of the likelihood of changes in a security's price. It is derived from the price of an option and shows what the market 'implies' about the stock's volatility in the future."
    },
    {
        "q": "What is a market regime?",
        "a": "A market regime defines the prevailing behavior of price action, such as 'Trending' (directional movement), 'Ranging' (sideways bouncing), or 'High Volatility' (choppy, expansive movement). Identifying the regime is critical for selecting the right trading strategy."
    }
]

# 2. PLATFORM HELP (TraderMind specific)
PLATFORM_HELP = [
    {
        "q": "How do I switch to a real account?",
        "a": "You can switch between Real and Demo accounts using the account switcher dropdown in the top navigation bar of the Dashboard."
    },
    {
        "q": "Can you trade for me?",
        "a": "No. I am an AI evaluation engine designed to provide insights and risk assessments. I do not have the authority to execute trades or manage funds."
    },
    {
        "q": "What does the anomaly score mean?",
        "a": "The Anomaly Score measures how much the current market conditions deviate from the expected baseline. A high score (>0.5) indicates unusual behavior, suggesting that standard trading signals may be unreliable."
    }
]

# 3. CHIT-CHAT (Persona)
PERSONA = [
    {
        "q": "Who are you?",
        "a": "I am TraderMind AI, your intelligent market evaluation assistant. I analyze data to help you make informed decisions, but I do not trade on your behalf."
    },
    {
        "q": "Are you ChatGPT?",
        "a": "No, I am a specialized AI model fine-tuned for the TraderMind platform. My focus is on financial market analysis and risk management."
    }
]

def generate_conversation():
    data = []
    
    # Generate 1000 variations of concepts
    for _ in range(1000):
        item = random.choice(CONCEPTS)
        data.append({
            "instruction": f"User: {item['q']}",
            "input": "Role: USER | Context: General Query",
            "output": item['a'] # Plain text output, not JSON
        })

    # Generate 500 platform help
    for _ in range(500):
        item = random.choice(PLATFORM_HELP)
        data.append({
            "instruction": f"User: {item['q']}",
            "input": "Role: USER | Context: Platform Support",
            "output": item['a']
        })

    # Generate 200 persona interactions
    for _ in range(200):
        item = random.choice(PERSONA)
        data.append({
            "instruction": f"User: {item['q']}",
            "input": "Role: USER | Context: Persona",
            "output": item['a']
        })
        
    return data

def main():
    import os
    os.makedirs("datasets", exist_ok=True)
    
    print("Generating Conversational Training Data...")
    dataset = generate_conversation()
    
    with open(OUTPUT_FILE, "w") as f:
        for record in dataset:
            f.write(json.dumps(record) + "\n")
            
    print(f"Generated {len(dataset)} conversation records to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
