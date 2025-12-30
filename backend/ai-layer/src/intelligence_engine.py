import math

class IntelligenceEngine:
    """
    TraderMind AI Intelligence Engine
    Implements deterministic confidence scoring and anomaly detection.
    """

    def __init__(self):
        pass

    def clamp(self, x, a=0, b=1):
        return max(a, min(b, x))

    def calculate_metrics(self, volatility, rsi, market_regime, baseline_volatility=0.7):
        """
        Calculates confidence decay and anomaly score based on market conditions.
        
        Args:
            volatility (float): Current market volatility.
            rsi (float): Current RSI value.
            market_regime (str): Current market regime.
            baseline_volatility (float): Expected baseline volatility.
            
        Returns:
            dict: { "confidence_decay": float, "anomaly_score": float, "risk_level": str }
        """
        
        # 1. Anomaly Score Logic
        # anomaly_score = |volatility - baseline| + |rsi - 50|/100 + signal_flip_penalty (simulated here as 0 for single-pass)
        vol_diff = abs(volatility - baseline_volatility)
        rsi_diff = abs(rsi - 50) / 100
        
        anomaly_score = self.clamp(vol_diff + rsi_diff)

        # 2. Confidence Decay Logic
        # decay_rate = (vol_shift * 0.4) + (rsi_div * 0.3) + (regime_instability * 0.3)
        # regime_instability is heuristic based on regime type
        regime_penalty = 0.0
        if market_regime in ["chop", "overextended"]:
            regime_penalty = 0.2
        
        decay_rate = self.clamp(
            (vol_diff * 0.4) + 
            (rsi_diff * 0.3) + 
            (regime_penalty * 0.3)
        )

        # 3. Risk Level Classification
        risk_level = "low"
        if anomaly_score > 0.3:
            risk_level = "medium"
        if anomaly_score > 0.5:
            risk_level = "high"

        return {
            "confidence_decay": round(decay_rate, 4),
            "anomaly_score": round(anomaly_score, 4),
            "risk_level": risk_level
        }

    def generate_explanation(self, metrics, regime):
        """
        Generates a text explanation for the calculated metrics.
        """
        anomaly = metrics["anomaly_score"]
        decay = metrics["confidence_decay"]
        
        summary = "Market conditions represent a stable evaluation environment."
        if anomaly > 0.3:
            summary = "Elevated anomaly score detected due to deviation from baseline conditions."
        
        analysis = f"Confidence is stable with minimal decay ({decay})."
        if decay > 0.1:
            analysis = f"Confidence is decaying ({decay}) due to expanding volatility or RSI divergence."
            
        return {
            "summary": summary,
            "confidence_analysis": analysis,
            "risk_assessment": f"Risk level assessed as {metrics['risk_level'].upper()}.",
            "anomalies": ["volatility_expanded"] if anomaly > 0.3 else [],
            "notes": "Evaluation only; no action implied"
        }
