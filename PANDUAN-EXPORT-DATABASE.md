# 📦 Panduan Export Database ke VPS

Database Alonica telah diisi dengan data lengkap untuk testing performa di VPS. Berikut panduan lengkap untuk export dan import database.

## 📊 Statistik Database

Database berisi data selama **6 bulan terakhir** (April - Oktober 2025):

- **24.020 Orders** - Pesanan pelanggan lengkap dengan detail item
- **181 Daily Reports** - Laporan penjualan harian
- **446 Kasir Shifts** - Data shift kasir
- **328 Expense Records** - Catatan pengeluaran operasional
- **35+ Reservations** - Data reservasi pelanggan
- **20 Inventory Items** - Data stok barang
- **57 Menu Items** - Item menu makanan & minuman
- **6 Categories** - Kategori menu
- **5 Users** - Admin dan kasir
- **Total Revenue: Rp 1.85 Miliar**

## 🔧 Cara Export Database dari Replit

### Metode 1: Menggunakan pg_dump (Recommended)

```bash
# 1. Export seluruh database ke file SQL
pg_dump $DATABASE_URL > database_backup.sql

# 2. Compress file agar lebih kecil (opsional)
gzip database_backup.sql
# Hasil: database_backup.sql.gz

# 3. Download file melalui Replit Shell atau SFTP
```

### Metode 2: Export Data Only (tanpa schema)

```bash
# Export hanya data, tanpa CREATE TABLE statements
pg_dump $DATABASE_URL --data-only > data_only.sql
```

### Metode 3: Export Schema Only

```bash
# Export hanya struktur tabel, tanpa data
pg_dump $DATABASE_URL --schema-only > schema_only.sql
```

## 📥 Cara Import ke VPS

### Persiapan di VPS

```bash
# 1. Install PostgreSQL di VPS (jika belum)
sudo apt update
sudo apt install postgresql postgresql-contrib

# 2. Buat database baru
sudo -u postgres createdb alonica_db

# 3. Buat user database
sudo -u postgres createuser alonica_user --pwprompt

# 4. Berikan akses ke database
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;
\q
```

### Import Database

```bash
# 1. Upload file backup ke VPS (gunakan scp, rsync, atau FTP)
scp database_backup.sql user@your-vps-ip:/home/user/

# 2. Import ke PostgreSQL
psql -U alonica_user -d alonica_db -f database_backup.sql

# Atau jika file di-compress:
gunzip -c database_backup.sql.gz | psql -U alonica_user -d alonica_db
```

### Verifikasi Import

```bash
# Login ke PostgreSQL
psql -U alonica_user -d alonica_db

# Cek jumlah data
SELECT 'orders' as table_name, COUNT(*) FROM orders
UNION ALL
SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'daily_reports', COUNT(*) FROM daily_reports
UNION ALL
SELECT 'shifts', COUNT(*) FROM shifts
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'users', COUNT(*) FROM users;

# Cek total revenue
SELECT SUM(total) as total_revenue 
FROM orders 
WHERE payment_status = 'paid';

# Exit
\q
```

## 🧪 Testing Performa Database

### Query Performance Test

```sql
-- Test 1: Query orders dengan filter tanggal (harus cepat karena ada index)
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE created_at >= '2025-08-01' 
AND created_at < '2025-09-01'
ORDER BY created_at DESC;

-- Test 2: Aggregasi revenue per bulan
EXPLAIN ANALYZE
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_orders,
  SUM(total) as total_revenue
FROM orders
WHERE payment_status = 'paid'
GROUP BY month
ORDER BY month;

-- Test 3: Join kompleks dengan menu items
EXPLAIN ANALYZE
SELECT 
  o.id,
  o.customer_name,
  o.created_at,
  COUNT(*) as item_count
FROM orders o
WHERE o.created_at >= '2025-07-01'
GROUP BY o.id, o.customer_name, o.created_at
LIMIT 100;

-- Test 4: Daily reports aggregation
EXPLAIN ANALYZE
SELECT 
  report_date,
  total_revenue,
  total_orders,
  cash_difference
FROM daily_reports
ORDER BY report_date DESC
LIMIT 30;
```

