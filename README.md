# Minga Expenses

Dual-currency (EUR/PYG) expense tracking application with Django REST Framework backend and React frontend.

## Features

- 📊 Expense tracking with EUR and PYG currencies
- 📈 Dashboard with analytics and charts
- 📥 Import from Excel/CSV with column mapping
- 📤 Export to CSV
- 🏢 Master lists management (Companies, Payment Forms, Expense Types)
- 🔍 Searchable dropdowns with inline creation
- 🔐 Token-based authentication

## Tech Stack

**Backend:** Django 5.2, Django REST Framework, SQLite
**Frontend:** React 18, Vite, Tailwind CSS v4, Recharts

## Setup

### Backend
```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

- **Frontend:** http://localhost:5173
- **Backend API:** http://127.0.0.1:8000/api/
- **Django Admin:** http://127.0.0.1:8000/admin/

## Import Data

1. Go to Expenses page
2. Click "Import" button
3. Upload Excel (.xlsx) or CSV file
4. Map columns to system fields (auto-detects Spanish column names)
5. Review and import

**Supported column names:** Empresa, Obs, Gs, Euros, Tipo, Fec/Fecha, FP

## Clear All Data

To reset database to starting point (deletes all expenses and master lists):

```bash
# Show warning and data counts (safe, won't delete)
python manage.py clear_all_data

# Actually delete all data (requires confirmation)
python manage.py clear_all_data --confirm
# Then type: DELETE ALL
```

**⚠️ Warning:** This deletes ALL expenses, companies, payment forms, and expense types. Users are preserved.

## Development

```bash
# Backend tests
python manage.py test

# Check Django configuration
python manage.py check

# Create new migrations
python manage.py makemigrations
```

## Project Structure

```
minga_expenses_1/
├── core/                 # Django project settings
├── expenses/             # Main Django app
│   ├── models.py        # Data models
│   ├── serializers.py   # DRF serializers
│   ├── views.py         # API viewsets
│   ├── analytics_views.py   # Analytics endpoints
│   ├── import_views.py      # Import functionality
│   └── management/commands/ # Custom commands
└── frontend/            # React app
    ├── src/
    │   ├── pages/       # Route components
    │   ├── components/  # Reusable components
    │   ├── api/         # API client
    │   └── context/     # React context
    └── package.json
```

## License

Private project for personal use.
