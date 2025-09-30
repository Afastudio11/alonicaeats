# 🚀 Alonica Deployment Cheatsheet

Quick reference untuk deployment & troubleshooting

---

## 📋 Info VPS

```bash
IP Address: 148.230.101.194
Domain: kasirpos.space
GitHub: https://github.com/Afastudio11/alonicaeats
App Path: /var/www/alonica
Database: alonica_db
DB User: alonica_user
DB Password: Alonica2025.
```

---

## ⚡ Quick Fix Commands

### Fix Semua Masalah Sekaligus
```bash
cd /var/www/alonica
bash scripts/fix-vps-deployment.sh
```

### Setup VPS dari Nol
```bash
cd /var/www/alonica
bash scripts/setup-vps-fresh.sh
```

---

## 🔧 Common Commands

### PM2 Commands
```bash
# Status
pm2 status

# Logs (real-time)
pm2 logs alonica

# Logs (last 100 lines)
pm2 logs alonica --lines 100

# Restart
pm2 restart alonica

# Stop
pm2 stop alonica

# Delete & recreate
pm2 delete alonica
pm2 start npm --name "alonica" -- start
pm2 save

# Monitor resources
pm2 monit
```

### Application Commands
```bash
cd /var/www/alonica

# Pull latest code
git pull origin main

# Install dependencies (CORRECT way)
npm install
# or
npm ci

# Push database schema (SAFE way)
npm run db:push:prod

# Seed users
npm run seed:users

# Build
npm run build

# Start (testing)
npm start
```

### Nginx Commands
```bash
# Test config
sudo nginx -t

# Reload config
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/alonica_error.log

# View access logs
sudo tail -f /var/log/nginx/alonica_access.log
```

### Database Commands
```bash
# Connect to database
psql "postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db"

# Or with sudo
sudo -u postgres psql -d alonica_db

# Backup database
pg_dump -U alonica_user alonica_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U alonica_user alonica_db < backup_20250930.sql

# List databases
sudo -u postgres psql -l

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🐛 Troubleshooting

### Error: "cannot access 'node_modules/drizzle-kit/'"

**Penyebab:** Drizzle-kit tidak ter-install

**Fix:**
```bash
cd /var/www/alonica
npm install drizzle-kit
npm run db:push:prod
```

### Error: "permission denied for schema public"

**Penyebab:** Database privileges tidak lengkap

**Fix:**
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

### Error: "502 Bad Gateway"

**Penyebab:** Aplikasi tidak running

**Fix:**
```bash
# Cek status
pm2 status

# Lihat logs
pm2 logs alonica --lines 50

# Restart
pm2 restart alonica

# Jika gagal, recreate
pm2 delete alonica
cd /var/www/alonica
pm2 start npm --name "alonica" -- start
pm2 save
```

### Error: "Port 3000 already in use"

**Fix:**
```bash
# Lihat proses di port 3000
sudo lsof -i :3000

# Kill proses (ganti PID)
kill -9 PID

# Atau restart PM2
pm2 restart alonica
```

### Error: "Cannot connect to database"

**Fix:**
```bash
# Cek PostgreSQL
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test connection
psql "postgresql://alonica_user:Alonica2025.@localhost:5432/alonica_db" -c "SELECT 1;"
```

### Error: "Git pull failed" atau "Git auth failed"

**Fix:**
```bash
cd /var/www/alonica

# Reset local changes
git reset --hard origin/main

# Pull again
git pull origin main

# Jika masih gagal, gunakan PAT
# (Generate di GitHub Settings → Developer settings → Personal access tokens)
git remote set-url origin https://YOUR_PAT@github.com/Afastudio11/alonicaeats.git
```

### Build Error: "Cannot find module"

**Fix:**
```bash
cd /var/www/alonica

# Clean install
rm -rf node_modules package-lock.json
npm install

# Build ulang
npm run build
```

---

## 🔍 Health Check

### Quick Status Check
```bash
# Check all services
echo "=== PM2 Status ===" && pm2 status && \
echo -e "\n=== Nginx Status ===" && sudo systemctl status nginx --no-pager && \
echo -e "\n=== PostgreSQL Status ===" && sudo systemctl status postgresql --no-pager && \
echo -e "\n=== Disk Usage ===" && df -h /var/www/alonica && \
echo -e "\n=== Memory Usage ===" && free -h
```

### Test Application
```bash
# Test local
curl http://localhost:3000

