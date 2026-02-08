# VPS Deployment Migration - Summary

## What Was Done

Successfully created a complete VPS deployment configuration for the Minga Expenses application. All files are organized in the `CICD` folder for deployment configuration and `docs` folder for documentation.

## Files Created

### CICD Folder (Deployment Configuration)

**Dockerfiles**:
- `CICD/Dockerfile.backend` - Production backend (Django + Gunicorn)
- `CICD/Dockerfile.backend.dev` - Development backend (Django dev server)
- `CICD/Dockerfile.frontend` - Production frontend (React build + Nginx)
- `CICD/Dockerfile.frontend.dev` - Development frontend (Vite dev server)

**Docker Compose**:
- `CICD/docker-compose.dev.yml` - Local development environment
- `CICD/docker-compose.prod.yml` - Production environment

**Nginx Configuration**:
- `CICD/nginx/nginx.conf` - VPS reverse proxy with SSL
- `CICD/nginx/default.conf` - Frontend container Nginx for SPA

**Deployment Scripts**:
- `CICD/scripts/setup-vps.sh` - Initial VPS setup (Docker, Nginx, SSL, firewall)
- `CICD/scripts/deploy.sh` - Automated deployment/update script

**Configuration Templates**:
- `CICD/.env.example` - Environment variables template with documentation

### Documentation (docs Folder)

- `docs/README.md` - Documentation index and quick start
- `docs/migration.md` - Comprehensive migration guide (35+ sections)
- `docs/deployment-guide.md` - Step-by-step deployment instructions
- `docs/architecture.md` - Technical architecture documentation with diagrams

### Project Root Files

- `.dockerignore` - Exclude unnecessary files from Docker builds

### Modified Files

**Backend**:
- `requirements.txt` - Added gunicorn, psycopg2-binary, whitenoise
- `core/settings.py` - Updated for:
  - Environment-based database configuration (SQLite dev / PostgreSQL prod)
  - WhiteNoise for static files
  - CORS and CSRF from environment variables
  - Production security settings
  - Static/media file configuration

**Frontend**:
- `frontend/src/api/client.js` - Updated to use environment variable for API URL
- `frontend/.env.development` - Development API URL
- `frontend/.env.production` - Production API URL (template)
- `frontend/.env.example` - Environment variables template

## Architecture Overview

```
Internet (HTTPS)
    ↓
Nginx (VPS) - SSL Termination & Reverse Proxy
    ↓
    ├─→ Frontend Container (Nginx serving React build)
    └─→ Backend Container (Django + Gunicorn)
            ↓
        Supabase PostgreSQL
```

## Key Features Implemented

### 1. Docker Containerization
- Multi-stage builds for optimized images
- Separate dev and prod configurations
- Non-root users for security
- Health checks configured
- Volume management for persistence

### 2. Environment-Based Configuration
- Development uses SQLite
- Production uses Supabase PostgreSQL
- All secrets in environment variables
- Easy switching between environments

### 3. Security
- SSL/HTTPS with Let's Encrypt
- Firewall configuration (UFW)
- Secure cookies and HSTS headers
- CORS and CSRF protection
- Container isolation
- Non-root container users

### 4. Deployment Automation
- One-command VPS setup
- One-command deployment/updates
- Automated migrations
- Automated static file collection
- Health checks and monitoring

### 5. Comprehensive Documentation
- Migration guide with troubleshooting
- Step-by-step deployment instructions
- Architecture documentation with diagrams
- Quick reference commands
- Backup and restore procedures

## How to Use

### Local Development

```bash
# Start development environment
docker compose -f CICD/docker-compose.dev.yml up

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000/api/
# Admin: http://localhost:8000/admin/
```

### VPS Deployment

**First Time Setup**:
```bash
# 1. SSH to VPS
ssh root@<vps-ip>

# 2. Run setup script
curl -fsSL https://raw.githubusercontent.com/stifferdoroskevich/minga_expenses_v1/main/CICD/scripts/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh

# 3. Clone repository
cd /opt/minga_expenses
git clone https://github.com/stifferdoroskevich/minga_expenses_v1.git .

# 4. Configure environment
cp CICD/.env.example .env
nano .env  # Fill in your values

# 5. Setup SSL
cp CICD/nginx/nginx.conf /etc/nginx/sites-available/minga_expenses
ln -s /etc/nginx/sites-available/minga_expenses /etc/nginx/sites-enabled/
nano /etc/nginx/sites-available/minga_expenses  # Update YOUR_DOMAIN_OR_IP
nginx -t
systemctl restart nginx
certbot --nginx -d <your-ip>

# 6. Deploy
bash CICD/scripts/deploy.sh

# 7. Create superuser
docker exec -it minga_backend_prod python manage.py createsuperuser
```

