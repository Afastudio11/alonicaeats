# 🚀 Panduan Deployment VPS - Alonica Restaurant System

## 📋 Ringkasan
Panduan lengkap step-by-step untuk deploy sistem Alonica ke VPS tanpa error, dengan fokus pada maintainability, scalability, dan keamanan.

> **⚠️ PENTING**: Ikuti setiap langkah dengan urutan yang tepat untuk menghindari error autentikasi dan masalah lainnya!

## 🔧 Prerequisites VPS
- **OS**: Ubuntu 20.04+ atau CentOS 8+
- **RAM**: Minimal 2GB (recommended 4GB+)
- **Storage**: Minimal 20GB SSD
- **Network**: Public IP dan domain (optional)
- **Access**: SSH root/sudo access

## 🏗️ Arsitektur Deployment

```
Internet → Nginx (SSL/Proxy) → Node.js App (Port 3000) → PostgreSQL Database
```

---

## 🚀 QUICK START (Otomatis)

Untuk setup cepat, gunakan script otomatis:

```bash
# Download dan jalankan quick setup script (dari project directory)
cd /path/to/your/alonica-project
chmod +x scripts/vps-quick-setup.sh
./scripts/vps-quick-setup.sh

# ATAU jika belum clone project, download script dulu:
# wget https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main/scripts/vps-quick-setup.sh
# chmod +x vps-quick-setup.sh
# ./vps-quick-setup.sh
```

> Script ini akan otomatis setup semua yang diperlukan. Jika ingin setup manual, lanjutkan ke langkah berikutnya.

---

## 📦 LANGKAH 1: Persiapan Server VPS (Manual Setup)

### 1.1 Update Sistem dan Install Dependencies

**Ubuntu/Debian:**
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
  nodejs npm \
  postgresql postgresql-contrib \
  nginx \
  git \
  curl \
  certbot python3-certbot-nginx \
  htop \
  ufw

# Install Node.js 20 (LTS) - Skip if already installed nodejs from apt
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Alternative: Install via NodeSource instead of apt nodejs
# sudo apt remove nodejs npm -y  # Remove old version first
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt-get install -y nodejs

# Verify installations
node --version    # Should be v20.x.x
npm --version     # Should be 10.x.x
psql --version    # Should be PostgreSQL 12+
```

**CentOS/RHEL:**
```bash
# Update sistem
sudo yum update -y

# Install dependencies
sudo yum install -y \
  nodejs npm \
  postgresql postgresql-server postgresql-contrib \
  nginx \
  git \
  curl \
  certbot python3-certbot-nginx

# Initialize PostgreSQL (CentOS only)
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 1.2 Setup Firewall
```bash
# Setup UFW firewall
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 3000/tcp   # App port (temporary - will be removed later)
sudo ufw --force enable

# Verify firewall status
sudo ufw status verbose
```

### 1.3 Verify Semua Services Running
```bash
# Check service status
sudo systemctl status nginx
sudo systemctl status postgresql

# Start services jika belum running
sudo systemctl enable nginx
sudo systemctl enable postgresql
sudo systemctl start nginx
sudo systemctl start postgresql
```

---

## 🗂️ LANGKAH 2: Clone dan Setup Proyek

### 2.1 Clone Repository dan Setup Directory
```bash
# Create aplikasi directory
sudo mkdir -p /opt/alonica
sudo chown $USER:$USER /opt/alonica

# Clone repository
cd /opt/alonica
git clone <your-repository-url> .

# atau jika sudah ada folder alonica
# git clone <your-repository-url> /opt/alonica

# Set proper permissions
sudo chown -R $USER:$USER /opt/alonica
chmod -R 755 /opt/alonica
```

### 2.2 Verify Project Structure
```bash
# Check structure project
ls -la /opt/alonica

# Harus terlihat file-file ini:
# - package.json
# - server/
# - client/
# - shared/
# - scripts/
# - docs/
```

---

## 🗄️ LANGKAH 3: Setup Database PostgreSQL

### 3.1 Setup Database dan User
```bash
# Switch ke postgres user
sudo -u postgres psql

# Jalankan perintah SQL ini satu per satu:
```

