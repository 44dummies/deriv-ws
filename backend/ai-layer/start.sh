#!/bin/bash

# Start Ollama in background
echo "Starting Ollama..."
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done

# Create Model (Muzan)
echo "Creating Muzan model..."
# Check if GGUF exists, otherwise pull specific base model as fallback or fail
if [ -f "./models/tradermind.gguf" ]; then
    ollama create muzan -f Modelfile
else
    echo "WARNING: tradermind.gguf not found. Pulling fallback model (mistral)..."
    ollama pull mistral
    ollama create muzan -f Modelfile
fi

# Start FastAPI
echo "Starting AI Layer API..."
uvicorn main:app --host 0.0.0.0 --port 8001
