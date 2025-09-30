# 🚀 Panduan Deploy Alonica ke VPS - UPDATED & TESTED

Panduan lengkap deployment yang sudah diperbaiki - **TANPA ERROR!**

**Info VPS Anda:**
- 🌐 IP Address: `148.230.101.194`
- 🔗 Domain: `kasirpos.space`
- 📦 GitHub: https://github.com/Afastudio11/alonicaeats

---

## ⚡ Cara Tercepat - One Command Deploy!

### Opsi 1: Fresh VPS Setup (Dari Nol)

Jalankan ini di VPS yang baru pertama kali:

```bash
# Login ke VPS
ssh root@148.230.101.194

# Install semua dependencies & deploy aplikasi
curl -fsSL https://raw.githubusercontent.com/Afastudio11/alonicaeats/main/scripts/setup-vps-fresh.sh | bash
```

### Opsi 2: Redeploy (Sudah Ada Aplikasi)

Jika aplikasi sudah ada tapi error, gunakan quick deploy:

```bash
cd /var/www/alonica
bash scripts/vps-quick-deploy.sh
```

Script otomatis akan:
- ✅ Install/update dependencies
- ✅ Setup database dengan permissions yang benar
- ✅ Push schema & seed users
- ✅ Build & restart aplikasi
- ✅ Tidak ada error lagi!

---

## 📋 Daftar Isi