```sql
-- Buat database
CREATE DATABASE alonica_production;

-- Buat user dengan password yang kuat
CREATE USER alonica_user WITH PASSWORD 'P@ssw0rd_Alonica_2024!';

-- Berikan semua hak akses
GRANT ALL PRIVILEGES ON DATABASE alonica_production TO alonica_user;

-- Grant schema privileges (penting!)
GRANT ALL ON SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;

-- Grant future tables (penting untuk migrations!)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;

-- Keluar dari psql
\q
```

### 3.2 Test Database Connection
```bash
# Test koneksi dengan user yang dibuat
psql -h localhost -U alonica_user -d alonica_production -c "SELECT version();"

# Jika berhasil, akan muncul info versi PostgreSQL
# Jika gagal, check password dan user privileges
```

### 3.3 Configure PostgreSQL untuk Remote Access (Optional)
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf

# Uncomment dan ubah:
# listen_addresses = 'localhost'  # atau '*' untuk semua IP

# Edit pg_hba.conf untuk authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Tambahkan line ini sebelum line yang ada:
# local   all             alonica_user                            md5
# host    all             alonica_user    127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## ⚙️ LANGKAH 4: Konfigurasi Environment Variables

### 4.1 Create Environment File
```bash
# Masuk ke directory project
cd /opt/alonica

# Buat file environment production
nano .env.production
```

### 4.2 Isi File `.env.production` dengan Konfigurasi Ini:
```env
# ========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ========================================

# App Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (SESUAIKAN PASSWORD!)
DATABASE_URL=postgresql://alonica_user:P@ssw0rd_Alonica_2024!@localhost:5432/alonica_production

# Security Secrets (GANTI DENGAN RANDOM STRING!)
SESSION_SECRET=your_very_long_random_string_here_min_32_chars
JWT_SECRET=another_very_long_random_string_here_min_32_chars

# Payment Integration (Optional - Untuk Midtrans)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=true

# Google Cloud Storage (Optional - Jika menggunakan GCS)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET=your_bucket_name
GOOGLE_APPLICATION_CREDENTIALS=/opt/alonica/gcs-key.json

# Domain dan CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
REPLIT_DOMAINS=

# File Upload (Optional)
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# Logging
LOG_LEVEL=info
```

### 4.3 Generate Security Secrets
```bash
# Generate random secrets untuk production
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Copy hasil output ke file .env.production
```

### 4.4 Set Proper Permissions untuk File Environment
```bash
# Set permissions agar hanya owner yang bisa read
chmod 600 .env.production
chown $USER:$USER .env.production

# Verify permissions
ls -la .env.production
# Should show: -rw------- 1 user user
```

---

## 🏗️ LANGKAH 5: Install dan Build Aplikasi

### 5.1 Install Dependencies
```bash
# Masuk ke directory project
cd /opt/alonica

# Install dependencies dengan npm
npm install

# Verify installation
npm list --depth=0

# Check jika ada vulnerabilities
npm audit
```

### 5.2 Build Aplikasi untuk Production
```bash
# Build frontend dan backend
npm run build

# Verify build output
ls -la dist/
# Harus terlihat folder 'dist' dengan file compiled
```

### 5.3 Test Build Lokal (Optional)
```bash
# Test run production build
NODE_ENV=production node dist/index.js &

# Test endpoint (di terminal lain)
curl http://localhost:3000/api/health

# Stop test jika berhasil
killall node
```

---

## 🗃️ LANGKAH 6: Database Migration dan Schema Setup

### 6.1 Run Database Migrations
```bash
# Set environment untuk database operations
export DATABASE_URL="postgresql://alonica_user:P@ssw0rd_Alonica_2024!@localhost:5432/alonica_production"

# Push database schema (membuat tables)
# Verify actual script name first:
npm run --silent 2>/dev/null | grep -E "(db:push|migrate|drizzle)"

# Use the correct script name, examples:
npm run db:push
# OR if different: npm run migrate
# OR if different: npm run drizzle:push

# Verify tables created
psql -h localhost -U alonica_user -d alonica_production -c "\dt"
# Harus terlihat tables: users, menu_items, orders, dll.
```

### 6.2 **🚨 CRITICAL: Seed Default Users (WAJIB DILAKUKAN!)**

> **⚠️ INI LANGKAH PALING PENTING** - Tanpa ini akan error "Login gagal"!

