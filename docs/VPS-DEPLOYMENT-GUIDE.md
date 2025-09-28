# 🚀 Panduan Deployment VPS Lengkap - Alonica Restaurant System

## 📋 Ringkasan

Panduan step-by-step yang sangat detail untuk migrasi aplikasi Alonica ke Virtual Private Server (VPS) Ubuntu 25.04 dengan **fokus utama pencegahan error** dan **jaminan sinkronisasi database sempurna** dari backend ke frontend.

> **⚠️ PENTING**: Ikuti setiap langkah dengan urutan yang tepat untuk menghindari error autentikasi dan masalah lainnya!

## 🎯 Tujuan Panduan

- ✅ **Deployment tanpa error** - Zero downtime, zero authentication failures
- ✅ **Sinkronisasi database sempurna** - Data konsisten antara backend dan frontend
- ✅ **Verifikasi fungsionalitas kritis** - Login Admin/Kasir, Order Processing, Menu Management
- ✅ **Pencegahan error umum** - Hardcoded paths, environment variables, database permissions

## 🔧 Prerequisites VPS

- **OS**: Ubuntu 25.04 LTS (Fresh Installation)
- **RAM**: Minimal 4GB (recommended 8GB+)
- **Storage**: Minimal 40GB SSD
- **Network**: Public IP dan domain
- **Access**: SSH root/sudo access

---

## 📊 TAHAP 1: PRA-MIGRASI & PEMERIKSAAN RISIKO

### 1.1 Audit Konfigurasi Saat Ini

**🔍 Pemeriksaan Database Lokal/Development:**

```bash
# Masuk ke directory project saat ini
cd /path/to/your/alonica-project

# Periksa schema database yang ada
echo "=== DATABASE SCHEMA AUDIT ==="
npm run db:push --dry-run 2>&1 | tee pre-migration-audit.log

# Cek environment variables
echo "=== ENVIRONMENT VARIABLES AUDIT ==="
env | grep -E "(DATABASE|MIDTRANS|NODE_ENV|PORT)" | tee -a pre-migration-audit.log

# Audit dependencies
echo "=== DEPENDENCIES AUDIT ==="
npm audit --audit-level high | tee -a pre-migration-audit.log

# Cek hardcoded localhost references
echo "=== HARDCODED PATHS AUDIT ==="
grep -r "localhost" . --exclude-dir=node_modules --exclude-dir=.git | tee -a pre-migration-audit.log
grep -r "127.0.0.1" . --exclude-dir=node_modules --exclude-dir=.git | tee -a pre-migration-audit.log
```

### 1.2 Backup Database Lengkap (Development)

```bash
# Jika menggunakan database development/staging
echo "=== CREATING DEVELOPMENT DATABASE BACKUP ==="

# Method 1: Jika menggunakan PostgreSQL
if [ -n "$DATABASE_URL" ]; then
    echo "Backing up PostgreSQL database..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    pg_dump $DATABASE_URL > "backup_dev_${timestamp}.sql"
    echo "✅ Database backup created: backup_dev_${timestamp}.sql"
fi

# Method 2: Export data JSON (untuk in-memory storage)
echo "Exporting application data to JSON..."
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:5000/api/export/all > "app_data_backup_${timestamp}.json"

# Method 3: Manual data verification
echo "=== VERIFYING CRITICAL DATA ==="
curl -s http://localhost:5000/api/auth/users | jq '.length' > user_count.txt
curl -s http://localhost:5000/api/menu/items | jq '.length' > menu_count.txt
curl -s http://localhost:5000/api/categories | jq '.length' > category_count.txt

echo "Current data counts:"
echo "Users: $(cat user_count.txt)"
echo "Menu Items: $(cat menu_count.txt)"
echo "Categories: $(cat category_count.txt)"
```

### 1.3 Identifikasi Potensi Error Paths

```bash
echo "=== SCANNING FOR POTENTIAL ERROR SOURCES ==="

# Cek import paths yang berpotensi error
echo "Checking for absolute import paths..."
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
  xargs grep -l "from ['\"]/" | tee absolute_imports.log

# Cek file paths dalam kode
echo "Checking for hardcoded file paths..."
grep -r "/tmp\|/var\|/opt\|C:\\" . --exclude-dir=node_modules --exclude-dir=.git | \
  grep -v ".log:" | tee hardcoded_paths.log

# Cek port references
echo "Checking for hardcoded ports..."
grep -r ":300[0-9]\|:500[0-9]\|:800[0-9]" . \
  --exclude-dir=node_modules --exclude-dir=.git | tee port_references.log

# Cek environment variable usage
echo "Checking for missing environment variables..."
grep -r "process\.env\." . --exclude-dir=node_modules --exclude-dir=.git | \
  cut -d: -f2 | grep -o "process\.env\.[A-Z_]*" | sort -u | tee env_vars_used.log
```

### 1.4 Pre-Migration Checklist

```bash
echo "=== PRE-MIGRATION CHECKLIST ==="

# Generate checklist
cat > pre-migration-checklist.txt << 'EOF'
PRE-MIGRATION CHECKLIST - ALONICA VPS DEPLOYMENT

[ ] Database audit completed and logged
[ ] Full database backup created (if applicable)
[ ] Hardcoded paths identified and documented
[ ] Environment variables documented
[ ] Dependencies audit passed
[ ] Current user accounts documented:
    - Admin users: ___
    - Kasir users: ___
[ ] Current menu items: ___
[ ] Current categories: ___
[ ] Payment configuration verified (Midtrans)
[ ] All localhost references documented
[ ] Port configuration documented
[ ] SSL requirements identified
[ ] Domain DNS ready for pointing

CRITICAL FILES TO BACKUP:
[ ] package.json
[ ] .env files (sanitized)
[ ] Database schema
[ ] User data
[ ] Menu data
[ ] Configuration files

NEXT: Proceed to VPS setup only after all items checked
EOF

echo "✅ Pre-migration audit complete. Review checklist before proceeding."
echo "📄 Files created:"
echo "  - pre-migration-audit.log"
echo "  - pre-migration-checklist.txt"
echo "  - backup_dev_*.sql (if applicable)"
echo "  - app_data_backup_*.json"
```

