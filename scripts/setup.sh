#!/bin/bash

# Setup script untuk deployment aplikasi restaurant management
set -e

echo "🍴 Setup Restaurant Management System"
echo "======================================"

# Function to generate random password
generate_password() {
    openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32
}

# Function to generate session secret
generate_session_secret() {
    openssl rand -base64 64 2>/dev/null || date +%s | sha256sum | base64 | head -c 64
}

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Membuat file .env dari template..."
    cp .env.example .env
    
    # Generate session secret
    SESSION_SECRET=$(generate_session_secret)
    
    # Update .env with generated values
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-session-key-change-this/${SESSION_SECRET}/" .env
    else
        # Linux
        sed -i "s/your-super-secret-session-key-change-this/${SESSION_SECRET}/" .env
    fi
    
    echo "✅ File .env dibuat dengan session secret yang aman"
    echo ""
    echo "⚠️  PENTING: Edit file .env dan isi:"
    echo "   - DATABASE_URL dengan URL database PostgreSQL Anda"
    echo "   - Ganti username/password admin jika diperlukan"
    echo "   - Atur konfigurasi Google Cloud Storage jika menggunakan upload file"
else
    echo "✅ File .env sudah ada"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker tidak ditemukan. Silakan install Docker terlebih dahulu."
    echo "   Install dari: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose tidak ditemukan."
    echo "   Install dari: https://docs.docker.com/compose/install/"
    exit 1
fi

echo ""
echo "🚀 Pilih mode deployment:"
echo "1) Development (dengan database lokal)"
echo "2) Production build saja"
echo "3) Test Docker build"

read -p "Masukkan pilihan (1-3): " choice

case $choice in
    1)
        echo "🔧 Starting development environment..."
        # Check if we can use 'docker compose' or need 'docker-compose'
        if docker compose version &> /dev/null; then
            docker compose up --build
        else
            docker-compose up --build
        fi
        ;;
    2)
        echo "🏗️ Building production Docker image..."
        docker build -t restaurant-management:latest .
        echo "✅ Docker image berhasil dibuild: restaurant-management:latest"
        echo ""
        echo "Untuk menjalankan:"
        echo "docker run -p 5000:5000 --env-file .env restaurant-management:latest"
        ;;
    3)
        echo "🧪 Testing Docker build..."
        docker build -t restaurant-test .
        echo "✅ Build test berhasil!"
        
        # Quick test run
        echo "Testing container startup..."
        container_id=$(docker run -d -p 5001:5000 -e NODE_ENV=production -e DATABASE_URL=postgresql://test:test@localhost/test restaurant-test)
        
        sleep 5
        
        # Test health endpoint
        if curl -f http://localhost:5001/api/health &> /dev/null; then
            echo "✅ Health check berhasil!"
        else
            echo "❌ Health check gagal"
        fi
        
        # Cleanup
        docker stop $container_id
        docker rm $container_id
        ;;
    *)
        echo "❌ Pilihan tidak valid"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup selesai!"
echo ""
echo "📚 Next steps:"
echo "1. Edit file .env sesuai konfigurasi Anda"
echo "2. Pastikan database PostgreSQL sudah siap"
echo "3. Jalankan migrasi database: npm run db:push"
echo "4. Deploy ke cloud provider pilihan Anda"