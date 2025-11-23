# Multi-stage build for Python pronunciation backend with Piper1-GPL

FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    wget \
    curl \
    git \
    pkg-config \
    libsndfile1-dev \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Clone Piper1-GPL from official repository
RUN git clone https://github.com/OHF-Voice/piper1-gpl.git /tmp/piper1-gpl

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir /tmp/piper1-gpl

# Download Piper voice models (en_US-lessac-medium for high quality)
RUN mkdir -p /app/models && \
    cd /app/models && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

# Production stage
FROM python:3.11-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libsndfile1 \
    ffmpeg \
    curl \
    libatomic1 \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 appuser

# Create working directory
WORKDIR /app

# Copy Piper1-GPL binaries
COPY --from=builder /usr/local/bin/piper /usr/local/bin/piper
COPY --from=builder /usr/local/lib/libpiper_phonemize.so* /usr/local/lib/

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy Piper voice models
COPY --from=builder /app/models /app/models

# Update library cache
RUN ldconfig

# Copy application code
COPY . .

# Create directories with proper permissions
RUN mkdir -p /app/references /app/temp && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV PIPER_VOICE_MODEL=/app/models/en_US-lessac-medium.onnx
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
