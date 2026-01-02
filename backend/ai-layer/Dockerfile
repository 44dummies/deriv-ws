
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy only necessary files (NO 4.9GB model)
COPY main_production.py main.py
COPY config/ ./config/
COPY src/ ./src/

# Create Non-Root User for Security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8001

CMD ["python", "main.py"]
