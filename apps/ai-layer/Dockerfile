
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create Non-Root User for Security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8001

CMD ["python", "main.py"]
