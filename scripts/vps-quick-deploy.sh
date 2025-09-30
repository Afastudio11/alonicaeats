#!/bin/bash

# VPS Quick Deploy Script untuk Alonica
# Jalankan script ini di VPS untuk deploy/redeploy aplikasi dengan benar

set -e  # Exit on error

echo "🚀 Starting Alonica VPS Deployment..."
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the /var/www/alonica directory"
    exit 1
fi

echo -e "${GREEN}✓${NC} Running in correct directory"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file from .env.example:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your actual values"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env file found"

# Load environment variables from .env
set -a
source .env
set +a

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables loaded"

# Step 1: Stop PM2 if running (only alonica app)
echo ""
echo "📦 Step 1/9: Stopping alonica PM2 process..."
pm2 delete alonica-production 2>/dev/null || echo "No alonica PM2 process to stop"
echo -e "${GREEN}✓${NC} PM2 process stopped"

# Step 2: Pull latest code (if git repo)
echo ""
echo "📥 Step 2/9: Checking for git updates..."
if [ -d ".git" ]; then
    git pull origin main || git pull origin master || echo "No git updates"
    echo -e "${GREEN}✓${NC} Git updates checked"
else
    echo -e "${YELLOW}⚠${NC} Not a git repository, skipping"
fi

# Step 3: Install/Update dependencies
echo ""
echo "📚 Step 3/9: Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 4: Test database connection
echo ""
echo "🗄️  Step 4/9: Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database connection successful"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your DATABASE_URL in .env file"
    echo "Current DATABASE_URL: $DATABASE_URL"
    
    # Offer to help setup database (but don't auto-create with hard-coded password)
    read -p "Would you like help setting up the database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "To setup database, run these commands:"
        echo ""
        echo "sudo -u postgres psql << 'EOF'"
        echo "CREATE DATABASE alonica_db;"
        echo "CREATE USER alonica_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';"
        echo "GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;"
        echo "\c alonica_db;"
        echo "GRANT ALL ON SCHEMA public TO alonica_user;"
        echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;"
        echo "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;"
        echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;"
        echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;"
        echo "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO alonica_user;"
        echo "EOF"
        echo ""
        echo "Then update your .env file with the correct DATABASE_URL"
    fi
    exit 1
fi

# Step 5: Check database privileges
echo ""
echo "🔐 Step 5/9: Verifying database privileges..."
psql "$DATABASE_URL" -c "CREATE TABLE test_permissions (id SERIAL PRIMARY KEY); DROP TABLE test_permissions;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database privileges verified"
else
    echo -e "${YELLOW}⚠${NC} Warning: Limited database permissions. You may need to grant privileges."
fi

# Step 6: Push database schema
echo ""
echo "📊 Step 6/9: Pushing database schema..."
npm run db:push:prod || npm run db:push
echo -e "${GREEN}✓${NC} Database schema updated"

# Step 7: Seed users if needed
echo ""
echo "👤 Step 7/9: Checking initial users..."
USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$USER_COUNT" -lt 1 ]; then
    echo "Seeding initial users..."
    npm run seed:users
    echo -e "${GREEN}✓${NC} Users seeded"
else
    echo -e "${GREEN}✓${NC} Users already exist (count: $USER_COUNT)"
fi

# Step 8: Build application
echo ""
echo "🔨 Step 8/9: Building application..."
npm run build
echo -e "${GREEN}✓${NC} Application built successfully"

# Step 9: Start PM2
echo ""
echo "🚀 Step 9/9: Starting application with PM2..."
pm2 start ecosystem.config.cjs
pm2 save
echo -e "${GREEN}✓${NC} Application started"

# Wait a moment for app to start
sleep 3

# Display status
echo ""
echo "========================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================"
echo ""
pm2 status
echo ""
echo "📋 Quick Commands:"
echo "  - View logs:    pm2 logs alonica-production"
echo "  - Restart app:  pm2 restart alonica-production"
echo "  - Stop app:     pm2 stop alonica-production"
echo "  - Monitor:      pm2 monit"
echo ""
echo "🌐 Access your app:"
echo "  - HTTP:  http://148.230.101.194"
echo "  - HTTPS: https://kasirpos.space"
echo ""
echo "👤 Login credentials:"
echo "  - Admin: admin / admin123"
echo "  - Kasir: kasir1 / kasir123"
echo ""

# Test if app is responding
echo "🧪 Testing application..."
sleep 2
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Application is responding on port 3000"
else
    echo -e "${YELLOW}⚠${NC} Warning: Application may not be responding yet"
    echo "Check logs with: pm2 logs alonica-production"
fi
