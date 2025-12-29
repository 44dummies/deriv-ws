# TraderMind AI Layer

Python FastAPI service for deterministic AI inference.

## Setup

```bash
cd apps/ai-layer

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

## Run

```bash
# Development
uvicorn main:app --reload --port 8001

# Production
uvicorn main:app --host 0.0.0.0 --port 8001
```

## API Endpoints

### POST /infer
Perform AI inference on feature vector.

```json
{
  "features": {
    "rsi": 25.0,
    "ema_fast": 1005.0,
    "ema_slow": 1000.0,
    "sma_fast": 1004.0,
    "sma_slow": 1000.0,
    "momentum": 0.03,
    "volatility": 0.01,
    "atr": 5.0,
    "market": "R_100"
  },
  "session_id": "session-001"
}
```

Response:
```json
{
  "signal_bias": "CALL",
  "confidence": 0.85,
  "reason": "RSI_OVERSOLD+EMA_BULLISH+MOMENTUM_UP",
  "model_version": "qil-v1.0.0-stub",
  "request_hash": "a1b2c3d4e5f6g7h8"
}
```

### GET /health
Health check for load balancers.

### GET /model/info
Get model metadata.

## Testing

```bash
pip install pytest
pytest test_main.py -v
```

## Guarantees

- **Deterministic**: Same input → Same output
- **No side effects**: No DB writes, no external calls
- **No execution**: Only returns predictions

## Integration

The AI layer is called by the QuantEngine:
```
QuantEngine → HTTP POST /infer → AI Layer → Response
```
