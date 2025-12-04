# AI智能合同分析管理系统 - 后端

## 🚀 项目概述

基于Node.js + Express + Supabase的后端服务，为AI智能合同分析管理系统提供API支持。

## 📦 技术栈

- **运行时**: Node.js (>=18.0.0)
- **框架**: Express.js
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth
- **文件上传**: Multer
- **开发工具**: Nodemon, ESLint, Prettier

## 🛠️ 安装和运行

### 环境要求
- Node.js 18.0.0 或更高版本
- npm 或 yarn

### 安装依赖
```bash
cd backend
npm install
```

### 环境配置
1. 复制环境变量文件
```bash
cp .env.example .env
```

2. 配置环境变量
编辑 `.env` 文件，设置以下变量：
- `VITE_SUPABASE_URL`: Supabase项目URL
- `VITE_SUPABASE_ANON_KEY`: Supabase匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase服务角色密钥（可选）
- `JWT_SECRET`: JWT密钥

### 运行开发服务器
```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

### 生产环境部署
```bash
npm start
```

## 📚 API文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/logout` - 用户登出

### 合同管理
- `POST /api/contracts/upload` - 上传合同文件
- `GET /api/contracts` - 获取合同列表
- `GET /api/contracts/:id` - 获取合同详情
- `PATCH /api/contracts/:id/status` - 更新合同状态
- `DELETE /api/contracts/:id` - 删除合同

### 智能分析
- `POST /api/analysis/analyze/:contractId` - 分析合同内容
- `GET /api/analysis/:contractId` - 获取分析结果
- `GET /api/analysis/:contractId/risk-report` - 获取风险报告
- `POST /api/analysis/batch-analyze` - 批量分析合同

### 模板管理
- `GET /api/templates` - 获取模板列表
- `GET /api/templates/:id` - 获取模板详情
- `POST /api/templates` - 创建新模板
- `PUT /api/templates/:id` - 更新模板
- `DELETE /api/templates/:id` - 删除模板
- `POST /api/templates/:id/generate-draft` - 生成合同草稿

### 仪表板
- `GET /api/dashboard/stats` - 获取统计数据
- `GET /api/dashboard/trends` - 获取分析趋势
- `GET /api/dashboard/risk-alerts` - 获取风险预警
- `GET /api/dashboard/performance` - 获取性能指标
- `GET /api/dashboard/activity-log` - 获取活动日志

## 🗄️ 数据库架构

### 核心表结构
- `user_profiles` - 用户档案
- `contracts` - 合同信息
- `contract_analysis` - 合同分析结果
- `templates` - 合同模板
- `contract_drafts` - 合同草稿
- `approval_workflows` - 审批流程
- `risk_rules` - 风险规则
- `system_config` - 系统配置

### 安全特性
- 行级安全策略 (RLS)
- JWT认证
- 文件类型验证
- 文件大小限制

## 🔒 安全考虑

- 所有API端点都经过身份验证
- 文件上传有类型和大小限制
- 数据库启用行级安全策略
- 敏感信息使用环境变量

## 🧪 测试

```bash
npm test
```

## 📋 开发规范

### 代码风格
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循RESTful API设计原则

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具变动

## 🚀 部署

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 环境变量配置
确保生产环境配置正确的环境变量：
- `NODE_ENV=production`
- 数据库连接字符串
- JWT密钥
- 文件存储配置

## 📞 支持

如有问题，请查看文档或联系开发团队。