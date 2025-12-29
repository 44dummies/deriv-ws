
import joblib
import pandas as pd
import logging
import os
from typing import Literal, List, Tuple

# Import schemas (assuming we can reuse or redefine for internal use)
# For now, we redefine internal types to match Pydantic models in main.py
# Or we just accept the pydantic object.

class ModelService:
    _instance = None
    _model = None
    
    MODEL_PATH = "model.joblib"
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelService, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance
    
    def _load_model(self):
        if os.path.exists(self.MODEL_PATH):
            logging.info(f"Loading model from {self.MODEL_PATH}")
            self._model = joblib.load(self.MODEL_PATH)
        else:
            logging.warning(f"Model file {self.MODEL_PATH} not found. Using safe fallback.")
            self._model = None

    def predict(self, features: dict) -> Tuple[float, str, List[str]]:
        """
        Run inference on feature dictionary.
        Returns: (confidence, regime, reasons)
        """
        reasons = []
        
        # 1. Determine Market Regime (Rule-based, as ML model is only for signal)
        # Consistent with previous logic
        regime = "RANGING"
        if features['volatility'] > 0.05:
            regime = "VOLATILE"
            reasons.append("HIGH_VOLATILITY")
        elif abs(features['momentum']) > 0.1:
            regime = "TRENDING"
            reasons.append("STRONG_TREND")
        else:
            regime = "RANGING"
            reasons.append("LOW_MOMENTUM")

        # 2. Run ML Model for Confidence/Signal
        if self._model:
            # Prepare dataframe [1, n_features]
            # Ensure order matches training: rsi, ema_fast, ema_slow, atr, momentum, volatility
            df = pd.DataFrame([features])
            desired_order = ['rsi', 'ema_fast', 'ema_slow', 'atr', 'momentum', 'volatility']
            df = df[desired_order]
            
            # Predict Probabilities
            # Class 1 = Call/Buy
            probs = self._model.predict_proba(df)[0]
            prob_buy = probs[1]
            
            # Map probability to "Confidence in a Signal"
            # If prob > 0.6 -> Call
            # If prob < 0.4 -> Put (High confidence in not-Call?) 
            # Actually, standard binary classification:
            # 0.5 is neutral. distance from 0.5 is confidence.
            
            # Confidence = 0.5 + |prob - 0.5| -> range [0.5, 1.0]
            # But we want 0.0 to 1.0?
            # User contract: ai_confidence.
            # Let's map it: |prob - 0.5| * 2  -> range [0.0, 1.0]
            
            raw_confidence = abs(prob_buy - 0.5) * 2
            ai_confidence = round(raw_confidence, 4)
            
            if prob_buy > 0.6:
                reasons.append("ML_SIGNAL_CALL")
            elif prob_buy < 0.4:
                reasons.append("ML_SIGNAL_PUT")
            else:
                reasons.append("ML_SIGNAL_NEUTRAL")
                
        else:
            # Fallback if model missing
            ai_confidence = 0.0
            reasons.append("MODEL_MISSING_FALLBACK")

        return ai_confidence, regime, reasons
