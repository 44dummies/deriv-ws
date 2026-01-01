
import joblib
import pandas as pd
import logging
import os
import json
from typing import Literal, List, Tuple, Optional

class ModelService:
    _instance = None
    _models = {} # Cache: {filename: model_obj}
    
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_DIR = os.path.join(BASE_DIR, "models")
    ACTIVE_POINTER_PATH = os.path.join(MODEL_DIR, "active_model.json")
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelService, cls).__new__(cls)
            cls._instance._load_active_model()
        return cls._instance
    
    def _get_active_model_filename(self):
        if os.path.exists(self.ACTIVE_POINTER_PATH):
            try:
                with open(self.ACTIVE_POINTER_PATH, 'r') as f:
                    data = json.load(f)
                    return data.get('active_model')
            except Exception as e:
                logging.error(f"Error reading active_model.json: {e}")
        return None

    def _load_model(self, filename: str):
        if filename in self._models:
            return self._models[filename]
            
        path = os.path.join(self.MODEL_DIR, filename)
        if os.path.exists(path):
            logging.info(f"Loading model from {path}")
            try:
                model = joblib.load(path)
                self._models[filename] = model
                return model
            except Exception as e:
                logging.error(f"Failed to load model {filename}: {e}")
                return None
        else:
            logging.warning(f"Model file {path} not found.")
            return None
            
    def _load_active_model(self):
        filename = self._get_active_model_filename()
        if filename:
            self._load_model(filename)

    def predict(self, features: dict, model_id: Optional[str] = None) -> Tuple[float, str, List[str], str]:
        """
        Run inference.
        Args:
            features: Input features key-value
            model_id: Optional filename of specific model (e.g. 'model_v1_4.pkl')
        Returns: (confidence, regime, reasons, model_version_used)
        """
        reasons = []
        
        # 1. Determine Model to Use
        target_model_filename = model_id
        if not target_model_filename:
            target_model_filename = self._get_active_model_filename()
            
        model = None
        if target_model_filename:
            model = self._load_model(target_model_filename)
            
        # 2. Determine Market Regime (Rule-based)
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

        # 3. Run ML Model
        ai_confidence = 0.0
        
        if model:
            try:
                # Prepare dataframe (feature order matters for XGBoost)
                # Ensure order matches training
                desired_order = ['rsi', 'adx', 'ema_fast', 'ema_slow', 'volatility', 'momentum']
                
                # Mapping input to training feature names if needed
                # Input: rsi, ema_fast, ema_slow, atr, momentum, volatility
                # Training used: rsi, adx, ema_fast, ema_slow, volatility, momentum
                # ALERT: Input schema has 'atr', Training has 'adx'. 
                # We need to map or compute ADX. 
                # For now, let's assume 'atr' in input maps to 'adx' for the sake of the interface, or we default 0.
                # Ideally, the input should provide ADX.
                
                # Adapting input features to model expected features
                # Use ADX if provided, otherwise fall back to ATR as rough proxy
                adx_value = features.get('adx', features.get('atr', 25.0))
                model_features = {
                    'rsi': features.get('rsi', 50),
                    'adx': adx_value,
                    'ema_fast': features.get('ema_fast'),
                    'ema_slow': features.get('ema_slow'),
                    'volatility': features.get('volatility'),
                    'momentum': features.get('momentum')
                }
                
                df = pd.DataFrame([model_features])
                df = df[desired_order] # Reorder to match training
                
                probs = model.predict_proba(df)[0]
                prob_buy = probs[1]
                
                # Map |prob - 0.5| -> Confidence
                raw_confidence = abs(prob_buy - 0.5) * 2
                ai_confidence = round(raw_confidence, 4)
                
                if prob_buy > 0.6:
                    reasons.append("ML_SIGNAL_CALL")
                elif prob_buy < 0.4:
                    reasons.append("ML_SIGNAL_PUT")
                else:
                    reasons.append("ML_SIGNAL_NEUTRAL")
            except Exception as e:
                logging.error(f"Inference error: {e}")
                reasons.append(f"INFERENCE_ERROR: {str(e)}")
        else:
            reasons.append("MODEL_MISSING_OR_NOT_LOADED")

        return ai_confidence, regime, reasons, (target_model_filename or "NONE")
