import json
import glob
import os
import random
import random

# Configuration
EVAL_DATA_PATH = "datasets/market_evaluation.jsonl"
QA_DATA_PATH = "datasets/admin_qa_refusals.jsonl"
CONVO_DATA_PATH = "datasets/general_conversation.jsonl"
OUTPUT_FILE = "datasets/tradermind_finetune.jsonl"

SYSTEM_PROMPT = """You are TraderMind AI.
ROLE: Market evaluation and risk insight assistant.
CONSTRAINTS: You do NOT trade. You do NOT suggest entries, exits, or direction.
OUTPUT: JSON only."""

def format_for_ollama(instruction, input_ctxt, output):
    """
    Formats a record into the Alpaca-style JSONL format commonly used for Ollama/Llama fine-tuning.
    """
    return {
        "instruction": instruction,
        "input": input_ctxt,
        "output": output,
        "system": SYSTEM_PROMPT
    }

def process_eval_records():
    records = []
    if not os.path.exists(EVAL_DATA_PATH):
        print(f"Warning: {EVAL_DATA_PATH} not found.")
        return []
        
    with open(EVAL_DATA_PATH, "r") as f:
        for line in f:
            try:
                record = json.loads(line)
                # Convert raw record into an instruction/response pair
                instruction = f"Analyze market conditions for {record['symbol']} on {record['timeframe']} timeframe."
                
                # Context input
                input_ctxt = (
                    f"Price: {record['price']} | Volatility: {record['volatility']} | "
                    f"RSI: {record['rsi']} | Trend: {record['ema_trend']} | "
                    f"Regime: {record['market_regime']}"
                )
                
                # Desired Output (The Analysis)
                output_obj = {
                    "summary": f"Market is in {record['market_regime']} state with {record['evaluation']} outlook.",
                    "confidence_analysis": f"Confidence is {record['quant_confidence']} with {record['confidence_decay']} decay factor.",
                    "risk_assessment": f"Risk level assessed as {record['risk_level']}.",
                    "anomalies": ["high_volatility"] if record['anomaly_score'] > 0.3 else [],
                    "notes": f"Tag: {record['explanation_tag']}"
                }
                
                records.append(format_for_ollama(instruction, input_ctxt, json.dumps(output_obj)))
            except Exception as e:
                continue
    return records

def process_qa_records():
    records = []
    # Process both QA Refusals AND General Conversation
    paths = [QA_DATA_PATH, CONVO_DATA_PATH]
    
    for path in paths:
        if not os.path.exists(path):
            print(f"Warning: {path} not found.")
            continue
            
        with open(path, "r") as f:
            for line in f:
                try:
                    record = json.loads(line)
                    records.append(format_for_ollama(
                        record['instruction'],
                        record['input'],
                        record['output']
                    ))
                except:
                    continue
    return records

def main():
    print("Processing Evaluation Records...")
    eval_records = process_eval_records()
    print(f"Loaded {len(eval_records)} evaluation records.")
    
    print("Processing Conversation & QA Records...")
    qa_records = process_qa_records()
    print(f"Loaded {len(qa_records)} conversation/QA records.")
    
    all_records = eval_records + qa_records
    random.shuffle(all_records) # Shuffle for better training
    
    print(f"Writing {len(all_records)} total records to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        for rec in all_records:
            f.write(json.dumps(rec) + "\n")
            
    print("Done. Ready for Ollama training.")

if __name__ == "__main__":
    main()
