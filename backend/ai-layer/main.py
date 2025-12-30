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

def load_model_version():
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r") as f:
                config = json.load(f)
                return config.get("active_model", "qil-v1.1.0-logreg")
    except Exception as e:
        print(f"Failed to load config: {e}")
    return "qil-v1.1.0-logreg"

MODEL_VERSION = load_model_version()
model_service = ModelService()

# =============================================================================
# SCHEMAS
# =============================================================================

class FeatureVector(BaseModel):
    """Input features for inference (Strict Contract)"""
    rsi: float = Field(..., ge=0, le=100, description="RSI value (0-100)")
    ema_fast: float = Field(..., description="Fast EMA value")
    ema_slow: float = Field(..., description="Slow EMA value")
    atr: float = Field(..., ge=0, description="Average True Range")
    momentum: float = Field(..., description="Momentum")
    volatility: float = Field(..., ge=0, description="Volatility coefficient")


class InferenceRequest(BaseModel):
    """Request body for /infer endpoint"""
    features: FeatureVector


class InferenceResponse(BaseModel):
    """Response from AI inference (Strict Contract)"""
    ai_confidence: float = Field(..., ge=0, le=1)
    market_regime: Literal["TRENDING", "RANGING", "VOLATILE"]
    reason_tags: List[str]
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
    }


@app.get("/health")
def health():
    """Health check for load balancers"""
    return {"status": "ok"}


@app.post("/infer", response_model=InferenceResponse)
def infer(request: InferenceRequest):
    """
    Perform AI inference on feature vector.
    
    GUARANTEES:
    - Deterministic: Same input → Same output
    - No side effects: No DB writes, no external calls
    """
    try:
        # Use ModelService for prediction
        confidence, regime, reasons = model_service.predict(request.features.model_dump())
        
        return InferenceResponse(
            ai_confidence=confidence,
            market_regime=regime,
            reason_tags=reasons,
            model_version=MODEL_VERSION,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/info")
def model_info():
    """Get model metadata"""
    return {
        "model_version": MODEL_VERSION,
        "model_type": "rule-based-stub",
        "features_required": [
            "rsi", "ema_fast", "ema_slow", "sma_fast", "sma_slow",
            "momentum", "volatility", "atr", "market"
        ],
        "outputs": ["signal_bias", "confidence", "reason"],
        "deterministic": True,
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