1. [Setup VPS dari Nol](#1-setup-vps-dari-nol)
2. [Clone & Deploy Aplikasi](#2-clone--deploy-aplikasi)
3. [Setup Nginx & SSL](#3-setup-nginx--ssl)
4. [Troubleshooting](#4-troubleshooting)
5. [Monitoring & Maintenance](#5-monitoring--maintenance)

---

## 1. Setup VPS dari Nol

### 1.1 Login ke VPS
```bash
ssh root@148.230.101.194
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

## 2. Clone & Deploy Aplikasi

### 2.1 Setup Directory
```bash
sudo mkdir -p /var/www/alonica
cd /var/www/alonica
```

### 2.2 Clone Repository
```bash
git clone https://github.com/Afastudio11/alonicaeats.git .
```

### 2.3 Setup Database dengan Permissions yang Benar

**CRITICAL: Ini yang sering lupa dan menyebabkan error!**

```bash
sudo -u postgres psql << 'EOF'
-- Buat database
CREATE DATABASE alonica_db;

-- Buat user dengan password
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
\q
EOF
```

### 2.4 Verify Database Connection
```bash
psql "postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db" -c "SELECT version();"
```

✅ **Jika muncul versi PostgreSQL, database siap!**

### 2.5 Update Ecosystem Config

File `ecosystem.config.cjs` sudah otomatis ter-update dengan:
- ✅ NODE_ENV=production
- ✅ DATABASE_URL sudah benar
- ✅ Semua env variables yang dibutuhkan

**Jika perlu customize** (misalnya ganti password), edit:
```bash
nano ecosystem.config.cjs
```

Cari baris `DATABASE_URL` dan pastikan password sesuai.

### 2.6 Install Dependencies
```bash
npm install
```

**PENTING:** Jangan pakai `npm ci --production` atau `--production` flag!

### 2.7 Push Database Schema
```bash
npm run db:push:prod
```

### 2.8 Seed Initial Users
```bash
npm run seed:users
```

Login credentials yang dibuat:
- **Admin**: `admin` / `admin123`
- **Kasir1**: `kasir1` / `kasir123`
- **Kasir2**: `kasir2` / `kasir123`
- **Kasir3**: `kasir3` / `kasir123`
- **Kasir4**: `kasir4` / `kasir123`

### 2.9 Build Aplikasi
```bash
npm run build
```

### 2.10 Start dengan PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save

# Setup auto-start on reboot
pm2 startup
# Copy dan jalankan command yang muncul!
```

### 2.11 Verify Aplikasi Berjalan
```bash
# Status harus "online"
pm2 status

# Lihat logs - seharusnya "serving on port 3000"
pm2 logs alonica-production --lines 20

# Test dari localhost
curl http://localhost:3000
```

✅ **Jika `curl` mengembalikan HTML, aplikasi sukses!**

---

## 3. Setup Nginx & SSL

### 3.1 Buat Nginx Configuration
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

### 3.2 Enable Site
```bash
sudo ln -sf /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 3.3 Test Akses
```bash
# Test via IP
curl http://148.230.101.194

# Atau buka di browser
# http://148.230.101.194
```

### 3.4 Setup SSL (Recommended)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d kasirpos.space -d www.kasirpos.space
```

Ikuti instruksi:
1. Masukkan email Anda
2. Agree to terms
3. Pilih option 2 (Redirect HTTP to HTTPS)

### 3.5 Test Auto Renewal
```bash
sudo certbot renew --dry-run
```

---

## 4. Troubleshooting

### ❌ Error: Database Connection Failed

**Cek status PostgreSQL:**
```bash
sudo systemctl status postgresql
```

**Restart PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

**Test connection:**
```bash
psql "postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db" -c "SELECT 1;"
```

**Jika masih gagal, reset database permissions:**
```bash
sudo -u postgres psql -d alonica_db << 'EOF'
GRANT ALL ON SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;
EOF
```

### ❌ Error: 502 Bad Gateway

**Penyebab:** Aplikasi tidak running atau crash

**Solusi:**
```bash
# Cek status PM2
pm2 status

# Lihat error logs
pm2 logs alonica-production --lines 100 | grep -i error

# Restart aplikasi
pm2 restart alonica-production

# Atau redeploy lengkap
cd /var/www/alonica
bash scripts/vps-quick-deploy.sh
```

### ❌ Error: Port 3000 Already in Use

**Solusi:**
```bash
# Lihat proses di port 3000
sudo lsof -i :3000

# Kill proses (ganti PID dari output di atas)
kill -9 PID

# Atau stop PM2 dulu
pm2 delete all
pm2 start ecosystem.config.cjs
pm2 save
```

### ❌ Error: "Using FallbackStorage"

**Penyebab:** Database tidak ter-konfigurasi dengan benar

**Solusi:**
```bash
# Cek ecosystem.config.cjs
cat ecosystem.config.cjs | grep DATABASE_URL

# Pastikan DATABASE_URL ada dan benar
# Restart PM2
pm2 restart alonica-production
```

### 🔧 Script Perbaikan Otomatis

Untuk memperbaiki semua masalah sekaligus:
```bash
cd /var/www/alonica
bash scripts/vps-quick-deploy.sh
```

---

## 5. Monitoring & Maintenance

### Perintah PM2 Berguna
```bash
pm2 status                            # Status aplikasi
pm2 logs alonica-production           # Lihat logs real-time
pm2 logs alonica-production --lines 100  # 100 baris terakhir
pm2 restart alonica-production        # Restart aplikasi
pm2 stop alonica-production           # Stop aplikasi
pm2 monit                             # Monitor resource usage
pm2 flush                             # Clear logs
```

### Perintah Nginx Berguna
```bash
sudo nginx -t                                   # Test konfigurasi
sudo systemctl reload nginx                     # Reload config
sudo systemctl restart nginx                    # Restart Nginx
sudo tail -f /var/log/nginx/alonica_error.log   # Monitor error logs
sudo tail -f /var/log/nginx/alonica_access.log  # Monitor access logs
```

### Database Backup
```bash
# Backup database
pg_dump -U alonica_user -d alonica_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -U alonica_user -d alonica_db < backup_20250930.sql
```

### Update Aplikasi (dari GitHub)
```bash
cd /var/www/alonica
git pull origin main
bash scripts/vps-quick-deploy.sh
```

---

## ✅ Checklist Deployment

**VPS Setup:**
- [ ] Node.js 20 installed
- [ ] PostgreSQL installed & running
- [ ] Nginx installed & running
- [ ] PM2 installed globally
- [ ] Firewall configured (UFW)

**Database Setup:**
- [ ] Database `alonica_db` created
- [ ] User `alonica_user` created
- [ ] Schema privileges granted ✅ CRITICAL
- [ ] Default privileges granted ✅ CRITICAL
- [ ] Connection tested successfully

**Application Setup:**
- [ ] Repository cloned to `/var/www/alonica`
- [ ] Dependencies installed (NOT with --production)
- [ ] Database schema pushed successfully
- [ ] Users seeded successfully
- [ ] Application built successfully
- [ ] PM2 running and saved
- [ ] PM2 startup configured

**Nginx & SSL:**
- [ ] Nginx configured for domain
- [ ] Site enabled and tested
- [ ] SSL certificate installed (optional)
- [ ] Auto-renewal configured

**Testing:**
- [ ] Application accessible via IP: http://148.230.101.194
- [ ] Application accessible via domain: https://kasirpos.space
- [ ] Login works (admin/admin123)
- [ ] Database operations working
- [ ] No errors in PM2 logs

---

## 🎉 Selesai!

**Access URLs:**
- **HTTP**: http://148.230.101.194
- **HTTPS**: https://kasirpos.space

**Login Credentials:**
- Admin: `admin` / `admin123`
- Kasir1: `kasir1` / `kasir123`

**Quick Deploy Commands:**
```bash
# Redeploy aplikasi
cd /var/www/alonica && bash scripts/vps-quick-deploy.sh

# Check status
pm2 status && sudo systemctl status nginx

# View logs
pm2 logs alonica-production --lines 50

# Restart everything
pm2 restart alonica-production && sudo systemctl reload nginx
```

---

## 📞 Butuh Bantuan?

1. Cek logs: `pm2 logs alonica-production --lines 100`
2. Cek Nginx logs: `sudo tail -f /var/log/nginx/alonica_error.log`
3. Gunakan script perbaikan: `bash scripts/vps-quick-deploy.sh`
4. Lihat section Troubleshooting di atas

**Happy deploying! 🚀**