```bash
# Method 1: Menggunakan seed script (RECOMMENDED)
# Run the seed script directly
npx tsx scripts/seed-users.ts

# Verify users created
psql -h localhost -U alonica_user -d alonica_production -c "SELECT username, role FROM users;"

# Method 2: Menggunakan API endpoint (ALTERNATIVE)
# Start aplikasi temporary
NODE_ENV=production node dist/index.js &
APP_PID=$!
sleep 5

# Initialize default users
curl -X POST http://localhost:3000/api/auth/init-default-users

# Verify response (harus berisi "created":{"admin":1,"kasir":4})
# Stop temporary server safely
kill $APP_PID
```

### 6.3 Verify Database Data
```bash
# Check users berhasil dibuat
psql -h localhost -U alonica_user -d alonica_production -c "SELECT username, role FROM users;"

# Expected output:
#  username | role  
# ----------+-------
#  admin    | admin
#  kasir1   | kasir
#  kasir2   | kasir
#  kasir3   | kasir
#  kasir4   | kasir
```

---

## 🚀 LANGKAH 7: Setup Production Service dengan PM2

### 7.1 Install PM2 Global
```bash
# Install PM2 process manager
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 7.2 Create PM2 Ecosystem File
```bash
# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'alonica-production',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env.production',
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
EOF
```

### 7.3 Setup Log Directory dan Start Application
```bash
# Create logs directory
mkdir -p logs

# Start aplikasi dengan PM2
pm2 start ecosystem.config.js

# Verify aplikasi running
pm2 status
pm2 logs alonica-production --lines 20

# Test aplikasi
curl http://localhost:3000/api/health
# Expected: {"status":"healthy","timestamp":"..."}

# Setup PM2 auto-start on boot
pm2 startup
pm2 save
```

---

## 🌐 LANGKAH 8: Setup Nginx Reverse Proxy

### 8.1 Create Nginx Configuration
```bash
# Create nginx site config
sudo nano /etc/nginx/sites-available/alonica
```

```nginx
# Nginx configuration untuk Alonica
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # GANTI DENGAN DOMAIN ANDA
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header X-XSS-Protection "1; mode=block";
    
    # Client max body size for file uploads
    client_max_body_size 10M;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files (jika ada)
    location /static {
        alias /opt/alonica/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

### 8.2 Enable Site dan Test Nginx
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx jika test berhasil
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx
```

### 8.3 Test Access dari Browser
```bash
# Test dari server (internal)
curl http://localhost/api/health

# Test dari domain (jika DNS sudah pointing)
curl http://your-domain.com/api/health

# 🔒 SECURITY: Close direct app port after Nginx is working
sudo ufw delete allow 3000/tcp
sudo ufw reload
```

---

## 🔒 LANGKAH 9: Setup SSL dengan Let's Encrypt

### 9.1 Install SSL Certificate
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to terms
# 3. Choose redirect (Option 2)
```

### 9.2 Test SSL Auto-Renewal
```bash
# Test SSL renewal
sudo certbot renew --dry-run

# Should show "Congratulations, all renewals succeeded"
```

### 9.3 Setup Auto-Renewal Cron
```bash
# Add cron job for auto renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## ✅ LANGKAH 10: Final Verification dan Testing

### 10.1 Complete System Check
```bash
# Check all services running
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check ports
sudo netstat -tlnp | grep -E ':(80|443|3000|5432)'

# Test database connection
psql -h localhost -U alonica_user -d alonica_production -c "SELECT COUNT(*) FROM users;"
# Should return 5 (1 admin + 4 kasir)
```

### 10.2 **🔑 TEST LOGIN FUNCTIONALITY (MOST IMPORTANT!)**
```bash
# Test admin login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected response:
# {"user":{"id":"...","username":"admin","role":"admin"},"token":"..."}

# Test kasir login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kasir1","password":"kasir123"}'

# Expected response:
# {"user":{"id":"...","username":"kasir1","role":"kasir"},"token":"..."}
```

### 10.3 Test Web Interface
```bash
# Open browser dan test:
# 1. https://your-domain.com (should load homepage)
# 2. Click "Admin Login" button
# 3. Login dengan: admin / admin123
# 4. Should redirect to admin dashboard
# 5. Test logout functionality
```

---

## 🛠️ TROUBLESHOOTING & COMMON ISSUES

### ❌ Issue: "Login gagal - Username atau password salah"

**Cause**: Default users belum ter-seed di database

**Solution**:
```bash
# 1. Check jika users ada di database
psql -h localhost -U alonica_user -d alonica_production -c "SELECT username, role FROM users;"

# 2. Jika kosong, seed users:
# Method A: Via API (if app is running)
curl -X POST http://localhost:3000/api/auth/init-default-users

# Method B: Via seed script (RECOMMENDED)
npx tsx scripts/seed-users.ts

# 3. Verify users created:
psql -h localhost -U alonica_user -d alonica_production -c "SELECT username, role FROM users;"
```

**🔒 SECURITY NOTE**: The `/api/auth/init-default-users` endpoint should only work when no users exist in database. If accessible after initial setup, consider blocking it via Nginx or removing it.

### ❌ Issue: Application tidak start

**Check these steps**:
```bash
# 1. Check environment file
cat .env.production | grep DATABASE_URL

# 2. Check database connection
psql -h localhost -U alonica_user -d alonica_production -c "SELECT 1;"

# 3. Check PM2 logs
pm2 logs alonica-production --lines 50

# 4. Check port conflicts
sudo netstat -tlnp | grep :3000
```

### ❌ Issue: Nginx 502 Bad Gateway

**Solutions**:
```bash
# 1. Check if app is running
pm2 status

# 2. Check nginx logs
sudo tail -f /var/log/nginx/error.log

# 3. Restart services
pm2 restart alonica-production
sudo systemctl reload nginx
```

### ❌ Issue: SSL Certificate Error

**Solutions**:
```bash
# 1. Check domain DNS
nslookup your-domain.com

# 2. Check nginx config
sudo nginx -t

# 3. Renew SSL manually
sudo certbot renew --nginx --force-renewal
```

---

## 📋 CHECKLIST POST-DEPLOYMENT

Copy checklist ini dan pastikan semua ✅:

**Infrastructure:**
- [ ] VPS setup dengan OS terbaru
- [ ] Firewall configured (80, 443, 22)
- [ ] PostgreSQL installed dan running
- [ ] Nginx installed dan running

**Application:**
- [ ] Repository cloned ke /opt/alonica
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build`)
- [ ] Environment file configured (`.env.production`)
- [ ] Database schema migrated (`npm run db:push`)

