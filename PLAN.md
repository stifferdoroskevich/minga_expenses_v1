## Minga Expenses — Practical Implementation Plan

### Current State (✅ Completed)
- ✅ Django 5.2 project created as "core"
- ✅ App "expenses" created
- ✅ Initial migration run
- ✅ Superuser created
- ✅ Virtual environment configured

---

## 🎯 STAGE 1: Local Django Admin (Testing & Validation)
**Goal**: Fully functional expense tracking using Django Admin only - NO frontend yet
**Use Case**: Manual data entry via Django Admin, test models and business logic locally

### Phase 1.1 — Project Wiring (IMMEDIATE NEXT)
**Goal**: Wire the expenses app into Django settings

### Tasks:
1. Add `'expenses'` to `INSTALLED_APPS` in `core/settings.py`
2. Configure timezone: `TIME_ZONE = 'UTC'` (or preferred)
3. Configure language: `LANGUAGE_CODE = 'en-us'`
4. Verify server runs: `python manage.py runserver`

**Exit Criteria**: Server runs without errors, admin accessible at http://127.0.0.1:8000/admin/

---

### Phase 1.2 — Models & Admin (CORE FUNCTIONALITY)
**Goal**: Create domain models with validation and admin interface

### 1.2.1 Create Models in `expenses/models.py`

#### Company Model (Master List)
- `name` (CharField, max_length=200, unique=True)
- `notes` (TextField, blank=True, null=True)
- `created_at`, `updated_at` (auto timestamps)

#### PaymentForm Model (Master List - "Formas de pago")
Payment forms like: Cash, Credit Card, Debit Card, Bank Transfer, PayPal, etc.
- `name` (CharField, max_length=100, unique=True)
- `description` (TextField, blank=True, null=True)
- `created_at`, `updated_at` (auto timestamps)

#### PaymentType Model (Master List - "Tipos de pago")
Payment types/categories like: Food, Transport, Utilities, Entertainment, Healthcare, Shopping, Services, etc.
- `name` (CharField, max_length=100, unique=True)
- `description` (TextField, blank=True, null=True)
- `created_at`, `updated_at` (auto timestamps)

#### Expense Model (Transactions)
Supports dual currency: EUR (primary) and PYG (Paraguayan Guaraníes). At least one currency must be filled.
- `date` (DateField)
- `description` (TextField)
- `amount_eur` (DecimalField, max_digits=10, decimal_places=2, blank=True, null=True) - Euros
- `amount_pyg` (DecimalField, max_digits=12, decimal_places=0, blank=True, null=True) - Paraguayan Guaraníes (no decimals)
- `company` (ForeignKey to Company, on_delete=PROTECT)
- `payment_form` (ForeignKey to PaymentForm, on_delete=PROTECT) - "FP" column
- `payment_type` (ForeignKey to PaymentType, on_delete=PROTECT) - "Tipo" column
- `created_at`, `updated_at` (auto timestamps)

**Constraints**:
- At least one currency (amount_eur OR amount_pyg) must be filled (validation in clean() method)
- If filled, amounts must be > 0
- Indexes on: date, company, payment_form, payment_type

### 1.2.2 Admin Registration in `expenses/admin.py`
Rich admin interfaces for easy data entry:
- **CompanyAdmin**: list_display, search_fields, ordering
- **PaymentFormAdmin**: list_display, search_fields (for "Formas de pago")
- **PaymentTypeAdmin**: list_display, search_fields (for "Tipos de pago")
- **ExpenseAdmin**:
  - list_display: date, company, payment_type, payment_form, amount_eur, amount_pyg, description
  - list_filter: date, company, payment_type, payment_form
  - search_fields: description, company__name
  - date_hierarchy: date
  - fieldsets for organized form layout

### 1.2.3 Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 1.2.4 Create Basic Tests in `expenses/tests.py`
- Company unique name constraint
- PaymentForm unique name constraint
- PaymentType unique name constraint
- Expense currency validation (at least one currency filled, amounts > 0)
- Model __str__ methods
- Foreign key relationships

---

### Phase 1.3 — Populate Initial Data & Test
**Goal**: Add real data via Django Admin and test the system

