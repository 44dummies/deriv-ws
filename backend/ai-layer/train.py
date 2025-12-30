"""
TraderMind AI Layer - Model Training Script
Generates synthetic data based on technical analysis rules and trains a Logistic Regression model.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

MODEL_PATH = "model.joblib"
SAMPLES = 10000

def generate_synthetic_data(n_samples=SAMPLES):
    """
    Generate synthetic feature vectors and labels based on TA logic.
    Features: rsi, ema_fast, ema_slow, atr, momentum, volatility
    Label: 1 (Call/Buy) or 0 (Put/Sell) - simplified binary for Logistic Regression
    """
    np.random.seed(42)
    
    # Generate random features
    data = {
        'rsi': np.random.uniform(10, 90, n_samples),
        'ema_fast': np.random.uniform(100, 200, n_samples),
        'ema_slow': np.random.uniform(100, 200, n_samples), # Will adjust relative to fast
        'atr': np.random.uniform(1, 5, n_samples),
        'momentum': np.random.uniform(-0.05, 0.05, n_samples),
        'volatility': np.random.uniform(0.005, 0.05, n_samples)
    }
    
    df = pd.DataFrame(data)
    
    # Enforce logical relationships for cleaner signals
    # If ema_fast > ema_slow, it's generally bullish
    df['ema_slow'] = df['ema_fast'] + np.random.uniform(-5, 5, n_samples) 
    
    # Calculate score to determine label
    # High RSI (>70) -> Sell (0)
    # Low RSI (<30) -> Buy (1)
    # Fast > Slow -> Buy (1)
    # Positive Momentum -> Buy (1)
    
    scores = np.zeros(n_samples)
    
    # RSI Contribution (Mean reversion logic)
    scores += np.where(df['rsi'] < 30, 2.0, 0)
    scores += np.where(df['rsi'] > 70, -2.0, 0)
    
    # EMA Crossover Contribution (Trend following)
    scores += np.where(df['ema_fast'] > df['ema_slow'], 1.5, -1.5)
    
    # Momentum Contribution
    scores += np.where(df['momentum'] > 0, 1.0, -1.0)
    
    # Volatility Penalty (Uncertainty)
    scores *= np.where(df['volatility'] > 0.03, 0.5, 1.0)
    
    # Add noise
    scores += np.random.normal(0, 0.5, n_samples)
    
    # Generate Probabilities (Sigmoid)
    probs = 1 / (1 + np.exp(-scores))
    
    # Generate binary labels (1 = Call, 0 = Put/Neutral)
    # Using 0.5 threshold
    labels = (probs > 0.5).astype(int)
    
    return df, labels

def train_model():
    logging.info("Generating synthetic data...")
    X, y = generate_synthetic_data()
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logging.info(f"Training Logistic Regression model on {len(X_train)} samples...")
    # C=1.0 (default regularization), fixed random_state for determinism
    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    score = model.score(X_test, y_test)
    logging.info(f"Model Accuracy on Test Set: {score:.4f}")
    
    # Save
    logging.info(f"Saving model to {MODEL_PATH}...")
    joblib.dump(model, MODEL_PATH)
    logging.info("Done.")

if __name__ == "__main__":
    train_model()
