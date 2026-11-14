FROM node:26-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend runtime, serving the API and the built frontend ---
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.12.18 /uv /usr/local/bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    UV_PYTHON_DOWNLOADS=never

# Dependencies first so they're cached until uv.lock changes
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-install-project

COPY backend/ ./
RUN uv sync --locked

COPY --from=frontend /frontend/dist ./static

ENV PATH="/app/.venv/bin:$PATH" \
    STATIC_DIR=/app/static \
    PYTHONUNBUFFERED=1

# Heroku sets $PORT at runtime; default to 8000 for local runs.
# exec makes uvicorn PID 1 so it receives SIGTERM and shuts down cleanly.
CMD ["sh", "-c", "exec uvicorn api.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