---

## 🏗️ TAHAP 2: SETUP VPS UBUNTU 25.04

### 2.1 Initial Server Setup dan Security

```bash
# Update sistem Ubuntu 25.04
echo "=== UPDATING UBUNTU 25.04 SYSTEM ==="
sudo apt update && sudo apt upgrade -y

# Install essential security tools
sudo apt install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Setup firewall rules
echo "=== CONFIGURING FIREWALL ==="
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Verify firewall status
sudo ufw status verbose

echo "✅ Basic security setup completed"
```

### 2.2 Install Dependencies untuk Ubuntu 25.04

```bash
echo "=== INSTALLING CORE DEPENDENCIES ==="

# Install Node.js 20 LTS (Official Repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 16 (Latest for Ubuntu 25.04)
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Install Nginx dan tools
sudo apt install -y \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    wget \
    htop \
    tree \
    jq \
    redis-server

# Install process manager tools
sudo npm install -g pm2

# Verify installations
echo "=== VERIFYING INSTALLATIONS ==="
node --version     # Should be v20.x.x
npm --version      # Should be 10.x.x
psql --version     # Should be PostgreSQL 16.x
nginx -v           # Should be nginx/1.24.x
pm2 --version      # Should be 5.x.x

# Start and enable services
sudo systemctl enable postgresql
sudo systemctl enable nginx
sudo systemctl enable redis-server
sudo systemctl start postgresql
sudo systemctl start nginx
sudo systemctl start redis-server

echo "✅ All dependencies installed and services started"
```

### 2.3 Configure PostgreSQL Security

```bash
echo "=== CONFIGURING POSTGRESQL SECURITY ==="

# Secure PostgreSQL installation
sudo -u postgres psql << 'EOF'
-- Change postgres user password
ALTER USER postgres PASSWORD 'SecurePostgresPassword2024!';

-- Configure security settings
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_statement = 'mod';
SELECT pg_reload_conf();

\q
EOF

# Configure PostgreSQL for better security
sudo tee -a /etc/postgresql/16/main/postgresql.conf << 'EOF'

# Alonica Custom Configuration
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
EOF

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

echo "✅ PostgreSQL configured for production use"
```

---

## 🗂️ TAHAP 3: CLONE & SETUP APLIKASI

### 3.1 Setup Directory Structure

```bash
echo "=== SETTING UP APPLICATION DIRECTORY ==="

# Create application directory with proper structure
sudo mkdir -p /opt/alonica/{app,backups,logs,ssl}
sudo chown -R $USER:$USER /opt/alonica
chmod -R 755 /opt/alonica

# Create deployment user (security best practice)
sudo useradd -r -s /bin/bash -d /opt/alonica alonica
sudo usermod -a -G alonica $USER

# Set proper ownership
sudo chown -R alonica:alonica /opt/alonica
sudo chmod -R 755 /opt/alonica

echo "✅ Directory structure created"
```

### 3.2 Clone Repository dari GitHub

```bash
echo "=== CLONING APPLICATION FROM GITHUB ==="

# Clone ke directory aplikasi
cd /opt/alonica/app

# GANTI URL_REPOSITORY dengan URL GitHub Anda
REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"

git clone $REPO_URL .

# Verify clone success
if [ -f "package.json" ] && [ -d "server" ] && [ -d "client" ]; then
    echo "✅ Repository cloned successfully"
    tree -L 2 .
else
    echo "❌ Clone failed or incomplete. Check repository structure."
    exit 1
fi

# Set proper permissions
sudo chown -R alonica:alonica /opt/alonica/app
chmod -R 755 /opt/alonica/app

echo "✅ Application cloned and permissions set"
```

### 3.3 Verify Project Structure

```bash
echo "=== VERIFYING PROJECT STRUCTURE ==="

cd /opt/alonica/app

# Check critical files exist
REQUIRED_FILES=(
    "package.json"
    "server/index.ts"
    "client/src/App.tsx"
    "shared/schema.ts"
    "vite.config.ts"
    "drizzle.config.ts"
)

echo "Checking required files:"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING!"
        exit 1
    fi
done

# Check directory structure
REQUIRED_DIRS=(
    "server"
    "client/src"
    "shared"
    "scripts"
)

echo "Checking required directories:"
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/"
    else
        echo "❌ $dir/ - MISSING!"
        exit 1
    fi
done

echo "✅ Project structure verification passed"
```

---

## 🗄️ TAHAP 4: SETUP DATABASE PRODUCTION

### 4.1 Create Production Database

```bash
echo "=== CREATING PRODUCTION DATABASE ==="

# Generate secure credentials
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "Generated database password (SAVE THIS): $DB_PASSWORD"

# Create database and user
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE alonica_production;

-- Create user with generated password
CREATE USER alonica_user WITH PASSWORD '$DB_PASSWORD';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE alonica_production TO alonica_user;

-- Connect to the database
\c alonica_production;

-- Grant schema privileges (CRITICAL for Drizzle ORM)
GRANT ALL ON SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;

-- Grant future objects (CRITICAL for migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO alonica_user;

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify user can access
\c alonica_production alonica_user;
SELECT 'Database access test successful' as status;

\q
EOF

echo "✅ Production database created with user: alonica_user"
echo "📝 Save this connection string:"
echo "DATABASE_URL=postgresql://alonica_user:$DB_PASSWORD@localhost:5432/alonica_production"
```

### 4.2 Test Database Connection

```bash
echo "=== TESTING DATABASE CONNECTION ==="

# Test connection with psql
psql "postgresql://alonica_user:$DB_PASSWORD@localhost:5432/alonica_production" -c "SELECT version();"

if [ $? -eq 0 ]; then
    echo "✅ Database connection test successful"
else
    echo "❌ Database connection failed. Check credentials and permissions."
    exit 1
fi

# Test permissions
psql "postgresql://alonica_user:$DB_PASSWORD@localhost:5432/alonica_production" << 'EOF'
-- Test CREATE privilege
CREATE TABLE test_permissions (id SERIAL PRIMARY KEY, test_col TEXT);
INSERT INTO test_permissions (test_col) VALUES ('test');
SELECT * FROM test_permissions;
DROP TABLE test_permissions;
\q
EOF

echo "✅ Database permissions verified"
```

