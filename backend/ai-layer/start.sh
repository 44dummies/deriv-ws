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
    echo "Found local model: tradermind.gguf"
    ollama create muzan -f Modelfile
else
    if [ -n "$MODEL_DOWNLOAD_URL" ]; then
        echo "Downloading model from external source..."
        echo "URL: $MODEL_DOWNLOAD_URL"
        
        # Download the file
        curl -L -o ./models/tradermind.gguf "$MODEL_DOWNLOAD_URL"
        
        if [ -f "./models/tradermind.gguf" ]; then
            echo "Download successful. Creating Muzan..."
            ollama create muzan -f Modelfile
        else
            echo "ERROR: Download failed. Falling back to Mistral..."
            ollama pull mistral
            ollama create muzan -f Modelfile
        fi
    else
        echo "WARNING: tradermind.gguf not found and MODEL_DOWNLOAD_URL not set."
        echo "Pulling fallback model (mistral)..."
        ollama pull mistral
        ollama create muzan -f Modelfile
    fi
fi

# Start FastAPI
echo "Starting AI Layer API..."
uvicorn main:app --host 0.0.0.0 --port 8001
