FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src
ENV ADMIN_API_HOST=0.0.0.0

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY alembic.ini ./
COPY migrations ./migrations
COPY .env.example ./.env.example

RUN mkdir -p /app/data/project-documents

EXPOSE 8000

CMD ["sh", "-c", "uvicorn supply_bot.admin_api.app:create_admin_app --factory --host ${ADMIN_API_HOST:-0.0.0.0} --port ${PORT:-8000}"]
