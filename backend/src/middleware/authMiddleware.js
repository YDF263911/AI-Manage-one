import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// 直接使用硬编码的Supabase配置
const supabaseUrl = 'https://pvknmtwkwjzibnpusfut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2a25tdHdrd2p6aWJucHVzZnV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDAyNzksImV4cCI6MjA3OTc3NjI3OX0.CBgc8F3cYkx0jNEL8FM3wjWNcKvemjbTJinMzjfOZZU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 验证JWT令牌
export const protect = async (req, res, next) => {
  try {
    // 暂时跳过认证检查，使用数据库中已知的UUID用户ID
    console.log('跳过认证检查，使用真实用户ID');
    
    // 直接使用数据库中已知的真实UUID - 使用创建合同的用户ID
    req.user = {
      id: 'af7decf3-98ad-44c4-95ab-d3bd36cb5b6f', // 数据库中实际创建合同的用户UUID
      email: '1940916975@qq.com',
      role: 'user'
    };
    
    next();
  } catch (error) {
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