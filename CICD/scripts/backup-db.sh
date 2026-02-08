#!/bin/bash
# Database backup script for production
# Creates a backup of the PostgreSQL database before deployment

set -e

echo "==================================="
echo "Database Backup Script"
echo "==================================="
echo ""

# Load environment variables
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

source .env

# Create backup directory
BACKUP_DIR="/opt/minga_expenses/backups/"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo "📦 Creating database backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Backup file: $BACKUP_FILE"
echo ""

# Use pg_dump directly
echo "Creating backup with pg_dump..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F p \
    > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Backup failed!"
    echo "   Make sure postgresql-client is installed:"
    echo "   apt-get install postgresql-client"
    exit 1
fi

# Check if backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "   Size: $BACKUP_SIZE"
    echo "   Location: $BACKUP_FILE"
    echo ""
    
    # Keep only last 7 backups
    echo "🗑️  Cleaning old backups (keeping last 7)..."
    ls -t "$BACKUP_DIR"/backup_*.sql | tail -n +8 | xargs -r rm
    
    echo "✅ Backup complete!"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "To restore this backup:"
echo "  cat $BACKUP_FILE | docker exec -i minga_backend_prod psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME"
echo ""