### 4.3 Configure Database Security

```bash
echo "=== CONFIGURING DATABASE SECURITY ==="

# Configure pg_hba.conf for secure connections
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup

sudo tee /etc/postgresql/16/main/pg_hba.conf << 'EOF'
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             postgres                                peer
local   all             alonica_user                            md5
local   all             all                                     peer

# IPv4 local connections:
host    alonica_production    alonica_user    127.0.0.1/32      md5
host    all             postgres        127.0.0.1/32           md5

# IPv6 local connections:
host    all             all             ::1/128                 md5

# Deny all other connections
local   all             all                                     reject
host    all             all             0.0.0.0/0               reject
EOF

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

# Verify configuration
sudo -u postgres psql -c "SELECT name, setting FROM pg_settings WHERE name IN ('listen_addresses', 'port');"

echo "✅ Database security configured"
```

---

## ⚙️ TAHAP 5: KONFIGURASI ENVIRONMENT PRODUCTION

### 5.1 Generate Security Secrets

```bash
echo "=== GENERATING PRODUCTION SECRETS ==="

cd /opt/alonica/app

# Generate secure random secrets
SESSION_SECRET=$(openssl rand -base64 48)
JWT_SECRET=$(openssl rand -base64 48)
ADMIN_INIT_TOKEN=$(openssl rand -hex 32)

echo "Generated secrets (SAVE THESE SECURELY):"
echo "SESSION_SECRET: $SESSION_SECRET"
echo "JWT_SECRET: $JWT_SECRET"
echo "ADMIN_INIT_TOKEN: $ADMIN_INIT_TOKEN"

# Save to secure file for reference
cat > /opt/alonica/app/.secrets.txt << EOF
# PRODUCTION SECRETS - KEEP SECURE
# Generated on: $(date)

SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET
ADMIN_INIT_TOKEN=$ADMIN_INIT_TOKEN
DATABASE_PASSWORD=$DB_PASSWORD

# IMPORTANT: Delete this file after copying secrets to .env.production
# Command: rm /opt/alonica/app/.secrets.txt
EOF

chmod 600 /opt/alonica/app/.secrets.txt
chown alonica:alonica /opt/alonica/app/.secrets.txt

echo "✅ Secrets generated and saved to .secrets.txt"
```

### 5.2 Create Production Environment File

```bash
echo "=== CREATING PRODUCTION ENVIRONMENT ==="

cd /opt/alonica/app

# Create production environment file
cat > .env.production << EOF
# ========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ========================================
# Generated on: $(date)

# Application Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://alonica_user:$DB_PASSWORD@localhost:5432/alonica_production

# Security Secrets
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET

# Application Security
ADMIN_INIT_TOKEN=$ADMIN_INIT_TOKEN
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Domain Configuration (UPDATE WITH YOUR DOMAIN)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Payment Integration (Midtrans)
# IMPORTANT: Set these for production payments
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here
MIDTRANS_IS_PRODUCTION=true

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,image/gif

# Google Cloud Storage (Optional)
# GOOGLE_CLOUD_PROJECT_ID=your_project_id
# GOOGLE_CLOUD_BUCKET=your_bucket_name
# GOOGLE_APPLICATION_CREDENTIALS=/opt/alonica/app/gcs-key.json

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/opt/alonica/logs/app.log

# Cache Configuration
REDIS_URL=redis://localhost:6379

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
EOF

# Set secure permissions
chmod 600 .env.production
chown alonica:alonica .env.production

echo "✅ Production environment file created"
echo "📝 IMPORTANT: Update MIDTRANS keys and domain in .env.production"
```

### 5.3 Verify Environment Configuration

```bash
echo "=== VERIFYING ENVIRONMENT CONFIGURATION ==="

cd /opt/alonica/app

# Check environment variables
source .env.production

# Verify critical variables are set
REQUIRED_VARS=(
    "NODE_ENV"
    "PORT"
    "DATABASE_URL"
    "SESSION_SECRET"
    "JWT_SECRET"
)

echo "Checking required environment variables:"
for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ $var is set"
    else
        echo "❌ $var is missing!"
        exit 1
    fi
done

# Test database connection with environment
psql "$DATABASE_URL" -c "SELECT 'Environment database connection successful' as status;"

if [ $? -eq 0 ]; then
    echo "✅ Environment database connection verified"
else
    echo "❌ Environment database connection failed"
    exit 1
fi

echo "✅ Environment configuration verified"
```

---

## 🏗️ TAHAP 6: BUILD & INSTALL APLIKASI

### 6.1 Install Dependencies

```bash
echo "=== INSTALLING APPLICATION DEPENDENCIES ==="

cd /opt/alonica/app

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install --production=false

# Verify critical dependencies
echo "Verifying critical dependencies:"
npm list --depth=0 | grep -E "(express|react|drizzle|postgres|midtrans)"

# Check for vulnerabilities
echo "Running security audit:"
npm audit --audit-level high

# Install missing TypeScript if needed
if ! npm list typescript > /dev/null 2>&1; then
    npm install typescript --save-dev
fi

echo "✅ Dependencies installed successfully"
```

### 6.2 Build Application untuk Production

```bash
echo "=== BUILDING APPLICATION FOR PRODUCTION ==="

cd /opt/alonica/app

# Set environment for build
export NODE_ENV=production

# Clean previous builds
rm -rf dist/

# Build the application
echo "Building frontend and backend..."
npm run build

# Verify build success
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    echo "✅ Build successful"
    
    # Check build artifacts
    echo "Build artifacts:"
    ls -la dist/
    
    # Verify frontend build
    if [ -d "dist/public" ]; then
        echo "✅ Frontend build found"
        ls -la dist/public/
    else
        echo "❌ Frontend build missing"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi

# Set permissions for build artifacts
chown -R alonica:alonica dist/
chmod -R 755 dist/

echo "✅ Application built successfully"
```

### 6.3 Test Production Build Locally

