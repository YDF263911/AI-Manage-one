import express from 'express';
import { supabase } from '../utils/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, role = 'user' } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          role,
        },
      },
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: '注册成功，请检查邮箱验证',
      user: data.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
      });
    }

    res.json({
      success: true,
      message: '登录成功',
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

// 获取当前用户信息
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
});

// 用户登出
router.post('/logout', protect, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

// 刷新令牌
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: '令牌刷新失败',
      });
    }

    res.json({
      success: true,
      session: data.session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
});

export default router;