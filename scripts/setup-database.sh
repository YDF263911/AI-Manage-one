#!/bin/bash

# AI智能合同分析管理系统数据库设置脚本
# 用于初始化数据库和运行迁移

echo "🚀 开始设置AI智能合同分析管理系统数据库..."

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ 错误：请先设置Supabase环境变量"
    echo "请检查 .env 文件中的 SUPABASE_URL 和 SUPABASE_ANON_KEY"
    exit 1
fi

# 检查是否安装了supabase-cli
if ! command -v supabase &> /dev/null; then
    echo "📦 安装Supabase CLI..."
    npm install -g supabase-cli
fi

# 创建supabase配置文件
if [ ! -f "supabase/config.toml" ]; then
    echo "⚙️ 创建Supabase配置..."
    mkdir -p supabase
    cat > supabase/config.toml << EOF
[project]
# 项目配置

[auth]
# 认证配置

[database]
# 数据库配置
EOF
fi

# 运行数据库初始化脚本
echo "🗄️ 初始化数据库表结构..."
cd backend/src/database

# 使用psql连接到Supabase并执行初始化脚本
if command -v psql &> /dev/null; then
    psql "$SUPABASE_URL" -f init.sql
    if [ $? -eq 0 ]; then
        echo "✅ 数据库初始化成功！"
    else
        echo "❌ 数据库初始化失败，请检查连接设置"
        exit 1
    fi
else
    echo "⚠️ 未找到psql命令，请手动执行数据库初始化："
    echo "psql \"\$SUPABASE_URL\" -f backend/src/database/init.sql"
fi

# 运行迁移脚本
echo "🔄 运行数据库迁移..."
for migration in migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "执行迁移: $(basename $migration)"
        if command -v psql &> /dev/null; then
            psql "$SUPABASE_URL" -f "$migration"
        fi
    fi
done

echo "🎉 数据库设置完成！"
echo ""
echo "📊 数据库结构概览："
echo "   • users - 用户表"
echo "   • contracts - 合同表"
echo "   • contract_clauses - 合同条款表"
echo "   • templates - 模板表"
echo "   • approval_flows - 审批流程表"
echo "   • analysis_records - 分析记录表"
echo "   • system_logs - 系统日志表"
echo ""
echo "🔑 默认管理员账户："
echo "   邮箱: admin@aicontract.com"
echo "   密码: admin123 (首次登录后请修改)"
echo ""
echo "💡 下一步：启动前端和后端服务"