#!/bin/bash

# AI智能合同分析管理系统生产环境启动脚本
# 作者: AI-Manage Team
# 创建时间: 2024-12-01

echo "🚀 启动AI智能合同分析管理系统生产环境..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 进入项目根目录
cd "$(dirname "$0")/.."

# 检查生产环境配置文件
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production文件不存在，使用.env.example创建..."
    cp .env.example .env.production
    echo "✅ 已创建.env.production文件，请配置生产环境信息"
    echo "❌ 请先配置生产环境变量再启动"
    exit 1
fi

# 设置生产环境变量
export NODE_ENV=production

# 安装依赖
echo "📦 安装项目依赖..."
npm ci --production

# 构建前端
echo "🔨 构建前端应用..."
cd frontend
npm ci
npm run build
cd ..

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
npm ci --production

# 使用PM2启动服务（如果已安装）
if command -v pm2 &> /dev/null; then
    echo "🚀 使用PM2启动服务..."
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
else
    echo "🚀 直接启动后端服务..."
    npm start
fi

echo ""
echo "🎉 AI智能合同分析管理系统生产环境启动完成！"
echo ""
echo "📊 服务地址: http://localhost:3000"
echo "🎨 前端应用: 已构建到frontend/dist目录"
echo ""
echo "💡 生产环境注意事项:"
echo "   1. 确保数据库连接配置正确"
echo "   2. 配置SSL证书和域名"
echo "   3. 设置防火墙和网络安全"
echo "   4. 定期备份数据"
echo "   5. 监控系统性能和日志"