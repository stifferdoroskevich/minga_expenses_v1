#!/bin/bash
# VPS Initial Setup Script for Debian
# Run this script as root on a fresh Debian VPS

set -e  # Exit on error

echo "==================================="
echo "Minga Expenses VPS Setup Script"
echo "==================================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    postgresql-client

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker is already installed"
fi

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add deploy user (optional, recommended)
echo "👤 Creating deploy user..."
if ! id -u deploy &> /dev/null; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    echo "✅ User 'deploy' created and added to docker group"
else
    echo "✅ User 'deploy' already exists"
fi

# Configure firewall
echo "🔥 Configuring firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "✅ Firewall configured"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/minga_expenses
chown -R deploy:deploy /opt/minga_expenses || chown -R root:root /opt/minga_expenses

# Create directories for static and media files
mkdir -p /opt/minga_expenses/staticfiles
mkdir -p /opt/minga_expenses/media

# Configure Docker networks
echo "🌐 Creating Docker network..."
docker network create minga_network 2>/dev/null || echo "✅ Network already exists"

# Setup Nginx configuration directory
echo "⚙️  Setting up Nginx..."
rm -f /etc/nginx/sites-enabled/default

# Create certbot webroot
mkdir -p /var/www/certbot

echo ""
echo "==================================="
echo "✅ VPS Setup Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository:"
echo "   cd /opt/minga_expenses"
echo "   git clone https://github.com/stifferdoroskevich/minga_expenses_v1.git ."
echo ""
echo "2. Create .env file in project root with your configuration"
echo "   cp CICD/.env.example .env"
echo "   nano .env"
echo ""
echo "3. Copy Nginx configuration:"
echo "   cp /opt/minga_expenses/CICD/nginx/nginx.conf /etc/nginx/sites-available/minga_expenses"
echo "   ln -s /etc/nginx/sites-available/minga_expenses /etc/nginx/sites-enabled/"
echo "   # Edit the file to replace YOUR_DOMAIN_OR_IP"
echo "   nano /etc/nginx/sites-available/minga_expenses"
echo ""
echo "4. Test Nginx configuration:"
echo "   nginx -t"
echo ""
echo "5. Generate SSL certificate:"
echo "   certbot --nginx -d your-domain-or-ip"
echo ""
echo "6. Run the deployment script:"
echo "   cd /opt/minga_expenses"
echo "   bash CICD/scripts/deploy.sh"
echo ""
echo "7. Create Django superuser:"
echo "   docker exec -it minga_backend_prod python manage.py createsuperuser"
echo ""