**🚨 CRITICAL STEP:**
- [ ] **Default users seeded** (`curl -X POST .../api/auth/init-default-users`)
- [ ] **Login tested** (admin/admin123 dan kasir1/kasir123)
- [ ] **Port 3000 closed** after Nginx setup (`sudo ufw delete allow 3000/tcp`)

**Production Setup:**
- [ ] PM2 configured dan running
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed dan tested
- [ ] Auto-renewal setup untuk SSL

**Testing:**
- [ ] Health endpoint working (`/api/health`)
- [ ] Web interface accessible
- [ ] Admin login working
- [ ] Kasir login working
- [ ] All features functional

**Monitoring:**
- [ ] PM2 monitoring active
- [ ] Log files accessible
- [ ] Database backup scheduled
- [ ] SSL auto-renewal tested

---

## 🎯 KREDENSIAL LOGIN DEFAULT

Setelah deployment berhasil, gunakan kredensial ini:

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `admin123` |
| **Kasir** | `kasir1` | `kasir123` |
| **Kasir** | `kasir2` | `kasir456` |
| **Kasir** | `kasir3` | `kasir789` |
| **Kasir** | `kasir4` | `kasir000` |

> **🔒 SECURITY NOTE**: Ganti password default setelah login pertama melalui admin dashboard!

---

## 📞 SUPPORT & MAINTENANCE

**Update Rutin:**
- Security patches: Segera setelah tersedia
- Application updates: Mingguan (weekend)
- Database maintenance: Bulanan
- SSL renewal: Otomatis (cek bulanan)

**Backup Strategy:**
- Database backup: Harian (otomatis)
- Application backup: Mingguan
- Full system backup: Bulanan

---

**🎉 DEPLOYMENT SELESAI!** 

Jika mengikuti panduan ini step-by-step, aplikasi Alonica harus running tanpa error autentikasi atau masalah lainnya.