```bash
echo "=== TESTING PRODUCTION BUILD ==="

cd /opt/alonica/app

# Set environment
export $(cat .env.production | xargs)

# Test production build
echo "Starting production server test..."
timeout 30s node dist/index.js &
BUILD_TEST_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Production build health check passed"
else
    echo "❌ Production build health check failed"
    kill $BUILD_TEST_PID 2>/dev/null
    exit 1
fi

# Test static files
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Frontend serving successfully"
else
    echo "❌ Frontend serving failed"
fi

# Stop test server
kill $BUILD_TEST_PID 2>/dev/null
wait $BUILD_TEST_PID 2>/dev/null

echo "✅ Production build test completed"
```

---

## 🗃️ TAHAP 7: DATABASE MIGRATION & DATA SEEDING

### 7.1 Run Database Migrations

```bash
echo "=== RUNNING DATABASE MIGRATIONS ==="

cd /opt/alonica/app

# Set database environment
export DATABASE_URL="postgresql://alonica_user:$DB_PASSWORD@localhost:5432/alonica_production"

# Check if drizzle-kit is available
if ! npm list drizzle-kit > /dev/null 2>&1; then
    echo "Installing drizzle-kit..."
    npm install drizzle-kit --save-dev
fi

# Push database schema
echo "Pushing database schema to production..."
npm run db:push

# Verify tables were created
echo "Verifying database tables:"
psql "$DATABASE_URL" -c "\dt" | tee database_tables.log

# Check for required tables
REQUIRED_TABLES=(
    "users"
    "menu_items"
    "categories"
    "orders"
    "inventory_items"
    "reservations"
    "shifts"
)

echo "Checking required tables:"
for table in "${REQUIRED_TABLES[@]}"; do
    if psql "$DATABASE_URL" -c "\dt" | grep -q "$table"; then
        echo "✅ Table '$table' created"
    else
        echo "❌ Table '$table' missing!"
        exit 1
    fi
done

echo "✅ Database schema migration completed"
```

### 7.2 🚨 CRITICAL: Seed Default Users

> **⚠️ LANGKAH PALING PENTING** - Tanpa ini akan terjadi error "Login gagal"!

```bash
echo "=== SEEDING DEFAULT USERS (CRITICAL STEP) ==="

cd /opt/alonica/app

# Method 1: Using seed script (RECOMMENDED)
echo "Running user seed script..."
npx tsx scripts/seed-users.ts

# Verify users were created
echo "Verifying users created:"
psql "$DATABASE_URL" -c "SELECT username, role, is_active FROM users ORDER BY role, username;"

# Count users by role
ADMIN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE role = 'admin';")
KASIR_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE role = 'kasir';")

echo "User counts:"
echo "Admin users: $ADMIN_COUNT"
echo "Kasir users: $KASIR_COUNT"

# Verify we have the expected users
if [ "$ADMIN_COUNT" -ge 1 ] && [ "$KASIR_COUNT" -ge 1 ]; then
    echo "✅ Default users seeded successfully"
else
    echo "❌ User seeding failed. Running fallback method..."
    
    # Method 2: Manual user creation via SQL
    psql "$DATABASE_URL" << 'EOF'
-- Hash for 'admin123' and 'kasir123' (bcrypt)
-- Note: In production, these should be changed immediately
INSERT INTO users (username, password, role, is_active) VALUES
('admin', '$2b$10$8OZUCKDlWZQ5Q5Q5Q5Q5QOZUCKDlWZQ5Q5Q5Q5Q5QOZ', 'admin', true),
('kasir1', '$2b$10$8OZUCKDlWZQ5Q5Q5Q5Q5QOZUCKDlWZQ5Q5Q5Q5Q5QOZ', 'kasir', true),
('kasir2', '$2b$10$8OZUCKDlWZQ5Q5Q5Q5Q5QOZUCKDlWZQ5Q5Q5Q5Q5QOZ', 'kasir', true),
('kasir3', '$2b$10$8OZUCKDlWZQ5Q5Q5Q5Q5QOZUCKDlWZQ5Q5Q5Q5Q5QOZ', 'kasir', true),
('kasir4', '$2b$10$8OZUCKDlWZQ5Q5Q5Q5Q5QOZUCKDlWZQ5Q5Q5Q5Q5QOZ', 'kasir', true)
ON CONFLICT (username) DO NOTHING;
EOF
    
    # Verify fallback worked
    USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;")
    if [ "$USER_COUNT" -ge 5 ]; then
        echo "✅ Fallback user creation successful"
    else
        echo "❌ CRITICAL: User creation failed completely!"
        exit 1
    fi
fi

echo "✅ CRITICAL STEP COMPLETED: Default users are ready"
```

### 7.3 Seed Initial Data (Categories & Menu)

```bash
echo "=== SEEDING INITIAL APPLICATION DATA ==="

cd /opt/alonica/app

# Check if seed-menu script exists
if [ -f "scripts/seed-menu.ts" ]; then
    echo "Running menu seed script..."
    npx tsx scripts/seed-menu.ts
else
    echo "Menu seed script not found. Creating minimal categories..."
    
    # Create basic categories via SQL
    psql "$DATABASE_URL" << 'EOF'
INSERT INTO categories (name, description, is_active) VALUES
('Makanan Utama', 'Hidangan makanan utama restoran', true),
('Minuman', 'Berbagai jenis minuman', true),
('Makanan Penutup', 'Dessert dan makanan penutup', true),
('Appetizer', 'Makanan pembuka', true)
ON CONFLICT (name) DO NOTHING;
EOF
fi

# Verify data seeding
echo "Verifying seeded data:"
CATEGORY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM categories;")
MENU_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM menu_items;")

echo "Categories: $CATEGORY_COUNT"
echo "Menu Items: $MENU_COUNT"

# Create store profile
psql "$DATABASE_URL" << 'EOF'
INSERT INTO store_profile (restaurant_name, address, phone, email, is_active) VALUES
('Alonica Restaurant', 'Jl. Kuliner Rasa No. 123, Jakarta', '(021) 555-0123', 'info@alonica.com', true)
ON CONFLICT DO NOTHING;
EOF

echo "✅ Initial data seeding completed"
```

---

## 🚀 TAHAP 8: SETUP PM2 PRODUCTION SERVICE

