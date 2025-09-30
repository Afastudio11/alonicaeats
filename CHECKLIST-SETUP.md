# ✅ Checklist Setup VPS Hostinger

Gunakan checklist ini untuk memastikan tidak ada yang terlewat!

## 📋 Persiapan Awal

- [ ] Sudah punya akses ke VPS Hostinger
- [ ] Sudah punya akses SSH ke VPS (username & password/key)
- [ ] Sudah punya repository GitHub untuk project ini
- [ ] Sudah membaca file `PANDUAN-DEPLOY-VPS.md`

---

## 🖥️ Setup di VPS

### Software yang Harus Diinstall:
- [ ] Node.js 20 (`node --version` → v20.x.x)
- [ ] npm (`npm --version` → 10.x.x)
- [ ] PM2 (`pm2 --version`)
- [ ] Nginx (`nginx -v`)
- [ ] PostgreSQL (`psql --version`)
- [ ] Git (`git --version`)

### Database Setup:
- [ ] Database PostgreSQL sudah dibuat (nama: `alonica_db`)
- [ ] User database sudah dibuat (nama: `alonica_user`)
- [ ] Password database sudah di-set
- [ ] Connection string sudah dicatat: `postgresql://alonica_user:password@localhost:5432/alonica_db`

### Aplikasi Setup:
- [ ] Repository sudah di-clone ke `/var/www/alonica`
- [ ] Dependencies sudah diinstall (`npm install`)
- [ ] File `.env` sudah dibuat dengan semua environment variables
- [ ] Database schema sudah di-push (`npm run db:push`)
- [ ] Data user sudah di-seed (`npm run seed:users`)
- [ ] Aplikasi sudah di-build (`npm run build`)
- [ ] Aplikasi bisa jalan dengan PM2 (`pm2 start npm --name "alonica" -- start`)
- [ ] PM2 configuration sudah di-save (`pm2 save`)
- [ ] PM2 startup script sudah di-setup (`pm2 startup`)

### Web Server Setup:
- [ ] Nginx config sudah dibuat di `/etc/nginx/sites-available/alonica`
- [ ] Symbolic link sudah dibuat di `/etc/nginx/sites-enabled/`
- [ ] Nginx config sudah di-test (`sudo nginx -t`)
- [ ] Nginx sudah di-reload (`sudo systemctl reload nginx`)
- [ ] Firewall sudah allow HTTP/HTTPS (`sudo ufw allow 'Nginx Full'`)

---

## 🔐 Setup di GitHub

### Repository Secrets (Settings → Secrets and variables → Actions):
- [ ] `HOST` → `148.230.101.194`
- [ ] `USERNAME` → Username SSH (biasanya `root`)
- [ ] `SSH_PRIVATE_KEY` → Private SSH key lengkap
- [ ] `APP_PATH` → `/var/www/alonica`
- [ ] `DATABASE_URL` → Connection string PostgreSQL
- [ ] `NODE_ENV` → `production`
- [ ] `PORT` → `3000`
- [ ] `MIDTRANS_SERVER_KEY` → Midtrans server key (optional)
- [ ] `MIDTRANS_CLIENT_KEY` → Midtrans client key (optional)

### GitHub Actions:
- [ ] File `.github/workflows/deploy.yml` sudah ada
- [ ] File sudah di-commit dan push ke GitHub
- [ ] Tab Actions di GitHub sudah dicheck
- [ ] Workflow "Deploy ke VPS Hostinger" muncul di list

---

## 🧪 Testing

### Test di VPS:
- [ ] Aplikasi jalan di PM2: `pm2 status` → status "online"
- [ ] Tidak ada error di logs: `pm2 logs alonica`
- [ ] Aplikasi respond di localhost: `curl http://localhost:3000`
- [ ] Nginx berjalan normal: `sudo systemctl status nginx`

### Test dari Browser:
- [ ] Website bisa diakses via IP: `http://148.230.101.194`
- [ ] Halaman "Welcome to Alonica" muncul
- [ ] Login page bisa diakses: `http://148.230.101.194/login`
- [ ] Bisa login dengan user `admin` password `admin123`

### Test GitHub Actions:
- [ ] Edit file di repository (misal: tambah komentar)
- [ ] Commit dan push ke branch `main`
- [ ] Buka GitHub → Tab Actions
- [ ] Workflow "Deploy ke VPS Hostinger" berjalan
- [ ] Workflow selesai dengan status hijau (✓)
- [ ] Perubahan muncul di website

---

## 🌐 Setup Domain & SSL (Optional)

Setup domain kasirpos.space:
- [ ] Domain sudah di-point ke IP VPS 148.230.101.194 (A Record)
- [ ] DNS propagation sudah selesai (cek dengan `nslookup kasirpos.space`)
- [ ] Nginx config sudah update dengan domain kasirpos.space
- [ ] Certbot sudah diinstall
- [ ] SSL certificate sudah di-generate (`sudo certbot --nginx -d kasirpos.space -d www.kasirpos.space`)
- [ ] Website bisa diakses via HTTPS: `https://kasirpos.space`
- [ ] Auto redirect HTTP → HTTPS sudah aktif

---

## 📊 Monitoring (Optional)

Setup monitoring untuk production:
- [ ] PM2 Plus account (monitoring gratis)
- [ ] Uptime monitoring (UptimeRobot, Pingdom, dll)
- [ ] Error tracking (Sentry, LogRocket, dll)
- [ ] Database backup otomatis
- [ ] Log rotation setup

---

## 🆘 Troubleshooting Quick Reference

### Jika Aplikasi Tidak Jalan:
```bash
# 1. Cek PM2 status
pm2 status

# 2. Cek logs
pm2 logs alonica --lines 50

# 3. Restart aplikasi
pm2 restart alonica

# 4. Cek Nginx
sudo systemctl status nginx
sudo nginx -t
```

### Jika Database Error:
```bash
# 1. Cek PostgreSQL
sudo systemctl status postgresql

# 2. Test koneksi
psql -U alonica_user -d alonica_db -h localhost

# 3. Cek environment variable
cat /var/www/alonica/.env | grep DATABASE_URL
```

### Jika GitHub Actions Gagal:
1. Cek logs di tab Actions
2. Pastikan semua secrets sudah di-set dengan benar
3. Test SSH manual dari komputer Anda
4. Cek permission folder aplikasi di VPS

---

## ✨ Selesai!

Jika semua checklist sudah centang (✓), deployment otomatis Anda sudah siap!

### Setiap kali Anda push ke GitHub:
1. ✅ Kode otomatis ter-deploy ke VPS
2. ✅ Dependencies otomatis terinstall
3. ✅ Build otomatis berjalan
4. ✅ Database schema otomatis update
5. ✅ Aplikasi otomatis restart
6. ✅ Zero downtime deployment

**Happy Coding! 🚀**

---

## 📞 Butuh Bantuan?

Jika ada yang tidak beres:
1. Cek file `PANDUAN-DEPLOY-VPS.md` section Troubleshooting
2. Cek PM2 logs: `pm2 logs alonica`
3. Cek Nginx logs: `sudo tail -f /var/log/nginx/alonica_error.log`
4. Cek GitHub Actions logs di tab Actions repository

Semoga lancar! 💪