# Test via Nginx
curl http://148.230.101.194

# Test domain
curl https://kasirpos.space
```

### Check Logs
```bash
# Application logs
pm2 logs alonica --lines 50

# Nginx error logs
sudo tail -100 /var/log/nginx/alonica_error.log

# System logs
sudo journalctl -u nginx -n 50
sudo journalctl -u postgresql -n 50
```

---

## 📦 Deployment Workflow

### Manual Deployment
```bash
cd /var/www/alonica
git pull origin main
npm install
npm run db:push:prod
npm run build
pm2 restart alonica
pm2 save
```

### Auto Deployment (GitHub Actions)
```bash
# Di lokal:
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions akan otomatis deploy ke VPS!
# Monitor di: https://github.com/Afastudio11/alonicaeats/actions
```

---

## 🔐 Security

### Update Secrets
```bash
cd /var/www/alonica

# Generate new secrets
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For JWT_SECRET

# Update .env
nano .env

# Restart
pm2 restart alonica
```

### Setup Firewall
```bash
# Allow HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Allow SSH
sudo ufw allow OpenSSH

# Enable
sudo ufw enable

# Check status
sudo ufw status
```

### SSL Certificate Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew

# Auto-renewal is configured by default
```

---

## 💾 Backup & Restore

### Backup Everything
```bash
# Create backup directory
mkdir -p ~/backups/$(date +%Y%m%d)

# Backup database
pg_dump -U alonica_user alonica_db > ~/backups/$(date +%Y%m%d)/database.sql

# Backup application
tar -czf ~/backups/$(date +%Y%m%d)/app.tar.gz /var/www/alonica

# Backup .env (SENSITIVE!)
cp /var/www/alonica/.env ~/backups/$(date +%Y%m%d)/.env

echo "Backup completed in ~/backups/$(date +%Y%m%d)/"
```

### Restore from Backup
```bash
# Restore database
psql -U alonica_user alonica_db < ~/backups/20250930/database.sql

# Restore application
cd /var/www
sudo rm -rf alonica
sudo tar -xzf ~/backups/20250930/app.tar.gz

# Restart
pm2 restart alonica
```

---

## 📊 Monitoring

### Resource Usage
```bash
# CPU & Memory
htop

# or
pm2 monit

# Disk space
df -h

# Application size
du -sh /var/www/alonica
```

### Performance
```bash
# Response time test
time curl http://localhost:3000

# Load test (install apache2-utils first)
ab -n 1000 -c 10 http://localhost:3000/
```

---

## 🆘 Emergency Commands

### Kill Everything & Restart
```bash
# Stop all
pm2 stop all
sudo systemctl stop nginx

# Start all
sudo systemctl start nginx
pm2 restart all
```

### Nuclear Option (Full Reinstall)
```bash
# Backup first!
pg_dump -U alonica_user alonica_db > ~/emergency_backup.sql

# Remove app
cd /var/www
sudo rm -rf alonica

# Clone fresh
sudo git clone https://github.com/Afastudio11/alonicaeats.git alonica
cd alonica

# Setup
npm install
npm run db:push:prod
npm run build

# Restore data
psql -U alonica_user alonica_db < ~/emergency_backup.sql

# Start
pm2 start npm --name "alonica" -- start
pm2 save
```

---

## 📞 Get Help

### View All Logs
```bash
# Application
pm2 logs alonica --lines 200

# Nginx
sudo tail -200 /var/log/nginx/alonica_error.log

# System
sudo journalctl -xe -n 100
```

### System Info
```bash
# Node version
node --version

# npm version
npm --version

# PostgreSQL version
psql --version

# Nginx version
nginx -v

# OS version
lsb_release -a
```

---

## 🎯 Login Credentials

**Admin Panel:**
- URL: https://kasirpos.space/login
- Admin: `admin` / `admin123`
- Kasir1: `kasir1` / `kasir123`
- Kasir2: `kasir2` / `kasir123`
- Kasir3: `kasir3` / `kasir123`
- Kasir4: `kasir4` / `kasir123`

---

**Last Updated:** September 30, 2025
**Maintained for:** Alonica Restaurant System @ kasirpos.space
