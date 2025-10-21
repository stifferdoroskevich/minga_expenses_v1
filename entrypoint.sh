#!/bin/bash
set -e

python manage.py migrate
python manage.py collectstatic --noinput

exec gunicorn --bind 0.0.0.0:8000 --workers 2 core.wsgi:application