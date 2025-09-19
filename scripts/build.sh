#!/bin/bash

# Production build script untuk restaurant management system
set -e

echo "🏗️  Restaurant Management - Production Build"
echo "============================================"

# Function to check Node.js version
check_node_version() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js tidak ditemukan. Silakan install Node.js 18 atau lebih tinggi."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js version $NODE_VERSION tidak didukung. Minimal Node.js 18."
        exit 1
    fi
    
    echo "✅ Node.js $(node --version) detected"
}

# Function to clean previous builds
clean_build() {
    echo "🧹 Cleaning previous builds..."
    if [ -d "dist" ]; then
        rm -rf dist/
        echo "   Removed dist/ directory"
    fi
    
    # Clear npm cache jika ada masalah build
    if [ "$1" = "--clean-cache" ]; then
        echo "   Clearing npm cache..."
        npm cache clean --force
    fi
}

# Function to install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    
    if [ ! -f "package-lock.json" ]; then
        echo "⚠️  package-lock.json tidak ditemukan. Menjalankan npm install..."
        npm install
    else
        npm ci
    fi
    
    echo "✅ Dependencies installed"
}

# Function to run type checking
type_check() {
    echo "🔍 Running type checking..."
    npm run check
    echo "✅ Type checking passed"
}

# Function to build the application
build_app() {
    echo "🔨 Building application..."
    
    # Set NODE_ENV for production build
    export NODE_ENV=production
    
    # Build frontend and backend
    npm run build
    
    # Verify build outputs
    if [ ! -f "dist/index.js" ]; then
        echo "❌ Backend build failed: dist/index.js not found"
        exit 1
    fi
    
    if [ ! -f "dist/public/index.html" ]; then
        echo "❌ Frontend build failed: dist/public/index.html not found"
        exit 1
    fi
    
    echo "✅ Build completed successfully"
    echo "   Backend: dist/index.js ($(du -h dist/index.js | cut -f1))"
    echo "   Frontend: dist/public/ ($(du -sh dist/public | cut -f1))"
}

# Function to create production package
create_package() {
    echo "📝 Creating production package info..."
    
    # Create build info
    cat > dist/build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "environment": "production",
  "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF
    
    echo "✅ Build info created at dist/build-info.json"
}

# Function to test production build
test_build() {
    echo "🧪 Testing production build..."
    
    # Create minimal test environment
    export NODE_ENV=production
    export PORT=5001
    export DATABASE_URL="postgresql://test:test@localhost:5432/test"
    export SESSION_SECRET="test-secret-key-do-not-use-in-production"
    
    # Test if the server can start
    echo "   Starting server test..."
    timeout 10s node dist/index.js &
    SERVER_PID=$!
    
    sleep 3
    
    # Test health endpoint
    if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
        echo "✅ Server health check passed"
        kill $SERVER_PID 2>/dev/null || true
    else
        echo "❌ Server health check failed"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    wait $SERVER_PID 2>/dev/null || true
}

# Function to show deployment instructions
show_deployment_instructions() {
    echo ""
    echo "🚀 Build completed successfully!"
    echo "================================="
    echo ""
    echo "📁 Build artifacts:"
    echo "   dist/index.js      - Server application"
    echo "   dist/public/       - Frontend static files"
    echo "   dist/build-info.json - Build information"
    echo ""
    echo "🌐 Deploy to production:"
    echo "   1. Copy dist/ folder to your server"
    echo "   2. Copy package.json and package-lock.json"
    echo "   3. Install all dependencies: npm ci"
    echo "   4. Set environment variables (see .env.example)"
    echo "   5. Run database migration: npm run db:push"
    echo "   6. Install production dependencies: npm ci --omit=dev"
    echo "   7. Start server: NODE_ENV=production node dist/index.js"
    echo ""
    echo "🐳 Or use Docker:"
    echo "   docker build -t restaurant-management ."
    echo "   docker run -p 5000:5000 --env-file .env restaurant-management"
    echo ""
    echo "📋 Next steps:"
    echo "   - Setup production database"
    echo "   - Configure environment variables"
    echo "   - Setup SSL/TLS certificates"
    echo "   - Configure domain and DNS"
    echo ""
}

# Main execution
main() {
    # Parse command line arguments
    CLEAN_CACHE=false
    SKIP_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean-cache)
                CLEAN_CACHE=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --clean-cache    Clear npm cache before build"
                echo "  --skip-tests     Skip build testing"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Execute build steps
    check_node_version
    
    if [ "$CLEAN_CACHE" = true ]; then
        clean_build --clean-cache
    else
        clean_build
    fi
    
    install_deps
    type_check
    build_app
    create_package
    
    if [ "$SKIP_TESTS" = false ]; then
        test_build
    fi
    
    show_deployment_instructions
}

# Run main function
main "$@"