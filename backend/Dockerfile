# ---------- Stage 1: Go 1.25.2 build ----------
FROM golang:1.25.2-bookworm AS build

WORKDIR /src

# Копируем все исходники
COPY . .

# Сборка статического бинаря
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server main.go


# ---------- Stage 2: runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=9000

WORKDIR /app

# Базовые пакеты
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Python зависимости
RUN pip install --no-cache-dir numpy==2.1.3 pandas==2.2.3

# Копируем всю папку py
COPY py/ ./py/

# Копируем Go-бинарь
COPY --from=build /src/server /app/server

EXPOSE 9000
CMD ["/app/server"]
