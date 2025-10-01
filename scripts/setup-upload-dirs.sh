#!/bin/bash

# Script untuk setup direktori upload di VPS
# Jalankan script ini setelah deploy ke VPS

echo "🔧 Setting up upload directories for VPS deployment..."

# Buat direktori uploads dan public/images
mkdir -p uploads
mkdir -p public/images

# Set permissions yang benar
chmod 755 uploads
chmod 755 public
chmod 755 public/images

echo "✅ Upload directories created successfully:"
echo "   - uploads/ (untuk backup file)"
echo "   - public/images/ (untuk serve gambar)"

# Check if directories exist and have correct permissions
if [ -d "uploads" ] && [ -d "public/images" ]; then
    echo "✅ Directory structure verified"
    ls -la | grep -E "uploads|public"
    echo ""
    echo "📁 Detailed structure:"
    ls -la public/
else
    echo "❌ Failed to create directories"
    exit 1
fi

echo ""
echo "✨ Setup complete! Restart your application:"
echo "   pm2 restart ecosystem.config.cjs"
