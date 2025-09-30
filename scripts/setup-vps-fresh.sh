#!/bin/bash

#######################################################
# 🏗️ Alonica Fresh VPS Setup Script
#######################################################
# Script ini akan setup VPS Ubuntu dari NOL:
# 1. Update system
# 2. Install Node.js 20 LTS
# 3. Install PostgreSQL 16
# 4. Install Nginx
# 5. Install PM2
# 6. Setup database
# 7. Clone repository
# 8. Configure firewall
# 9. Setup Nginx reverse proxy
#######################################################

set -e  # Exit on error

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurasi - SESUAIKAN DENGAN INFO ANDA
GITHUB_REPO="https://github.com/Afastudio11/alonicaeats.git"
APP_PATH="/var/www/alonica"
DB_USER="alonica_user"
DB_NAME="alonica_db"
DB_PASSWORD="${DB_PASSWORD:-}"  # Set via env var atau akan di-prompt
DOMAIN="kasirpos.space"
VPS_IP="148.230.101.194"

# Prompt for password if not set
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Enter database password for PostgreSQL user '$DB_USER':${NC}"
    read -s DB_PASSWORD
    echo
    
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${RED}Error: Password cannot be empty!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Password set${NC}"
fi

echo -e "${BLUE}"
echo "================================================"
echo "   🏗️ Alonica Fresh VPS Setup"
echo "================================================"
echo -e "${NC}"
echo "This script will install:"
echo "  - Node.js 20 LTS"
echo "  - PostgreSQL 16"
echo "  - Nginx"
echo "  - PM2"
echo "  - Your Alonica application"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

#######################################################
# 1. Update System
#######################################################
echo -e "\n${YELLOW}[1/10] Updating system...${NC}"
sudo apt update && sudo apt upgrade -y
echo -e "${GREEN}✅ System updated${NC}"

#######################################################
# 2. Install Essential Tools
#######################################################
echo -e "\n${YELLOW}[2/10] Installing essential tools...${NC}"
sudo apt install -y curl wget git build-essential software-properties-common
echo -e "${GREEN}✅ Essential tools installed${NC}"

#######################################################
# 3. Install Node.js 20 LTS
#######################################################
echo -e "\n${YELLOW}[3/10] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
echo -e "${GREEN}✅ npm installed: $NPM_VERSION${NC}"

#######################################################
# 4. Install PM2
#######################################################
echo -e "\n${YELLOW}[4/10] Installing PM2...${NC}"
sudo npm install -g pm2

PM2_VERSION=$(pm2 --version)
echo -e "${GREEN}✅ PM2 installed: $PM2_VERSION${NC}"

#######################################################
# 5. Install PostgreSQL 16
#######################################################
echo -e "\n${YELLOW}[5/10] Installing PostgreSQL 16...${NC}"
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

PSQL_VERSION=$(psql --version)
echo -e "${GREEN}✅ PostgreSQL installed: $PSQL_VERSION${NC}"

#######################################################
# 6. Setup Database
#######################################################
echo -e "\n${YELLOW}[6/10] Setting up database...${NC}"
sudo -u postgres psql << EOF
-- Create database (skip if exists)
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user (skip if exists)
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database
\c $DB_NAME;

-- Grant schema privileges (CRITICAL untuk Drizzle)
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Grant default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify
\c $DB_NAME $DB_USER;
SELECT 'Database setup successful!' as status;
EOF

echo -e "${GREEN}✅ Database created and configured${NC}"

#######################################################
# 7. Install Nginx
#######################################################
echo -e "\n${YELLOW}[7/10] Installing Nginx...${NC}"
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

NGINX_VERSION=$(nginx -v 2>&1)
echo -e "${GREEN}✅ Nginx installed: $NGINX_VERSION${NC}"

#######################################################
# 8. Clone Repository
#######################################################
echo -e "\n${YELLOW}[8/10] Cloning repository...${NC}"
sudo mkdir -p $APP_PATH
sudo chown -R $USER:$USER $APP_PATH

git clone $GITHUB_REPO $APP_PATH

if [ -d "$APP_PATH" ] && [ -f "$APP_PATH/package.json" ]; then
    echo -e "${GREEN}✅ Repository cloned to $APP_PATH${NC}"
else
    echo -e "${RED}❌ Failed to clone repository${NC}"
    exit 1
fi

#######################################################
# 9. Install Application Dependencies
#######################################################
echo -e "\n${YELLOW}[9/10] Installing application dependencies...${NC}"
cd $APP_PATH
npm install

echo -e "${GREEN}✅ Dependencies installed${NC}"

#######################################################
# 10. Setup Firewall
#######################################################
echo -e "\n${YELLOW}[10/10] Setting up firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo -e "${GREEN}✅ Firewall configured${NC}"

#######################################################
# Create Nginx Configuration
#######################################################
echo -e "\n${YELLOW}Creating Nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/alonica > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $VPS_IP;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/alonica_access.log;
    error_log /var/log/nginx/alonica_error.log;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

#######################################################
# Summary & Next Steps
#######################################################
echo -e "\n${GREEN}"
echo "================================================"
echo "   ✅ VPS Setup Complete!"
echo "================================================"
echo -e "${NC}"
echo "What was installed:"
echo "  ✅ Node.js $NODE_VERSION"
echo "  ✅ npm $NPM_VERSION"
echo "  ✅ PM2 $PM2_VERSION"
echo "  ✅ PostgreSQL (database: $DB_NAME)"
echo "  ✅ Nginx (reverse proxy)"
echo "  ✅ Application cloned to $APP_PATH"
echo "  ✅ Firewall configured"
echo ""
echo "Next steps:"
echo "  1. Run deployment fix script:"
echo "     cd $APP_PATH"
echo "     bash scripts/fix-vps-deployment.sh"
echo ""
echo "  2. Or setup manually:"
echo "     cd $APP_PATH"
echo "     npm run db:push:prod"
echo "     npm run seed:users"
echo "     npm run build"
echo "     pm2 start npm --name 'alonica' -- start"
echo "     pm2 save"
echo "     pm2 startup"
echo ""
echo "  3. Setup SSL (optional but recommended):"
echo "     sudo apt install certbot python3-certbot-nginx"
echo "     sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "Access your application:"
echo "  HTTP:  http://$VPS_IP"
echo "  HTTP:  http://$DOMAIN"
echo "  HTTPS: https://$DOMAIN (after SSL setup)"
echo ""
echo "Database connection:"
echo "  postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo -e "${BLUE}Happy deploying! 🚀${NC}"
