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

FRONTEND

 Run these commands from your project root:

  # Create Vite React project
  npm create vite@latest frontend -- --template react
  choose react , then javascript

  # Navigate to frontend folder
  cd frontend

  # Install dependencies
  npm install

  # Install Tailwind CSS
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
debug frontend 

  # Check if tailwindcss is in node_modules
  ls node_modules/.bin

  # Or try this alternative command to initialize Tailwind
  node node_modules/tailwindcss/lib/cli.js init -p



  # Install additional dependencies
  npm install react-router-dom axios
  npm list react-router-dom
  npm list axios

 # Install the Tailwind PostCSS plugin
  npm install -D @tailwindcss/postcss

  cd frontend
  npm run dev
