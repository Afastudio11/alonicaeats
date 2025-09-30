# 🚀 VPS Deployment Quickstart - Fixed & Secure

**Status:** ✅ All deployment errors fixed with secure configuration!

## 📌 What Changed?

### Security Improvements
- ✅ **No more hard-coded passwords** - All credentials now use `.env` file
- ✅ **Flexible SSL configuration** - Auto-detects localhost vs remote database
- ✅ **Safer deployment script** - Won't delete unrelated PM2 apps
- ✅ **Protected .env file** - Added to .gitignore automatically

### Fixed Issues
- ✅ Database connection errors (SSL configuration)
- ✅ 502 Bad Gateway (proper error handling)
- ✅ PM2 environment loading (uses .env file)
- ✅ Database permissions (comprehensive grants)

---

## ⚡ Quick Deploy (3 Steps)

### Step 1: Create .env File

```bash
cd /var/www/alonica
cp .env.example .env
nano .env
```

**Minimum required configuration:**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://alonica_user:YOUR_PASSWORD@localhost:5432/alonica_db
DATABASE_SSL=false
SESSION_SECRET=your_generated_secret_here
JWT_SECRET=your_generated_secret_here
```

**Generate secure secrets:**
```bash
openssl rand -base64 48
```

Copy the output and paste as SESSION_SECRET and JWT_SECRET.

### Step 2: Setup Database

```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE alonica_db;
CREATE USER alonica_user WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE alonica_db TO alonica_user;
\c alonica_db;
GRANT ALL ON SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alonica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO alonica_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO alonica_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
```

**Update .env with your password:**
```bash
DATABASE_URL=postgresql://alonica_user:YourSecurePassword123!@localhost:5432/alonica_db
```

### Step 3: Deploy!

```bash
cd /var/www/alonica
bash scripts/vps-quick-deploy.sh
```

The script will:
- ✅ Validate .env configuration
- ✅ Test database connection
- ✅ Install dependencies
- ✅ Push schema & seed users
- ✅ Build & start application
- ✅ Verify deployment

---

## 🔍 Verification

### Check Application Status
```bash
# PM2 status
pm2 status

# View logs
pm2 logs alonica-production --lines 50

# Test local connection
curl http://localhost:3000
```

### Check Database Connection
```bash
# Test with your actual credentials from .env
psql "postgresql://alonica_user:YOUR_PASSWORD@localhost:5432/alonica_db" -c "SELECT COUNT(*) FROM users;"
```

### Access Application
- **Local:** http://localhost:3000
- **Public IP:** http://148.230.101.194
- **Domain:** https://kasirpos.space

### Login Credentials
- **Admin:** admin / admin123
- **Kasir:** kasir1 / kasir123

---

## 🔧 Troubleshooting

### Error: "DATABASE_URL not set in .env"
**Solution:** Create .env file from .env.example and fill in values.

### Error: "Database connection failed"
**Solution:** Verify database credentials in .env match actual database setup.

```bash
# Test connection manually
psql "postgresql://alonica_user:PASSWORD@localhost:5432/alonica_db" -c "SELECT 1;"
```

### Error: "Application not responding on port 3000"
**Solution:** Check PM2 logs for errors.

```bash
pm2 logs alonica-production --lines 100 | grep -i error
```

### Still Having Issues?
Run the deployment script again - it's idempotent and safe:
```bash
cd /var/www/alonica
bash scripts/vps-quick-deploy.sh
```

---

## 📚 Additional Resources

- **Full Guide:** See `PANDUAN-DEPLOY-VPS.md` for comprehensive setup
- **Environment Variables:** See `.env.example` for all options
- **PM2 Commands:** 
  - `pm2 restart alonica-production` - Restart app
  - `pm2 monit` - Real-time monitoring
  - `pm2 logs` - View all logs

---

## 🔒 Security Checklist

- [ ] .env file created with strong passwords
- [ ] SESSION_SECRET and JWT_SECRET generated with openssl
- [ ] Database password is unique and strong
- [ ] .env file NOT committed to git (in .gitignore)
- [ ] SSL configured correctly (false for localhost, true for remote)
- [ ] Firewall configured (UFW with proper ports)
- [ ] Nginx reverse proxy setup
- [ ] HTTPS certificate installed (optional but recommended)

---

## 🎉 Success!

If you can:
1. ✅ See "online" status in `pm2 status`
2. ✅ Login to the application
3. ✅ Create orders and manage inventory
4. ✅ No errors in `pm2 logs`

**Your deployment is complete and working!** 🚀

---

**Need help?** Check logs first:
```bash
pm2 logs alonica-production --lines 100
```

**Quick redeploy** after code changes:
```bash
cd /var/www/alonica && bash scripts/vps-quick-deploy.sh
```