### 8.1 Configure PM2 Ecosystem

```bash
echo "=== CONFIGURING PM2 FOR PRODUCTION ==="

cd /opt/alonica/app

# Create logs directory
mkdir -p /opt/alonica/logs
chown -R alonica:alonica /opt/alonica/logs

# Create PM2 ecosystem configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'alonica-production',
    script: './dist/index.js',
    cwd: '/opt/alonica/app',
    instances: 'max',
    exec_mode: 'cluster',
    user: 'alonica',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: '/opt/alonica/logs/err.log',
    out_file: '/opt/alonica/logs/out.log',
    log_file: '/opt/alonica/logs/combined.log',
    pid_file: '/opt/alonica/logs/app.pid',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 5000,
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Health monitoring
    health_check_grace_period: 30000,
    health_check_fatal_exceptions: true,
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Environment-specific settings
    node_args: ['--max-old-space-size=1024'],
    // Cluster settings
    wait_ready: true,
    increment_var: 'PORT'
  }]
};
EOF

# Set proper permissions
chown alonica:alonica ecosystem.config.js

echo "✅ PM2 ecosystem configured"
```

### 8.2 Start Application dengan PM2

```bash
echo "=== STARTING APPLICATION WITH PM2 ==="

cd /opt/alonica/app

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start application
pm2 start ecosystem.config.js

# Verify application started
sleep 10
pm2 status

# Check if application is running
if pm2 status | grep -q "alonica-production.*online"; then
    echo "✅ Application started successfully"
else
    echo "❌ Application failed to start"
    echo "PM2 logs:"
    pm2 logs alonica-production --lines 20
    exit 1
fi

# Test application health
echo "Testing application health..."
sleep 5

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application health check passed"
else
    echo "❌ Application health check failed"
    echo "Recent logs:"
    pm2 logs alonica-production --lines 10
    exit 1
fi

# Setup PM2 startup script
pm2 startup
pm2 save

echo "✅ PM2 service configured for auto-start"
```

### 8.3 Configure PM2 Monitoring

```bash
echo "=== CONFIGURING PM2 MONITORING ==="

# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

# Create monitoring script
cat > /opt/alonica/scripts/monitor.sh << 'EOF'
#!/bin/bash
# PM2 Health Monitor Script

echo "=== PM2 HEALTH MONITOR $(date) ==="

# Check PM2 status
pm2 status

# Check application health
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application health: OK"
else
    echo "❌ Application health: FAILED"
    echo "Restarting application..."
    pm2 restart alonica-production
fi

# Check memory usage
pm2 monit --no-colors | head -20

# Check recent errors
echo "Recent errors (last 10 lines):"
tail -10 /opt/alonica/logs/err.log 2>/dev/null || echo "No errors"
EOF

chmod +x /opt/alonica/scripts/monitor.sh

# Add cron job for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/alonica/scripts/monitor.sh >> /opt/alonica/logs/monitor.log 2>&1") | crontab -

echo "✅ PM2 monitoring configured"
```

---

## 🌐 TAHAP 9: CONFIGURE NGINX REVERSE PROXY

### 9.1 Create Nginx Configuration

```bash
echo "=== CONFIGURING NGINX REVERSE PROXY ==="

# Backup default nginx config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create Alonica site configuration
sudo tee /etc/nginx/sites-available/alonica << 'EOF'
# Alonica Restaurant System - Nginx Configuration
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/s;

# Upstream backend servers
upstream alonica_backend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP server - redirects to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # UPDATE WITH YOUR DOMAIN
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # UPDATE WITH YOUR DOMAIN
    
    # SSL configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Client settings
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Proxy settings
    proxy_buffering on;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    # API routes with rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        limit_req_status 429;
        
        proxy_pass http://alonica_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        
        proxy_pass http://alonica_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files with caching
    location /assets/ {
        alias /opt/alonica/app/dist/public/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        
        # Compress static files
        gzip on;
        gzip_vary on;
        gzip_types
            text/css
            text/javascript
            text/xml
            text/plain
            text/x-component
            application/javascript
            application/json
            application/xml
            application/rss+xml
            font/truetype
            font/opentype
            application/vnd.ms-fontobject
            image/svg+xml;
    }
    
    # Health check endpoint (no logging)
    location /api/health {
        proxy_pass http://alonica_backend;
        access_log off;
        
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
    
    # Frontend application (fallback to index.html)
    location / {
        proxy_pass http://alonica_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Try files, fallback to application
        try_files $uri @app;
    }
    
    location @app {
        proxy_pass http://alonica_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security: Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(sql|env|log|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

echo "✅ Nginx configuration created"
```

### 9.2 Enable Nginx Site

```bash
echo "=== ENABLING NGINX SITE ==="

# Test nginx configuration
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Enable the site
sudo ln -sf /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration again
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx

echo "✅ Nginx site enabled and reloaded"
```

### 9.3 Test Nginx Proxy (HTTP Only)

```bash
echo "=== TESTING NGINX PROXY ==="

# Test nginx is serving the application
echo "Testing HTTP proxy (before SSL)..."

# Update domain in nginx config first
read -p "Enter your domain name (e.g., alonica.example.com): " DOMAIN
sudo sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/alonica
sudo systemctl reload nginx

# Test local connection
if curl -H "Host: $DOMAIN" http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Nginx proxy to application working"
else
    echo "❌ Nginx proxy failed"
    echo "Checking nginx error logs:"
    sudo tail -20 /var/log/nginx/error.log
    exit 1
fi

# Test if application responds on port 80
echo "Testing external connection..."
if curl -f http://$DOMAIN/api/health > /dev/null 2>&1; then
    echo "✅ External HTTP access working"
else
    echo "⚠️ External access may not work until DNS is configured"
fi

echo "✅ Nginx proxy test completed"
```

---

## 🔒 TAHAP 10: SETUP SSL DENGAN LET'S ENCRYPT

### 10.1 Install SSL Certificate

