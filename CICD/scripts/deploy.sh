#!/bin/bash
# Deployment script for Minga Expenses
# Run this script from the project root directory

set -e  # Exit on error

echo "==================================="
echo "Minga Expenses Deployment Script"
echo "==================================="
echo ""

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file from CICD/.env.example"
    exit 1
fi

echo "📁 Current directory: $PROJECT_ROOT"

# Pull latest changes from git (if in git repo)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes from git..."
    git pull origin $(git branch --show-current) || echo "⚠️  Git pull failed or not configured"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f CICD/docker-compose.prod.yml down || true

# Remove old images (optional, uncomment to enable)
# echo "🗑️  Removing old images..."
# docker compose -f CICD/docker-compose.prod.yml rm -f

# Build new images
echo "🔨 Building Docker images..."
docker compose -f CICD/docker-compose.prod.yml build --no-cache

# Start containers
echo "🚀 Starting containers..."
docker compose -f CICD/docker-compose.prod.yml up -d

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Check if containers are running
echo "🔍 Checking container status..."
docker compose -f CICD/docker-compose.prod.yml ps

# Show logs
echo ""
echo "📋 Container logs (last 20 lines):"
docker compose -f CICD/docker-compose.prod.yml logs --tail=20

# Health check
echo ""
echo "🏥 Performing health check..."
if docker exec minga_backend_prod python manage.py check --deploy 2>/dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed (may need manual inspection)"
fi

# Restart Nginx to pick up any changes
if command -v nginx &> /dev/null; then
    echo "🔄 Reloading Nginx..."
    nginx -t && systemctl reload nginx || echo "⚠️  Nginx reload failed"
fi

echo ""
echo "==================================="
echo "✅ Deployment Complete!"
echo "==================================="
echo ""
echo "Useful commands:"
echo "  View logs: docker compose -f CICD/docker-compose.prod.yml logs -f"
echo "  Stop:      docker compose -f CICD/docker-compose.prod.yml down"
echo "  Restart:   docker compose -f CICD/docker-compose.prod.yml restart"
echo "  Shell:     docker exec -it minga_backend_prod bash"
echo ""
echo "Create superuser (first time only):"
echo "  docker exec -it minga_backend_prod python manage.py createsuperuser"
echo ""
