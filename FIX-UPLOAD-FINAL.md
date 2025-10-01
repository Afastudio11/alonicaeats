# Fix Upload Foto - Panduan Lengkap VPS

## Masalah
Upload berhasil tapi gambar tidak muncul.

## Solusi Lengkap (Jalankan Semua Step)

### Step 1: Pull Update dari GitHub
```bash
cd ~/alonica  # atau /var/www/alonica (sesuaikan path Anda)
git pull origin main
```

### Step 2: Install Dependencies (jika ada update)
```bash
npm install
```

### Step 3: PENTING - Rebuild Aplikasi
```bash
npm run build
```
⚠️ **WAJIB!** Tanpa rebuild, code lama masih jalan.

### Step 4: Setup Direktori Upload
```bash
chmod +x scripts/test-upload-vps.sh
bash scripts/test-upload-vps.sh
```

### Step 5: Update Nginx Config
```bash
# Backup config dulu
sudo cp /etc/nginx/sites-available/alonica /etc/nginx/sites-available/alonica.backup

# Edit config
sudo nano /etc/nginx/sites-available/alonica
```

Pastikan ada baris ini (tambahkan jika belum ada):
```nginx
server {
    ...
    client_max_body_size 20M;  # PENTING!
    ...
}
```

Save (Ctrl+O, Enter, Ctrl+X), lalu:
```bash
sudo nginx -t          # Test config
sudo systemctl reload nginx  # Reload Nginx
```

### Step 6: Restart PM2
```bash
pm2 restart all
pm2 logs --lines 20
```

### Step 7: Test Upload

1. **Buka browser** → kasirpos.space/login
2. **Login** sebagai admin
3. **Buka DevTools**: Tekan F12
4. **Klik tab Console**
5. **Edit menu item** → Klik "Ganti Foto"
6. **Upload foto**
7. **Lihat di Console**, harus ada log:
   ```
   Upload response: {success: true, path: "/images/xxx.jpg", uploadURL: "/images/xxx.jpg"}
   Image URL: /images/xxx.jpg
   ```
8. **Gambar harus muncul** di form ✅

## Troubleshooting

### Gambar Masih Tidak Muncul?

**1. Cek console browser untuk error:**
- Buka F12 → Console
- Cek ada error merah?
- Screenshot dan kirim

**2. Cek file tersimpan:**
```bash
ls -la ~/alonica/public/images/
```
Harus ada file .jpg/.png

**3. Test akses langsung:**
- Cari nama file di folder: `ls -la public/images/`
- Buka di browser: `https://kasirpos.space/images/[nama-file].jpg`
- Kalau bisa dibuka = server OK, masalah di frontend
- Kalau 404 = server belum serve file dengan benar

**4. Cek PM2 logs:**
```bash
pm2 logs --lines 100
```
Cari error "Upload error" atau "Failed to upload"

**5. Cek Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```
Upload foto, lihat ada error?

**6. Cek Nginx client_max_body_size:**
```bash
sudo nginx -T | grep client_max_body_size
```
Harus ada: `client_max_body_size 20M;`

## Checklist Lengkap

- [ ] Pull update dari GitHub ✓
- [ ] Run `npm install` ✓
- [ ] Run `npm run build` ✓ **PENTING!**
- [ ] Direktori uploads/ dan public/images/ ada ✓
- [ ] Nginx client_max_body_size 20M ✓
- [ ] PM2 restart ✓
- [ ] Test upload via admin ✓
- [ ] Cek console browser untuk log ✓
- [ ] Gambar muncul di form ✓

## Jika Masih Gagal

Jalankan dan kirim output:
```bash
# 1. Test script
bash scripts/test-upload-vps.sh > test-result.txt 2>&1

# 2. PM2 logs
pm2 logs --lines 100 > pm2-logs.txt 2>&1

# 3. List files
ls -la public/images/ > files-list.txt 2>&1

# 4. Nginx test
sudo nginx -T > nginx-config.txt 2>&1
```

Kirim file: `test-result.txt`, `pm2-logs.txt`, `files-list.txt`, `nginx-config.txt`

## Catatan Penting

✅ **Rebuild adalah WAJIB** setelah pull update code  
✅ Nginx config harus ada `client_max_body_size 20M`  
✅ Direktori public/images/ harus writable  
✅ PM2 harus running dengan user yang benar  
✅ Static files di-serve dari `public/` di production