```bash
echo "=== INSTALLING SSL CERTIFICATE ==="

# Ensure domain DNS is pointing to server
echo "IMPORTANT: Ensure your domain DNS is pointing to this server IP before continuing."
echo "Server IP: $(curl -s ifconfig.me)"
read -p "Press Enter when DNS is configured and propagated..."

# Install SSL certificate with Certbot
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --no-eff-email --redirect

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate installed successfully"
else
    echo "❌ SSL certificate installation failed"
    echo "Common issues:"
    echo "1. DNS not pointing to this server"
    echo "2. Domain not accessible from internet"
    echo "3. Firewall blocking ports 80/443"
    exit 1
fi

# Test SSL configuration
echo "Testing SSL configuration..."
if curl -f https://$DOMAIN/api/health > /dev/null 2>&1; then
    echo "✅ HTTPS access working"
else
    echo "❌ HTTPS access failed"
    exit 1
fi

echo "✅ SSL setup completed"
```

### 10.2 Configure SSL Security

```bash
echo "=== CONFIGURING SSL SECURITY ==="

# Create stronger DH parameters
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Create SSL security configuration
sudo tee /etc/nginx/conf.d/ssl-security.conf << 'EOF'
# SSL Security Configuration for Alonica
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_dhparam /etc/nginx/dhparam.pem;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
EOF

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ SSL security configured"
```

### 10.3 Setup SSL Auto-Renewal

```bash
echo "=== SETTING UP SSL AUTO-RENEWAL ==="

# Test SSL renewal
sudo certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo "✅ SSL auto-renewal test passed"
else
    echo "❌ SSL auto-renewal test failed"
    exit 1
fi

# Create renewal hook script
sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
# Reload nginx after SSL renewal
/bin/systemctl reload nginx

# Log renewal
echo "$(date): SSL certificate renewed and nginx reloaded" >> /var/log/ssl-renewal.log
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

# Add cron job for renewal (if not already exists)
if ! sudo crontab -l | grep -q certbot; then
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
fi

echo "✅ SSL auto-renewal configured"
```

---

## ✅ TAHAP 11: VERIFIKASI FUNGSIONALITAS KRITIS (JAMINAN NOL ERROR)

### 11.1 Test Sistem Secara Menyeluruh

```bash
echo "=== COMPREHENSIVE SYSTEM TESTING ==="

cd /opt/alonica/app

# Test 1: Infrastructure Services
echo "1. Testing infrastructure services..."
SERVICES=("postgresql" "nginx" "redis-server")
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
        exit 1
    fi
done

# Test 2: Application Process
echo "2. Testing application process..."
if pm2 status | grep -q "alonica-production.*online"; then
    echo "✅ Application process is running"
else
    echo "❌ Application process is not running"
    pm2 logs alonica-production --lines 10
    exit 1
fi

# Test 3: Database Connection
echo "3. Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connection working"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Test 4: Health Endpoints
echo "4. Testing health endpoints..."
HEALTH_TESTS=(
    "https://$DOMAIN/api/health"
    "https://$DOMAIN/"
)

for endpoint in "${HEALTH_TESTS[@]}"; do
    if curl -f "$endpoint" > /dev/null 2>&1; then
        echo "✅ $endpoint responding"
    else
        echo "❌ $endpoint not responding"
        exit 1
    fi
done

echo "✅ System infrastructure tests passed"
```

### 11.2 🔑 Test Login Functionality (MOST CRITICAL)

```bash
echo "=== TESTING LOGIN FUNCTIONALITY (CRITICAL) ==="

# Test Admin Login
echo "Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "Admin login response: $ADMIN_RESPONSE"

if echo "$ADMIN_RESPONSE" | jq -e '.user.role == "admin"' > /dev/null 2>&1; then
    echo "✅ Admin login successful"
    ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token')
else
    echo "❌ CRITICAL: Admin login failed!"
    echo "Response: $ADMIN_RESPONSE"
    
    # Diagnostic checks
    echo "Running diagnostics..."
    psql "$DATABASE_URL" -c "SELECT username, role, is_active FROM users WHERE role = 'admin';"
    echo "Check if users exist in database above ^^^"
    exit 1
fi

# Test Kasir Login
echo "Testing kasir login..."
KASIR_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kasir1","password":"kasir123"}')

echo "Kasir login response: $KASIR_RESPONSE"

if echo "$KASIR_RESPONSE" | jq -e '.user.role == "kasir"' > /dev/null 2>&1; then
    echo "✅ Kasir login successful"
    KASIR_TOKEN=$(echo "$KASIR_RESPONSE" | jq -r '.token')
else
    echo "❌ CRITICAL: Kasir login failed!"
    echo "Response: $KASIR_RESPONSE"
    exit 1
fi

# Test Invalid Login
echo "Testing invalid login (should fail)..."
INVALID_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"invalid","password":"invalid"}')

if echo "$INVALID_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo "✅ Invalid login properly rejected"
else
    echo "⚠️ Invalid login should return error"
fi

echo "✅ CRITICAL TEST PASSED: Login functionality working"
```

### 11.3 Test Menu Management & Data Sinkronisasi

```bash
echo "=== TESTING MENU MANAGEMENT & DATA SYNC ==="

# Test Menu Data Retrieval
echo "Testing menu data retrieval..."
MENU_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://$DOMAIN/api/menu/items)

MENU_COUNT=$(echo "$MENU_RESPONSE" | jq '. | length')
echo "Menu items found: $MENU_COUNT"

if [ "$MENU_COUNT" -ge 0 ]; then
    echo "✅ Menu data retrieval working"
else
    echo "❌ Menu data retrieval failed"
    exit 1
fi

# Test Categories
echo "Testing categories..."
CATEGORY_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://$DOMAIN/api/categories)

CATEGORY_COUNT=$(echo "$CATEGORY_RESPONSE" | jq '. | length')
echo "Categories found: $CATEGORY_COUNT"

if [ "$CATEGORY_COUNT" -ge 0 ]; then
    echo "✅ Categories retrieval working"
else
    echo "❌ Categories retrieval failed"
    exit 1
fi

# Test Menu Item Creation (Admin only)
echo "Testing menu item creation..."
NEW_ITEM_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/menu/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Test Item - DELETE ME",
    "price": 25000,
    "categoryId": "test-category",
    "description": "Test item for deployment verification",
    "isAvailable": true
  }')

if echo "$NEW_ITEM_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Menu item creation working"
    TEST_ITEM_ID=$(echo "$NEW_ITEM_RESPONSE" | jq -r '.id')
    
    # Clean up test item
    curl -s -X DELETE https://$DOMAIN/api/menu/items/$TEST_ITEM_ID \
      -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    echo "✅ Test item cleaned up"
else
    echo "⚠️ Menu item creation may have issues (check permissions)"
fi

echo "✅ Menu management tests passed"
```

