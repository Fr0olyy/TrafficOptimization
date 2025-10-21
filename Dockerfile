# ========================================
# Stage 1: Frontend build
# ========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ========================================
# Stage 2: Backend build
# ========================================
FROM golang:1.25.1-bookworm AS backend-builder

WORKDIR /build

COPY backend/go.mod backend/go.sum* ./
RUN if [ -f go.sum ]; then go mod download; fi

COPY backend/main.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o server main.go

# ========================================
# Stage 3: Python 3.12 runtime
# ========================================
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=9000 \
    WEB_DIR=/app/web

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/py/ ./py/
COPY --from=frontend-builder /build/dist ./web
COPY --from=backend-builder /build/server /app/server

RUN chmod +x /app/server && \
    useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

EXPOSE 9000

CMD ["/app/server"]
