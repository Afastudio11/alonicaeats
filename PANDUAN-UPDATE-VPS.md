# Panduan Update Aplikasi di VPS

Panduan ini menjelaskan cara untuk menarik (pull) perubahan kode terbaru dari GitHub ke VPS Anda dan menerapkan update tersebut.

## Prasyarat

- Akses SSH ke VPS Anda
- Git sudah terinstall di VPS
- Repository sudah di-clone di VPS
- PM2 sudah terinstall untuk mengelola aplikasi

## Langkah-Langkah Update

### 1. Login ke VPS via SSH

```bash
ssh username@ip-vps-anda
```

Ganti `username` dan `ip-vps-anda` dengan kredensial VPS Anda.

### 2. Masuk ke Direktori Aplikasi

```bash
cd /path/ke/alonica-app
```

Ganti `/path/ke/alonica-app` dengan path direktori aplikasi Anda.

### 3. Backup Database (Opsional tapi Disarankan)

Sebelum melakukan update, backup database terlebih dahulu:

```bash
bash scripts/backup-db.sh
```

### 4. Pull Perubahan Terbaru dari GitHub

```bash
git pull origin main
```

Jika branch Anda berbeda (misalnya `master`), ganti `main` dengan nama branch Anda.

**Jika ada conflict:**
```bash
# Lihat file yang conflict
git status

# Edit file yang conflict dan selesaikan conflict
# Kemudian:
git add .
git commit -m "Resolve merge conflicts"
```

### 5. Install Dependencies Baru (Jika Ada)

Jika ada package baru yang ditambahkan:

```bash
npm install
```

### 6. Update Database Schema (Jika Ada Perubahan)

Jika ada perubahan pada schema database:

```bash
npm run db:push
```

Jika ada data-loss warning dan Anda yakin:

```bash
npm run db:push --force
```

### 7. Seed Menu Baru (Jika Diperlukan)

Jika Anda ingin mengupdate menu dengan 6 kategori dan 120 items:

```bash
npx tsx scripts/seed-menu-compact.ts
```

**⚠️ PERHATIAN:** Command ini akan menghapus menu items lama dan menggantinya dengan yang baru!

### 8. Build Aplikasi

Build ulang aplikasi dengan perubahan terbaru:

```bash
npm run build
```

### 9. Restart Aplikasi

Restart aplikasi menggunakan PM2:

```bash
pm2 restart alonica-app
```

Atau jika nama PM2 app Anda berbeda:

```bash
pm2 restart nama-app-anda
```

### 10. Cek Status Aplikasi

Pastikan aplikasi berjalan dengan baik:

```bash
pm2 status
pm2 logs alonica-app
```

### 11. Test Aplikasi

Buka browser dan akses aplikasi Anda untuk memastikan update berhasil:

```
http://ip-vps-anda:3000
```

Atau jika menggunakan domain:

```
https://domain-anda.com
```

## Perubahan Update Terbaru

### ✅ Perubahan yang Sudah Diterapkan:

1. **Layout Menu POS Horizontal**
   - Menu items sekarang ditampilkan dalam grid 2-4 kolom
   - Lebih hemat space dan lebih banyak items terlihat
   - Lokasi: Halaman Kasir Manual (POS)

2. **6 Kategori Menu dengan 120 Items**
   - Makanan Berat: 20 items
   - Makanan Ringan: 20 items
   - Minuman Dingin: 20 items
   - Minuman Panas: 20 items
   - Dessert: 20 items
   - Paket Spesial: 20 items
   - Total: 120 menu items

3. **Metode Pembayaran Cash & QRIS**
   - Pilihan pembayaran Cash atau QRIS di POS
   - Input uang cash hanya muncul jika pilih Cash
   - QRIS bisa langsung konfirmasi tanpa input jumlah

## Troubleshooting

### Masalah: Git pull error
```bash
# Reset local changes (HATI-HATI: ini akan menghapus perubahan local)
git reset --hard origin/main
git pull origin main
```

### Masalah: Port sudah digunakan
```bash
# Cari process yang menggunakan port
lsof -i :3000

# Kill process (ganti PID dengan ID process yang ditemukan)
kill -9 PID
```

### Masalah: PM2 tidak merespons
```bash
# Restart PM2
pm2 kill
pm2 start ecosystem.config.cjs
```

### Masalah: Build error
```bash
# Hapus node_modules dan reinstall
rm -rf node_modules
npm install
npm run build
```

### Masalah: Database connection error
```bash
# Cek apakah PostgreSQL running
sudo systemctl status postgresql

# Restart PostgreSQL jika perlu
sudo systemctl restart postgresql

# Cek environment variables
cat .env | grep DATABASE_URL
```

## Script Helper

### Quick Update Script

Buat file `quick-update.sh`:

```bash
#!/bin/bash

echo "🔄 Starting update process..."

# Backup database
echo "💾 Backing up database..."
bash scripts/backup-db.sh

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Push database schema
echo "🗄️ Updating database schema..."
npm run db:push

# Build application
echo "🏗️ Building application..."
npm run build

# Restart application
echo "🔄 Restarting application..."
pm2 restart alonica-app

# Show status
echo "✅ Update complete! Application status:"
pm2 status

echo "📊 Recent logs:"
pm2 logs alonica-app --lines 20
```

Buat executable:
```bash
chmod +x quick-update.sh
```

Jalankan:
```bash
./quick-update.sh
```

## Catatan Penting

1. **Selalu backup database** sebelum melakukan update besar
2. **Test di environment development** dulu sebelum deploy ke production
3. **Monitor logs** setelah restart untuk memastikan tidak ada error
4. **Simpan file .env** dengan aman, jangan commit ke git
5. **Update .gitignore** jika ada file baru yang perlu diabaikan

## Kontak Support

Jika mengalami masalah:
1. Cek logs aplikasi: `pm2 logs alonica-app`
2. Cek logs database di `/var/log/postgresql/`
3. Cek disk space: `df -h`
4. Cek memory: `free -h`

---

**Update terakhir:** 1 Oktober 2025
**Versi aplikasi:** 1.0.0
