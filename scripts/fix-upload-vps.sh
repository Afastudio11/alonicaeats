#!/bin/bash

# Script lengkap untuk fix upload foto di VPS
echo "🔧 Fixing photo upload on VPS..."

# 1. Buat direktori upload
echo "📁 Creating upload directories..."
mkdir -p uploads
mkdir -p public/images
chmod 755 uploads public public/images
echo "✅ Directories created"

# 2. Cek Nginx config
echo ""
echo "🌐 Checking Nginx configuration..."

NGINX_CONF="/etc/nginx/sites-available/alonica"
NGINX_ENABLED="/etc/nginx/sites-enabled/alonica"

if [ -f "$NGINX_CONF" ]; then
    echo "Found Nginx config at: $NGINX_CONF"
    
    # Cek apakah client_max_body_size sudah ada
    if grep -q "client_max_body_size" "$NGINX_CONF"; then
        echo "✅ client_max_body_size already configured"
        grep "client_max_body_size" "$NGINX_CONF"
    else
        echo "⚠️  client_max_body_size NOT found in Nginx config!"
        echo ""
        echo "🔧 Backup dan update Nginx config dengan command berikut:"
        echo ""
        echo "sudo cp $NGINX_CONF ${NGINX_CONF}.backup"
        echo "sudo sed -i '/server_name/a \    \n    # File upload limit\n    client_max_body_size 20M;' $NGINX_CONF"
        echo "sudo nginx -t"
        echo "sudo systemctl reload nginx"
        echo ""
        echo "ATAU edit manual file $NGINX_CONF"
        echo "Tambahkan baris ini setelah 'server_name':"
        echo "    client_max_body_size 20M;"
    fi
else
    echo "⚠️  Nginx config tidak ditemukan di $NGINX_CONF"
    echo ""
    echo "Lokasi config Nginx mungkin berbeda. Cek dengan:"
    echo "  sudo nginx -T | grep 'configuration file'"
    echo "  ls -la /etc/nginx/sites-available/"
fi

# 3. Test Nginx config
echo ""
echo "🧪 Test Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx config OK"
else
    echo "❌ Nginx config error! Fix errors first."
    sudo nginx -t
fi

# 4. Restart services
echo ""
echo "🔄 Restarting services..."
echo "PM2:"
pm2 restart all
echo ""
echo "Nginx (need sudo):"
echo "Run: sudo systemctl reload nginx"

# 5. Verify
echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Verification checklist:"
echo "  [1] Directories exist:"
ls -ld uploads public/images 2>/dev/null
echo ""
echo "  [2] PM2 running:"
pm2 list | grep alonica
echo ""
echo "  [3] Nginx client_max_body_size:"
echo "      Run: sudo nginx -T 2>/dev/null | grep client_max_body_size"
echo ""
echo "  [4] Test upload:"
echo "      - Login ke admin dashboard"
echo "      - Edit menu item"
echo "      - Klik 'Ganti Foto'"
echo "      - Upload foto < 20MB"
echo "      - Should work now! ✨"
