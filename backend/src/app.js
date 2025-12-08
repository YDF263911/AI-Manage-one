import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入路由
import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contract.js';
import analysisRoutes from './routes/analysis.js';
import templateRoutes from './routes/template.js';
import dashboardRoutes from './routes/dashboard.js';
import aiRoutes from './routes/ai.js';
import fileViewerRoutes from './routes/fileViewer.js';
import extractRoutes from './routes/extract.js';

// 导入中间件
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// 环境变量配置
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // 允许的源列表
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // 在开发环境中允许所有源，或检查是否在允许列表中
    if (process.env.NODE_ENV === 'development' || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(compression());

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 响应头中间件
app.use((req, res, next) => {
  // 设置content-type头的charset为utf-8
  res.header('Content-Type', 'application/json; charset=utf-8');
  // 设置cache-control头
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

// 静态文件服务 - 支持直接访问和API前缀访问
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/file', fileViewerRoutes);
app.use('/api/extract', extractRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 错误处理中间件
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 环境: ${process.env.NODE_ENV}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/api/health`);
});

export default app;