#!/bin/bash
# Pre-deployment check script
# Verifies database connectivity and migration status

set -e

echo "==================================="
echo "Pre-Deployment Database Check"
echo "==================================="
echo ""

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

source .env

echo "📋 Configuration:"
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo ""

# Test database connectivity
echo "🔌 Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    echo "   Check your .env file and Supabase firewall settings"
    echo "   Make sure postgresql-client is installed:"
    echo "   apt-get install postgresql-client"
    exit 1
fi

# Check if tables exist
echo ""
echo "📊 Checking database schema..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

echo "   Tables found: $(echo $TABLE_COUNT | tr -d ' ')"

# Check for Django-specific tables
echo ""
echo "🔍 Checking for Django tables..."
DJANGO_TABLES=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'django_%' ORDER BY table_name;")

if [ -z "$DJANGO_TABLES" ]; then
    echo "⚠️  No Django tables found - this looks like a new database"
    echo "   Migrations will run normally"
else
    echo "✅ Django tables found:"
    echo "$DJANGO_TABLES" | sed 's/^/   - /'
fi

# Check for application tables
echo ""
echo "🔍 Checking for application tables..."
APP_TABLES=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'expenses_%' ORDER BY table_name;")

if [ -z "$APP_TABLES" ]; then
    echo "⚠️  No application tables found"
else
    echo "✅ Application tables found:"
    echo "$APP_TABLES" | sed 's/^/   - /'
    
    # Count records in main tables
    echo ""
    echo "📈 Record counts:"
    for table in expenses_expense expenses_company expenses_paymentform expenses_expensetype; do
        COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        echo "   $table: $(echo $COUNT | tr -d ' ')"
    done
fi

# Check for users
echo ""
echo "👥 Checking for users..."
USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM auth_user;" 2>/dev/null || echo "0")

echo "   Users found: $(echo $USER_COUNT | tr -d ' ')"

echo ""
echo "==================================="
echo "✅ Pre-deployment check complete!"
echo "==================================="
echo ""

# Provide recommendations
if [ ! -z "$DJANGO_TABLES" ]; then
    echo "💡 Recommendation:"
    echo "   Database already has Django tables. The deployment will use"
    echo "   'migrate --fake-initial' to avoid recreating existing tables."
    echo ""
fi
