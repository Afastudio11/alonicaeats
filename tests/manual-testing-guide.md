# 📋 Manual Testing Guide - Alonica Restaurant System

## 🎯 Masalah yang Diperbaiki

### ✅ Issues yang Telah Diselesaikan:
1. **Login Dashboard Admin & Kasir** - Sistem autentikasi sekarang berfungsi dengan baik
2. **Dashboard Kasir Blank** - Content sekarang tampil dengan benar 
3. **Layout Header Kosong** - Spacing dan margin sudah diperbaiki
4. **Integration Testing** - Test suite lengkap telah dibuat

## 🧪 Testing Manual

### 1. Authentication Testing

#### Login Admin:
```
URL: http://localhost:5000/login
Credentials:
- Username: admin  
- Password: admin123
```

#### Login Kasir:
```
URL: http://localhost:5000/login
Credentials:
- Username: kasir1
- Password: kasir123
- Username: kasir2  
- Password: kasir456
```

### 2. Dashboard Testing

#### Admin Dashboard:
- ✅ Akses ke `/admin` menampilkan sidebar lengkap
- ✅ Header tidak memiliki spacing kosong berlebihan
- ✅ Content area tampil dengan proporsi yang benar
- ✅ Mobile responsive dengan hamburger menu

#### Kasir Dashboard:
- ✅ Akses ke `/kasir` menampilkan content yang sesuai
- ✅ Tidak lagi blank/kosong
- ✅ Sidebar kasir berfungsi dengan navigasi yang tepat
- ✅ Layout konsisten dengan admin dashboard

### 3. Layout Testing

#### Desktop (>= 1024px):
- ✅ Sidebar fixed di kiri dengan lebar 256px
- ✅ Content area menggunakan flexbox layout
- ✅ Tidak ada margin berlebihan di area content

#### Mobile (< 1024px):
- ✅ Sidebar tersembunyi secara default
- ✅ Hamburger menu berfungsi
- ✅ Overlay background saat sidebar terbuka
- ✅ Content full-width pada mobile

### 4. Navigation Testing

#### Admin Navigation:
- ✅ Orders, Kitchen, Kasir Manual
- ✅ Reservasi, Manajemen User
- ✅ Custom Menu, Categories
- ✅ Analytics, Inventory, Settings

#### Kasir Navigation:
- ✅ Menu Order, Dapur, Kasir Manual
- ✅ Reservasi, Pencatatan Pengeluaran
- ✅ Laporan Harian
- ✅ Shift Management

## 🔧 Integration Testing

### Automated Tests:
```bash
npm run test:integration
```

### Test Coverage:
- ✅ Health Check API
- ✅ User Authentication (Admin & Kasir)
- ✅ Access Control (Role-based)
- ✅ API Endpoints (Menu, Categories, Orders)
- ✅ Frontend Routes
- ✅ Error Handling

## 🎯 Quick Verification Checklist

### Pre-Testing:
- [ ] Server berjalan di port 5000
- [ ] No error di console logs
- [ ] Default users ter-initialize

### Login Testing:
- [ ] Admin login berhasil dengan admin/admin123
- [ ] Kasir login berhasil dengan kasir1/kasir123
- [ ] Invalid credentials ditolak dengan error 401
- [ ] Redirect ke dashboard sesuai role

### Dashboard Testing:
- [ ] Admin dashboard `/admin` tampil lengkap
- [ ] Kasir dashboard `/kasir` tidak blank
- [ ] Sidebar navigation berfungsi
- [ ] Layout tidak memiliki spacing berlebihan

### Mobile Testing:
- [ ] Responsive pada ukuran 375px (mobile)
- [ ] Hamburger menu berfungsi
- [ ] Sidebar dapat dibuka/tutup
- [ ] Content tidak terpotong

### Logout Testing:
- [ ] Logout button berfungsi
- [ ] Session terhapus dari localStorage
- [ ] Redirect ke login page
- [ ] Access control aktif setelah logout

## 🐛 Troubleshooting

### Jika Login Gagal:
1. Cek server logs untuk error 401
2. Jalankan: `curl -X POST http://localhost:5000/api/auth/init-default-users`
3. Verifikasi default users sudah ter-create

### Jika Dashboard Blank:
1. Cek browser console untuk JavaScript errors
2. Verifikasi routing di App.tsx
3. Pastikan user role sesuai dengan dashboard

### Jika Layout Bermasalah:
1. Cek CSS classes di browser dev tools
2. Verifikasi flexbox layout di dashboard components
3. Test pada ukuran layar berbeda

## 📊 Expected Results

### Successful Testing Indicators:
- ✅ Semua login berhasil tanpa error
- ✅ Dashboard content tampil penuh tanpa spacing kosong
- ✅ Navigation sidebar berfungsi sempurna
- ✅ Mobile responsive layout
- ✅ Integration tests pass 100%

### Performance Expectations:
- Login response < 500ms
- Dashboard load < 1s
- Sidebar animation smooth
- API responses < 200ms average