### Tasks:
1. Create master list entries via admin:
   - Add 5-10 companies you frequently use
   - Add payment forms: Cash, Credit Card, Debit Card, Bank Transfer, etc.
   - Add payment types: Food, Transport, Utilities, Entertainment, Healthcare, Shopping, Services, etc.
2. Create 20-30 test expenses with various scenarios:
   - EUR only expenses
   - PYG only expenses
   - Dual currency expenses
   - Different companies, payment forms, and types
3. Test admin interface functionality:
   - Filtering by date, company, payment type
   - Searching expenses
   - Editing existing expenses
   - Deleting expenses

**Exit Criteria (STAGE 1 COMPLETE)**:
- ✅ All models created and migrated
- ✅ Admin interface fully functional
- ✅ Can create/edit/delete all records via admin
- ✅ Constraints work correctly (unique names, currency validation)
- ✅ Master lists populated with real data
- ✅ 20+ test expenses entered and validated
- ✅ System works smoothly for daily expense tracking
- ✅ Basic tests pass

**🎉 STAGE 1 MILESTONE**: You can now track expenses locally using Django Admin!

---

## 🎯 STAGE 2: REST API & Frontend (Modern UI)
**Goal**: Build React frontend for better UX
**Prerequisites**: STAGE 1 complete and tested

### Phase 2.1 — API Layer (Django REST Framework)
**Goal**: RESTful API for React frontend

### 2.1.1 Install Dependencies
```bash
pip install djangorestframework django-cors-headers django-filter
```

### 2.1.2 Update Settings
- Add `'rest_framework'`, `'corsheaders'`, `'django_filters'` to `INSTALLED_APPS`
- Configure CORS for local development
- Add REST framework settings (pagination, auth)

### 2.1.3 Create Serializers in `expenses/serializers.py`
- CompanySerializer
- PaymentFormSerializer (for "Formas de pago")
- PaymentTypeSerializer (for "Tipos de pago")
- ExpenseSerializer (with nested read representations, dual currency support)

### 2.1.4 Create ViewSets in `expenses/views.py`
- CompanyViewSet
- PaymentFormViewSet (for "Formas de pago")
- PaymentTypeViewSet (for "Tipos de pago")
- ExpenseViewSet (with filtering by date range, company, payment_form, payment_type, currency)

### 2.1.5 Configure URLs
- Create `expenses/urls.py` with DRF routers
- Wire up in `core/urls.py`
- API browsable interface at `/api/`

### 2.1.6 API Tests
- Test CRUD operations for each endpoint
- Test filtering and pagination
- Test validation errors

**Exit Criteria**:
- ✅ API endpoints accessible at `/api/companies/`, `/api/payment-forms/`, `/api/payment-types/`, `/api/expenses/`
- ✅ Can CRUD via cURL/Postman/browser
- ✅ Filtering works (date range, company, payment_form, payment_type)
- ✅ Dual currency (EUR/PYG) properly handled in API responses
- ✅ API tests pass

---

### Phase 2.2 — Frontend Scaffold (Vite + React + Tailwind)
**Goal**: Basic React app that consumes the API

