"""
TraderMind Quant Intelligence Layer (QIL)
FastAPI inference service

SECURITY CONSTRAINTS (PRD Section 8.3):
- No access to Deriv tokens
- No access to user balances
- No access to session state
- No database writes
- Numeric features input only
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-layer")

app = FastAPI(
    title="TraderMind AI Layer",
    description="Quant Intelligence Layer - Probabilistic ML Inference",
    version="1.0.0",
)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================


class FeatureInput(BaseModel):
    """Numeric features for ML inference"""
    rsi: float = Field(..., ge=0, le=100, description="Relative Strength Index")
    ema_fast: float = Field(..., description="Fast EMA value")
    ema_slow: float = Field(..., description="Slow EMA value")
    volatility: float = Field(..., ge=0, description="Market volatility")
    momentum: float = Field(..., description="Price momentum")


class InferenceRequest(BaseModel):
    """POST /infer request body"""
    market: str = Field(..., description="Market symbol, e.g. R_100")
    features: FeatureInput
    strategy_version: str = Field(..., description="Strategy version identifier")


class InferenceResponse(BaseModel):
    """POST /infer response body (PRD Section 8.4)"""
    signal_bias: Literal["CALL", "PUT"]
    confidence: float = Field(..., ge=0, le=1)
    regime: Literal["TRENDING", "RANGING", "VOLATILE"]
    model_version: str
    reason: str


# =============================================================================
# ENDPOINTS
# =============================================================================


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-layer"}


@app.post("/infer", response_model=InferenceResponse)
async def infer(request: InferenceRequest) -> InferenceResponse:
    """
    ML inference endpoint
    
    Returns signal bias, confidence, and market regime classification.
    This is the ONLY output - no execution, no DB writes, no token access.
    """
    logger.info(f"Inference request: market={request.market}, strategy={request.strategy_version}")
    
    features = request.features
    
    # Determine market regime based on volatility
    if features.volatility > 0.8:
        regime = "VOLATILE"
    elif abs(features.momentum) > 0.5:
        regime = "TRENDING"
    else:
        regime = "RANGING"
    
    # Simple rule-based signal (placeholder for ML model)
    if features.rsi < 30:
        signal_bias = "CALL"
        reason = "RSI_OVERSOLD"
        confidence = min(0.9, (30 - features.rsi) / 30 + 0.5)
    elif features.rsi > 70:
        signal_bias = "PUT"
        reason = "RSI_OVERBOUGHT"
        confidence = min(0.9, (features.rsi - 70) / 30 + 0.5)
    elif features.ema_fast > features.ema_slow:
        signal_bias = "CALL"
        reason = "EMA_CROSSOVER_BULLISH"
        confidence = 0.6
    else:
        signal_bias = "PUT"
        reason = "EMA_CROSSOVER_BEARISH"
        confidence = 0.6
    
    return InferenceResponse(
        signal_bias=signal_bias,
        confidence=round(confidence, 2),
        regime=regime,
        model_version="rule_based_v1.0",
        reason=reason,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
