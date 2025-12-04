# AI智能合同分析管理系统

基于Vue3 + Node.js + Supabase的企业级合同全生命周期智能化管理平台。

## 🎯 项目愿景
打造以AI为核心驱动力的企业级合同管理平台，实现合同全生命周期智能化管理，成为企业的"合同智慧大脑"。

## 🛠️ 技术栈

### 前端
- Vue 3 (组合式API + Pinia)
- Element Plus UI组件库
- Vite 构建工具
- Axios HTTP客户端
- Vue Router 路由管理

### 后端
- Node.js + Express/NestJS
- Supabase (PostgreSQL数据库 + 身份认证 + 存储)
- JWT 身份验证
- CORS 跨域支持

### AI能力
- 集成开源NLP模型(LayoutLM、BERT)
- OCR引擎(Tesseract/阿里云OCR)
- 电子签名SDK集成

## 📁 项目结构

```
ai-contract-management/
├── frontend/                 # 前端Vue3项目
├── backend/                  # 后端Node.js项目
├── docs/                     # 项目文档
├── scripts/                  # 部署脚本
├── .env.example              # 环境变量示例
├── package.json              # 根项目配置
└── README.md                 # 项目说明
```

## 🚀 快速开始

### 一键安装和启动

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 配置环境变量（复制并修改.env文件）
cp .env.example .env
# 编辑 .env 文件，填入您的Supabase配置

# 3. 设置数据库
npm run setup:database

# 4. 启动开发环境
npm run dev
```

### 分步安装

#### 1. 安装依赖
```bash
# 安装前端依赖
cd frontend && npm install

# 安装后端依赖  
cd ../backend && npm install
```

#### 2. 配置环境变量
复制 `.env.example` 为 `.env` 并填入以下配置：
```
VITE_SUPABASE_URL=您的Supabase项目URL
VITE_SUPABASE_ANON_KEY=您的Supabase匿名密钥
SUPABASE_URL=您的Supabase项目URL
SUPABASE_ANON_KEY=您的Supabase匿名密钥
SUPABASE_SERVICE_KEY=您的Supabase服务密钥
PORT=3001
NODE_ENV=development
```

#### 3. 数据库设置
```bash
# 运行数据库初始化脚本
./scripts/setup-database.sh
```

#### 4. 启动服务
```bash
# 开发环境（同时启动前后端）
npm run dev

# 或分别启动
npm run dev:frontend  # 前端开发服务器 (http://localhost:5173)
npm run dev:backend   # 后端API服务器 (http://localhost:3001)
```

## 📊 核心功能模块

1. **合同智能解析与录入** - 多格式上传、OCR识别、AI信息提取
2. **智能分析与审阅** - 合规审查、风险识别、文本比对
3. **全生命周期管理** - 流程引擎、电子签署、履约跟踪
4. **知识库与模板管理** - 标准模板、智能起草、历史检索
5. **数据可视化报表** - 管理驾驶舱、自定义报表

## 👥 用户角色

- **法务人员**: AI自动初审、风险高亮、知识库检索
- **业务人员**: 智能起草、流程跟踪、移动端操作
- **管理层**: 数据可视化、风险预警、KPI统计
- **财务人员**: 财务信息提取、履约对账
- **系统管理员**: 权限配置、AI模型管理、运维监控

## 🔧 开发指南

### 前端开发
```bash
cd frontend
npm run dev
```

### 后端开发
```bash
cd backend
npm run dev
```

### 数据库操作
通过Supabase Dashboard管理数据库，或使用Supabase CLI进行迁移。

## 📄 许可证

MIT License