### 2.2.1 Create Frontend
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom axios
```

### 2.2.2 Configure Tailwind
- Update `tailwind.config.js`
- Add Tailwind directives to CSS

### 2.2.3 Create Basic Structure
- Layout component with navigation
- Routes: `/expenses`, `/expenses/new`, `/expenses/:id/edit`
- API client utility (axios with base URL)

### 2.2.4 Implement Core Views
- Expenses list (table with filters, showing both EUR and PYG columns)
- Create expense form (with dual currency inputs)
- Edit expense form (with dual currency inputs)
- Master list management (Companies, Payment Forms, Payment Types)

---

### Phase 2.3 — Dynamic Reference Creation (UX Enhancement)
**Goal**: Create master list items on-the-fly while adding expenses

### Features:
- Modal/dropdown combo for Company selection with "Add New" button
- Modal/dropdown combo for Payment Form selection with "Add New" (Formas de pago)
- Modal/dropdown combo for Payment Type selection with "Add New" (Tipos de pago)
- Optimistic UI updates
- Form validation and error handling

**Exit Criteria (STAGE 2 COMPLETE)**:
- ✅ Frontend runs on http://localhost:5173
- ✅ Can list expenses from API (both currencies displayed)
- ✅ Can create new expense (EUR and/or PYG)
- ✅ Can edit existing expense
- ✅ Can create master list items inline while adding expenses
- ✅ Proper validation (at least one currency required)
- ✅ Better UX than Django Admin

**🎉 STAGE 2 MILESTONE**: Modern frontend for expense tracking!

---

## 🎯 STAGE 3: Reports & Analytics
**Goal**: Insights and reports from expense data
**Prerequisites**: STAGE 2 complete

### Phase 3.1 — Backend Analytics Endpoints
**Goal**: Create API endpoints for aggregated data

### Tasks:
1. Create aggregation views in Django:
   - Monthly totals (EUR and PYG separated)
   - Totals by company
   - Totals by payment form
   - Totals by payment type
   - Date range filtering
2. Add to API endpoints: `/api/analytics/monthly/`, `/api/analytics/by-company/`, etc.
3. Test aggregations with existing data

---

### Phase 3.2 — Dashboard & Charts
**Goal**: Visual representation of expense data

### Features:
- Dashboard route: `/dashboard`
- Monthly expenses chart (separated by currency: EUR/PYG)
- Top 10 companies (showing both currencies)
- Breakdown by payment form (Formas de pago)
- Breakdown by payment type (Tipos de pago)
- Date range filters
- Currency selector (EUR only, PYG only, or both)

### Tech:
- Chart library: recharts or chart.js
- Responsive design for mobile

---

### Phase 3.3 — Export Functionality
**Goal**: Export expense data for external analysis

### Features:
- Export to CSV (with both EUR and PYG columns)
- Export to Excel (optional)
- Date range selection for export
- Filter by company, payment form, payment type before export

---

### Phase 3.4 — Import Functionality
**Goal**: Bulk import existing expense data from Excel/CSV files

### Features:
- Import button on Expenses list page
- Upload Excel (.xlsx) or CSV files
- Read "transacciones" sheet from Excel files
- Interactive column mapping interface:
  - Map Excel columns (A-G in Spanish) to system fields
  - Preview first 5 rows before import
  - Default mapping for known column names
- Auto-populate master lists from imported data:
  - Companies extracted from data
  - Payment Forms extracted from data
  - Expense Types extracted from data
  - Skip duplicates (unique name constraint)
- Validation before import:
  - Check required fields (date, amounts, company, payment form, expense type)
  - Validate data types (dates, numbers)
  - Show errors with row numbers
- Import summary:
  - Total rows processed
  - Successful imports
  - Errors/skipped rows
  - New master list items created

### Technical Requirements:
- Backend: Install `openpyxl` for Excel file parsing
- Parse Excel columns A to G from "transacciones" sheet
- Support Spanish column names (Fecha, Descripción, EUR, PYG, Empresa, FP, Tipo)
- Transaction: Import master lists first, then expenses
- Error handling: Continue on row errors, report at end

**Exit Criteria (STAGE 3 COMPLETE)**:
- ✅ Dashboard shows accurate aggregates for both currencies
- ✅ Charts render correctly with currency breakdown
- ✅ Filters work (date range, currency selector)
- ✅ CSV export includes both EUR and PYG columns
- ✅ Excel/CSV import with column mapping
- ✅ Master lists auto-populate from import data
- ✅ Import validation and error reporting
- ✅ Proper handling of expenses with dual currency
- ✅ Reports are accurate and useful for decision-making

**🎉 STAGE 3 MILESTONE**: Complete expense tracking with analytics and data migration!

---

## 🎯 STAGE 4: Cloud Deployment
**Goal**: Deploy to production for access from anywhere
**Prerequisites**: STAGE 3 complete and tested locally

### Phase 4.1 — Prepare for Production
**Goal**: Production-ready configuration

### Tasks:
1. Environment variables for secrets (SECRET_KEY, DB credentials, etc.)
2. Configure production database (PostgreSQL recommended)
3. Static files configuration (WhiteNoise or S3)
4. Security settings:
   - ALLOWED_HOSTS
   - CSRF_TRUSTED_ORIGINS
   - SECURE_SSL_REDIRECT
5. Error logging (Sentry or similar)

---

### Phase 4.2 — Deploy Backend
**Goal**: Deploy Django app to cloud

### Options:
- **Railway** (easiest, free tier available)
- **Render** (good free tier)
- **AWS Elastic Beanstalk** (more complex, scalable)
- **DigitalOcean App Platform**
- **Heroku** (paid only now)

### Tasks:
1. Choose hosting provider
2. Configure database (PostgreSQL)
3. Deploy Django app
4. Run migrations in production
5. Create superuser in production
6. Test admin interface in production

---

### Phase 4.3 — Deploy Frontend
**Goal**: Deploy React app to cloud

### Options:
- **Vercel** (recommended for React/Vite)
- **Netlify**
- **Cloudflare Pages**
- **AWS S3 + CloudFront**

### Tasks:
1. Build React app for production: `npm run build`
2. Configure environment variables (API URL)
3. Deploy to chosen provider
4. Configure custom domain (optional)
5. Test full flow in production

---

### Phase 4.4 — CI/CD (Optional but Recommended)
**Goal**: Automated testing and deployment

### Tasks:
1. GitHub Actions workflow:
   - Run Django tests on push
   - Run linting (flake8, black for Python)
   - Deploy on merge to main
2. Frontend CI:
   - Run tests (if any)
   - ESLint, Prettier for JS/React
   - Auto-deploy on merge to main

**Exit Criteria (STAGE 4 COMPLETE)**:
- ✅ Backend deployed and accessible via HTTPS
- ✅ Frontend deployed and accessible via HTTPS
- ✅ Database persists data correctly in production
- ✅ Can access from any device/location
- ✅ Security settings configured
- ✅ Error logging working
- ✅ Backups configured (database)
- ✅ CI/CD pipeline (optional but recommended)

**🎉 STAGE 4 MILESTONE**: Production-ready expense tracker accessible from anywhere!

---

## 🎉 Final Checklist

### Testing
- ✅ Test coverage > 70% (backend)
- ✅ All user flows tested manually
- ✅ Mobile responsiveness tested
- ✅ Cross-browser testing (Chrome, Firefox, Safari)

### Documentation
- ✅ README with setup instructions
- ✅ API documentation (optional: Swagger/OpenAPI)
- ✅ User guide (optional)

### Polish
- ✅ Error handling and loading states
- ✅ Form validation and user feedback
- ✅ Responsive design (mobile-friendly)
- ✅ Accessible (basic ARIA labels)

---

## Development Commands Reference

### Backend
```bash
# Activate venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# Run server
python manage.py runserver

