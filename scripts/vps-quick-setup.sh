#!/bin/bash

# Alonica VPS Quick Setup Script
# Fast deployment script untuk VPS pribadi

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/alonica"
DB_NAME="alonica_production"
DB_USER="alonica_user" 
DB_PASSWORD="$(openssl rand -base64 32)"
SESSION_SECRET="$(openssl rand -base64 32)"
JWT_SECRET="$(openssl rand -base64 32)"

echo -e "${BLUE}🚀 Alonica VPS Quick Setup${NC}"
echo "==============================="

# Function untuk log
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "Jangan jalankan script ini sebagai root!"
fi

# Prompt for domain (optional)
read -p "Masukkan domain Anda (optional, kosongkan jika hanya IP): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN="localhost"
    warning "Domain tidak diset, menggunakan localhost"
fi

log "Domain: $DOMAIN"

# 1. Update sistem
log "Updating sistem..."
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
log "Installing dependencies..."
sudo apt install -y \
    curl \
    git \
    nginx \
    postgresql \
    postgresql-contrib \
    ufw \
    certbot \
    python3-certbot-nginx

# 3. Install Node.js 20
log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install PM2
log "Installing PM2..."
sudo npm install -g pm2

# 5. Setup firewall
log "Setting up firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 6. Setup PostgreSQL
log "Setting up PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
\q
EOF

success "Database setup completed"

# 7. Clone application (if not exists)
if [ ! -d "$APP_DIR" ]; then
    log "Creating application directory..."
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    log "Please clone your repository to $APP_DIR manually:"
    echo "git clone <your-repo-url> $APP_DIR"
    read -p "Press Enter after cloning the repository..."
fi

# 8. Setup application
log "Setting up application..."
cd $APP_DIR

# Install dependencies
npm install || error "Failed to install dependencies"

# Build application
npm run build || error "Failed to build application"

# 9. Create production environment file
log "Creating production environment file..."
cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Security Secrets
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET

# Domain Configuration
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Payment Integration (Update these with your actual keys)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=true

# Logging
LOG_LEVEL=info
EOF

chmod 600 .env.production
success "Environment file created"

# 10. Database migration dan seeding
log "Running database migrations..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
npm run db:push || error "Database migration failed"

log "Seeding default users..."
npx tsx scripts/seed-users.ts || error "User seeding failed"

# 11. Setup PM2
log "Setting up PM2..."
mkdir -p logs

# Start application
pm2 start ecosystem.config.js --env production || error "Failed to start application with PM2"

# Save PM2 configuration
pm2 save

# Setup PM2 auto-startup (capture the command and run it)
log "Setting up PM2 auto-startup..."
STARTUP_CMD=$(pm2 startup | grep "sudo env" | head -1)
if [ ! -z "$STARTUP_CMD" ]; then
    log "Running PM2 startup command..."
    eval $STARTUP_CMD || warning "PM2 startup command failed - you may need to run it manually"
    success "PM2 auto-startup configured"
else
    warning "Could not capture PM2 startup command - run 'pm2 startup' manually later"
fi

success "Application started with PM2"

# 12. Setup Nginx
log "Setting up Nginx..."
sudo tee /etc/nginx/sites-available/alonica > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Client max body size
    client_max_body_size 10M;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t || error "Nginx configuration test failed"

# Reload nginx
sudo systemctl reload nginx || error "Failed to reload Nginx"

success "Nginx setup completed"

# 13. Setup SSL (if domain provided and not localhost)
if [ "$DOMAIN" != "localhost" ]; then
    log "Setting up SSL certificate..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || warning "SSL setup failed - you can run this manually later"
fi

# 14. Final checks
log "Running final checks..."

# Check PM2 status
pm2 status

# Test application
sleep 5
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    success "Application health check passed"
else
    error "Application health check failed"
fi

# 15. Show results
echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo "=================================="
echo ""
echo "📋 Setup Summary:"
echo "- Application: $APP_DIR"
echo "- Database: $DB_NAME"
echo "- Domain: $DOMAIN"
echo "- PM2 Process: alonica-production"
echo ""
echo "🔑 Login Credentials:"
echo "- Admin: admin / admin123"
echo "- Kasir: kasir1 / kasir123"
echo ""
echo "📝 Important Files:"
echo "- Environment: $APP_DIR/.env.production"
echo "- Nginx Config: /etc/nginx/sites-available/alonica"
echo "- PM2 Config: $APP_DIR/ecosystem.config.js"
echo ""
echo "🛠️  Management Commands:"
echo "- View logs: pm2 logs alonica-production"
echo "- Restart app: pm2 restart alonica-production"
echo "- Nginx reload: sudo systemctl reload nginx"
echo ""
echo "🌐 Access your application:"
if [ "$DOMAIN" != "localhost" ]; then
    echo "- HTTP: http://$DOMAIN"
    echo "- HTTPS: https://$DOMAIN (if SSL setup succeeded)"
else
    echo "- Local: http://your-server-ip"
fi
echo ""
echo "🔒 Security Notes:"
echo "1. Change default passwords after first login"
echo "2. Keep .env.production file secure (chmod 600)"
echo "3. Regular security updates: sudo apt update && sudo apt upgrade"
echo ""
echo "📧 Database credentials saved in .env.production"
echo "   Database Password: [hidden for security]"
echo ""

success "Alonica VPS deployment completed!"