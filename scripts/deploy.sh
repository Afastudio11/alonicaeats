#!/bin/bash

# Deployment script untuk berbagai cloud providers
set -e

echo "☁️  Deploy Restaurant Management ke Cloud"
echo "========================================"

# Function to check if required tools are installed
check_requirements() {
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker tidak ditemukan"
        missing=1
    fi
    
    if ! command -v git &> /dev/null; then
        echo "❌ Git tidak ditemukan"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        echo "Silakan install tools yang diperlukan"
        exit 1
    fi
}

# Function to validate .env file
validate_env() {
    if [ ! -f ".env" ]; then
        echo "❌ File .env tidak ditemukan. Jalankan scripts/setup.sh terlebih dahulu"
        exit 1
    fi
    
    # Check required variables
    if ! grep -q "DATABASE_URL=postgresql://" .env; then
        echo "⚠️  DATABASE_URL belum dikonfigurasi dengan benar di .env"
        echo "   Format: postgresql://username:password@host:port/database"
        read -p "Lanjutkan? (y/N): " confirm
        if [[ $confirm != [yY] ]]; then
            exit 1
        fi
    fi
}

# Function to build and test Docker image
build_and_test() {
    echo "🏗️  Building Docker image..."
    docker build -t restaurant-management:latest .
    
    echo "✅ Docker image berhasil dibangun"
}

# Main deployment logic
main() {
    check_requirements
    validate_env
    
    echo ""
    echo "🚀 Pilih target deployment:"
    echo "1) Render.com (Recommended untuk pemula)"
    echo "2) Railway.app" 
    echo "3) Google Cloud Run"
    echo "4) Build Docker image saja"
    
    read -p "Masukkan pilihan (1-4): " choice
    
    case $choice in
        1)
            echo "🎯 Setup untuk Render.com"
            build_and_test
            echo ""
            echo "📋 Langkah deployment ke Render:"
            echo "1. Push kode ke GitHub"
            echo "2. Buat PostgreSQL database di Render"
            echo "3. Buat Web Service dengan Dockerfile"
            echo "4. Set environment variables dari .env"
            ;;
        2)
            echo "🚂 Setup untuk Railway.app"
            build_and_test
            echo ""
            echo "📋 Commands Railway:"
            echo "railway login && railway init && railway up"
            ;;
        3)
            echo "☁️  Setup untuk Google Cloud Run"
            build_and_test
            echo ""
            echo "📋 Commands Google Cloud:"
            echo "gcloud builds submit --tag gcr.io/PROJECT_ID/restaurant-management"
            echo "gcloud run deploy --image gcr.io/PROJECT_ID/restaurant-management"
            ;;
        4)
            build_and_test
            echo "✅ Docker image siap: restaurant-management:latest"
            ;;
        *)
            echo "❌ Pilihan tidak valid"
            ;;
    esac
}

main "$@"