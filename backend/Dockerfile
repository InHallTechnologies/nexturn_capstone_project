FROM ghcr.io/astral-sh/uv:0.6-python3.12-bookworm-slim

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 5000
CMD ["python", "app.py"]
