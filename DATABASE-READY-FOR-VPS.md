# ✅ Database Alonica Siap untuk VPS Testing

Database telah berhasil diisi dengan **24.020 orders** dan data lengkap untuk testing performa di VPS.

## 📊 Ringkasan Data yang Telah Dibuat

### Periode Data
- **Dari:** 6 April 2025
- **Sampai:** 3 Oktober 2025  
- **Durasi:** 181 hari (~6 bulan)

### Data Transaksi
| Tipe Data | Jumlah | Keterangan |
|-----------|--------|------------|
| **Orders** | 24.020 | Pesanan pelanggan lengkap |
| **Daily Reports** | 181 | Laporan penjualan harian |
| **Kasir Shifts** | 446 | Data shift kasir |
| **Expenses** | 328 | Catatan pengeluaran |
| **Reservations** | 35+ | Booking pelanggan |
| **Inventory Items** | 20 | Stok barang |
| **Menu Items** | 57 | Item menu |
| **Categories** | 6 | Kategori menu |
| **Users** | 5 | Admin & kasir |

### Revenue & Statistik
- **Total Revenue:** Rp 1.850.769.023 (~1.85 Miliar)
- **Revenue per Order:** Rp 88.545 (rata-rata)
- **Revenue per Hari:** Rp 10.225.243 (rata-rata)

### Distribusi Pembayaran
- **QRIS:** 43.2% (10.385 orders) - Rp 919.441.392
- **Cash:** 43.8% (10.517 orders) - Rp 931.327.631
- **Pay Later:** ~13% (sisanya)

### Status Order
- **Served:** 96.8% (23.243 orders)
- **Cancelled:** 3.2% (777 orders)

## 🚀 Cara Export Database

### Metode Cepat (Recommended)

```bash
# Jalankan script export otomatis
npm run db:export
```

Script ini akan:
1. Export seluruh database ke file SQL
2. Compress file dengan gzip
3. Memberikan instruksi download & upload

### Metode Manual

```bash
# Export database
pg_dump $DATABASE_URL > alonica_backup.sql

# Compress (opsional)
gzip alonica_backup.sql

# Hasil: alonica_backup.sql.gz
```

## 📥 Import ke VPS

### 1. Persiapan VPS

```bash
# Install PostgreSQL
sudo apt update && sudo apt install postgresql

# Buat database & user
sudo -u postgres createdb alonica_db
sudo -u postgres createuser alonica_user --pwprompt

# Grant privileges
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;
\q
```

### 2. Upload & Import

```bash
# Upload file ke VPS (dari komputer lokal)
scp alonica_backup.sql.gz user@vps-ip:/home/user/

# Di VPS, import database
gunzip -c alonica_backup.sql.gz | psql -U alonica_user -d alonica_db

# Atau tanpa gzip
psql -U alonica_user -d alonica_db -f alonica_backup.sql
```

### 3. Verifikasi

```bash
# Cek jumlah data
psql -U alonica_user -d alonica_db

# Di dalam psql:
SELECT COUNT(*) FROM orders;  -- Harus ~24,000
SELECT SUM(total) FROM orders WHERE payment_status = 'paid';  -- Harus ~1.85M
\q
```

## 🧪 Testing Performa

### Quick Performance Test

```sql
-- Test query speed (harus <50ms)
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE created_at >= '2025-08-01' 
ORDER BY created_at DESC 
LIMIT 100;

-- Test aggregation (harus <100ms)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as orders,
  SUM(total) as revenue
FROM orders
WHERE payment_status = 'paid'
GROUP BY month;
```

### Load Testing dengan pgbench

```bash
# Install pgbench (sudah include di postgresql-contrib)
# Run benchmark
pgbench -c 10 -t 100 alonica_db
```

### Expected Performance

Dengan 24k+ orders di VPS yang wajar:
- Simple SELECT: < 10ms
- Complex JOIN: < 50ms
- Aggregation: < 100ms
- Insert Order: < 5ms

## 📋 Files Penting

1. **PANDUAN-EXPORT-DATABASE.md** - Panduan lengkap export/import
2. **scripts/export-database.sh** - Script export otomatis
3. **scripts/seed-massive-data.ts** - Script generate 12k orders (sudah dijalankan)

## 🔍 Troubleshooting

### Database terlalu lambat di VPS

```bash
# Optimize PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf

# Tambahkan:
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB

# Restart
sudo systemctl restart postgresql

# Reindex & vacuum
psql -U alonica_user -d alonica_db
REINDEX DATABASE alonica_db;
VACUUM ANALYZE;
```

### File backup terlalu besar

```bash
# Export tanpa data lama (misal hanya 3 bulan terakhir)
pg_dump $DATABASE_URL --data-only \
  --table=orders \
  --where="created_at >= '2025-07-01'" \
  > recent_orders.sql
```

### Error saat import

```bash
# Import dengan verbose untuk debug
psql -U alonica_user -d alonica_db -f backup.sql -v ON_ERROR_STOP=1

# Atau skip errors
psql -U alonica_user -d alonica_db -f backup.sql --set ON_ERROR_STOP=off
```

## 🎯 Checklist Testing

- [ ] Export database berhasil
- [ ] File backup ter-compress dengan baik
- [ ] Upload ke VPS sukses
- [ ] Import tanpa error
- [ ] Verifikasi jumlah data cocok (~24k orders)
- [ ] Query performance test < 100ms
- [ ] Load test dengan pgbench
- [ ] Aplikasi connect ke database VPS
- [ ] Dashboard menampilkan data dengan benar

## 📞 Kredensial Login

Untuk testing aplikasi setelah di VPS:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Kasir 1 | kasir1 | kasir123 |
| Kasir 2 | kasir2 | kasir123 |
| Kasir 3 | kasir3 | kasir123 |
| Kasir 4 | kasir4 | kasir123 |

## ✨ Kesimpulan

Database Alonica telah berhasil diisi dengan:
- ✅ **24.020+ orders** selama 6 bulan
- ✅ **181 daily reports** lengkap
- ✅ **446 shifts** data kasir
- ✅ **328 expenses** pengeluaran
- ✅ **Rp 1.85 Miliar** total revenue
- ✅ Semua fitur terisi dengan data realistis

**Database siap untuk di-test performa di VPS Anda!** 🚀

---

📖 **Baca juga:**
- `PANDUAN-EXPORT-DATABASE.md` - Panduan detail export/import  
- `package.json` - Lihat semua script yang tersedia (`npm run db:export`, dll)
