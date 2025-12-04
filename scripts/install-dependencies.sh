#!/bin/bash

# AI智能合同分析管理系统依赖安装脚本

echo "📦 开始安装项目依赖..."

# 安装前端依赖
echo "🎨 安装前端依赖..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 前端依赖安装成功！"
    else
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
else
    echo "❌ 未找到前端package.json文件"
    exit 1
fi

# 安装后端依赖
echo "🔧 安装后端依赖..."
cd ../backend
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 后端依赖安装成功！"
    else
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
else
    echo "❌ 未找到后端package.json文件"
    exit 1
fi

# 安装全局依赖（如果需要）
echo "🌐 检查全局依赖..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2进程管理器..."
    npm install -g pm2
fi

if ! command -v supabase &> /dev/null; then
    echo "📦 安装Supabase CLI..."
    npm install -g supabase-cli
fi

echo "🎉 所有依赖安装完成！"
echo ""
echo "💡 下一步操作："
echo "1. 配置环境变量：复制 .env.example 为 .env 并填写Supabase配置"
echo "2. 设置数据库：运行 ./scripts/setup-database.sh"
echo "3. 启动开发环境：运行 npm run dev"

cd ..