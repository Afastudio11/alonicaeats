# 🚀 Panduan Deploy Otomatis ke VPS Hostinger dengan GitHub Actions

Panduan lengkap untuk pemula - step by step tanpa error!

---

## 📋 Daftar Isi
1. [Persiapan VPS Hostinger](#1-persiapan-vps-hostinger)
2. [Setup SSH Key](#2-setup-ssh-key)
3. [Install Software di VPS](#3-install-software-di-vps)
4. [Setup Database PostgreSQL](#4-setup-database-postgresql)
5. [Clone Repository ke VPS](#5-clone-repository-ke-vps)
6. [Setup GitHub Secrets](#6-setup-github-secrets)
7. [Buat GitHub Actions Workflow](#7-buat-github-actions-workflow)
8. [Setup Nginx (Web Server)](#8-setup-nginx-web-server)
9. [Setup SSL (HTTPS)](#9-setup-ssl-https-opsional)
10. [Testing Deployment](#10-testing-deployment)

---

## 1. Persiapan VPS Hostinger

### 1.1 Login ke VPS
1. Buka **Panel Hostinger** → pilih VPS Anda
2. Catat informasi berikut:
   - **IP Address VPS**: misal `123.456.78.90`
   - **Username**: biasanya `root` atau `ubuntu`
   - **Password**: dari email Hostinger

### 1.2 Login via SSH
Buka terminal/command prompt di komputer Anda:

```bash
ssh root@123.456.78.90
# Masukkan password ketika diminta
```

✅ **Berhasil login** jika muncul prompt seperti: `root@hostname:~#`

---

## 2. Setup SSH Key

### 2.1 Generate SSH Key di VPS
Jalankan perintah berikut di VPS:

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "deploy@github"

# Tekan Enter 3x (untuk default location dan no passphrase)
```

### 2.2 Copy Private Key
```bash
cat ~/.ssh/id_rsa
```

**PENTING**: Copy semua output termasuk:
```
-----BEGIN RSA PRIVATE KEY-----
... (isi key yang panjang) ...
-----END RSA PRIVATE KEY-----
```

Simpan ini untuk dipakai di GitHub Secrets nanti!

### 2.3 Setup Public Key
```bash
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## 3. Install Software di VPS

### 3.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Node.js 20
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi instalasi
node --version  # Harus muncul: v20.x.x
npm --version   # Harus muncul: 10.x.x
```

### 3.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Verifikasi
pm2 --version
```

### 3.4 Install Nginx (Web Server)
```bash
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verifikasi
sudo systemctl status nginx
```

### 3.5 Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verifikasi
sudo systemctl status postgresql
```

### 3.6 Install Git
```bash
sudo apt install git -y

# Verifikasi
git --version
```

---

## 4. Setup Database PostgreSQL

### 4.1 Buat Database dan User
```bash
# Login ke PostgreSQL sebagai user postgres
sudo -u postgres psql

# Jalankan perintah SQL berikut (satu per satu):
```

```sql
-- Buat database
CREATE DATABASE alonica_db;

-- Buat user dengan password (ganti 'password_anda' dengan password yang kuat!)
CREATE USER alonica_user WITH PASSWORD 'password_anda_yang_kuat';

-- Beri akses penuh ke database
GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;

-- Keluar dari PostgreSQL
\q
```

### 4.2 Catat Connection String
Format connection string Anda:
```
postgresql://alonica_user:password_anda_yang_kuat@localhost:5432/alonica_db
```

**PENTING**: Simpan ini untuk GitHub Secrets nanti!

---

## 5. Clone Repository ke VPS

### 5.1 Buat Folder Aplikasi
```bash
# Buat folder untuk aplikasi
mkdir -p /var/www/alonica
cd /var/www/alonica
```

### 5.2 Clone Repository
```bash
# Ganti URL dengan URL repository GitHub Anda
git clone https://github.com/USERNAME/NAMA-REPO.git .

# Catatan: Titik (.) di akhir penting! Artinya clone ke folder saat ini
```

**PENTING**: Jika repository private, Anda perlu Personal Access Token:
1. Buka GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → Beri nama dan centang `repo`
3. Copy token
4. Gunakan format: `https://TOKEN@github.com/USERNAME/NAMA-REPO.git`

### 5.3 Install Dependencies
```bash
npm install
```

### 5.4 Buat File .env
```bash
nano .env
```

Isi dengan environment variables Anda:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://alonica_user:password_anda_yang_kuat@localhost:5432/alonica_db

# Midtrans (optional, untuk payment gateway)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
```

Simpan dengan: `Ctrl + X`, lalu `Y`, lalu `Enter`

### 5.5 Push Database Schema
```bash
npm run db:push
```

### 5.6 Seed Data
```bash
npm run seed:users
```

### 5.7 Build Aplikasi
```bash
npm run build
```

### 5.8 Test Aplikasi
```bash
# Test dulu dengan npm start
npm start

# Jika tidak ada error, tekan Ctrl+C untuk stop
```

### 5.9 Start dengan PM2
```bash
# Start aplikasi dengan PM2
pm2 start npm --name "alonica" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Copy dan jalankan perintah yang muncul!
```

---

## 6. Setup GitHub Secrets

### 6.1 Buka Repository di GitHub
1. Buka repository Anda di GitHub
2. Klik **Settings** (tab paling kanan)
3. Klik **Secrets and variables** → **Actions**
4. Klik **New repository secret**

### 6.2 Tambahkan Secrets Berikut

#### Secret 1: HOST
- **Name**: `HOST`
- **Value**: IP Address VPS Anda (misal: `123.456.78.90`)

#### Secret 2: USERNAME
- **Name**: `USERNAME`
- **Value**: `root` (atau username SSH Anda)

#### Secret 3: SSH_PRIVATE_KEY
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: Private key yang sudah Anda copy di langkah 2.2
  ```
  -----BEGIN RSA PRIVATE KEY-----
  ... (paste semua isi key) ...
  -----END RSA PRIVATE KEY-----
  ```

#### Secret 4: APP_PATH
- **Name**: `APP_PATH`
- **Value**: `/var/www/alonica`

#### Secret 5: DATABASE_URL
- **Name**: `DATABASE_URL`
- **Value**: `postgresql://alonica_user:password_anda_yang_kuat@localhost:5432/alonica_db`

#### Secret 6: NODE_ENV
- **Name**: `NODE_ENV`
- **Value**: `production`

#### Secret 7: PORT
- **Name**: `PORT`
- **Value**: `3000`

#### Secret 8 & 9: Midtrans (Optional)
- **Name**: `MIDTRANS_SERVER_KEY`
- **Value**: Your Midtrans server key

- **Name**: `MIDTRANS_CLIENT_KEY`
- **Value**: Your Midtrans client key

---

## 7. Buat GitHub Actions Workflow

### 7.1 Buat Folder dan File
Di komputer Anda (atau langsung di GitHub):

1. Buat folder: `.github/workflows/`
2. Buat file: `deploy.yml` di dalam folder tersebut

### 7.2 Isi File deploy.yml

Copy dan paste kode berikut ke `.github/workflows/deploy.yml`:

```yaml
name: Deploy ke VPS Hostinger

on:
  push:
    branches: [main]  # Trigger ketika push ke branch main
  workflow_dispatch:  # Bisa trigger manual dari GitHub

jobs:
  deploy:
    name: Deploy Aplikasi
    runs-on: ubuntu-latest

    steps:
      # Step 1: Checkout code
      - name: Checkout Repository
        uses: actions/checkout@v4

      # Step 2: Deploy ke VPS
      - name: Deploy ke VPS via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            echo "🚀 Memulai deployment..."
            
            # 1. Masuk ke folder aplikasi
            cd ${{ secrets.APP_PATH }}
            
            # 2. Pull latest code dari GitHub
            echo "📥 Mengambil kode terbaru..."
            git pull origin main
            
            # 3. Install dependencies
            echo "📦 Menginstall dependencies..."
            npm ci --production
            
            # 4. Build aplikasi
            echo "🔨 Building aplikasi..."
            npm run build
            
            # 5. Update environment variables
            echo "⚙️  Update environment variables..."
            echo "NODE_ENV=${{ secrets.NODE_ENV }}" > .env
            echo "PORT=${{ secrets.PORT }}" >> .env
            echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
            echo "MIDTRANS_SERVER_KEY=${{ secrets.MIDTRANS_SERVER_KEY }}" >> .env
            echo "MIDTRANS_CLIENT_KEY=${{ secrets.MIDTRANS_CLIENT_KEY }}" >> .env
            
            # 6. Push database schema (jika ada perubahan)
            echo "🗄️  Push database schema..."
            npm run db:push || echo "Database sudah up to date"
            
            # 7. Restart aplikasi dengan PM2
            echo "🔄 Restart aplikasi..."
            pm2 restart alonica || pm2 start npm --name "alonica" -- start
            
            # 8. Save PM2 configuration
            pm2 save
            
            echo "✅ Deployment selesai!"
            
            # 9. Tampilkan status
            pm2 status
```

### 7.3 Commit dan Push
```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

---

## 8. Setup Nginx (Web Server)

### 8.1 Buat Config Nginx
```bash
sudo nano /etc/nginx/sites-available/alonica
```

### 8.2 Isi Config
Copy dan paste kode berikut (ganti `your-domain.com` dengan domain Anda, atau gunakan IP jika belum punya domain):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Ganti dengan domain atau IP Anda

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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

Simpan dengan: `Ctrl + X`, lalu `Y`, lalu `Enter`

### 8.3 Enable Site
```bash
# Buat symbolic link
sudo ln -s /etc/nginx/sites-available/alonica /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Jika OK, reload Nginx
sudo systemctl reload nginx
```

### 8.4 Setup Firewall
```bash
# Allow HTTP dan HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 9. Setup SSL (HTTPS) - Opsional

Jika Anda sudah punya domain dan ingin menggunakan HTTPS:

### 9.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 9.2 Generate SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Ikuti instruksi di layar:
1. Masukkan email Anda
2. Setuju terms of service
3. Pilih option 2 (Redirect) untuk auto redirect HTTP ke HTTPS

### 9.3 Auto Renewal
```bash
# Test auto renewal
sudo certbot renew --dry-run

# Jika OK, certificate akan auto-renew setiap 90 hari
```

---

## 10. Testing Deployment

### 10.1 Test Manual di VPS
```bash
# Cek status PM2
pm2 status

# Cek logs jika ada error
pm2 logs alonica --lines 50

# Cek apakah aplikasi jalan di port 3000
curl http://localhost:3000
```

### 10.2 Test dari Browser
Buka browser dan akses:
- **Dengan domain**: `http://your-domain.com` atau `https://your-domain.com`
- **Tanpa domain**: `http://123.456.78.90` (ganti dengan IP VPS Anda)

✅ **Berhasil** jika muncul halaman "Welcome to Alonica"

### 10.3 Test GitHub Actions
1. Edit file apapun di repository (misal: tambah komentar di README)
2. Commit dan push ke GitHub
3. Buka repository di GitHub → klik tab **Actions**
4. Lihat workflow "Deploy ke VPS Hostinger" sedang berjalan
5. Tunggu sampai selesai (hijau ✅)
6. Refresh browser, perubahan sudah muncul!

---

## 📊 Monitoring & Maintenance

### Perintah Berguna PM2
```bash
# Lihat status aplikasi
pm2 status

# Lihat logs real-time
pm2 logs alonica

# Restart aplikasi
pm2 restart alonica

# Stop aplikasi
pm2 stop alonica

# Delete aplikasi dari PM2
pm2 delete alonica

# Monitoring resource usage
pm2 monit
```

### Perintah Berguna Nginx
```bash
# Test konfigurasi
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Lihat error logs
sudo tail -f /var/log/nginx/alonica_error.log
```

### Perintah Berguna Database
```bash
# Login ke database
sudo -u postgres psql -d alonica_db

# Backup database
pg_dump -U alonica_user alonica_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -U alonica_user alonica_db < backup_20250930.sql
```

---

## 🔧 Troubleshooting

### Error: "pm2: command not found"
```bash
# Install ulang PM2
sudo npm install -g pm2

# Atau tambahkan ke PATH
export PATH="$PATH:$(npm config get prefix)/bin"
```

### Error: "Cannot connect to database"
```bash
# Cek status PostgreSQL
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Cek apakah database ada
sudo -u postgres psql -l
```

### Error: "Port 3000 already in use"
```bash
# Lihat proses yang menggunakan port 3000
sudo lsof -i :3000

# Kill proses (ganti PID dengan PID yang muncul)
kill -9 PID
```

### Error: "Git pull failed"
```bash
# Reset local changes
cd /var/www/alonica
git reset --hard origin/main
git pull origin main
```

### Error: "502 Bad Gateway" di Nginx
```bash
# Cek apakah aplikasi jalan
pm2 status

# Cek logs
pm2 logs alonica

# Restart aplikasi dan Nginx
pm2 restart alonica
sudo systemctl restart nginx
```

---

## ✅ Checklist Deployment

- [ ] VPS Hostinger sudah siap
- [ ] SSH key sudah di-generate
- [ ] Node.js, PM2, Nginx, PostgreSQL sudah terinstall
- [ ] Database PostgreSQL sudah dibuat
- [ ] Repository sudah di-clone ke VPS
- [ ] Aplikasi sudah bisa jalan di VPS (test dengan PM2)
- [ ] GitHub Secrets sudah ditambahkan (minimal 7 secrets)
- [ ] GitHub Actions workflow file sudah dibuat
- [ ] Nginx sudah dikonfigurasi
- [ ] Firewall sudah allow HTTP/HTTPS
- [ ] SSL certificate sudah diinstall (optional)
- [ ] Test deployment dari GitHub Actions berhasil
- [ ] Website bisa diakses dari browser

---

## 🎉 Selamat!

Deployment otomatis Anda sudah siap! Sekarang setiap kali Anda push ke branch `main`, aplikasi akan otomatis ter-deploy ke VPS Hostinger.

### Next Steps:
1. Setup monitoring dengan PM2 Plus atau tools lain
2. Setup backup database otomatis
3. Setup domain dan SSL certificate
4. Setup CI/CD untuk testing sebelum deploy

---

## 📞 Butuh Bantuan?

Jika ada error atau pertanyaan:
1. Cek logs dengan `pm2 logs alonica`
2. Cek Nginx logs dengan `sudo tail -f /var/log/nginx/alonica_error.log`
3. Cek GitHub Actions logs di tab Actions repository Anda
4. Baca section Troubleshooting di atas

**Semoga sukses! 🚀**
