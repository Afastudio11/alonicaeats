# Panduan Deployment VPS - Alonica Restaurant System

## Ringkasan
Panduan lengkap untuk deploy sistem Alonica ke VPS dengan fokus pada maintainability, scalability, dan keamanan database.

## Prerequisites VPS
- Ubuntu 20.04+ atau CentOS 8+
- RAM minimal 2GB (recommended 4GB+)
- Storage minimal 20GB
- Docker & Docker Compose
- Nginx (sebagai reverse proxy)
- SSL Certificate (Let's Encrypt)

## Arsitektur Deployment

```
Internet → Nginx (SSL/Proxy) → Docker Container (App) → PostgreSQL (Database)
```

## 1. Persiapan Server VPS

### Update sistem dan install dependencies:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose nginx certbot python3-certbot-nginx git -y

# CentOS/RHEL
sudo yum update -y
sudo yum install docker docker-compose nginx certbot python3-certbot-nginx git -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Setup Firewall:
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## 2. Clone dan Setup Proyek

```bash
# Clone repository
git clone <your-repo-url> /opt/alonica
cd /opt/alonica

# Buat environment file
cp .env.example .env.production
```

## 3. Konfigurasi Database

### Setup PostgreSQL (Terpisah dari container untuk keamanan):
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Setup database
sudo -u postgres psql
CREATE DATABASE alonica_production;
CREATE USER alonica_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE alonica_production TO alonica_user;
\q
```

### Backup Strategy:
```bash
# Script auto backup harian
sudo crontab -e
# Tambahkan: 0 2 * * * /opt/alonica/scripts/backup-db.sh
```

## 4. Environment Variables Production

File `.env.production`:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://alonica_user:your_secure_password@localhost:5432/alonica_production

# Security
SESSION_SECRET=your_very_long_random_string_here
JWT_SECRET=another_very_long_random_string

# External Services
MIDTRANS_SERVER_KEY=your_midtrans_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=true

# Google Cloud Storage (jika menggunakan)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_BUCKET=your_bucket_name

# Domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
REPLIT_DOMAINS=
```

## 5. Strategi Deployment Zero-Downtime

### Blue-Green Deployment:
```bash
# Script deployment otomatis
./scripts/deploy.sh
```

Proses:
1. Build image baru dengan tag timestamp
2. Test container baru di port berbeda
3. Update Nginx config ke container baru
4. Reload Nginx (zero downtime)
5. Stop container lama

## 6. Database Migration Strategy

### Aman untuk Production:
```bash
# 1. Backup database sebelum migration
./scripts/backup-db.sh

# 2. Test migration di staging
NODE_ENV=staging npm run db:push

# 3. Jalankan migration production
NODE_ENV=production npm run db:push

# 4. Verify data integrity
./scripts/verify-data.sh
```

### Rollback Plan:
```bash
# Jika ada masalah, rollback ke backup
./scripts/restore-db.sh backup_filename.sql
```

## 7. Monitoring & Logging

### Setup monitoring dengan Docker:
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards
- **Loki**: Log aggregation
- **Cadvisor**: Container metrics

### Health Checks:
```bash
# Endpoint health check
curl http://localhost:3000/api/health

# Database health
./scripts/check-db-health.sh
```

## 8. SSL dan Security

### Setup SSL dengan Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Security Headers di Nginx:
```nginx
# Security headers sudah dikonfigurasi di aplikasi
# Tambahan di Nginx:
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy strict-origin-when-cross-origin;
```

## 9. Maintenance dan Updates

### Update Aplikasi (Tanpa downtime):
```bash
cd /opt/alonica
git pull origin main
./scripts/deploy.sh
```

### Update Dependencies:
```bash
# Update npm packages
npm update
npm audit fix

# Rebuild dan deploy
./scripts/deploy.sh
```

### Database Maintenance:
```bash
# Vacuum dan analyze (mingguan)
./scripts/db-maintenance.sh
```

## 10. Backup dan Recovery

### Automated Backups:
- Database backup harian
- File backup mingguan
- Off-site backup bulanan

### Recovery Testing:
- Test restore backup setiap bulan
- Dokumentasi recovery steps
- RTO target: < 1 jam

## 11. Scaling Strategy

### Horizontal Scaling:
```bash
# Multiple containers dengan load balancer
docker-compose scale app=3
```

### Vertical Scaling:
```bash
# Resource allocation
docker-compose up --scale app=1 --memory=4g --cpus=2
```

## Checklist Pre-Deployment
- [ ] VPS sudah disiapkan dengan OS dan dependencies
- [ ] Database PostgreSQL setup dan tested
- [ ] Environment variables dikonfigurasi
- [ ] SSL certificate active
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] DNS pointing ke VPS
- [ ] Health checks working
- [ ] Rollback plan tested

## Troubleshooting Common Issues

### Container tidak start:
```bash
docker logs alonica_app
# Check ports, environment variables, database connection
```

### Database connection errors:
```bash
# Test database connectivity
pg_isready -h localhost -p 5432 -U alonica_user
```

### SSL issues:
```bash
# Renew SSL
sudo certbot renew --nginx
```

## Support & Maintenance

Untuk maintenance rutin:
- Update mingguan (Minggu malam)
- Security patches segera setelah rilis
- Database maintenance bulanan
- Backup verification bulanan

---

**Catatan Penting**: Selalu test di staging environment sebelum deploy ke production!