**Subsequent Updates**:
```bash
cd /opt/minga_expenses
bash CICD/scripts/deploy.sh
```

## Environment Variables Needed

### Backend (.env in project root)

```bash
SECRET_KEY=<generate-random-key>
DEBUG=False
ALLOWED_HOSTS=<vps-ip>,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://<vps-ip>
CSRF_TRUSTED_ORIGINS=https://<vps-ip>

# Supabase Transaction Pooler (Recommended)
DATABASE_ENGINE=django.db.backends.postgresql
DB_NAME=postgres
DB_USER=postgres.<project-ref>
DB_PASSWORD=<password>
DB_HOST=aws-0-eu-central-1.pooler.supabase.com
DB_PORT=6543

STATIC_ROOT=/app/staticfiles
MEDIA_ROOT=/app/media
```

**💡 Tip:** Use Supabase's Transaction Pooler instead of direct connection for better performance with Docker.

### Frontend (.env.production)

```bash
VITE_API_BASE_URL=https://<vps-ip>/api/
```

## Testing

### Local Testing

1. **Development Environment**:
   ```bash
   docker compose -f CICD/docker-compose.dev.yml up
   # Test at http://localhost:5173
   ```

2. **Production Build (Local)**:
   ```bash
   docker compose -f CICD/docker-compose.prod.yml build
   docker compose -f CICD/docker-compose.prod.yml up
   # Test at http://localhost
   ```

### Production Testing

1. Access frontend: `https://<vps-ip>`
2. Test login functionality
3. Create/edit/delete expenses
4. Test import/export
5. Check analytics dashboard
6. Verify admin panel: `https://<vps-ip>/admin/`

## Monitoring & Maintenance

### View Logs
```bash
docker compose -f CICD/docker-compose.prod.yml logs -f
```

### Check Container Status
```bash
docker ps
docker stats
```

### Restart Services
```bash
docker compose -f CICD/docker-compose.prod.yml restart
```

### Database Backup
Via Supabase dashboard or:
```bash
docker exec minga_backend_prod pg_dump -h <host> -U <user> -d <db> > backup.sql
```

### SSL Renewal
Automatic via Certbot. Test with:
```bash
certbot renew --dry-run
```

## Troubleshooting

### Containers Not Starting
```bash
docker compose -f CICD/docker-compose.prod.yml logs
docker inspect <container-name>
```

### Database Connection Issues
- Verify Supabase credentials in .env
- Check DATABASE_ENGINE is set to postgresql
- Verify Supabase allows connections from VPS IP

### Nginx 502 Bad Gateway
- Check backend container is running: `docker ps`
- Check backend logs: `docker logs minga_backend_prod`

### Frontend Not Loading
- Check VITE_API_BASE_URL in frontend/.env.production
- Verify CORS_ALLOWED_ORIGINS in backend .env
- Check browser console for errors

## Security Checklist

- [x] Firewall configured (ports 22, 80, 443)
- [x] SSL/HTTPS enabled
- [x] Secure cookies in production
- [x] CORS restricted to specific origins
- [x] CSRF protection enabled
- [x] Strong SECRET_KEY generated
- [x] Database credentials secured in .env
- [x] .env files excluded from git
- [x] Containers run as non-root users
- [ ] SSH key authentication (recommended)
- [ ] Root login disabled (recommended)

## Next Steps

1. **Deploy to VPS**: Follow the deployment guide
2. **Test thoroughly**: Verify all functionality works
3. **Setup monitoring**: Consider adding Sentry for error tracking
4. **Configure backups**: Set up automated database backups
5. **Domain setup** (optional): If you get a domain, update configurations
6. **CI/CD** (optional): Add GitHub Actions for automated deployment

## Documentation Links

- **Full Migration Guide**: [docs/migration.md](docs/migration.md)
- **Deployment Steps**: [docs/deployment-guide.md](docs/deployment-guide.md)
- **Architecture Details**: [docs/architecture.md](docs/architecture.md)
- **Quick Start**: [docs/README.md](docs/README.md)

## Support

Repository: https://github.com/stifferdoroskevich/minga_expenses_v1

For issues:
1. Check troubleshooting sections in documentation
2. Review container logs
3. Create GitHub issue with details

## Summary

All deployment files and documentation have been created successfully. The project is now ready for:
- ✅ Local development with Docker
- ✅ Production deployment on Debian VPS
- ✅ SSL/HTTPS configuration
- ✅ Automated deployment and updates
- ✅ Comprehensive documentation

The migration maintains full compatibility with the existing project while adding production-ready containerization and deployment automation.
