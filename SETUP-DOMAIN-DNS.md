# 🌐 Setup Domain kasirpos.space ke VPS

Panduan singkat untuk mengarahkan domain kasirpos.space ke VPS Hostinger Anda.

---

## 📋 Informasi Anda
- **Domain**: kasirpos.space
- **IP VPS**: 148.230.101.194
- **Registrar Domain**: (cek di mana Anda beli domain)

---

## 🔧 Langkah Setup DNS

### 1. Login ke Dashboard Domain
Login ke dashboard tempat Anda membeli domain kasirpos.space (misal: Namecheap, GoDaddy, Cloudflare, Niagahoster, dll)

### 2. Cari Menu DNS Management
Biasanya ada di:
- **DNS Management**
- **DNS Settings**
- **DNS Records**
- **Manage DNS**

### 3. Tambahkan A Record

Tambahkan 2 A Records berikut:

#### Record 1: Root Domain
- **Type**: A
- **Name/Host**: @ (atau kosong atau kasirpos.space)
- **Value/Points to**: `148.230.101.194`
- **TTL**: 3600 (atau 1 hour atau Automatic)

#### Record 2: WWW Subdomain
- **Type**: A
- **Name/Host**: www
- **Value/Points to**: `148.230.101.194`
- **TTL**: 3600 (atau 1 hour atau Automatic)

### 4. Hapus Record Lama (Jika Ada)
Jika ada A Record atau CNAME yang mengarah ke tempat lain, hapus dulu!

### 5. Save Changes
Klik **Save** atau **Apply Changes**

---

## ⏱️ DNS Propagation

Setelah save, tunggu DNS propagation (biasanya 5-30 menit, maksimal 24 jam).

### Cek DNS Propagation:

#### Cara 1: Menggunakan nslookup (di Terminal/CMD)
```bash
nslookup kasirpos.space
```

Output yang benar:
```
Server:  ...
Address:  ...

Name:    kasirpos.space
Address:  148.230.101.194
```

#### Cara 2: Menggunakan Website
Buka: https://www.whatsmydns.net/
- Masukkan: `kasirpos.space`
- Type: `A`
- Lihat apakah semua server sudah menunjuk ke `148.230.101.194`

#### Cara 3: Ping Domain
```bash
ping kasirpos.space
```

Harus reply dari IP `148.230.101.194`

---

## ✅ Verifikasi Setup

Setelah DNS propagation selesai, test di browser:

1. **Test HTTP (tanpa SSL dulu)**:
   - Buka: `http://kasirpos.space`
   - Harus muncul website Alonica

2. **Test WWW**:
   - Buka: `http://www.kasirpos.space`
   - Harus muncul website Alonica

3. **Setup SSL (HTTPS)** - Ikuti panduan di PANDUAN-DEPLOY-VPS.md section 9:
   ```bash
   sudo certbot --nginx -d kasirpos.space -d www.kasirpos.space
   ```

4. **Test HTTPS**:
   - Buka: `https://kasirpos.space`
   - Harus muncul website Alonica dengan icon gembok 🔒

---

## 🔍 Troubleshooting

### Domain belum mengarah ke VPS?
**Cek:**
1. Apakah A Record sudah benar? (kasirpos.space → 148.230.101.194)
2. Apakah sudah save changes?
3. Tunggu 15-30 menit untuk DNS propagation
4. Clear DNS cache di komputer Anda:
   ```bash
   # Windows
   ipconfig /flushdns
   
   # Mac
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Domain mengarah tapi website tidak muncul?
**Cek:**
1. Apakah Nginx sudah running? `sudo systemctl status nginx`
2. Apakah Nginx config sudah benar? `sudo nginx -t`
3. Apakah aplikasi jalan di PM2? `pm2 status`
4. Cek Nginx logs: `sudo tail -f /var/log/nginx/alonica_error.log`

### SSL tidak bisa diinstall?
**Cek:**
1. Apakah domain sudah mengarah ke VPS? (test dengan nslookup)
2. Apakah port 80 dan 443 terbuka? `sudo ufw status`
3. Coba jalankan ulang: `sudo certbot --nginx -d kasirpos.space -d www.kasirpos.space`

---

## 📝 Contoh DNS Record yang Benar

Berikut tampilan DNS record yang benar di dashboard domain Anda:

```
Type    Name              Value              TTL
A       @                 148.230.101.194    3600
A       www               148.230.101.194    3600
```

Atau:

```
Type    Name              Value              TTL
A       kasirpos.space    148.230.101.194    1 Hour
A       www               148.230.101.194    1 Hour
```

---

## 🎯 Next Steps

Setelah domain berhasil:

1. ✅ Setup SSL dengan Certbot (HTTPS)
2. ✅ Test auto redirect HTTP → HTTPS
3. ✅ Setup auto renewal SSL certificate
4. ✅ Update semua link di aplikasi ke https://kasirpos.space

---

## 📞 Butuh Bantuan?

Jika DNS tidak berfungsi setelah 24 jam:
1. Contact support registrar domain Anda
2. Screenshot DNS records dan kirim ke support
3. Pastikan nameserver yang digunakan adalah nameserver default dari registrar

**Good luck! 🚀**