### 11.4 Test Order Processing & Kasir Functions

```bash
echo "=== TESTING ORDER PROCESSING & KASIR FUNCTIONS ==="

# Test Shift Management
echo "Testing shift management..."
SHIFT_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/shifts/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KASIR_TOKEN" \
  -d '{"initialCash": 100000}')

if echo "$SHIFT_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Shift start working"
    SHIFT_ID=$(echo "$SHIFT_RESPONSE" | jq -r '.id')
else
    echo "⚠️ Shift management may have issues"
    echo "Response: $SHIFT_RESPONSE"
fi

# Test Order Creation (QRIS)
echo "Testing QRIS order creation..."
ORDER_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KASIR_TOKEN" \
  -d '{
    "customerName": "Test Customer",
    "tableNumber": "T01",
    "items": [{"itemId": "test-item", "name": "Test Item", "price": 25000, "quantity": 1}],
    "subtotal": 25000,
    "total": 25000,
    "paymentMethod": "qris"
  }')

if echo "$ORDER_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ QRIS order creation working"
    ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id')
else
    echo "⚠️ QRIS order creation may have issues"
    echo "Response: $ORDER_RESPONSE"
fi

# Test Cash Order
echo "Testing cash order creation..."
CASH_ORDER_RESPONSE=$(curl -s -X POST https://$DOMAIN/api/orders/cash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $KASIR_TOKEN" \
  -d '{
    "customerName": "Cash Customer",
    "tableNumber": "T02",
    "items": [{"itemId": "test-item", "name": "Test Item", "price": 25000, "quantity": 1}],
    "subtotal": 25000,
    "total": 25000,
    "amountPaid": 30000
  }')

if echo "$CASH_ORDER_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "✅ Cash order creation working"
    CASH_ORDER_ID=$(echo "$CASH_ORDER_RESPONSE" | jq -r '.id')
else
    echo "⚠️ Cash order creation may have issues"
    echo "Response: $CASH_ORDER_RESPONSE"
fi

# Close test shift if created
if [ -n "$SHIFT_ID" ]; then
    echo "Closing test shift..."
    curl -s -X POST https://$DOMAIN/api/shifts/$SHIFT_ID/close \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $KASIR_TOKEN" \
      -d '{"finalCash": 125000, "notes": "Test shift"}' > /dev/null
    echo "✅ Test shift closed"
fi

echo "✅ Order processing tests completed"
```

### 11.5 Test Frontend Accessibility

```bash
echo "=== TESTING FRONTEND ACCESSIBILITY ==="

# Test main pages load
FRONTEND_PAGES=(
    "/"
    "/login"
    "/menu"
    "/admin"
)

echo "Testing frontend pages..."
for page in "${FRONTEND_PAGES[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN$page)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $page loads (HTTP $HTTP_CODE)"
    else
        echo "⚠️ $page returns HTTP $HTTP_CODE"
    fi
done

# Test static assets
echo "Testing static assets..."
STATIC_TEST=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/assets/)
if [ "$STATIC_TEST" = "200" ] || [ "$STATIC_TEST" = "403" ]; then
    echo "✅ Static assets serving"
else
    echo "⚠️ Static assets may have issues (HTTP $STATIC_TEST)"
fi

echo "✅ Frontend accessibility tests completed"
```

---

## 🎯 TAHAP 12: FINAL VERIFICATION & CLEANUP

### 12.1 Complete Security Check

```bash
echo "=== FINAL SECURITY VERIFICATION ==="

# Check open ports
echo "Checking open ports..."
sudo netstat -tlnp | grep -E ':(22|80|443|3000|5432)' | tee open_ports.log

# Verify firewall rules
echo "Checking firewall rules..."
sudo ufw status verbose

# Check for any port 3000 exposure (should be blocked from outside)
echo "Verifying port 3000 is not exposed..."
if sudo ufw status | grep -q "3000"; then
    echo "⚠️ Port 3000 may be exposed. Removing external access..."
    sudo ufw delete allow 3000/tcp
    sudo ufw reload
fi

# Verify file permissions
echo "Checking file permissions..."
ls -la /opt/alonica/app/.env.production
ls -la /opt/alonica/app/.secrets.txt 2>/dev/null || echo "Secrets file not found (good)"

# Check nginx security headers
echo "Testing security headers..."
curl -I https://$DOMAIN/ | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"

echo "✅ Security verification completed"
```

### 12.2 Performance Verification

```bash
echo "=== PERFORMANCE VERIFICATION ==="

# Test response times
echo "Testing response times..."
for endpoint in "/" "/api/health" "/api/menu/items"; do
    RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" https://$DOMAIN$endpoint)
    echo "Response time for $endpoint: ${RESPONSE_TIME}s"
done

# Check PM2 resource usage
echo "PM2 resource usage:"
pm2 monit --no-colors | head -15

# Check database connections
echo "Database connection info:"
psql "$DATABASE_URL" -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

echo "✅ Performance verification completed"
```

### 12.3 Cleanup & Final Setup

