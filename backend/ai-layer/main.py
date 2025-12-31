"""
TraderMind AI Layer
FastAPI service for deterministic AI inference

NO DATABASE WRITES - Read-only inference
NO EXECUTION AUTHORITY - Only returns predictions
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, List
import hashlib
import json
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from model_service import ModelService
from intelligence_engine import IntelligenceEngine

# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI(
    title="TraderMind AI Layer",
    description="Deterministic AI inference for trading signals",
    version="1.0.0",
)

# Load Configuration
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config", "model_config.json")
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "config", "locked_system_prompt.txt")

def load_system_prompt():
    if os.path.exists(PROMPT_PATH):
        with open(PROMPT_PATH, "r") as f:
            return f.read()
    return "SYSTEM PROMPT NOT FOUND"

SYSTEM_PROMPT = load_system_prompt()
MODEL_VERSION = "qil-v1.2.0-eval" # Updated version

model_service = ModelService()
intelligence_engine = IntelligenceEngine()

# =============================================================================
# SCHEMAS
# =============================================================================

class FeatureVector(BaseModel):
    """Input features for inference (Strict Contract)"""
    rsi: float = Field(..., ge=0, le=100)
    ema_fast: float
    ema_slow: float
    atr: float
    momentum: float
    volatility: float
    market_regime: str = "unknown" # Added for context

class InferenceRequest(BaseModel):
    """Request body for /infer endpoint"""
    features: FeatureVector

class InferenceResponse(BaseModel):
    """Response from AI inference (Strict Contract)"""
    ai_confidence: float
    confidence_decay: float
    anomaly_score: float
    market_regime: str
    risk_level: str
    explanation: dict 
    model_version: str

# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/")
def root():
    """Health check"""
    return {
        "service": "TraderMind AI Layer",
        "status": "healthy",
        "model_version": MODEL_VERSION,
        "mode": "EVALUATION-ONLY"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/infer", response_model=InferenceResponse)
def infer(request: InferenceRequest):
    """
    Perform AI inference with Evaluation Logic.
    
    GUARANTEES:
    - Deterministic: Same input → Same output
    - No side effects: No DB writes, no external calls
    """
    try:
        # 1. Get base prediction (stub or real model)
        confidence, regime, reasons = model_service.predict(request.features.model_dump())
        
        # 2. Calculate Evaluation Metrics (Confidence Decay & Anomaly)
        metrics = intelligence_engine.calculate_metrics(
            volatility=request.features.volatility,
            rsi=request.features.rsi,
            market_regime=request.features.market_regime
        )
        
        # 3. Generate Evaluation Explanation
        explanation = intelligence_engine.generate_explanation(metrics, regime)
        
        # 4. Adjust Final Confidence
        final_confidence = max(0.0, confidence - metrics["confidence_decay"])

        return InferenceResponse(
            ai_confidence=final_confidence,
            confidence_decay=metrics["confidence_decay"],
            anomaly_score=metrics["anomaly_score"],
            market_regime=regime,
            risk_level=metrics["risk_level"],
            explanation=explanation,
            model_version=MODEL_VERSION,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/info")
def model_info():
    """Get model metadata"""
    return {
        "model_version": MODEL_VERSION,
        "status": "active",
        "model_type": "deterministic-eval-engine",
        "system_prompt_hash": hashlib.md5(SYSTEM_PROMPT.encode()).hexdigest(),
        "outputs": ["confidence", "decay", "anomaly", "risk_level"],
        "deterministic": True,
    }

# =============================================================================
# CHAT ENDPOINT (OLLAMA PROXY)
# =============================================================================

class ChatRequest(BaseModel):
    message: str
    role: str = "USER" # "ADMIN" or "USER"
    context: str = ""

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Proxies chat requests to the local Ollama instance.
    Enforces Role Context in the prompt.
    """
    try:
        import httpx
        import os
        
        # Construct the prompt with strict Role Context
        full_prompt = (
            f"Role: {request.role} | Context: {request.context}\n"
            f"User: {request.message}"
        )

        ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": "tradermind",
                    "prompt": full_prompt,
                    "stream": False
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Ollama Error")
                
            data = response.json()
            return {"response": data.get("response", "")}
            
    except Exception as e:
        print(f"Chat Error: {e}")
        # Fallback if Ollama is offline
        return {
            "response": "I am currently in Offline Evaluation Mode. Please check if the Ollama server is running."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
