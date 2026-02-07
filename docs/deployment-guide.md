# Minga Expenses - Deployment Guide

Complete step-by-step guide for deploying Minga Expenses to a Debian VPS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial VPS Setup](#initial-vps-setup)
3. [Configure Environment Variables](#configure-environment-variables)
4. [SSL Certificate Setup](#ssl-certificate-setup)
5. [First Deployment](#first-deployment)
6. [Create Django Superuser](#create-django-superuser)
7. [Verify Deployment](#verify-deployment)
8. [Updating the Application](#updating-the-application)
9. [Backup and Restore](#backup-and-restore)
10. [Monitoring](#monitoring)

## Prerequisites

### What You Need

1. **VPS Server**:
   - Debian 11 or 12
   - Minimum 1GB RAM, 1 CPU core
   - 20GB storage
   - Public IP address
   - Root or sudo access

2. **Supabase Database**:
   - PostgreSQL database already created
   - Connection credentials (host, database name, user, password)
   - Firewall configured to allow connections from VPS IP

3. **Local Machine**:
   - SSH client
   - Git configured
   - Code editor

4. **Repository**:
   - GitHub repository: https://github.com/stifferdoroskevich/minga_expenses_v1.git
   - Public access (no authentication needed)

### Collect Required Information

Before starting, gather:
- VPS IP address
- VPS root password or SSH key
- Supabase database credentials:
  - Host (e.g., `db.xxxxxxxxxxxx.supabase.co`)
  - Database name
  - Username
  - Password
  - Port (usually 5432)

## Initial VPS Setup

### Step 1: Connect to VPS

```bash
# SSH into your VPS as root
ssh root@<your-vps-ip>

# Or if using SSH key
ssh -i ~/.ssh/your_key root@<your-vps-ip>
```

### Step 2: Run Automated Setup Script

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/stifferdoroskevich/minga_expenses_v1/main/CICD/scripts/setup-vps.sh -o setup-vps.sh

chmod +x setup-vps.sh

./setup-vps.sh
```

The script will:
- Update system packages
- Install Docker and Docker Compose
- Install Nginx and Certbot
- Configure firewall (UFW)
- Create application directory
- Set up Docker networks

**Expected Duration**: 5-10 minutes

### Step 3: Clone Repository

```bash
cd /opt/minga_expenses

git clone https://github.com/stifferdoroskevich/minga_expenses_v1.git .
```

Verify files are present:
```bash
ls -la
# Should see: CICD/, core/, expenses/, frontend/, requirements.txt, etc.
```

## Configure Environment Variables

### Step 1: Create Backend .env File

```bash
cd /opt/minga_expenses

cp CICD/.env.example .env

nano .env
```

### Step 2: Fill in Environment Variables

```bash
# Django Settings
SECRET_KEY=<generate-random-key>
DEBUG=False
ALLOWED_HOSTS=<your-vps-ip>,localhost,127.0.0.1

# CORS Settings
CORS_ALLOWED_ORIGINS=https://<your-vps-ip>

# CSRF Settings
CSRF_TRUSTED_ORIGINS=https://<your-vps-ip>

# Database Configuration - PostgreSQL (Supabase)
DATABASE_ENGINE=django.db.backends.postgresql
DB_NAME=<your-database-name>
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
DB_HOST=<your-supabase-host>.supabase.co
DB_PORT=5432

# Static Files
STATIC_ROOT=/app/staticfiles
MEDIA_ROOT=/app/media
```

**Generate SECRET_KEY**:
```bash
# Method 1: Using Python
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Method 2: Using OpenSSL
openssl rand -base64 50
```

Save and exit (Ctrl+X, Y, Enter in nano).

### Step 3: Create Frontend Environment File

```bash
nano frontend/.env.production
```

Add:
```bash
VITE_API_BASE_URL=https://<your-vps-ip>/api/
```

Save and exit.

### Step 4: Verify Configuration

```bash
# Check .env exists and is not empty
cat .env | head -5

# Check frontend .env.production
cat frontend/.env.production
```

## SSL Certificate Setup

### Step 1: Configure Nginx

```bash
# Copy Nginx configuration
cp /opt/minga_expenses/CICD/nginx/nginx.conf /etc/nginx/sites-available/minga_expenses

# Edit the configuration to add your VPS IP
nano /etc/nginx/sites-available/minga_expenses
```

Find these lines and replace `YOUR_DOMAIN_OR_IP`:
```nginx
ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN_OR_IP/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN_OR_IP/privkey.pem;
```

**For IP address**: Use format like `123.45.67.89`

Save and exit.

### Step 2: Enable Nginx Configuration

```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/minga_expenses /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
```

You should see:
```
nginx: configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 3: Start Nginx

```bash
systemctl restart nginx
systemctl enable nginx
```

### Step 4: Generate SSL Certificate

```bash
# Create directory for certbot webroot
mkdir -p /var/www/certbot

# Generate certificate
certbot certonly --webroot -w /var/www/certbot -d <your-vps-ip>
```

Follow the prompts:
1. Enter your email address
2. Agree to Terms of Service (Y)
3. Agree to share email (optional)

**Note**: If using IP address, some certificate authorities may require additional verification.

### Step 5: Test SSL Auto-Renewal

```bash
certbot renew --dry-run
```

Should see: "Congratulations, all simulated renewals succeeded"

## First Deployment

### Step 1: Build and Start Containers

```bash
cd /opt/minga_expenses

# Run deployment script
bash CICD/scripts/deploy.sh
```

The script will:
1. Pull latest code from git
2. Build Docker images
3. Stop old containers
4. Start new containers
5. Run Django migrations
6. Collect static files
7. Perform health checks

**Expected Duration**: 5-10 minutes (first build takes longer)

### Step 2: Monitor Deployment

Watch the logs:
```bash
docker compose -f CICD/docker-compose.prod.yml logs -f
```

Press Ctrl+C to exit log viewing.

### Step 3: Check Container Status

```bash
docker ps
```

You should see two containers running:
- `minga_backend_prod`
- `minga_frontend_prod`

## Create Django Superuser

```bash
docker exec -it minga_backend_prod python manage.py createsuperuser
```

Follow the prompts:
1. Username: (choose a username)
2. Email: (your email)
3. Password: (choose a secure password)
4. Password (again): (repeat password)

## Verify Deployment

### 1. Check Frontend

Open browser: `https://<your-vps-ip>`

You should see the Minga Expenses login page.

### 2. Check Backend API

```bash
curl https://<your-vps-ip>/api/
```

Should return API endpoints list (JSON).

### 3. Check Django Admin

Open browser: `https://<your-vps-ip>/admin/`

Login with superuser credentials created earlier.

### 4. Test Full Workflow

1. Login to frontend
2. Create a test expense
3. View analytics dashboard
4. Check master lists
5. Test import/export (optional)

### 5. Check Container Logs

```bash
# Backend logs
docker compose -f CICD/docker-compose.prod.yml logs backend --tail=50

# Frontend logs
docker compose -f CICD/docker-compose.prod.yml logs frontend --tail=50
```

### 6. Check Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Updating the Application

### Regular Updates (Code Changes)

1. SSH into VPS:
   ```bash
   ssh root@<your-vps-ip>
   ```

2. Navigate to project:
   ```bash
   cd /opt/minga_expenses
   ```

3. Run deployment script:
   ```bash
   bash CICD/scripts/deploy.sh
   ```

The script automatically:
- Pulls latest code from GitHub
- Rebuilds Docker images
- Restarts containers
- Runs migrations
- Collects static files

### Manual Updates

If you need more control:

```bash
cd /opt/minga_expenses

# Pull latest code
git pull origin main

# Rebuild images
docker compose -f CICD/docker-compose.prod.yml build

# Stop containers
docker compose -f CICD/docker-compose.prod.yml down

# Start containers
docker compose -f CICD/docker-compose.prod.yml up -d

# Run migrations
docker exec -it minga_backend_prod python manage.py migrate

# Collect static files
docker exec -it minga_backend_prod python manage.py collectstatic --noinput
```

### Rollback to Previous Version

```bash
cd /opt/minga_expenses

# View commit history
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash>

# Rebuild and restart
bash CICD/scripts/deploy.sh
```

## Backup and Restore

### Database Backup (Supabase)

**Option 1: Supabase Dashboard**
1. Login to Supabase dashboard
2. Navigate to your project
3. Go to Database → Backups
4. Create manual backup or configure automatic backups

**Option 2: Manual pg_dump**
```bash
# Create backup directory
mkdir -p /opt/minga_expenses/backups

# Backup database
docker exec minga_backend_prod pg_dump \
  -h <supabase-host> \
  -U <db-user> \
  -d <db-name> \
  > /opt/minga_expenses/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore

```bash
# Restore from backup
docker exec -i minga_backend_prod psql \
  -h <supabase-host> \
  -U <db-user> \
  -d <db-name> \
  < /opt/minga_expenses/backups/backup_YYYYMMDD_HHMMSS.sql
```

### Application Backup

```bash
# Backup configuration
tar -czf /root/minga_backup_$(date +%Y%m%d).tar.gz \
  /opt/minga_expenses/.env \
  /opt/minga_expenses/frontend/.env.production \
  /etc/nginx/sites-available/minga_expenses
```

### Media Files Backup

```bash
# Backup uploaded files (if any)
docker run --rm \
  -v minga_expenses_media_volume:/data \
  -v /opt/minga_expenses/backups:/backup \
  alpine tar -czf /backup/media_$(date +%Y%m%d).tar.gz /data
```

## Monitoring

### Check System Resources

```bash
# Overall system status
htop

# Docker container resources
docker stats

# Disk usage
df -h

# Memory usage
free -h
```

### View Application Logs

```bash
# Real-time logs (all services)
docker compose -f CICD/docker-compose.prod.yml logs -f

# Backend only
docker compose -f CICD/docker-compose.prod.yml logs -f backend

# Frontend only
docker compose -f CICD/docker-compose.prod.yml logs -f frontend

# Last 100 lines
docker compose -f CICD/docker-compose.prod.yml logs --tail=100
```

### Check Container Health

```bash
# Container status
docker ps

# Detailed container info
docker inspect minga_backend_prod

# Container logs
docker logs minga_backend_prod --tail=50

# Execute command in container
docker exec -it minga_backend_prod bash
```

### Monitor Nginx

```bash
# Access log
tail -f /var/log/nginx/access.log

# Error log
tail -f /var/log/nginx/error.log

# Test configuration
nginx -t

# Reload configuration
systemctl reload nginx
```

### Database Monitoring

```bash
# Connect to database
docker exec -it minga_backend_prod python manage.py dbshell

# Check migrations
docker exec -it minga_backend_prod python manage.py showmigrations

# Run Django checks
docker exec -it minga_backend_prod python manage.py check --deploy
```

### SSL Certificate Status

```bash
# Check certificates
certbot certificates

# Test renewal
certbot renew --dry-run

# View certificate details
openssl x509 -in /etc/letsencrypt/live/<your-ip>/fullchain.pem -text -noout
```

## Troubleshooting Commands

### Restart Services

```bash
# Restart all containers
docker compose -f CICD/docker-compose.prod.yml restart

# Restart specific container
docker restart minga_backend_prod

# Restart Nginx
systemctl restart nginx
```

### Clean Up Docker

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (careful!)
docker system prune -a --volumes
```

### Network Issues

```bash
# Check open ports
ss -tulpn | grep LISTEN

# Test connectivity
curl -I https://<your-vps-ip>

# Check firewall
ufw status

# Check DNS (if using domain)
nslookup <your-domain>
```

### Permission Issues

```bash
# Fix ownership
chown -R deploy:deploy /opt/minga_expenses

# Fix permissions
chmod -R 755 /opt/minga_expenses
chmod +x /opt/minga_expenses/CICD/scripts/*.sh
```

## Maintenance Tasks

### Weekly Tasks
- Check application logs for errors
- Verify backups are running
- Monitor disk space usage

### Monthly Tasks
- Update system packages: `apt update && apt upgrade`
- Review SSL certificate expiry
- Check security updates
- Review database performance

### Quarterly Tasks
- Full system backup
- Security audit
- Performance optimization review
- Update documentation

## Security Checklist

- [ ] Firewall configured (ports 22, 80, 443 only)
- [ ] SSH key authentication enabled
- [ ] Root login disabled (optional)
- [ ] SSL certificates installed and auto-renewing
- [ ] Secure passwords for Django admin
- [ ] Database uses strong password
- [ ] .env files not in version control
- [ ] Regular backups configured
- [ ] System packages updated
- [ ] Docker containers run as non-root users

## Support

For issues:
1. Check logs: `docker compose -f CICD/docker-compose.prod.yml logs`
2. Review [migration.md](migration.md) troubleshooting section
3. Check [architecture.md](architecture.md) for system overview
4. GitHub Issues: https://github.com/stifferdoroskevich/minga_expenses_v1/issues

## Quick Reference

### Essential Commands

```bash
# Deploy/Update
cd /opt/minga_expenses && bash CICD/scripts/deploy.sh

# View logs
docker compose -f CICD/docker-compose.prod.yml logs -f

# Restart
docker compose -f CICD/docker-compose.prod.yml restart

# Stop
docker compose -f CICD/docker-compose.prod.yml down

# Start
docker compose -f CICD/docker-compose.prod.yml up -d

# Django shell
docker exec -it minga_backend_prod python manage.py shell

# Database migrations
docker exec -it minga_backend_prod python manage.py migrate

# Create superuser
docker exec -it minga_backend_prod python manage.py createsuperuser

# Collect static files
docker exec -it minga_backend_prod python manage.py collectstatic --noinput
```

### Important Paths

- Application: `/opt/minga_expenses`
- Nginx config: `/etc/nginx/sites-available/minga_expenses`
- SSL certificates: `/etc/letsencrypt/live/<your-ip>/`
- Nginx logs: `/var/log/nginx/`
- Environment: `/opt/minga_expenses/.env`
