// PM2 конфигурация для продакшена
module.exports = {
  apps: [{
    name: 'mood-tracker-bot',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Restart policy
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health check
    health_check_grace_period: 3000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    
    // Environment variables from .env file
    env_file: '.env'
  }]
};