module.exports = {
  apps: [{
    name: 'alonica-production',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    // Load environment variables from .env file
    // IMPORTANT: Create .env file with actual values before starting!
    env_file: '.env',
    // Log files
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Resource limits
    max_memory_restart: '500M',
    // Auto restart settings
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 1000,
    // Health check
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
};
