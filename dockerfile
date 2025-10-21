FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

ENV DJANGO_SETTINGS_MODULE=core.settings_prod
ENV STATIC_ROOT=/app/staticfiles

RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["/app/entrypoint.sh"]