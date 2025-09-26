#!/bin/bash

# Deployment verification script
# Checks if all components are working correctly

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo -e "${BLUE}🔍 Alonica Deployment Health Check${NC}"
echo "=================================="

# Check 1: Node.js and PM2
log "Checking Node.js and PM2..."
if command -v node &> /dev/null && command -v pm2 &> /dev/null; then
    success "Node.js $(node --version) and PM2 installed"
else
    fail "Node.js or PM2 not found"
fi

# Check 2: PM2 process status
log "Checking PM2 processes..."
if pm2 list | grep -q "alonica-production"; then
    if pm2 list | grep "alonica-production" | grep -q "online"; then
        success "Alonica application is running"
    else
        fail "Alonica application is not online"
        pm2 logs alonica-production --lines 10
    fi
else
    fail "Alonica application not found in PM2"
fi

# Check 3: Database connection
log "Checking database connection..."
if command -v psql &> /dev/null; then
    if [ ! -z "$DATABASE_URL" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
            success "Database connection successful"
        else
            fail "Database connection failed"
        fi
    else
        warning "DATABASE_URL not set - skipping database check"
    fi
else
    warning "psql not found - skipping database check"
fi

# Check 4: Application health endpoint
log "Checking application health..."
if curl -f http://localhost:3000/api/health &> /dev/null; then
    success "Application health endpoint responding"
else
    fail "Application health endpoint not responding"
fi

# Check 5: Nginx status
log "Checking Nginx..."
if command -v nginx &> /dev/null; then
    if sudo systemctl is-active nginx &> /dev/null; then
        success "Nginx is running"
        
        # Test nginx config
        if sudo nginx -t &> /dev/null; then
            success "Nginx configuration is valid"
        else
            fail "Nginx configuration has errors"
        fi
    else
        fail "Nginx is not running"
    fi
else
    warning "Nginx not found"
fi

# Check 6: Firewall status
log "Checking firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        success "UFW firewall is active"
        
        # Check required ports
        if sudo ufw status | grep -q "80\|443"; then
            success "Required ports (80, 443) are open"
        else
            warning "Web ports may not be open"
        fi
    else
        warning "UFW firewall is not active"
    fi
else
    warning "UFW not found"
fi

# Check 7: SSL certificate (if domain is set)
if [ ! -z "$1" ] && [ "$1" != "localhost" ]; then
    log "Checking SSL certificate for $1..."
    if [ -f "/etc/letsencrypt/live/$1/fullchain.pem" ]; then
        # Check if certificate is valid and not expired
        if openssl x509 -in /etc/letsencrypt/live/$1/fullchain.pem -noout -checkend 604800 &> /dev/null; then
            success "SSL certificate is valid and not expiring soon"
        else
            warning "SSL certificate may be expiring soon"
        fi
    else
        warning "SSL certificate not found for $1"
    fi
fi

# Check 8: Disk space
log "Checking disk space..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    success "Disk usage is healthy ($DISK_USAGE%)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    warning "Disk usage is getting high ($DISK_USAGE%)"
else
    fail "Disk usage is critical ($DISK_USAGE%)"
fi

# Check 9: Memory usage
log "Checking memory usage..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -lt 80 ]; then
    success "Memory usage is healthy (${MEMORY_USAGE}%)"
elif [ "$MEMORY_USAGE" -lt 90 ]; then
    warning "Memory usage is getting high (${MEMORY_USAGE}%)"
else
    fail "Memory usage is critical (${MEMORY_USAGE}%)"
fi

# Check 10: Recent logs for errors
log "Checking recent logs for errors..."
if pm2 logs alonica-production --lines 50 | grep -i "error\|fail\|exception" | head -5; then
    warning "Found recent errors in logs (check above)"
else
    success "No recent errors found in logs"
fi

echo ""
echo -e "${BLUE}🏁 Health Check Complete${NC}"
echo "========================"
echo ""
echo "Next steps if issues found:"
echo "- PM2 issues: pm2 restart alonica-production"
echo "- Database issues: Check DATABASE_URL and PostgreSQL status"
echo "- Nginx issues: sudo systemctl restart nginx"
echo "- Application issues: Check pm2 logs alonica-production"
echo ""