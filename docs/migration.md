# Minga Expenses - VPS Migration Guide

## Overview

This document provides a comprehensive guide for migrating the Minga Expenses application from local development to a production VPS (Virtual Private Server) running Debian. The migration uses Docker and Docker Compose for containerization, with separate configurations for development and production environments.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Migration Components](#migration-components)
6. [Environment Configuration](#environment-configuration)
7. [Database Migration](#database-migration)
8. [Docker Configuration](#docker-configuration)
9. [Testing Locally](#testing-locally)
10. [VPS Deployment](#vps-deployment)
11. [Post-Deployment](#post-deployment)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

The application consists of two main components:

- **Backend**: Django 5.2 REST API with token-based authentication
- **Frontend**: React 19 Single Page Application (SPA) built with Vite

### Production Architecture

```
Internet (HTTPS:443)
    ↓
Nginx (SSL Termination + Reverse Proxy)
    ↓
    ├── → Frontend Container (Nginx serving React build)
    └── → Backend Container (Django + Gunicorn)
            ↓
        Supabase PostgreSQL (External)
```

### Development Architecture

```
Docker Compose (dev)
    ├── Backend Container (Django dev server on :8000)
    │   └── SQLite (volume mounted)
    └── Frontend Container (Vite dev server on :5173)
```

## Prerequisites

### Local Development
- Docker Engine 20.10+
- Docker Compose V2
- Git
- Code editor (VS Code, etc.)

### VPS (Production)
- Debian 11 or 12
- Minimum 1GB RAM, 1 CPU core
- 20GB storage
- Root or sudo access
- Public IP address
- SSH access configured

### External Services
- Supabase PostgreSQL database (existing)
- GitHub repository (public)

## Project Structure

```
minga_expenses_v1/
├── CICD/                          # Deployment configuration
│   ├── Dockerfile.backend         # Backend production image
│   ├── Dockerfile.backend.dev     # Backend development image
│   ├── Dockerfile.frontend        # Frontend production image
│   ├── Dockerfile.frontend.dev    # Frontend development image
│   ├── docker-compose.dev.yml     # Development environment
│   ├── docker-compose.prod.yml    # Production environment
│   ├── .env.example              # Environment variables template
│   ├── nginx/
│   │   ├── nginx.conf            # VPS Nginx configuration
│   │   └── default.conf          # Frontend container Nginx
│   └── scripts/
│       ├── setup-vps.sh          # Initial VPS setup script
│       └── deploy.sh             # Deployment automation
├── docs/                         # Documentation
│   ├── migration.md              # This file
│   ├── deployment-guide.md       # Step-by-step deployment
│   └── architecture.md           # Architecture documentation
├── core/                         # Django project settings
├── expenses/                     # Django app
├── frontend/                     # React application
├── .dockerignore                 # Docker build exclusions
├── .env                         # Environment variables (not in git)
└── requirements.txt             # Python dependencies
```

## Technology Stack

### Backend
- **Framework**: Django 5.2 + Django REST Framework
- **Language**: Python 3.13
- **WSGI Server**: Gunicorn (production)
- **Database**: SQLite (dev), PostgreSQL (prod via Supabase)
- **Static Files**: WhiteNoise
- **Dependencies**: django-cors-headers, django-filter, openpyxl, python-dotenv

### Frontend
- **Framework**: React 19 with React DOM
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **HTTP Client**: Axios 1.12
- **Routing**: React Router DOM 7
- **Charts**: Recharts 3

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (reverse proxy + SSL termination)
- **SSL**: Let's Encrypt (Certbot)
- **OS**: Debian 11/12

## Migration Components

### 1. Docker Configuration

#### Backend Dockerfiles

**Production** (`CICD/Dockerfile.backend`):
- Python 3.13 slim base image
- Non-root user for security
- Installs dependencies from requirements.txt
- Includes Gunicorn for WSGI serving
- Collects static files with WhiteNoise
- Runs database migrations on startup
- Exposes port 8000

**Development** (`CICD/Dockerfile.backend.dev`):
- Similar base configuration
- Uses Django development server
- Supports hot-reload via volume mounting
- No static file collection

#### Frontend Dockerfiles

**Production** (`CICD/Dockerfile.frontend`):
- Multi-stage build
- Stage 1: Node 20 builds React app
- Stage 2: Nginx alpine serves static build
- Optimized for small image size
- Configured for SPA routing

**Development** (`CICD/Dockerfile.frontend.dev`):
- Node 20 alpine
- Runs Vite dev server with HMR
- Volume-mounted for hot-reload

### 2. Docker Compose Configurations

#### Development (`docker-compose.dev.yml`)
- Backend: Django dev server, SQLite database
- Frontend: Vite dev server on port 5173
- Volume mounting for hot-reload
- Local network for inter-container communication

#### Production (`docker-compose.prod.yml`)
- Backend: Gunicorn, PostgreSQL connection
- Frontend: Nginx serving production build
- Named volumes for persistence
- Health checks configured
- Environment from .env file

### 3. Backend Configuration Changes

**Database Configuration** (settings.py):
- Environment-based database selection
- SQLite for development (DATABASE_ENGINE not set)
- PostgreSQL for production (from env variables)
- Support for DATABASE_URL or individual DB_ variables
- Connection pooling (CONN_MAX_AGE=600)

**CORS Configuration**:
- Environment variable for allowed origins
- Comma-separated list support
- Credentials enabled for token authentication

**Static Files**:
- WhiteNoise middleware for serving static files
- STATIC_ROOT configurable via environment
- Compressed and cached static files

**Security Settings** (production only):
- SSL redirect
- Secure cookies
- HSTS headers
- XSS protection
- Content type sniffing protection

### 4. Frontend Configuration Changes

**API Client** (src/api/client.js):
- Uses `import.meta.env.VITE_API_BASE_URL`
- Fallback to localhost for development
- Environment-specific configuration

**Environment Files**:
- `.env.development`: Points to localhost:8000
- `.env.production`: Points to VPS IP/domain
- `.env.example`: Template for developers

### 5. Nginx Configuration

**VPS Main Nginx** (`nginx.conf`):
- HTTP to HTTPS redirect (port 80 → 443)
- SSL configuration with Let's Encrypt certificates
- Reverse proxy to frontend container (/)
- Reverse proxy to backend container (/api/, /admin/)
- Static files served directly (/static/, /media/)
- Security headers
- Gzip compression

**Frontend Container Nginx** (`default.conf`):
- Serves React build from /usr/share/nginx/html
- SPA fallback routing (all routes → index.html)
- Static asset caching (1 year)
- Gzip compression

## Environment Configuration

### Backend (.env in project root)

```bash
# Django Settings
SECRET_KEY=<generate-with-django>
DEBUG=False
ALLOWED_HOSTS=<vps-ip>,localhost,127.0.0.1

# CORS Settings
CORS_ALLOWED_ORIGINS=https://<vps-ip>

# CSRF Settings
CSRF_TRUSTED_ORIGINS=https://<vps-ip>

# Database (Supabase Transaction Pooler - Recommended)
DATABASE_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres.<your-project-ref>
DB_PASSWORD=<supabase-password>
DB_HOST=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=6543

# Static Files
STATIC_ROOT=/app/staticfiles
MEDIA_ROOT=/app/media
```

**Note:** Using Supabase's Transaction Pooler is recommended for:
- Better connection pooling with Docker containers
- IPv4 compatibility (avoids IPv6 networking issues)
- Optimized for short-lived connections

Find your Transaction Pooler connection string in Supabase Dashboard → Project Settings → Database → Connection String → Transaction pooler.

### Frontend (.env.production in frontend/)

```bash
VITE_API_BASE_URL=https://<vps-ip>/api/
```

## Database Migration

### Current State
- **Local**: SQLite database (`db.sqlite3`)
- **Production**: Supabase PostgreSQL (already provisioned)

### Migration Strategy

1. **Development**: Continue using SQLite (no changes needed)
2. **Production**: Connect to existing Supabase PostgreSQL

### Migration Steps

1. Export data from local SQLite (if needed):
   ```bash
   python manage.py dumpdata --exclude auth.permission --exclude contenttypes > data.json
   ```

2. Configure production database in .env with Supabase credentials

3. Run migrations on production:
   ```bash
   docker exec -it minga_backend_prod python manage.py migrate
   ```

4. Import data (if needed):
   ```bash
   docker exec -it minga_backend_prod python manage.py loaddata data.json
   ```

5. Create superuser:
   ```bash
   docker exec -it minga_backend_prod python manage.py createsuperuser
   ```

## Docker Configuration

### Building Images

**Development**:
```bash
docker compose -f CICD/docker-compose.dev.yml build
```

**Production** (local testing):
```bash
docker compose -f CICD/docker-compose.prod.yml build
```

### Running Containers

**Development**:
```bash
docker compose -f CICD/docker-compose.dev.yml up
```

**Production**:
```bash
docker compose -f CICD/docker-compose.prod.yml up -d
```

### Useful Commands

```bash
# View logs
docker compose -f CICD/docker-compose.prod.yml logs -f

# Stop containers
docker compose -f CICD/docker-compose.prod.yml down

# Restart containers
docker compose -f CICD/docker-compose.prod.yml restart

# Execute command in container
docker exec -it minga_backend_prod python manage.py shell

# View running containers
docker ps

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune
```

## Testing Locally

### Development Environment Test

1. Start development environment:
   ```bash
   docker compose -f CICD/docker-compose.dev.yml up
   ```

2. Access services:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/
   - Django Admin: http://localhost:8000/admin/

3. Test features:
   - Login functionality
   - Create/edit/delete expenses
   - Master lists management
   - Import/export functionality
   - Analytics dashboard

### Production Environment Test (Local)

1. Create .env file with production-like configuration
2. Build and start:
   ```bash
   docker compose -f CICD/docker-compose.prod.yml build
   docker compose -f CICD/docker-compose.prod.yml up
   ```

3. Access services:
   - Frontend: http://localhost (port 80)
   - Backend: http://localhost:8000 (exposed for testing)

4. Verify:
   - Production build loads correctly
   - API endpoints work
   - Static files serve properly
   - Database connectivity

## VPS Deployment

See [deployment-guide.md](deployment-guide.md) for detailed step-by-step instructions.

## Post-Deployment

### Verification

1. **Health Checks**:
   ```bash
   docker ps  # All containers running
   docker compose -f CICD/docker-compose.prod.yml logs --tail=50
   ```

2. **Service Endpoints**:
   - Frontend: https://<vps-ip>
   - API: https://<vps-ip>/api/
   - Admin: https://<vps-ip>/admin/

3. **SSL Certificate**:
   ```bash
   certbot certificates
   ```

### Monitoring

1. **Container Status**:
   ```bash
   docker stats
   ```

2. **Logs**:
   ```bash
   docker compose -f CICD/docker-compose.prod.yml logs -f backend
   docker compose -f CICD/docker-compose.prod.yml logs -f frontend
   ```

3. **Nginx Logs**:
   ```bash
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   ```

### Maintenance

1. **Update Application**:
   ```bash
   cd /opt/minga_expenses
   bash CICD/scripts/deploy.sh
   ```

2. **Database Backup**:
   - Use Supabase dashboard for automated backups
   - Or manually with pg_dump:
   ```bash
   pg_dump -h <host> -U <user> -d <db> > backup.sql
   ```

3. **SSL Renewal**:
   - Automatic via Certbot
   - Test renewal: `certbot renew --dry-run`

## Troubleshooting

### Container Issues

**Containers not starting**:
```bash
docker compose -f CICD/docker-compose.prod.yml logs
docker inspect <container-name>
```

**Port conflicts**:
```bash
sudo netstat -tulpn | grep :8000
# Kill conflicting process or change port
```

### Database Issues

**Connection refused**:
- Check Supabase credentials in .env
- Verify Supabase allows connections from VPS IP
- Check DATABASE_ENGINE setting

**Migration errors**:
```bash
docker exec -it minga_backend_prod python manage.py showmigrations
docker exec -it minga_backend_prod python manage.py migrate --fake-initial
```

### Nginx Issues

**502 Bad Gateway**:
- Backend container not running: `docker ps`
- Check backend logs: `docker logs minga_backend_prod`
- Verify proxy_pass URLs in nginx.conf

**SSL certificate errors**:
```bash
certbot certificates
certbot renew --force-renewal
```

### Frontend Issues

**API connection errors**:
- Check VITE_API_BASE_URL in .env.production
- Verify CORS_ALLOWED_ORIGINS in backend .env
- Check browser console for CORS errors

**404 on refresh**:
- Verify SPA fallback in nginx config: `try_files $uri /index.html`

### Performance Issues

**Slow response times**:
- Check container resources: `docker stats`
- Increase Gunicorn workers in Dockerfile.backend
- Enable database query logging

**High memory usage**:
- Reduce Gunicorn workers
- Add swap space to VPS
- Monitor with `htop`

## Security Best Practices

1. **Environment Variables**: Never commit .env files to git
2. **Secret Key**: Generate unique SECRET_KEY for production
3. **SSH**: Use key-based authentication, disable password auth
4. **Firewall**: Only expose ports 22, 80, 443
5. **Updates**: Keep system packages updated
6. **Backups**: Regular database backups
7. **Monitoring**: Set up error tracking (Sentry, etc.)
8. **SSL**: Keep certificates renewed
9. **Docker**: Run containers as non-root users
10. **Database**: Use strong passwords, SSL connections

## Next Steps

1. Set up automated backups
2. Configure monitoring and alerting
3. Add CI/CD pipeline (GitHub Actions)
4. Set up staging environment
5. Implement log aggregation
6. Add performance monitoring

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
