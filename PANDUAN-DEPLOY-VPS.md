# 🚀 Panduan Deploy Alonica ke VPS - UPDATED & TESTED

Panduan lengkap deployment yang sudah diperbaiki - **TANPA ERROR LAGI!**

**Info VPS Anda:**
- 🌐 IP Address: `148.230.101.194`
- 🔗 Domain: `kasirpos.space`
- 📦 GitHub: https://github.com/Afastudio11/alonicaeats
- 🗄️ Database Password: `Alonica2025.`

---

## ⚡ Cara Tercepat (Recommended!)

Gunakan script otomatis yang sudah kami buat:

```bash
# 1. Setup VPS dari nol (hanya sekali)
cd /var/www/alonica
bash scripts/setup-vps-fresh.sh

# 2. Fix masalah deployment (jika ada error)
bash scripts/fix-vps-deployment.sh
```

**Script otomatis akan:**
- ✅ Install semua software (Node.js, PostgreSQL, Nginx, PM2)
- ✅ Setup database dengan permissions yang BENAR
- ✅ Install drizzle-kit (yang sering hilang)
- ✅ Push schema & seed users
- ✅ Build & restart aplikasi

---

## 📋 Daftar Isi

1. [Setup VPS dari Nol](#1-setup-vps-dari-nol)
2. [Setup Database (PENTING!)](#2-setup-database-penting)
3. [Clone & Deploy Manual](#3-clone--deploy-manual)
4. [Setup GitHub Actions (Auto Deploy)](#4-setup-github-actions-auto-deploy)
5. [Setup Nginx & SSL](#5-setup-nginx--ssl)
6. [Troubleshooting Masalah Umum](#6-troubleshooting-masalah-umum)

---

## 1. Setup VPS dari Nol

### 1.1 Login ke VPS
```bash
ssh root@148.230.101.194
# Masukkan password dari Hostinger
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi
node --version  # Harus v20.x.x
npm --version   # Harus 10.x.x
```

### 1.4 Install PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 1.5 Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.6 Install Nginx & Git
```bash
sudo apt install nginx git -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.7 Setup Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 2. Setup Database (PENTING!)

### ⚠️ MASALAH UMUM: Missing Schema Privileges!

**Error yang sering muncul:**
- `permission denied for schema public`
- `cannot access 'node_modules/drizzle-kit/'`

**Root Cause:** Database privileges yang tidak lengkap untuk Drizzle ORM!

### 2.1 Buat Database dengan Privileges yang BENAR

```bash
# Login ke PostgreSQL
sudo -u postgres psql

# Jalankan SQL berikut:
```

```sql
-- Buat database
CREATE DATABASE alonica_db;

-- Buat user dengan password ANDA
CREATE USER alonica_user WITH PASSWORD 'Alonica2025.';

-- Beri privileges DATABASE
GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;

-- PENTING! Connect ke database dulu
\c alonica_db;

-- CRITICAL: Beri privileges SCHEMA (ini yang sering lupa!)
GRANT ALL ON SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;

-- CRITICAL: Grant default privileges untuk table yang akan dibuat nanti
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO alonica_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Test koneksi
\c alonica_db alonica_user;
SELECT 'Database setup successful!' as status;

-- Keluar
\q
```

### 2.2 Test Database Connection
```bash
psql "postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db" -c "SELECT version();"
```

✅ **Berhasil** jika muncul versi PostgreSQL!

---

## 3. Clone & Deploy Manual

### 3.1 Clone Repository
```bash
mkdir -p /var/www/alonica
cd /var/www/alonica
git clone https://github.com/Afastudio11/alonicaeats.git .
```

**Jika repository private**, gunakan Personal Access Token:
1. Buka GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)
2. Centang `repo` permission
3. Copy token
4. Clone dengan: `git clone https://YOUR_TOKEN@github.com/Afastudio11/alonicaeats.git .`

### 3.2 Install Dependencies

⚠️ **PENTING: Jangan pakai `--production`!**

```bash
# BENAR (install semua dependencies termasuk drizzle-kit):
npm install

# SALAH (akan menyebabkan error drizzle-kit hilang):
# npm ci --production  ❌ JANGAN INI!
```

### 3.3 Setup Environment Variables
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
ALLOWED_ORIGINS=https://kasirpos.space,https://www.kasirpos.space
FRONTEND_URL=https://kasirpos.space
MIDTRANS_IS_PRODUCTION=false
LOG_LEVEL=info
EOF

chmod 600 .env
```

### 3.4 Push Database Schema

⚠️ **PENTING: Gunakan script yang benar!**

```bash
# BENAR (auto-install drizzle-kit jika hilang):
npm run db:push:prod

# SALAH (error jika drizzle-kit tidak ada):
# npm run db:push  ❌ JANGAN INI!
```

### 3.5 Seed Initial Users
```bash
npm run seed:users
```

Login credentials yang dibuat:
- **Admin**: `admin` / `admin123`
- **Kasir1**: `kasir1` / `kasir123`
- **Kasir2**: `kasir2` / `kasir123`
- **Kasir3**: `kasir3` / `kasir123`
- **Kasir4**: `kasir4` / `kasir123`

### 3.6 Build Aplikasi
```bash
npm run build
```

### 3.7 Start dengan PM2
```bash
pm2 start npm --name "alonica" -- start
pm2 save

# Setup auto-start on reboot
pm2 startup
# Copy dan jalankan command yang muncul!
```

### 3.8 Verify
```bash
pm2 status
pm2 logs alonica --lines 20
curl http://localhost:3000
```

---

## 4. Setup GitHub Actions (Auto Deploy)

### 4.1 Setup SSH Key di VPS

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "deploy@github"
# Tekan Enter 3x (default location, no passphrase)

# Copy private key (simpan untuk GitHub Secrets)
cat ~/.ssh/id_rsa

# Setup authorized_keys
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4.2 Tambahkan GitHub Secrets

Buka repository di GitHub → Settings → Secrets and variables → Actions → New repository secret

Tambahkan secrets berikut:

| Secret Name | Value |
|------------|-------|
| `HOST` | `148.230.101.194` |
| `USERNAME` | `root` (atau username SSH Anda) |
| `SSH_PRIVATE_KEY` | (paste output dari `cat ~/.ssh/id_rsa`) |
| `APP_PATH` | `/var/www/alonica` |
| `DATABASE_URL` | `postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MIDTRANS_SERVER_KEY` | (optional, untuk production) |
| `MIDTRANS_CLIENT_KEY` | (optional, untuk production) |

### 4.3 Workflow File Sudah Ada!

File `.github/workflows/deploy.yml` sudah dibuat dengan konfigurasi yang BENAR:
- ✅ Menggunakan `npm ci` (tanpa --production)
- ✅ Menggunakan `npm run db:push:prod`
- ✅ Auto restart PM2

**Cara trigger deployment:**
1. Edit file apapun di project
2. Commit & push ke GitHub
3. GitHub Actions akan otomatis deploy ke VPS!

---

## 5. Setup Nginx & SSL

### 5.1 Buat Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/alonica
```

Paste konfigurasi berikut:

```nginx
server {
    listen 80;
    server_name kasirpos.space www.kasirpos.space 148.230.101.194;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/alonica_access.log;
    error_log /var/log/nginx/alonica_error.log;
}
```

Simpan: `Ctrl + X`, `Y`, `Enter`

### 5.2 Enable Site
```bash
sudo ln -sf /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5.3 Setup SSL (Recommended)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d kasirpos.space -d www.kasirpos.space
```

Ikuti instruksi:
1. Masukkan email Anda
2. Agree to terms
3. Pilih option 2 (Redirect HTTP to HTTPS)

### 5.4 Test Auto Renewal
```bash
sudo certbot renew --dry-run
```

---

## 6. Troubleshooting Masalah Umum

### ❌ Error: "cannot access 'node_modules/drizzle-kit/'"

**Penyebab:** Drizzle-kit tidak ter-install (karena pakai `npm ci --production`)

**Solusi:**
```bash
cd /var/www/alonica

# Opsi 1: Install drizzle-kit manual
npm install drizzle-kit

# Opsi 2: Install ulang semua dependencies
npm install

# Lalu push schema dengan script yang aman
npm run db:push:prod
```

### ❌ Error: "permission denied for schema public"

**Penyebab:** Database privileges tidak lengkap

**Solusi:**
```bash
sudo -u postgres psql -d alonica_db << 'EOF'
GRANT ALL ON SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO alonica_user;
EOF
```

### ❌ Error: "Password authentication is not supported"

**Penyebab:** GitHub tidak support password untuk push sejak 2021

**Solusi:** JANGAN push dari VPS! Workflow yang benar:
1. ✅ Edit kode di lokal/Replit
2. ✅ Push ke GitHub dari lokal
3. ✅ GitHub Actions auto-deploy ke VPS
4. ✅ VPS hanya `git pull`, bukan push

Jika HARUS push dari VPS, gunakan Personal Access Token:
```bash
git remote set-url origin https://YOUR_PAT@github.com/Afastudio11/alonicaeats.git
```

### ❌ Error: "502 Bad Gateway"

**Penyebab:** Aplikasi tidak running atau PM2 error

**Solusi:**
```bash
# Cek status
pm2 status

# Cek logs
pm2 logs alonica --lines 50

# Restart
pm2 restart alonica

# Atau start ulang
pm2 delete alonica
pm2 start npm --name "alonica" -- start
pm2 save
```

### ❌ Error: "Port 3000 already in use"

**Solusi:**
```bash
# Lihat proses di port 3000
sudo lsof -i :3000

# Kill proses (ganti PID)
kill -9 PID

# Atau stop PM2 dulu
pm2 stop alonica
pm2 delete alonica
```

### ❌ Error: "Cannot connect to database"

**Solusi:**
```bash
# Cek PostgreSQL running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql "postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db" -c "SELECT 1;"
```

### 🔧 Gunakan Script Fix Otomatis

Untuk memperbaiki semua masalah sekaligus:
```bash
cd /var/www/alonica
bash scripts/fix-vps-deployment.sh
```

---

## 📊 Monitoring & Maintenance

### Perintah PM2 Berguna
```bash
pm2 status                    # Status aplikasi
pm2 logs alonica              # Lihat logs real-time
pm2 logs alonica --lines 100  # Lihat 100 baris terakhir
pm2 restart alonica           # Restart aplikasi
pm2 stop alonica              # Stop aplikasi
pm2 monit                     # Monitor resource usage
```

### Perintah Nginx Berguna
```bash
sudo nginx -t                                   # Test konfigurasi
sudo systemctl reload nginx                     # Reload config
sudo systemctl restart nginx                    # Restart Nginx
sudo tail -f /var/log/nginx/alonica_error.log   # Monitor error logs
```

### Database Backup
```bash
# Backup database
pg_dump -U alonica_user alonica_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -U alonica_user alonica_db < backup_20250930.sql
```

---

## ✅ Checklist Deployment

**VPS Setup:**
- [ ] VPS accessible via SSH
- [ ] Node.js 20 installed
- [ ] PostgreSQL installed & running
- [ ] Nginx installed & running
- [ ] PM2 installed globally
- [ ] Firewall configured (UFW)

**Database Setup:**
- [ ] Database `alonica_db` created
- [ ] User `alonica_user` created with password `Alonica2025.`
- [ ] Database privileges granted
- [ ] **Schema privileges granted** (CRITICAL!)
- [ ] Default privileges granted
- [ ] Connection tested successfully

**Application Setup:**
- [ ] Repository cloned to `/var/www/alonica`
- [ ] Dependencies installed with `npm install` (NOT `--production`)
- [ ] Environment variables configured in `.env`
- [ ] Database schema pushed with `npm run db:push:prod`
- [ ] Users seeded successfully
- [ ] Application built successfully
- [ ] PM2 running and saved
- [ ] PM2 startup configured

**GitHub Actions:**
- [ ] SSH key generated on VPS
- [ ] All 7-9 secrets added to GitHub
- [ ] `.github/workflows/deploy.yml` exists with correct config
- [ ] Test deployment successful

**Nginx & SSL:**
- [ ] Nginx configured for domain
- [ ] Site enabled and tested
- [ ] SSL certificate installed (optional but recommended)
- [ ] Auto-renewal configured

**Testing:**
- [ ] Application accessible via IP: http://148.230.101.194
- [ ] Application accessible via domain: https://kasirpos.space
- [ ] Login works (admin/admin123)
- [ ] Database operations working
- [ ] GitHub Actions auto-deploy working

---

## 🎉 Selesai!

Deployment Anda sudah siap! Setiap kali push ke GitHub, aplikasi akan otomatis ter-deploy.

**Access URLs:**
- **HTTP**: http://148.230.101.194
- **HTTPS**: https://kasirpos.space

**Login Credentials:**
- Admin: `admin` / `admin123`
- Kasir1: `kasir1` / `kasir123`

**Management Commands:**
```bash
# Check status
pm2 status && sudo systemctl status nginx

# View logs
pm2 logs alonica --lines 50

# Restart everything
pm2 restart alonica && sudo systemctl reload nginx

# Fix deployment issues
bash scripts/fix-vps-deployment.sh
```

---

## 📞 Butuh Bantuan?

1. Cek logs: `pm2 logs alonica`
2. Cek Nginx logs: `sudo tail -f /var/log/nginx/alonica_error.log`
3. Cek GitHub Actions: Tab "Actions" di repository
4. Lihat Troubleshooting section di atas
5. Gunakan fix script: `bash scripts/fix-vps-deployment.sh`

**Happy deploying! 🚀**
