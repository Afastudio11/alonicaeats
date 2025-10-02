# Panduan Fix VPS & Seed Data Bulanan

## 🚨 Masalah 1: Error 401 Unauthorized di VPS

### Penyebab
Error "401: Unauthorized" saat generate PIN atau akses fitur admin terjadi karena:
- Session storage menggunakan **in-memory Map** yang hilang saat server restart
- PM2 di VPS menjalankan multiple workers atau restart otomatis
- Session data hilang, tapi frontend masih menyimpan token lama

### Lokasi Masalah
File `server/auth-utils.ts` baris 28:
```typescript
// In-memory session storage (production should use Redis or database)
export const activeSessions = new Map<string, SessionData>();
```

### ✅ Solusi Sementara (Quick Fix)

#### Opsi 1: Restart PM2 dengan Single Worker (RECOMMENDED)
```bash
# 1. SSH ke VPS Anda
ssh user@your-vps-ip

# 2. Edit ecosystem.config.cjs
nano ecosystem.config.cjs

# 3. Pastikan instances: 1
module.exports = {
  apps: [{
    name: 'alonica',
    script: 'dist/index.js',
    instances: 1,  // <-- PENTING: Set ke 1
    exec_mode: 'fork',  // <-- Gunakan fork mode
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};

# 4. Restart PM2
pm2 delete alonica
pm2 start ecosystem.config.cjs
pm2 save
```

#### Opsi 2: Cek dan Fix Nginx Configuration
```bash
# 1. Edit nginx config
sudo nano /etc/nginx/sites-available/alonica.conf

# 2. Pastikan ada baris ini (forward Authorization header)
location / {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;  # <-- PENTING!
    proxy_cache_bypass $http_upgrade;
}

# 3. Test dan reload nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Restart PM2
pm2 restart alonica
```

#### Opsi 3: Clear Browser Session & Re-login
Untuk fix sementara tanpa akses VPS:
1. **Logout** dari aplikasi
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Login kembali** dengan credentials yang benar
4. Coba generate PIN lagi

### 🔧 Solusi Permanen (Untuk Update Mendatang)

Implementasi persistent session storage menggunakan PostgreSQL. Hubungi developer untuk implementasi ini jika quick fix tidak bekerja.

---

## 📊 Masalah 2: Seed Data Bulanan

### Informasi Script
Saya sudah membuat script **SAFE SEEDER** yang:
- ✅ **TIDAK menghapus** data existing
- ✅ **Hanya menambahkan** data yang belum ada
- ✅ Generate **100 order/hari** (dengan variance 15%)
- ✅ Generate **~Rp 5.000.000 revenue/hari**
- ✅ Data untuk **30 hari terakhir**
- ✅ Termasuk: Orders, Reservations, Daily Reports, Menu Items, Categories

### 🧪 Testing di Local (WAJIB!)

**PENTING:** Test di local DULU sebelum run di VPS!

```bash
# 1. Pastikan Anda sudah ada di project directory
cd /path/to/alonica-project

# 2. Pastikan database sudah ada dan connected
# Check file .env atau environment variables:
# DATABASE_URL=postgresql://...

# 3. Run seed script
npm run seed:monthly-data

# 4. Lihat hasilnya di terminal
# Script akan show summary:
#   - Total Orders
#   - Total Revenue
#   - Avg Orders/Day
#   - Avg Revenue/Day
#   - Reservations, Reports, dll
```

**Expected Output:**
```
🌱 SAFE MONTHLY DATA SEEDER
============================================================
📅 Period: Last 30 days
📊 Target: ~100 orders/day
💰 Target: ~Rp 5,000,000/day
⚠️  Mode: ADDITIVE (tidak menghapus data existing)
============================================================

✅ Database connected successfully
👥 Found 4 kasir users

... (proses seeding)

✨ SEED COMPLETED!
============================================================
📊 Final Statistics:
   Period: 30 days
   Total Orders: 3045
   Avg Orders/Day: 101
   Total Revenue: Rp 152,340,000
   Avg Revenue/Day: Rp 5,078,000
   ...
```

### 📤 Deploy ke VPS

#### Pre-requisites
- ✅ Script sudah di-test di local
- ✅ Anda punya akses SSH ke VPS
- ✅ Database VPS sudah running

#### Langkah-langkah Deploy

```bash
# 1. SSH ke VPS
ssh user@your-vps-ip

# 2. Masuk ke project directory
cd /var/www/alonica  # atau path Anda

# 3. Pull latest code dari GitHub
git pull origin main

# 4. Install dependencies (jika ada update)
npm install

# 5. BACKUP DATABASE DULU! (SANGAT PENTING!)
# Opsi A: Menggunakan script backup yang sudah ada
bash scripts/backup-db.sh

# Opsi B: Manual backup
pg_dump $DATABASE_URL > backup-before-seed-$(date +%Y%m%d).sql

# 6. Run seed script
npm run seed:monthly-data

# 7. Tunggu sampai selesai (bisa 2-5 menit)
# Lihat summary di terminal

# 8. Verify data di aplikasi
# Login ke https://your-domain.com/login
# Cek dashboard, orders, reservations

# 9. Restart PM2 (opsional, tapi recommended)
pm2 restart alonica
```

