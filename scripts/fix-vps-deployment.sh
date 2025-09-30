#!/bin/bash

#######################################################
# 🚀 Alonica VPS Deployment Fix Script
#######################################################
# Script ini akan memperbaiki masalah deployment umum:
# 1. Database permissions untuk Drizzle ORM
# 2. Install drizzle-kit yang hilang
# 3. Setup environment variables
# 4. Push database schema
# 5. Seed initial users
# 6. Build & restart aplikasi
#######################################################

set -e  # Exit on error

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurasi (sesuaikan dengan VPS Anda)
APP_PATH="/var/www/alonica"
DB_USER="alonica_user"
DB_NAME="alonica_db"
DB_PASSWORD="Alonica2025."
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}"
echo "================================================"
echo "   🚀 Alonica VPS Deployment Fix Script"
echo "================================================"
echo -e "${NC}"

#######################################################
# 1. Cek apakah di directory yang benar
#######################################################
echo -e "${YELLOW}[1/7] Checking application directory...${NC}"
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ Error: Directory $APP_PATH tidak ditemukan!${NC}"
    echo "Pastikan aplikasi sudah di-clone ke $APP_PATH"
    exit 1
fi

cd "$APP_PATH"
echo -e "${GREEN}✅ Directory found: $(pwd)${NC}"

#######################################################
# 2. Fix Database Permissions
#######################################################
echo -e "\n${YELLOW}[2/7] Fixing database permissions...${NC}"
sudo -u postgres psql -d "$DB_NAME" << EOF
-- Grant schema privileges (CRITICAL untuk Drizzle ORM)
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Grant privileges untuk table/sequence yang akan dibuat nanti
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Test koneksi
SELECT 'Database permissions updated successfully!' as status;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database permissions fixed${NC}"
else
    echo -e "${RED}❌ Failed to fix database permissions${NC}"
    echo "Jalankan manual: sudo -u postgres psql -d $DB_NAME"
    exit 1
fi

#######################################################
# 3. Setup Environment Variables
#######################################################
echo -e "\n${YELLOW}[3/7] Setting up environment variables...${NC}"
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=$DATABASE_URL

# Security (generate these for production!)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Domain Configuration
ALLOWED_ORIGINS=https://kasirpos.space,https://www.kasirpos.space
FRONTEND_URL=https://kasirpos.space

# Payment Integration (update dengan key production Anda!)
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
MIDTRANS_IS_PRODUCTION=false

# Logging
LOG_LEVEL=info
EOF

chmod 600 .env
echo -e "${GREEN}✅ Environment variables configured${NC}"

#######################################################
# 4. Install Dependencies (termasuk drizzle-kit)
#######################################################
echo -e "\n${YELLOW}[4/7] Installing dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

#######################################################
# 5. Push Database Schema
#######################################################
echo -e "\n${YELLOW}[5/7] Pushing database schema...${NC}"
export DATABASE_URL="$DATABASE_URL"

# Test database connection dulu
psql "$DATABASE_URL" -c "SELECT 'Database connection OK!' as status;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    echo "Connection string: $DATABASE_URL"
    exit 1
fi

# Push schema menggunakan script yang aman (auto-install drizzle-kit)
npm run db:push:prod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database schema pushed successfully${NC}"
else
    echo -e "${RED}❌ Failed to push database schema${NC}"
    exit 1
fi

#######################################################
# 6. Seed Initial Data
#######################################################
echo -e "\n${YELLOW}[6/7] Seeding initial users...${NC}"
npm run seed:users

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Initial users seeded${NC}"
    echo "   - Admin: admin / admin123"
    echo "   - Kasir1: kasir1 / kasir123"
    echo "   - Kasir2: kasir2 / kasir123"
    echo "   - Kasir3: kasir3 / kasir123"
    echo "   - Kasir4: kasir4 / kasir123"
else
    echo -e "${YELLOW}⚠️  User seeding failed (might already exist)${NC}"
fi

#######################################################
# 7. Build & Restart Application
#######################################################
echo -e "\n${YELLOW}[7/7] Building and restarting application...${NC}"

# Build aplikasi
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application built successfully${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Restart dengan PM2
if command -v pm2 &> /dev/null; then
    pm2 restart alonica || pm2 start npm --name "alonica" -- start
    pm2 save
    echo -e "${GREEN}✅ Application restarted with PM2${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Starting with npm...${NC}"
    npm start &
fi

#######################################################
# Summary
#######################################################
echo -e "\n${GREEN}"
echo "================================================"
echo "   ✅ VPS Deployment Fix Complete!"
echo "================================================"
echo -e "${NC}"
echo "What was fixed:"
echo "  ✅ Database permissions (schema grants)"
echo "  ✅ Environment variables configured"
echo "  ✅ Dependencies installed (including drizzle-kit)"
echo "  ✅ Database schema pushed"
echo "  ✅ Initial users seeded"
echo "  ✅ Application built and restarted"
echo ""
echo "Next steps:"
echo "  1. Check status: pm2 status"
echo "  2. View logs: pm2 logs alonica"
echo "  3. Access app: http://148.230.101.194"
echo "  4. Or domain: https://kasirpos.space"
echo ""
echo "Login credentials:"
echo "  Admin: admin / admin123"
echo "  Kasir: kasir1 / kasir123"
echo ""
echo -e "${BLUE}Happy deploying! 🚀${NC}"
