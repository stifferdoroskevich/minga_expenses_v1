# Minga Expenses - Documentation Index

Welcome to the Minga Expenses deployment documentation.

## Quick Links

- **[Migration Guide](migration.md)** - Comprehensive migration from local to VPS
- **[Deployment Guide](deployment-guide.md)** - Step-by-step deployment instructions
- **[Architecture Documentation](architecture.md)** - Technical architecture and system design

## Overview

Minga Expenses is a dual-currency (EUR/PYG) expense tracking application with:
- Django REST Framework backend
- React + Vite frontend
- Docker containerization
- PostgreSQL production database (Supabase)

## Getting Started

### For Deployment

1. Read [Deployment Guide](deployment-guide.md) for step-by-step instructions
2. Prepare your VPS (Debian 11/12)
3. Gather Supabase database credentials
4. Follow the deployment steps

### For Understanding the System

1. Read [Architecture Documentation](architecture.md) for system overview
2. Review [Migration Guide](migration.md) for technical details
3. Check the CICD folder for configuration files

## Directory Structure

```
minga_expenses_v1/
├── CICD/                      # Deployment configuration
│   ├── Dockerfile.backend     # Backend production image
│   ├── Dockerfile.frontend    # Frontend production image
│   ├── docker-compose.*.yml   # Docker Compose configs
│   ├── nginx/                 # Nginx configurations
│   ├── scripts/              # Deployment scripts
│   └── .env.example          # Environment template
├── docs/                     # This documentation
│   ├── README.md            # This file
│   ├── migration.md         # Migration guide
│   ├── deployment-guide.md  # Deployment steps
│   └── architecture.md      # Architecture docs
├── core/                    # Django project
├── expenses/                # Django app
└── frontend/                # React application
```

## Key Features

- **Dual Currency**: Track expenses in EUR and PYG
- **Import/Export**: Excel and CSV support
- **Analytics**: Charts and reports
- **Master Lists**: Companies, payment forms, expense types
- **Authentication**: Token-based security
- **Docker**: Containerized for easy deployment
- **SSL**: HTTPS with Let's Encrypt

## Technology Stack

**Backend**: Django 5.2, Django REST Framework, PostgreSQL, Gunicorn  
**Frontend**: React 19, Vite, Tailwind CSS, Recharts  
**Infrastructure**: Docker, Docker Compose, Nginx, Let's Encrypt  
**Hosting**: Debian VPS, Supabase (PostgreSQL)

## Quick Start

### Local Development

```bash
# Start development environment
docker compose -f CICD/docker-compose.dev.yml up

# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:8000
# - Admin: http://localhost:8000/admin
```

### Production Deployment

```bash
# On VPS
cd /opt/minga_expenses
bash CICD/scripts/setup-vps.sh      # First time only
bash CICD/scripts/deploy.sh         # Deploy/update
```

## Documentation Contents

### Migration Guide
- Architecture overview
- Prerequisites
- Project structure
- Migration components
- Environment configuration
- Database migration
- Docker configuration
- Testing locally
- VPS deployment
- Troubleshooting

### Deployment Guide
- Initial VPS setup
- Environment configuration
- SSL certificate setup
- First deployment
- Create superuser
- Verify deployment
- Updating application
- Backup and restore
- Monitoring
- Quick reference

### Architecture Documentation
- System overview
- Architecture diagrams
- Component details
- Data flow
- Security architecture
- Deployment architecture
- Technology stack
- Database schema
- API documentation
- Scalability considerations

## Support

For issues or questions:
1. Check the troubleshooting sections in the guides
2. Review logs: `docker compose -f CICD/docker-compose.prod.yml logs`
3. GitHub Issues: https://github.com/stifferdoroskevich/minga_expenses_v1/issues

## License

Private project for personal use.
