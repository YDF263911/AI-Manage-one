// PM2生态系统配置文件
// AI智能合同分析管理系统生产环境配置

module.exports = {
  apps: [{
    name: 'ai-contract-backend',
    script: './src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // 应用配置
    node_args: '--max-old-space-size=1024',
    max_memory_restart: '1G',
    
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // 监控配置
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // 重启策略
    max_restarts: 10,
    min_uptime: '10s',
    
    // 健康检查
    health_check_url: 'http://localhost:5000/api/health',
    health_check_interval: 30000,
    
    // 环境变量
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  // 部署配置
  deploy: {
    production: {
      user: 'node',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/ai-contract-management.git',
      path: '/var/www/ai-contract-management',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get update && apt-get install -y git'
    }
  }
};