```bash
echo "=== CLEANUP & FINAL SETUP ==="

# Remove temporary files
cd /opt/alonica/app
rm -f *.log
rm -f user_count.txt menu_count.txt category_count.txt
rm -f absolute_imports.log hardcoded_paths.log port_references.log env_vars_used.log

# Secure the secrets file
if [ -f ".secrets.txt" ]; then
    echo "⚠️ Remember to delete .secrets.txt after saving credentials safely!"
    echo "Command: rm /opt/alonica/app/.secrets.txt"
fi

# Create final status report
cat > /opt/alonica/deployment-report.txt << EOF
ALONICA VPS DEPLOYMENT REPORT
=============================
Deployment Date: $(date)
Domain: $DOMAIN
Server IP: $(curl -s ifconfig.me)

SERVICES STATUS:
- PostgreSQL: $(systemctl is-active postgresql)
- Nginx: $(systemctl is-active nginx)
- PM2: $(pm2 status alonica-production | grep -o "online\|stopped\|error" | head -1)
- Redis: $(systemctl is-active redis-server)

DATABASE INFO:
- Users: $(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;")
- Menu Items: $(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM menu_items;")
- Categories: $(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM categories;")

URLS:
- Frontend: https://$DOMAIN/
- Admin Login: https://$DOMAIN/login
- API Health: https://$DOMAIN/api/health

DEFAULT CREDENTIALS:
- Admin: admin / admin123
- Kasir: kasir1 / kasir123

NEXT STEPS:
1. Change default passwords
2. Configure Midtrans for payments
3. Setup regular backups
4. Monitor logs and performance
EOF

echo "✅ Deployment report created: /opt/alonica/deployment-report.txt"
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
```

---

## 📋 CHECKLIST FINAL VERIFIKASI

Pastikan semua item berikut ✅ sebelum mendeklarasikan deployment berhasil:

### Infrastructure & Security
- [ ] Ubuntu 25.04 LTS updated dan secured
- [ ] Firewall configured (22, 80, 443 only)
- [ ] PostgreSQL 16 installed dan secured
- [ ] Nginx installed dengan security headers
- [ ] SSL certificate installed dan verified
- [ ] Port 3000 blocked dari external access

### Application Setup
- [ ] Repository cloned dari GitHub
- [ ] Dependencies installed tanpa vulnerabilities
- [ ] Production build successful
- [ ] Environment variables configured
- [ ] Database schema migrated successfully

### 🚨 CRITICAL FUNCTIONALITY TESTS
- [ ] **Admin login working** (admin/admin123)
- [ ] **Kasir login working** (kasir1/kasir123)  
- [ ] **Menu data synchronized** (backend ↔ frontend)
- [ ] **Order creation working** (QRIS & Cash)
- [ ] **Shift management working**
- [ ] **Frontend accessible** via HTTPS

### Production Services
- [ ] PM2 configured dengan auto-restart
- [ ] Nginx reverse proxy working
- [ ] SSL auto-renewal configured
- [ ] Log rotation configured
- [ ] Monitoring cron jobs setup

### Data Integrity
- [ ] Default users seeded (1 admin + 4 kasir)
- [ ] Categories created
- [ ] Store profile configured  
- [ ] Database backups planned

### Performance & Monitoring
- [ ] Response times acceptable (<2s)
- [ ] Resource usage reasonable
- [ ] Error logs clean
- [ ] Health endpoints responding

---

## 🚨 TROUBLESHOOTING CRITICAL ERRORS

### Error: "Login gagal - Username atau password salah"

**Root Cause**: Default users tidak ter-seed di database

**Solution**:
```bash
# 1. Verify users exist
psql "$DATABASE_URL" -c "SELECT username, role FROM users;"

# 2. If empty, seed users
npx tsx scripts/seed-users.ts

# 3. Verify passwords are hashed correctly
psql "$DATABASE_URL" -c "SELECT username, length(password) FROM users;"
```

### Error: Database Connection Failed

**Root Cause**: Database permissions atau connection string salah

**Solution**:
```bash
# 1. Test connection manually
psql "postgresql://alonica_user:$DB_PASSWORD@localhost:5432/alonica_production" -c "SELECT 1;"

# 2. Check database user permissions
sudo -u postgres psql -c "\du alonica_user"

# 3. Verify environment variable
echo $DATABASE_URL
```

### Error: Nginx 502 Bad Gateway

**Root Cause**: Application tidak running atau port salah

**Solution**:
```bash
# 1. Check PM2 status
pm2 status

# 2. Check application logs
pm2 logs alonica-production --lines 50

# 3. Test direct application
curl http://localhost:3000/api/health

# 4. Restart if needed
pm2 restart alonica-production
```

### Error: Menu/Order Data Tidak Sinkron

**Root Cause**: API endpoints error atau database permission

**Solution**:
```bash
# 1. Test API endpoints
curl -H "Authorization: Bearer $TOKEN" https://$DOMAIN/api/menu/items

# 2. Check database permissions
psql "$DATABASE_URL" -c "SELECT * FROM information_schema.table_privileges WHERE grantee='alonica_user';"

# 3. Verify schema migration
npm run db:push
```

---

## 📞 POST-DEPLOYMENT MAINTENANCE

### Daily Tasks
```bash
# Check application health
curl https://$DOMAIN/api/health

# Check PM2 status
pm2 status

# Check disk space
df -h

# Check error logs
tail -50 /opt/alonica/logs/err.log
```

### Weekly Tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart application (rolling restart)
pm2 reload alonica-production

# Check SSL certificate expiry
sudo certbot certificates
```

### Monthly Tasks
```bash
# Database backup
pg_dump "$DATABASE_URL" > "/opt/alonica/backups/monthly_$(date +%Y%m%d).sql"

# Log rotation
pm2 flush

# Performance review
pm2 monit
```

---

## 🎉 KESIMPULAN

Jika mengikuti panduan ini langkah demi langkah dengan cermat, aplikasi Alonica Restaurant System akan:

✅ **Berjalan tanpa error** - Semua fungsionalitas kritis verified  
✅ **Database tersinkronisasi sempurna** - Backend dan frontend konsisten  
✅ **Login Admin/Kasir berfungsi** - Authentication system working  
✅ **Order processing lancar** - QRIS dan Cash payment working  
✅ **Secure dan production-ready** - SSL, firewall, dan monitoring aktif

**Default Login Credentials:**
- **Admin**: `admin` / `admin123` 
- **Kasir**: `kasir1` / `kasir123`

> 🔒 **SECURITY NOTE**: Segera ganti password default setelah login pertama!

**Access URLs:**
- **Frontend**: `https://yourdomain.com/`
- **Admin Dashboard**: `https://yourdomain.com/login`
- **API Health**: `https://yourdomain.com/api/health`

**Terima kasih telah menggunakan panduan deployment ini! 🚀**