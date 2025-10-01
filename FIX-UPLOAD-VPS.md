# Cara Memperbaiki Upload Foto di VPS

## Masalah
Foto tidak bisa diupload di VPS karena direktori untuk menyimpan gambar belum dibuat.

## Solusi Cepat

### 1. Login ke VPS Anda via SSH
```bash
ssh user@kasirpos.space
```

### 2. Masuk ke direktori aplikasi
```bash
cd ~/alonica
# atau cd /path/ke/aplikasi/anda
```

### 3. Jalankan script setup
```bash
chmod +x scripts/setup-upload-dirs.sh
bash scripts/setup-upload-dirs.sh
```

### 4. Restart aplikasi
```bash
pm2 restart ecosystem.config.cjs
# atau
pm2 restart all
```

### 5. Test upload foto
- Login ke dashboard admin
- Buka Menu Management
- Edit menu item
- Klik "Ganti Foto" atau "Upload Foto"
- Upload akan berhasil sekarang ✅

## Solusi Manual (jika script tidak bekerja)

### 1. Buat direktori secara manual
```bash
mkdir -p uploads
mkdir -p public/images
```

### 2. Set permissions
```bash
chmod 755 uploads
chmod 755 public
chmod 755 public/images
```

### 3. Verifikasi direktori sudah dibuat
```bash
ls -la | grep -E "uploads|public"
```

Anda harus melihat output seperti ini:
```
drwxr-xr-x 2 user user 4096 Oct  1 08:00 public
drwxr-xr-x 2 user user 4096 Oct  1 08:00 uploads
```

### 4. Restart PM2
```bash
pm2 restart all
pm2 logs
```

## Troubleshooting

### Problem: Permission Denied
**Solusi:**
```bash
# Pastikan owner direktori benar
sudo chown -R $USER:$USER uploads public

# Set permissions ulang
chmod -R 755 uploads public
```

### Problem: File tidak muncul setelah upload
**Solusi:**
```bash
# Cek apakah file tersimpan
ls -la uploads/
ls -la public/images/

# Jika file ada di uploads tapi tidak di public/images, 
# berarti ada error saat copy. Cek logs:
pm2 logs --lines 50
```

### Problem: Error 500 saat upload
**Solusi:**
```bash
# Cek logs untuk detail error
pm2 logs

# Pastikan aplikasi menggunakan local storage (bukan object storage)
# Environment variable berikut TIDAK boleh ada di .env:
# - PUBLIC_OBJECT_SEARCH_PATHS
# - PRIVATE_OBJECT_DIR
```

## Cara Kerja Upload di VPS

1. **Upload endpoint**: `/api/objects/upload`
2. **File disimpan di**: `uploads/` dan `public/images/`
3. **File diakses via**: `/images/{filename}`
4. **Autentikasi**: Perlu login sebagai admin

## Struktur Direktori yang Benar

```
alonica/
├── uploads/              # Backup file asli
│   └── abc-123.jpg
├── public/               # File yang bisa diakses publik
│   └── images/
│       └── abc-123.jpg
├── server/
├── client/
└── ...
```

## Catatan Penting

- 🔒 **Keamanan**: Hanya admin yang bisa upload file
- 📁 **Storage**: File disimpan lokal di VPS (tidak perlu cloud storage)
- 🖼️ **Format**: Hanya gambar (JPG, PNG, GIF, WebP)
- 📦 **Max size**: 10MB per file
- ✅ **Validasi**: File signature dicek untuk keamanan

## Setelah Setup Berhasil

Anda bisa:
- ✅ Upload foto menu baru
- ✅ Ganti foto menu yang sudah ada
- ✅ Foto tersimpan permanen di VPS
- ✅ Foto loading cepat (served dari local disk)
