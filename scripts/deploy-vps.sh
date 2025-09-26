#!/bin/bash

# Alonica VPS Deployment Script
# Zero-downtime blue-green deployment untuk VPS

set -e

# Configuration
APP_NAME="alonica"
DOCKER_IMAGE="alonica_app"
BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/alonica_deploy_$TIMESTAMP.log"

# Colors untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v nginx >/dev/null 2>&1 || error "Nginx is not installed"
    command -v git >/dev/null 2>&1 || error "Git is not installed"
    
    # Check if .env.production exists
    [[ -f .env.production ]] || error "Environment file .env.production not found"
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    if docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
        docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U alonica_user alonica_production > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
        success "Database backup created: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    else
        warning "PostgreSQL container not running, skipping database backup"
    fi
    
    # Keep only last 7 backups
    find "$BACKUP_DIR" -name "db_backup_*.sql" -type f -mtime +7 -delete
}

# Pull latest code
update_code() {
    log "Updating application code..."
    
    # Stash any local changes
    git stash save "Auto-stash before deployment $TIMESTAMP" || true
    
    # Pull latest changes
    git pull origin main || error "Failed to pull latest code"
    
    # Install/update dependencies
    npm ci || error "Failed to install dependencies"
    
    success "Code updated successfully"
}

# Build new image
build_image() {
    log "Building new Docker image..."
    
    # Build dengan timestamp tag
    docker build -f Dockerfile.production -t "${DOCKER_IMAGE}:${TIMESTAMP}" -t "${DOCKER_IMAGE}:latest" . || error "Failed to build Docker image"
    
    success "Docker image built: ${DOCKER_IMAGE}:${TIMESTAMP}"
}

# Test new container
test_container() {
    log "Testing new container..."
    
    # Run container pada port berbeda untuk testing
    docker run -d --name "${APP_NAME}_test_${TIMESTAMP}" \
        --env-file .env.production \
        -e PORT=3001 \
        -p 3001:3001 \
        "${DOCKER_IMAGE}:${TIMESTAMP}" || error "Failed to start test container"
    
    # Wait for container to be ready
    log "Waiting for test container to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            success "Test container is healthy"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Test container failed health check"
        fi
        sleep 2
    done
    
    # Cleanup test container
    docker stop "${APP_NAME}_test_${TIMESTAMP}" || true
    docker rm "${APP_NAME}_test_${TIMESTAMP}" || true
}

# Deploy production
deploy_production() {
    log "Deploying to production..."
    
    # Deploy dengan zero downtime
    docker-compose -f docker-compose.prod.yml up -d --no-deps app || error "Failed to deploy new container"
    
    # Wait for new container to be ready
    log "Waiting for production container to be ready..."
    for i in {1..60}; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            success "Production container is healthy"
            break
        fi
        if [ $i -eq 60 ]; then
            error "Production container failed health check"
        fi
        sleep 2
    done
    
    success "Production deployment completed"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run migrations safely
    docker-compose -f docker-compose.prod.yml exec app npm run db:push --force || error "Database migration failed"
    success "Database migrations completed"
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove old containers
    docker container prune -f || true
    
    # Remove dangling images
    docker image prune -f || true
    
    success "Cleanup completed"
}

# Reload nginx
reload_nginx() {
    log "Reloading Nginx configuration..."
    
    # Test nginx config first
    sudo nginx -t || error "Nginx configuration test failed"
    
    # Reload nginx
    sudo systemctl reload nginx || error "Failed to reload Nginx"
    
    success "Nginx reloaded successfully"
}

# Rollback function
rollback() {
    local backup_file="$1"
    
    warning "Starting rollback process..."
    
    if [[ -z "$backup_file" ]]; then
        # Find latest backup
        backup_file=$(ls -t "$BACKUP_DIR"/db_backup_*.sql | head -1)
    fi
    
    if [[ -f "$backup_file" ]]; then
        log "Restoring database from: $backup_file"
        docker-compose -f docker-compose.prod.yml exec postgres psql -U alonica_user -d alonica_production < "$backup_file"
        success "Database restored"
    else
        error "Backup file not found: $backup_file"
    fi
    
    success "Rollback completed"
}

# Main deployment function
main() {
    log "Starting Alonica VPS deployment - $TIMESTAMP"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            update_code
            build_image
            test_container
            deploy_production
            run_migrations
            cleanup
            reload_nginx
            success "🚀 VPS Deployment completed successfully!"
            ;;
        "rollback")
            rollback "$2"
            ;;
        "test")
            check_prerequisites
            build_image
            test_container
            log "Test completed successfully"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback [backup_file]|test}"
            exit 1
            ;;
    esac
}

# Trap untuk cleanup on error
trap 'error "Deployment failed! Check logs: $LOG_FILE"' ERR

# Run main function
main "$@"