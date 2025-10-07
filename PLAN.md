## Minga Expenses — Layered Implementation Plan

### Overview
Admin-first validation with Django, then add a REST API, and finally a Tailwind + React frontend. Each phase has clear exit criteria and tests.

### Quickstart Commands
```bash
# Environment (Python 3.13)
python3.13 -m venv .venv && source .venv/bin/activate
python -m pip install --upgrade pip
pip install "Django==5.2.*"

# Project + app
django-admin startproject minga_expenses .
python manage.py startapp expenses

# DB + admin
python manage.py migrate
python manage.py createsuperuser

# Smoke test
python manage.py runserver 0.0.0.0:8000
```

### Phase 0 — Project wiring (admin-first)
- Add `expenses` to `INSTALLED_APPS` in `minga_expenses/settings.py`.
- Configure `TIME_ZONE`, `LANGUAGE_CODE`, `STATIC_URL`.
- Exit criteria: server runs, admin accessible.

### Phase 1 — Domain and Admin validation
- Models
  - `Company(name, notes?)`
  - `PaymentMethod(name, description?)`
  - `Expense(category, date, total_value, description, company FK, payment_method FK)`
- Constraints and indexing
  - `Company.name` unique; `PaymentMethod.name` unique
  - `total_value > 0`
  - Index: `date`, `company`, `payment_method`
- Admin
  - Register all models
  - `list_display`, `list_filter` (date, company, method), `search_fields`
- Tests
  - Model constraints, `__str__`, create flows
- Exit criteria: CRUD via admin works; tests green.

### Phase 2 — API foundation (for React later)
- Add Django REST Framework and CORS
- Endpoints: CRUD for `Company`, `PaymentMethod`, `Expense`
- Filters: date range, company, payment method
- Auth: session auth initially
- Exit criteria: CRUD works via cURL/Postman; tests for serializers/views.

### Phase 3 — Frontend scaffold (Tailwind + React)
- Create Vite React app in `frontend/`
- Install TailwindCSS; base layout and routing
- Routes: `/dashboard`, `/expenses`, `/expenses/new`, `/expenses/:id/edit`
- Wire API client; list expenses; create expense
- Exit criteria: Can list and create expense through API.

### Phase 4 — Dynamic reference creation (React UX)
- Modal CRUD for `Company` and `PaymentMethod`
- Async selects with create-on-the-fly; optimistic UI
- Exit criteria: Create expense while adding missing references inline.

### Phase 5 — Dashboard and polish
- Aggregates: totals by month, by company, by payment method
- Pagination and filters; loading/error states
- Exit criteria: Dashboard accurate; core flows covered by tests.

### Phase 6 — Fixtures and CI
- Seed a few references and sample expenses
- Lightweight CI to run tests on push

### Milestones
- A: Admin-first models validated (create/update/delete in admin + tests)
- B: API CRUD green with coverage
- C: React scaffold renders lists and creates expense
- D: Inline modal creation works; dashboard accurate


