# 🚀 部署指南

## 开发环境部署

### 1. 本地开发环境

#### 使用脚本快速启动
```bash
# 一键安装和启动
npm run setup

# 或分步执行
npm run install:all
npm run setup:database
npm run dev
```

#### 访问地址
- 前端应用: http://localhost:5173
- 后端API: http://localhost:3001
- 默认管理员账户: admin@aicontract.com / admin123

### 2. 开发环境配置

#### 环境变量配置
创建 `.env` 文件并配置：
```env
# Supabase配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# 应用配置
PORT=3001
NODE_ENV=development
```

#### Supabase项目设置
1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建新项目
2. 获取项目URL和API密钥
3. 在Authentication > URL Configuration中设置重定向URL

## 生产环境部署

### 1. 服务器要求
- Ubuntu 20.04+ / CentOS 8+
- Node.js 16+
- npm 8+
- PM2（推荐）
- Nginx（推荐）

### 2. 部署步骤

#### 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2

# 安装Nginx
sudo apt install nginx -y
```

#### 应用部署
```bash
# 克隆代码
git clone https://github.com/your-repo/ai-contract-manage.git
cd ai-contract-manage

# 安装依赖
npm run install:all

# 配置生产环境变量
cp .env.example .env.production
# 编辑 .env.production 文件

# 构建应用
npm run build

# 使用PM2启动
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### Nginx配置
创建 `/etc/nginx/sites-available/ai-contract-manage`：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/ai-contract-manage/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/ai-contract-manage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 云平台部署

#### Vercel部署（前端）
1. 连接GitHub仓库到Vercel
2. 设置构建配置：
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. 配置环境变量

#### Railway部署（后端）
1. 连接GitHub仓库到Railway
2. 设置启动命令：`npm start`
3. 配置环境变量

#### Supabase部署
1. 在Supabase Dashboard中启用必要的功能
2. 配置Row Level Security (RLS)
3. 设置存储策略

## 监控和维护

### 1. 日志管理
```bash
# 查看PM2日志
pm2 logs

# 查看应用日志
tail -f ~/.pm2/logs/ai-contract-manage-out.log
```

### 2. 性能监控
```bash
# 监控系统资源
pm2 monit

# 查看进程状态
pm2 status
```

### 3. 备份策略

#### 数据库备份
```bash
# 使用Supabase内置备份
# 或手动备份
pg_dump $SUPABASE_URL > backup_$(date +%Y%m%d).sql
```

#### 文件备份
```bash
# 备份上传的文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

## 故障排除

### 常见问题

#### 1. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3001

# 修改端口
# 在 .env 中设置 PORT=其他端口
```

#### 2. 数据库连接问题
- 检查Supabase项目状态
- 验证API密钥是否正确
- 检查网络连接

#### 3. 文件上传问题
- 检查uploads目录权限
- 验证存储配置
- 检查文件大小限制

### 技术支持
如遇问题，请提供：
- 错误日志
- 环境信息
- 复现步骤

联系技术支持：tech-support@aicontract.com