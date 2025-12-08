import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// 直接使用硬编码的Supabase配置
const supabaseUrl = 'https://pvknmtwkwjzibnpusfut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2a25tdHdrd2p6aWJucHVzZnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDAyNzksImV4cCI6MjA3OTc3NjI3OX0.CBgc8F3cYkx0jNEL8FM3wjWNcKvemjbTJinMzjfOZZU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 验证JWT令牌
export const protect = async (req, res, next) => {
  try {
    // 首先尝试获取用户ID
    const userId = req.headers['x-user-id'];
    
    if (userId) {
      // 使用传递的用户ID（临时解决方案）
      req.user = {
        id: userId,
        email: 'user@example.com',
        role: 'user'
      };
      console.log('使用传递的用户ID，用户ID:', req.user.id);
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
    }

    // 验证JWT令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 通过Supabase验证用户
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌',
      });
    }

    // 设置用户信息
    req.user = {
      id: user.id,
      email: user.email,
      role: 'user' // 可以从user metadata或其他地方获取角色
    };
    
    console.log('认证成功，用户ID:', req.user.id);
    next();
  } catch (error) {
    console.error('认证错误:', error);
    
    res.status(401).json({
      success: false,
      message: '认证失败',
    });
  }
};

// 权限检查中间件
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    // 这里需要根据Supabase的用户角色进行权限检查
    // 暂时使用简单的角色检查
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
      });
    }

    next();
  };
};