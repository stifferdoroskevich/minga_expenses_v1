# 1. Delete the database file
  del db.sqlite3

  # 2. Delete existing migrations (keep __init__.py)
  del expenses\migrations\0001_initial.py

  # 3. Create fresh migrations
  python manage.py makemigrations

  # 4. Apply migrations
  python manage.py migrate

  # 5. Create superuser again
  python manage.py createsuperuser

  # 6. Run tests to verify everything works
  python manage.py test

  # 7. Start the server
  python manage.py runserver
