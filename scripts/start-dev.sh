#!/bin/bash

# AI智能合同分析管理系统开发环境启动脚本
# 作者: AI-Manage Team
# 创建时间: 2024-12-01

echo "🚀 启动AI智能合同分析管理系统开发环境..."

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

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，使用.env.example创建..."
    cp .env.example .env
    echo "✅ 已创建.env文件，请配置Supabase连接信息"
fi

# 安装根目录依赖
echo "📦 安装根目录依赖..."
npm install

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend

# 安装后端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

# 启动后端服务器（后台运行）
echo "🚀 启动后端服务器..."
npm run dev &
BACKEND_PID=$!

# 返回项目根目录
cd ..

# 启动前端服务
echo "🎨 启动前端服务..."
cd frontend

# 安装前端依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 启动前端开发服务器
echo "🚀 启动前端开发服务器..."
npm run dev &
FRONTEND_PID=$!

# 返回项目根目录
cd ..

echo ""
echo "🎉 AI智能合同分析管理系统启动完成！"
echo ""
echo "📊 后端服务: http://localhost:3000"
echo "📊 健康检查: http://localhost:3000/api/health"
echo "🎨 前端服务: http://localhost:5173"
echo ""
echo "💡 使用说明:"
echo "   1. 前端访问: http://localhost:5173"
echo "   2. 默认管理员账号: admin / admin123"
echo "   3. 确保Supabase连接配置正确"
echo "   4. 查看日志请使用: npm run logs"
echo ""
echo "⏹️  停止服务请按 Ctrl+C"

# 等待用户中断
wait