### ⚠️ Troubleshooting

#### Error: "No kasir users found"
```bash
# Run seed users first
npm run seed:users

# Lalu run seed monthly data lagi
npm run seed:monthly-data
```

#### Error: "Database connection failed"
```bash
# Check DATABASE_URL environment variable
echo $DATABASE_URL

# Jika kosong, set di file .env atau ecosystem.config.cjs
# Contoh di ecosystem.config.cjs:
env: {
  NODE_ENV: 'production',
  PORT: 5000,
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname'
}

# Restart PM2
pm2 restart alonica
```

#### Script running terlalu lama
- Normal untuk 30 hari data (3000+ orders)
- Bisa memakan waktu 2-10 menit tergantung spek VPS
- Jangan interrupt proses
- Monitor dengan `htop` atau `pm2 logs`

#### Data tidak muncul di dashboard
```bash
# 1. Restart aplikasi
pm2 restart alonica

# 2. Clear browser cache
# Ctrl+Shift+Delete → Clear All

# 3. Logout & Login kembali

# 4. Check database directly (opsional)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders;"
```

### 🔄 Run Ulang Script (Safe)

Script ini **smart & additive** - aman di-run berkali-kali:
- Jika hari sudah punya 110 orders, target 100 → **SKIP** (sudah cukup)
- Jika hari punya 50 orders, target 100 → **TAMBAH 50 orders** (top-up)
- Jika hari belum ada data → **CREATE ~100 orders**
- **TIDAK pernah DELETE atau OVERWRITE**

```bash
# Aman untuk run berkali-kali
npm run seed:monthly-data

# Contoh output jika run lagi:
# ✅ 2025-09-02: 110 existing + 0 new = 110 total (already meets target)
# ✅ 2025-09-03: 50 existing + 47 new = 97 total (topped up!)
# ✅ 2025-09-04: 0 existing + 94 new = 94 total (created)
```

### 📈 Customize Target

Edit file `scripts/seed-monthly-data.ts` baris 12-16:

```typescript
const CONFIG = {
  DAYS_TO_SEED: 30,  // Ubah jadi 60 untuk 2 bulan
  TARGET_ORDERS_PER_DAY: 100,  // Ubah target order
  TARGET_REVENUE_PER_DAY: 5_000_000,  // Ubah target revenue (dalam rupiah)
  VARIANCE: 0.15 // 15% variance untuk realisme
};
```

Setelah edit, commit dan push ke GitHub, lalu pull di VPS.

---

## 🎯 Checklist Lengkap

### Sebelum Mulai
- [ ] Backup database VPS
- [ ] Test seed script di local environment
- [ ] Pastikan SSH access ke VPS berfungsi
- [ ] Pastikan Git credentials sudah setup di VPS

### Fix VPS 401 Error
- [ ] SSH ke VPS
- [ ] Edit `ecosystem.config.cjs` → set `instances: 1`
- [ ] Check nginx config untuk `Authorization` header
- [ ] Restart PM2: `pm2 restart alonica`
- [ ] Test login & generate PIN di browser
- [ ] Jika masih error, logout → clear cache → login ulang

### Seed Data
- [ ] Test di local: `npm run seed:monthly-data`
- [ ] Verify hasil di local
- [ ] SSH ke VPS
- [ ] Pull latest code: `git pull origin main`
- [ ] Backup database: `bash scripts/backup-db.sh`
- [ ] Run seed: `npm run seed:monthly-data`
- [ ] Verify di aplikasi web
- [ ] Restart PM2: `pm2 restart alonica`

### Verification
- [ ] Login ke aplikasi
- [ ] Check dashboard analytics → lihat revenue & orders chart
- [ ] Check orders page → ada order history
- [ ] Check reservations → ada data reservasi
- [ ] Check menu → semua kategori & items ada
- [ ] Test generate PIN → tidak ada 401 error
- [ ] Test approval notifications → berfungsi normal

---

## 📞 Butuh Bantuan?

Jika mengalami kesulitan:

1. **Cek logs di VPS:**
   ```bash
   pm2 logs alonica --lines 100
   ```

2. **Cek database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

3. **Verify data counts:**
   ```bash
   psql $DATABASE_URL -c "
     SELECT 
       (SELECT COUNT(*) FROM orders) as orders,
       (SELECT COUNT(*) FROM reservations) as reservations,
       (SELECT COUNT(*) FROM menu_items) as menu_items,
       (SELECT COUNT(*) FROM daily_reports) as reports;
   "
   ```

4. **Restore dari backup (jika ada masalah):**
   ```bash
   psql $DATABASE_URL < backup-before-seed-YYYYMMDD.sql
   ```

---

## 💡 Tips Tambahan

1. **Monitoring VPS**: Install `htop` untuk monitor resource usage
   ```bash
   sudo apt install htop
   htop
   ```

2. **Database Performance**: Jika database lambat setelah seed:
   ```bash
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   ```

3. **PM2 Auto Restart**: Pastikan PM2 startup enabled
   ```bash
   pm2 startup
   pm2 save
   ```

4. **Nginx Logs**: Monitor nginx logs jika ada masalah
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

---

**Last Updated:** October 2, 2025  
**Script Version:** 1.0.0 (Safe Monthly Seeder)