### Database Size Check

```sql
-- Cek ukuran database
SELECT pg_size_pretty(pg_database_size('alonica_db'));

-- Cek ukuran per tabel
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cek index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

## 🚀 Optimasi VPS untuk Database Besar

### PostgreSQL Configuration

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# Memory Settings (sesuaikan dengan RAM VPS)
shared_buffers = 256MB              # 25% dari RAM
effective_cache_size = 1GB          # 50-75% dari RAM
work_mem = 16MB                     # RAM / max_connections / 2
maintenance_work_mem = 128MB        # Untuk VACUUM dan CREATE INDEX

# Connection Settings
max_connections = 100               # Sesuaikan kebutuhan

# Write Performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 1GB

# Query Performance
random_page_cost = 1.1              # Untuk SSD gunakan 1.1
effective_io_concurrency = 200      # Untuk SSD gunakan 200
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Monitoring Performance

```bash
# Install monitoring tools
sudo apt install postgresql-contrib

# Enable pg_stat_statements untuk query monitoring
sudo -u postgres psql alonica_db
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
\q

# View slow queries
sudo -u postgres psql alonica_db -c "
SELECT 
  calls,
  mean_exec_time,
  query 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"
```

## 📊 Load Testing

### Menggunakan pgbench

```bash
# Initialize test data
pgbench -i -s 50 alonica_db

# Run benchmark test (10 clients, 100 transactions each)
pgbench -c 10 -t 100 alonica_db

# Run benchmark dengan durasi 60 detik
pgbench -c 10 -T 60 alonica_db
```

### Custom Load Test dengan aplikasi

```bash
# Di VPS, jalankan aplikasi
cd /var/www/alonica
npm run build
npm run start

# Gunakan tools seperti:
# - Apache Bench (ab)
# - wrk
# - Artillery.io

# Contoh dengan Apache Bench
ab -n 1000 -c 10 http://localhost:5000/api/orders
```

## ✅ Checklist Verifikasi

- [ ] Database berhasil di-export dari Replit
- [ ] File backup berhasil di-upload ke VPS
- [ ] Database berhasil di-import ke VPS PostgreSQL
- [ ] Jumlah records sesuai (24k+ orders)
- [ ] Total revenue match (~1.85 Miliar)
- [ ] Query performance test berjalan normal
- [ ] Index berfungsi dengan baik
- [ ] Aplikasi bisa connect ke database VPS
- [ ] Load test menunjukkan performa yang baik

## 🔍 Troubleshooting

### Error: "relation does not exist"

```bash
# Pastikan schema sudah ter-import
psql -U alonica_user -d alonica_db -c "\dt"

# Re-import schema jika perlu
psql -U alonica_user -d alonica_db -f schema_only.sql
psql -U alonica_user -d alonica_db -f data_only.sql
```

### Error: Permission Denied

```bash
# Grant semua privileges
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;
\q
```

### Slow Query Performance

```bash
# Reindex database
sudo -u postgres psql alonica_db
REINDEX DATABASE alonica_db;

# Update statistics
ANALYZE;

# Vacuum
VACUUM ANALYZE;
\q
```

## 📝 Catatan Penting

1. **Backup Regular**: Selalu backup database sebelum testing
2. **Monitor Resources**: Pantau CPU, RAM, dan Disk I/O selama load test
3. **Security**: Pastikan PostgreSQL tidak exposed ke public
4. **SSL Connection**: Gunakan SSL untuk koneksi database production
5. **Connection Pooling**: Gunakan pg_bouncer untuk connection pooling

## 🎯 Expected Performance Benchmarks

Dengan 24k+ orders:

- **Simple SELECT query**: < 10ms
- **Complex JOIN query**: < 50ms  
- **Aggregation query**: < 100ms
- **Insert single order**: < 5ms
- **Concurrent requests (10 users)**: < 100ms avg response

Jika performa lebih lambat, cek:
- Index configuration
- PostgreSQL settings
- VPS resources (CPU/RAM/Disk)
- Network latency

---

**Selamat Testing! 🚀**

Database sudah siap dengan 24k+ orders untuk menguji performa VPS Anda.