# Migrations
python manage.py makemigrations
python manage.py migrate

# Run tests
python manage.py test

# Load fixtures
python manage.py loaddata expenses/fixtures/sample_data.json
```

### Frontend
```bash
cd frontend
npm install        # Install dependencies
npm run dev        # Run dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

---

## 🗺️ Roadmap Summary

| Stage | Status | Description | Key Milestone |
|-------|--------|-------------|---------------|
| **1** | 🔄 **CURRENT** | Local Django Admin only | Track expenses via admin interface |
| **2** | ⏳ Pending | REST API + React Frontend | Modern UI for expense tracking |
| **3** | ⏳ Pending | Reports & Analytics | Dashboard with charts and exports |
| **4** | ⏳ Pending | Cloud Deployment | Access from anywhere |

### Current Focus: STAGE 1
**Next Steps:**
1. Wire expenses app into settings
2. Create 4 models (Company, PaymentForm, PaymentType, Expense)
3. Register models in admin
4. Run migrations
5. Populate master lists
6. Test with real expense data

---

## 🎯 Current Priority: STAGE 1 - Phase 1.1 & 1.2
**Immediate next steps:**
1. Add `expenses` to `INSTALLED_APPS` in core/settings.py
2. Create the FOUR models (Company, PaymentForm, PaymentType, Expense with EUR/PYG)
3. Register models in admin with rich interfaces
4. Run migrations
5. Manually populate master lists via admin
6. Test with real expense data (20-30 entries)
7. Write basic model tests

**Once STAGE 1 is complete and tested with real data for a few weeks, move to STAGE 2 (Frontend)**


