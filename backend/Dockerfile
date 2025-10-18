# ---------- Stage 1: Go 1.25.2 build ----------
FROM golang:1.25.2-bookworm AS build

WORKDIR /src

# Копируем все исходники (без go.mod/go.sum)
COPY . .

# Сборка статического бинаря
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server main.go

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=9000 \
    WEB_DIR=/app/web

WORKDIR /app

# Базовые пакеты
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Python зависимости раннеров
RUN pip install --no-cache-dir numpy==2.1.3 pandas==2.2.3

# Python-скрипты (папка py должна существовать)
COPY py/ ./py/
# Если скрипты в корне репо:
# COPY csv-parser.py traffic-optimizer.py qubo-formulator.py qasm-exporter.py ./py/

# Статический фронтенд (index.html обязательно)
COPY web/ ./web/

# Go-бинарь
COPY --from=build /src/server /app/server

EXPOSE 9000
CMD ["/app/server"]
