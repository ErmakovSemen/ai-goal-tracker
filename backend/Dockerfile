# Simple Dockerfile for Render deployment
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies globally (not --user)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Use python -m uvicorn for reliability
# Render sets PORT env variable
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
