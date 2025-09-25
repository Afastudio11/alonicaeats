#!/bin/bash

# Health Check Script untuk Alonica VPS
# Monitor system health dan aplikasi

set -e

# Configuration
LOG_FILE="/var/log/alonica_health.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check application health
check_app_health() {
    log "Checking application health..."
    
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" http://localhost:3000/api/health || echo "000")
    status_code="${response: -3}"
    
    if [[ "$status_code" == "200" ]]; then
        success "Application is healthy"
        return 0
    else
        error "Application health check failed (HTTP $status_code)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    if docker-compose -f docker-compose.prod.yml exec postgres pg_isready -h localhost -p 5432 -U alonica_user > /dev/null 2>&1; then
        success "Database is accessible"
        return 0
    else
        error "Database connectivity failed"
        return 1
    fi
}

# Check Docker containers
check_containers() {
    log "Checking Docker containers..."
    
    local containers=("alonica_app" "alonica_postgres" "alonica_nginx")
    local failed=0
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            success "Container $container is running"
        else
            error "Container $container is not running"
            ((failed++))
        fi
    done
    
    return $failed
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [[ $cpu_usage -gt $ALERT_THRESHOLD_CPU ]]; then
        warning "High CPU usage: ${cpu_usage}%"
    else
        log "CPU usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    if [[ $memory_usage -gt $ALERT_THRESHOLD_MEMORY ]]; then
        warning "High memory usage: ${memory_usage}%"
    else
        log "Memory usage: ${memory_usage}%"
    fi
    
    # Disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt $ALERT_THRESHOLD_DISK ]]; then
        warning "High disk usage: ${disk_usage}%"
    else
        log "Disk usage: ${disk_usage}%"
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    log "Checking SSL certificate..."
    
    if [[ -f /etc/letsencrypt/live/yourdomain.com/fullchain.pem ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [[ $days_until_expiry -lt 30 ]]; then
            warning "SSL certificate expires in $days_until_expiry days"
        else
            log "SSL certificate expires in $days_until_expiry days"
        fi
    else
        warning "SSL certificate not found"
    fi
}

# Check log file sizes
check_log_sizes() {
    log "Checking log file sizes..."
    
    local log_dirs=("/var/log/nginx" "/var/log/alonica" "/opt/logs")
    
    for log_dir in "${log_dirs[@]}"; do
        if [[ -d "$log_dir" ]]; then
            local large_logs=$(find "$log_dir" -name "*.log" -size +100M 2>/dev/null || true)
            if [[ -n "$large_logs" ]]; then
                warning "Large log files found in $log_dir:"
                echo "$large_logs" | while read -r logfile; do
                    local size=$(du -h "$logfile" | cut -f1)
                    warning "  $logfile ($size)"
                done
            fi
        fi
    done
}

# Check backup status
check_backup_status() {
    log "Checking backup status..."
    
    local latest_backup=$(ls -t /opt/backups/alonica_backup_*.sql.gz 2>/dev/null | head -1 || echo "")
    
    if [[ -n "$latest_backup" ]]; then
        local backup_age=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 86400 ))
        if [[ $backup_age -gt 1 ]]; then
            warning "Latest backup is $backup_age days old"
        else
            success "Recent backup found ($(basename $latest_backup))"
        fi
    else
        warning "No backups found"
    fi
}

# Send alerts
send_alert() {
    local message="$1"
    local severity="$2"
    
    # Format message based on severity
    case $severity in
        "critical")
            local emoji="🚨"
            local color="danger"
            ;;
        "warning")
            local emoji="⚠️"
            local color="warning"
            ;;
        *)
            local emoji="ℹ️"
            local color="good"
            ;;
    esac
    
    local full_message="$emoji Alonica Health Check - $message"
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$full_message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Discord notification
    if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"$full_message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Generate health report
generate_report() {
    local failed_checks=("$@")
    local report_file="/tmp/health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Alonica VPS Health Report"
        echo "========================="
        echo "Generated: $(date)"
        echo ""
        
        if [[ ${#failed_checks[@]} -eq 0 ]]; then
            echo "✅ All health checks passed"
        else
            echo "❌ Failed checks:"
            for check in "${failed_checks[@]}"; do
                echo "  - $check"
            done
        fi
        
        echo ""
        echo "System Information:"
        echo "- Uptime: $(uptime -p)"
        echo "- Load average: $(uptime | awk -F'load average:' '{print $2}')"
        echo "- Free memory: $(free -h | grep Mem | awk '{print $7}')"
        echo "- Free disk: $(df -h / | tail -1 | awk '{print $4}')"
        
    } > "$report_file"
    
    echo "$report_file"
}

# Main health check function
main() {
    log "Starting health check..."
    
    # Load environment variables
    if [[ -f .env.production ]]; then
        set -a
        source .env.production
        set +a
    fi
    
    local failed_checks=()
    
    # Run health checks
    check_app_health || failed_checks+=("Application")
    check_database || failed_checks+=("Database")
    check_containers || failed_checks+=("Docker Containers")
    check_system_resources
    check_ssl_certificate
    check_log_sizes
    check_backup_status
    
    # Generate report
    local report_file
    report_file=$(generate_report "${failed_checks[@]}")
    
    # Send alerts if needed
    if [[ ${#failed_checks[@]} -gt 0 ]]; then
        send_alert "Health check failures detected: ${failed_checks[*]}" "critical"
        error "Health check completed with failures. Report: $report_file"
        exit 1
    else
        success "All health checks passed. Report: $report_file"
    fi
}

# Usage
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Usage: $0 [--quiet]"
    echo ""
    echo "Options:"
    echo "  --quiet    Run in quiet mode (minimal output)"
    echo "  --help     Show this help message"
    exit 0
fi

# Run main function
if [[ "$1" == "--quiet" ]]; then
    main > /dev/null 2>&1
else
    main
fi