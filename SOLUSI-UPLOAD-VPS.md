# Solusi Upload Foto Tidak Berfungsi di VPS

## Masalah Utama
**Nginx membatasi ukuran file upload ke 1MB** (default), tapi foto biasanya 3-5MB.

## Solusi Lengkap

### 1. Pull Update dari GitHub
```bash
cd ~/alonica
git pull origin main
chmod +x scripts/fix-upload-vps.sh
```

### 2. Jalankan Script Fix
```bash
bash scripts/fix-upload-vps.sh
```

Script akan:
- ✅ Buat direktori uploads/ dan public/images/
- ✅ Cek konfigurasi Nginx Anda
- ✅ Beri tahu jika perlu update config

### 3. Fix Nginx Config

**Cara 1: Otomatis (Recommended)**
```bash
# Backup config
sudo cp /etc/nginx/sites-available/alonica /etc/nginx/sites-available/alonica.backup

# Update client_max_body_size
sudo sed -i '/server_name/a \    \n    # File upload limit\n    client_max_body_size 20M;' /etc/nginx/sites-available/alonica

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**Cara 2: Manual**
```bash
# Edit config
sudo nano /etc/nginx/sites-available/alonica
```

Tambahkan baris ini setelah `server_name`:
```nginx
    # File upload limit
    client_max_body_size 20M;
```

Save (Ctrl+O, Enter, Ctrl+X), lalu:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Restart PM2
```bash
pm2 restart all
pm2 logs --lines 20
```

### 5. Test Upload
1. Login ke admin dashboard
2. Buka Menu Management
3. Edit atau tambah menu item
4. Klik "Ganti Foto"
5. Upload foto (max 20MB)
6. **Seharang berhasil!** ✅

## Troubleshooting

### Cek Config Nginx Aktif
```bash
# Lihat semua config
sudo nginx -T | grep client_max_body_size

# Atau cek file config
sudo cat /etc/nginx/sites-available/alonica | grep client_max_body_size
```

Harus ada output:
```
client_max_body_size 20M;
```

### Cek Direktori
```bash
ls -la | grep -E "uploads|public"
```

Output:
```
drwxr-xr-x 2 user user 4096 public
drwxr-xr-x 2 user user 4096 uploads
```

### Cek PM2
```bash
pm2 list
pm2 logs alonica-production --lines 50
```

### Cek Error Logs
```bash
# Nginx error
sudo tail -f /var/log/nginx/error.log

# PM2 error
pm2 logs --err
```

## Lokasi Config Nginx Alternatif

Jika `/etc/nginx/sites-available/alonica` tidak ada, cek:
```bash
# Lihat semua site
ls -la /etc/nginx/sites-available/

# Atau cek config utama
sudo cat /etc/nginx/nginx.conf | grep include

# Atau lihat config aktif
sudo nginx -T | head -50
```

## Verifikasi Upload Berhasil

1. Upload foto via admin
2. Cek file tersimpan:
```bash
ls -la public/images/
ls -la uploads/
```

3. Cek foto bisa diakses:
   - Buka: `https://kasirpos.space/images/[nama-file].jpg`
   - Harus bisa muncul fotonya

## Catatan Penting

- ✅ Max upload: 20MB (cukup untuk semua foto menu)
- ✅ Format: JPG, PNG, GIF, WebP
- ✅ Validasi keamanan: File signature dicek
- ✅ Perlu login admin untuk upload
- ✅ File disimpan lokal di VPS (tidak perlu cloud storage)

## Jika Masih Gagal

1. Screenshot error yang muncul
2. Jalankan:
```bash
pm2 logs --lines 100 > ~/upload-error.log
sudo nginx -T > ~/nginx-config.log
```

3. Share file `upload-error.log` dan `nginx-config.log`
