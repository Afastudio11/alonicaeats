#!/bin/bash

# Script untuk export database Alonica ke file backup

echo "=================================="
echo "🗄️  Export Database Alonica"
echo "=================================="
echo ""

# Cek apakah DATABASE_URL tersedia
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL tidak ditemukan!"
    echo "💡 Pastikan Anda menjalankan script ini di environment Replit"
    exit 1
fi

# Nama file output
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="alonica_backup_${TIMESTAMP}.sql"
FILENAME_GZ="${FILENAME}.gz"

echo "📦 Mengeksport database..."
echo "   File: $FILENAME"
echo ""

# Export database
pg_dump "$DATABASE_URL" > "$FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Export berhasil!"
    
    # Tampilkan ukuran file
    SIZE=$(ls -lh "$FILENAME" | awk '{print $5}')
    echo "   Ukuran: $SIZE"
    echo ""
    
    # Tanyakan apakah mau di-compress
    echo "🗜️  Mengcompress file..."
    gzip "$FILENAME"
    
    if [ $? -eq 0 ]; then
        SIZE_GZ=$(ls -lh "$FILENAME_GZ" | awk '{print $5}')
        echo "✅ Compress berhasil!"
        echo "   File compressed: $FILENAME_GZ"
        echo "   Ukuran: $SIZE_GZ"
        echo ""
        
        echo "📥 File siap untuk di-download dan di-upload ke VPS"
        echo ""
        echo "📋 Langkah selanjutnya:"
        echo "   1. Download file: $FILENAME_GZ"
        echo "   2. Upload ke VPS Anda"
        echo "   3. Import dengan: gunzip -c $FILENAME_GZ | psql -U user -d database"
        echo ""
        echo "💡 Lihat PANDUAN-EXPORT-DATABASE.md untuk detail lengkap"
    else
        echo "⚠️  Compress gagal, tapi file SQL tetap tersedia: $FILENAME"
    fi
else
    echo "❌ Export gagal!"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ Selesai!"
echo "=================================="
