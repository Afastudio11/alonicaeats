#!/bin/bash

# Database Backup Script untuk Alonica VPS
# Supports both local and remote backups

set -e

# Configuration
BACKUP_DIR="/opt/backups"
REMOTE_BACKUP_DIR="/opt/backups/remote"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
MAX_LOCAL_BACKUPS=10

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="alonica_production"
DB_USER="alonica_user"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directories
create_backup_dirs() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$REMOTE_BACKUP_DIR"
    
    # Set proper permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$REMOTE_BACKUP_DIR"
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker-compose -f docker-compose.prod.yml exec -e PGPASSWORD="$DB_PASSWORD" postgres pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
        success "Database is accessible"
    else
        error "Cannot connect to database"
    fi
}

# Create database backup
create_backup() {
    local backup_file="$BACKUP_DIR/alonica_backup_$TIMESTAMP.dump"
    local compressed_file="$backup_file.gz"
    
    log "Creating database backup..."
    
    # Create SQL dump with proper authentication and binary stream handling
    docker-compose -f docker-compose.prod.yml exec -T -e PGPASSWORD="$DB_PASSWORD" postgres pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --format=custom \
        --compress=9 \
        > "$backup_file" || error "Failed to create database backup"
    
    # Compress backup
    gzip "$backup_file" || error "Failed to compress backup"
    
    # Verify backup
    if [[ -f "$compressed_file" && -s "$compressed_file" ]]; then
        local size=$(du -h "$compressed_file" | cut -f1)
        success "Backup created successfully: $compressed_file ($size)"
        echo "$compressed_file"
    else
        error "Backup verification failed"
    fi
}

# Upload to remote storage (S3 or Google Cloud)
upload_to_remote() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    
    if [[ -n "$BACKUP_S3_BUCKET" ]]; then
        log "Uploading to S3..."
        aws s3 cp "$backup_file" "s3://$BACKUP_S3_BUCKET/database-backups/$filename" || warning "S3 upload failed"
    fi
    
    if [[ -n "$GOOGLE_CLOUD_BUCKET" ]]; then
        log "Uploading to Google Cloud Storage..."
        gsutil cp "$backup_file" "gs://$GOOGLE_CLOUD_BUCKET/database-backups/$filename" || warning "GCS upload failed"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Remove local backups older than retention period
    find "$BACKUP_DIR" -name "alonica_backup_*.dump.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # Keep only latest N backups
    ls -t "$BACKUP_DIR"/alonica_backup_*.dump.gz | tail -n +$((MAX_LOCAL_BACKUPS + 1)) | xargs -r rm --
    
    success "Old backups cleaned up"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    # Check if file can be decompressed
    if gzip -t "$backup_file" 2>/dev/null; then
        success "Backup integrity verified"
    else
        error "Backup is corrupted"
    fi
}

# Send notification
send_notification() {
    local backup_file="$1"
    local size=$(du -h "$backup_file" | cut -f1)
    local message="✅ Database backup completed successfully: $(basename $backup_file) ($size)"
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Discord notification
    if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Main function
main() {
    log "Starting database backup process..."
    
    # Load environment variables
    if [[ -f .env.production ]]; then
        set -a
        source .env.production
        set +a
    fi
    
    create_backup_dirs
    check_database
    
    local backup_file
    backup_file=$(create_backup)
    
    verify_backup "$backup_file"
    upload_to_remote "$backup_file"
    cleanup_old_backups
    send_notification "$backup_file"
    
    success "Database backup process completed successfully!"
}

# Error handling
trap 'error "Backup process failed!"' ERR

# Run main function
main "$@"