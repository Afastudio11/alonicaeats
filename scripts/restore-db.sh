#!/bin/bash

# Database Restore Script untuk Alonica VPS
# Restore database dari backup dengan safety checks

set -e

# Configuration
BACKUP_DIR="/opt/backups"
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

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    
    local backups=($(ls -t "$BACKUP_DIR"/alonica_backup_*.dump.gz 2>/dev/null || true))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        warning "No backups found in $BACKUP_DIR"
        return 1
    fi
    
    local i=1
    for backup in "${backups[@]}"; do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(echo "$filename" | sed 's/alonica_backup_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
        echo "$i) $filename ($size) - $date"
        ((i++))
    done
    
    echo ""
}

# Verify backup file
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup file..."
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
    fi
    
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted: $backup_file"
    fi
    
    success "Backup file verification passed"
}

# Create safety backup before restore
create_safety_backup() {
    log "Creating safety backup before restore..."
    
    local safety_backup="$BACKUP_DIR/safety_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker-compose -f docker-compose.prod.yml exec -T -e PGPASSWORD="$DB_PASSWORD" postgres pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        > "$safety_backup" || error "Failed to create safety backup"
    
    gzip "$safety_backup"
    success "Safety backup created: $safety_backup.gz"
}

# Stop application during restore
stop_application() {
    log "Stopping application containers..."
    
    docker-compose -f docker-compose.prod.yml stop app || true
    sleep 5
    
    success "Application stopped"
}

# Start application after restore
start_application() {
    log "Starting application containers..."
    
    docker-compose -f docker-compose.prod.yml up -d app || error "Failed to start application"
    
    # Wait for application to be ready
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            success "Application is running and healthy"
            return 0
        fi
        sleep 2
    done
    
    warning "Application may not be fully ready yet"
}

# Perform database restore
restore_database() {
    local backup_file="$1"
    
    log "Restoring database from: $(basename $backup_file)"
    
    # Drop and recreate database with proper authentication
    docker-compose -f docker-compose.prod.yml exec -e PGPASSWORD="$DB_PASSWORD" postgres psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS $DB_NAME;" || error "Failed to drop database"
    
    docker-compose -f docker-compose.prod.yml exec -e PGPASSWORD="$DB_PASSWORD" postgres psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || error "Failed to create database"
    
    # Restore from backup with proper authentication
    zcat "$backup_file" | docker-compose -f docker-compose.prod.yml exec -T -e PGPASSWORD="$DB_PASSWORD" postgres pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges || error "Failed to restore database"
    
    success "Database restored successfully"
}

# Verify restored data
verify_restore() {
    log "Verifying restored data..."
    
    # Check if tables exist
    local table_count=$(docker-compose -f docker-compose.prod.yml exec -e PGPASSWORD="$DB_PASSWORD" postgres psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' \n')
    
    if [[ "$table_count" -gt 0 ]]; then
        success "Database restore verification passed ($table_count tables found)"
    else
        error "Database restore verification failed (no tables found)"
    fi
}

# Interactive backup selection
select_backup() {
    list_backups || exit 1
    
    echo ""
    read -p "Select backup number to restore (or 'q' to quit): " selection
    
    if [[ "$selection" == "q" ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    local backups=($(ls -t "$BACKUP_DIR"/alonica_backup_*.dump.gz 2>/dev/null))
    local selected_backup="${backups[$((selection-1))]}"
    
    if [[ -z "$selected_backup" ]]; then
        error "Invalid selection"
    fi
    
    echo "$selected_backup"
}

# Confirmation prompt
confirm_restore() {
    local backup_file="$1"
    
    warning "⚠️  DATABASE RESTORE WARNING ⚠️"
    echo ""
    echo "This will:"
    echo "1. Stop the application"
    echo "2. Create a safety backup of current database"
    echo "3. DROP the current database completely"
    echo "4. Restore from: $(basename $backup_file)"
    echo "5. Restart the application"
    echo ""
    warning "ALL CURRENT DATA WILL BE LOST!"
    echo ""
    
    read -p "Are you absolutely sure you want to proceed? (type 'YES' to confirm): " confirmation
    
    if [[ "$confirmation" != "YES" ]]; then
        log "Restore cancelled by user"
        exit 0
    fi
}

# Main function
main() {
    local backup_file="$1"
    
    log "Starting database restore process..."
    
    # Load environment variables
    if [[ -f .env.production ]]; then
        set -a
        source .env.production
        set +a
    fi
    
    # Select backup file
    if [[ -z "$backup_file" ]]; then
        backup_file=$(select_backup)
    fi
    
    # Verify backup
    verify_backup "$backup_file"
    
    # Confirmation
    confirm_restore "$backup_file"
    
    # Perform restore
    create_safety_backup
    stop_application
    restore_database "$backup_file"
    verify_restore
    start_application
    
    success "🎉 Database restore completed successfully!"
    log "Restored from: $(basename $backup_file)"
}

# Error handling
trap 'error "Restore process failed! Check the safety backup if needed."' ERR

# Usage
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "If no backup file is specified, an interactive selection will be shown."
    echo ""
    echo "Examples:"
    echo "  $0                                    # Interactive selection"
    echo "  $0 /opt/backups/alonica_backup_20231225_120000.sql.gz"
    exit 0
fi

# Run main function
main "$@"