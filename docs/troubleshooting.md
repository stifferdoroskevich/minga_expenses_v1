# Deployment Troubleshooting & Common Issues

## Common Issues & Solutions

### 1. Login Returns 403 CSRF Error

**Problem**: Login request fails with "CSRF token missing" error.

**Solution**: The login endpoint needs to exempt authentication classes.

In `expenses/auth_views.py`:
```python
from rest_framework.decorators import authentication_classes

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Important: Disable auth for login
def login(request):
    # ... rest of code
```

### 2. CORS Errors - "No trailing slash"

**Problem**: CORS fails with origins that have trailing slashes.

**Solution**: NEVER add trailing slashes to CORS/CSRF origins:

❌ **Wrong**:
```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com/
CSRF_TRUSTED_ORIGINS=https://yourdomain.com/
```

✅ **Correct**:
```bash
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
```

### 3. SSL Certificate Mismatch

**Problem**: Browser shows `ERR_CERT_COMMON_NAME_INVALID`

**Cause**: Accessing site by IP but certificate is for domain name.

**Solution**: Use the domain that matches your SSL certificate:
- Certificate for: `static.<reverse IP DNS>.clients.your-server.de`
- Access via: `https://static.<reverse IP DNS>.clients.your-server.de` (not IP)

### 4. PostgreSQL Version Mismatch

**Problem**: `pg_dump: error: server version mismatch`

**Solution** (for Fedora):
```bash
sudo dnf install postgresql17
```

### 5. Database Connection: "Tenant or user not found"

**Problem**: Supabase Transaction Pooler connection fails.

**Check**:
1. Username format: `postgres.your_project_ref`
2. Host: `aws-1-eu-central-1.pooler.supabase.com
3. Port: `6543` (not 5432)
4. Database: `postgres`

### 6. Frontend Returns 404 for /api/

**Problem**: API requests fail, Nginx returns 404.

**Causes & Solutions**:

**a) Docker ports not published**:
```yaml
# Wrong:
expose:
  - "8000"

# Correct:
ports:
  - "8000:8000"
```

**b) Nginx proxy misconfigured**:
```nginx
# Correct:
location /api/ {
    proxy_pass http://localhost:8000;
    # ... rest of config
}
```

**c) Backend not running**:
```bash
docker ps | grep backend
docker logs minga_backend_prod
```

### 7. "Site Can't Be Reached"

**Problem**: Browser can't connect at all.

**Checklist**:
1. Containers running: `docker ps`
2. Nginx running: `sudo systemctl status nginx`
3. Nginx config updated: `sudo nginx -t`
4. Firewall ports open: `sudo ufw status` (80, 443)
5. Test locally: `curl http://localhost:3000`

### 8. Environment Variable Not Found

**Problem**: `The "VITE_API_BASE_URL" variable is not set`

**Cause**: Docker Compose can't find `.env` file.

**Solution**: Always run from project root:
```bash
# From project root:
docker compose -f CICD/docker-compose.prod.yml up -d

# NOT from CICD folder!
```

### 9. Static Files Path Issues

**Problem**: Static files 404 on VPS.

**Solution**: Nginx paths must match your actual project location:
```nginx
# Update based on your project path:
location /static/ {
    alias /root/minga_expenses_1/staticfiles/;  # Your actual path!
}
```

### 10. Migrations Fail on Existing Database

**Problem**: Migration tries to recreate existing tables.

**Solution**: Use `--fake-initial`:
```bash
python manage.py migrate --fake-initial
```

This marks existing migrations as applied without running them.

## Debugging Commands

### Check Container Status
```bash
docker ps
docker compose -f CICD/docker-compose.prod.yml ps
```

### View Logs
```bash
# All containers
docker compose -f CICD/docker-compose.prod.yml logs -f

# Backend only
docker logs minga_backend_prod --tail=50 -f

# Frontend only
docker logs minga_frontend_prod --tail=50 -f
```

### Test Backend
```bash
# From VPS
curl http://localhost:8000/api/
curl http://localhost:8000/admin/login/

# Check Django is serving API
docker exec -it minga_backend_prod python manage.py check
```

### Test Frontend
```bash
# From VPS
curl http://localhost:3000

# Check what API URL frontend is using
docker exec -it minga_frontend_prod cat /usr/share/nginx/html/index.html | grep -o 'https://[^"]*'
```

### Nginx Debugging
```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check what's proxying where
cat /etc/nginx/sites-enabled/minga_expenses | grep "proxy_pass"
```

### Database Debugging
```bash
# Test connection
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"

# Check migrations
docker exec -it minga_backend_prod python manage.py showmigrations

# View database settings Django is using
docker exec -it minga_backend_prod python manage.py shell -c "from django.conf import settings; print(settings.DATABASES)"
```

## Prevention Checklist

Before deploying:

- [ ] All environment variables in `.env` have NO trailing slashes
- [ ] Frontend `.env.production` has correct domain (matching SSL cert)
- [ ] Database host matches Supabase exactly (aws-0 vs aws-1!)
- [ ] `ALLOWED_HOSTS` includes both domain and IP
- [ ] `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` match
- [ ] Docker compose uses `ports` not `expose`
- [ ] Nginx config uses `localhost:8000` and `localhost:3000`
- [ ] SSL certificate paths in Nginx match actual certificate location
- [ ] Project paths in Nginx config match actual VPS paths

## Quick Fixes

**Restart everything**:
```bash
cd /root/minga_expenses_1
docker compose -f CICD/docker-compose.prod.yml restart
sudo systemctl reload nginx
```

**Full redeploy**:
```bash
cd /root/minga_expenses_1
bash CICD/scripts/deploy.sh
```

**Emergency rollback**:
```bash
cd /root/minga_expenses_1
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>
docker compose -f CICD/docker-compose.prod.yml down
docker compose -f CICD/docker-compose.prod.yml up -d --build
```
