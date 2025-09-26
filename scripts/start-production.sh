#!/bin/bash

# Production server start script dengan health monitoring
set -e

echo "🚀 Starting Restaurant Management System - Production"
echo "==================================================="

# Configuration
SERVER_PORT=${PORT:-5000}
MAX_RETRIES=3
RETRY_DELAY=5
PID_FILE="/tmp/restaurant-app.pid"
LOG_FILE="/tmp/restaurant-app.log"

# Function to validate environment
validate_environment() {
    echo "🔍 Validating environment..."
    
    # Check required files
    if [ ! -f "dist/index.js" ]; then
        echo "❌ Production build not found. Run 'npm run build' first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js tidak ditemukan"
        exit 1
    fi
    
    # Check required environment variables (skip with --no-db-check)
    if [[ "$*" != *"--no-db-check"* ]]; then
        local missing_vars=()
        
        if [ -z "$DATABASE_URL" ]; then
            missing_vars+=("DATABASE_URL")
        fi
        
        if [ -z "$SESSION_SECRET" ]; then
            missing_vars+=("SESSION_SECRET")
        fi
        
        if [ ${#missing_vars[@]} -gt 0 ]; then
            echo "❌ Missing required environment variables:"
            for var in "${missing_vars[@]}"; do
                echo "   - $var"
            done
            echo ""
            echo "💡 Tips:"
            echo "   - Copy .env.example to .env and fill in values"
            echo "   - Or set variables: export DATABASE_URL=\"...\""
            echo "   - Use --no-db-check to skip database validation"
            exit 1
        fi
    else
        echo "⚠️  Skipping database validation (--no-db-check)"
    fi
    
    echo "✅ Environment validation passed"
}

# Function to test database connection
test_database() {
    echo "🗄️  Testing database connection..."
    
    # Try to connect to database (this would need actual DB test)
    # For now we'll just validate the URL format
    if [[ $DATABASE_URL =~ ^postgres(ql)?://.*/.+$ ]]; then
        echo "✅ Database URL format is valid"
    else
        echo "❌ Invalid DATABASE_URL format"
        echo "   Expected: postgresql://user:password@host:port/database"
        exit 1
    fi
}

# Function to check if server is running
is_server_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to stop existing server
stop_server() {
    if is_server_running; then
        local pid=$(cat "$PID_FILE")
        echo "🛑 Stopping existing server (PID: $pid)..."
        
        kill -TERM "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            ((count++))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Forcing server shutdown..."
            kill -KILL "$pid" 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
        echo "✅ Server stopped"
    fi
}

# Function to start server
start_server() {
    echo "🌟 Starting production server..."
    
    # Set production environment
    export NODE_ENV=production
    export PORT=$SERVER_PORT
    
    # Start server in background (use compiled dist for production)
    nohup node dist/index.js > "$LOG_FILE" 2>&1 &
    local server_pid=$!
    
    # Save PID
    echo $server_pid > "$PID_FILE"
    
    echo "   Server PID: $server_pid"
    echo "   Log file: $LOG_FILE"
    echo "   Port: $SERVER_PORT"
    
    # Wait a moment for startup
    sleep 3
    
    # Check if server is still running
    if ! kill -0 $server_pid 2>/dev/null; then
        echo "❌ Server failed to start. Check logs:"
        tail -20 "$LOG_FILE"
        exit 1
    fi
    
    echo "✅ Server started successfully"
}

# Function to test server health
test_server_health() {
    echo "🏥 Testing server health..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "http://localhost:$SERVER_PORT/api/health" > /dev/null 2>&1; then
            echo "✅ Health check passed"
            return 0
        fi
        
        ((retries++))
        if [ $retries -lt $MAX_RETRIES ]; then
            echo "   Attempt $retries failed, retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
        fi
    done
    
    echo "❌ Health check failed after $MAX_RETRIES attempts"
    echo "   Server logs:"
    tail -20 "$LOG_FILE"
    return 1
}

# Function to show server status
show_status() {
    echo ""
    echo "📊 Server Status"
    echo "==============="
    
    if is_server_running; then
        local pid=$(cat "$PID_FILE")
        echo "✅ Server is running (PID: $pid)"
        echo "   Port: $SERVER_PORT"
        echo "   Health: http://localhost:$SERVER_PORT/api/health"
        echo "   Log file: $LOG_FILE"
        
        # Show memory usage
        if command -v ps &> /dev/null; then
            local memory=$(ps -o rss= -p $pid 2>/dev/null | awk '{print int($1/1024)" MB"}')
            echo "   Memory: $memory"
        fi
    else
        echo "❌ Server is not running"
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "📋 Recent logs:"
        tail -20 "$LOG_FILE"
    else
        echo "ℹ️  No log file found"
    fi
}

# Function to restart server
restart_server() {
    echo "🔄 Restarting server..."
    stop_server
    sleep 2
    start_server
    test_server_health
}

# Function to show help
show_help() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start the production server (default)"
    echo "  stop      Stop the running server"
    echo "  restart   Restart the server"
    echo "  status    Show server status"
    echo "  logs      Show recent logs"
    echo "  help      Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  PORT              Server port (default: 5000)"
    echo "  DATABASE_URL      PostgreSQL connection string (required)"
    echo "  SESSION_SECRET    Session encryption key (required)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/start-production.sh start"
    echo "  ./scripts/start-production.sh status"
    echo "  PORT=3000 ./scripts/start-production.sh start"
}

# Main execution
main() {
    local command=${1:-start}
    
    case $command in
        start)
            validate_environment
            test_database
            stop_server  # Stop any existing instance
            start_server
            test_server_health
            show_status
            echo ""
            echo "🎉 Restaurant Management System is running!"
            echo "   Access the application at: http://localhost:$SERVER_PORT"
            echo ""
            echo "💡 Management commands:"
            echo "   Status: $0 status"
            echo "   Logs:   $0 logs"
            echo "   Stop:   $0 stop"
            ;;
        stop)
            stop_server
            ;;
        restart)
            validate_environment
            restart_server
            show_status
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "❌ Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Handle signals for graceful shutdown
trap 'echo "Received signal, stopping server..."; stop_server; exit 0' SIGTERM SIGINT

# Run main function
main "$@"