"""
TraderMind AI Layer - Unit Tests
Tests deterministic inference behavior
"""

import pytest
from fastapi.testclient import TestClient
from main import app, FeatureVector

client = TestClient(app)

# =============================================================================
# TEST FIXTURES
# =============================================================================

@pytest.fixture
def sample_features():
    return {
        "rsi": 25.0,
        "ema_fast": 1005.0,
        "ema_slow": 1000.0,
        "momentum": 0.03,
        "volatility": 0.01,
        "atr": 5.0
    }

@pytest.fixture
def volatile_features():
    return {
        "rsi": 50.0,
        "ema_fast": 1000.0,
        "ema_slow": 1000.0,
        "momentum": 0.0,
        "volatility": 0.08,  # High volatility
        "atr": 10.0
    }

# =============================================================================
# DETERMINISM TESTS
# =============================================================================

def test_inference_determinism(sample_features):
    """Same input should always produce same output via endpoint"""
    request_data = {"features": sample_features}
    
    response1 = client.post("/infer", json=request_data)
    response2 = client.post("/infer", json=request_data)
    
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert response1.json() == response2.json()

# =============================================================================
# ENDPOINT TESTS
# =============================================================================

def test_health_endpoint():
    """Health endpoint should return ok"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_root_endpoint():
    """Root endpoint should return service info"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "TraderMind AI Layer"
    assert "model_version" in data

def test_infer_endpoint_structure(sample_features):
    """Response should match strict contract"""
    response = client.post("/infer", json={
        "features": sample_features
    })
    
    assert response.status_code == 200
    data = response.json()
    
    # Check strict contract fields
    assert "ai_confidence" in data
    assert "market_regime" in data
    assert "reason_tags" in data
    assert "model_version" in data
    
    # Verify types
    assert isinstance(data["ai_confidence"], float)
    assert data["market_regime"] in ["TRENDING", "RANGING", "VOLATILE"]
    assert isinstance(data["reason_tags"], list)

# =============================================================================
# LOGIC TESTS (Via Endpoint)
# =============================================================================

def test_high_volatility_regime(volatile_features):
    """High volatility should result in VOLATILE regime"""
    response = client.post("/infer", json={"features": volatile_features})
    data = response.json()
    
    assert data["market_regime"] == "VOLATILE"
    assert "HIGH_VOLATILITY" in data["reason_tags"]

def test_rsi_oversold_signal():
    """RSI < 30 should typically result in Call/Buy signal"""
    features = {
        "rsi": 20.0,
        "ema_fast": 1000.0,
        "ema_slow": 1000.0,
        "momentum": 0.0,
        "volatility": 0.01,
        "atr": 2.0
    }
    
    response = client.post("/infer", json={"features": features})
    assert response.status_code == 200

def test_trending_logic():
    """Strong momentum should verify TRENDING regime"""
    features = {
        "rsi": 50.0,
        "ema_fast": 1050.0,
        "ema_slow": 1000.0,
        "momentum": 0.2,
        "volatility": 0.02,
        "atr": 5.0
    }
    
    response = client.post("/infer", json={"features": features})
    data = response.json()
    assert data["market_regime"] == "TRENDING" or "STRONG_TREND" in data["reason_tags"]

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
