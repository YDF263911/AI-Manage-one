import express from 'express';
import { supabase } from '../utils/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 代理下载存储文件（避免CORS问题）
router.get('/download/:filePath', protect, async (req, res) => {
  try {
    const { filePath } = req.params;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: '文件路径不能为空'
      });
    }

    console.log('下载文件路径:', filePath);

    // 验证用户权限 - 确保用户只能下载自己合同的文件
    const decodedFilePath = decodeURIComponent(filePath);
    
    // 从文件路径中提取合同ID
    const contractIdMatch = decodedFilePath.match(/contracts\/([^\/]+)\//);
    if (!contractIdMatch) {
      return res.status(403).json({
        success: false,
        message: '无效的文件路径'
      });
    }

    const contractId = contractIdMatch[1];
    
    // 验证用户是否有权访问该合同
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .eq('user_id', req.user.id);

    if (contractError || !contracts || contracts.length === 0) {
      console.log('用户无权访问该合同:', {
        contractId,
        userId: req.user.id,
        error: contractError
      });
      
      return res.status(403).json({
        success: false,
        message: '无权访问该文件'
      });
    }

    // 从Supabase存储下载文件
    const { data, error } = await supabase.storage
      .from('contracts')
      .download(decodedFilePath);

    if (error) {
      console.error('Supabase存储下载失败:', error);
      
      // 根据错误类型返回不同的状态码
      if (error.status === 404) {
        return res.status(404).json({
          success: false,
          message: '文件不存在'
        });
      }
      
      if (error.status === 403) {
        return res.status(403).json({
          success: false,
          message: '无权访问该文件'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '文件下载失败'
      });
    }

    // 获取文件信息以设置正确的Content-Type
    const fileExtension = decodedFilePath.toLowerCase().split('.').pop();
    let contentType = 'application/octet-stream';
    
    switch (fileExtension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'doc':
        contentType = 'application/msword';
        break;
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${decodedFilePath.split('/').pop()}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域访问

    // 将文件流发送给客户端
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.send(buffer);

  } catch (error) {
    console.error('文件下载代理错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取文件公共URL（避免前端直接访问Supabase存储）
router.get('/public-url/:filePath', protect, async (req, res) => {
  try {
    const { filePath } = req.params;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: '文件路径不能为空'
      });
    }

    const decodedFilePath = decodeURIComponent(filePath);
    
    // 验证用户权限（同上）
    const contractIdMatch = decodedFilePath.match(/contracts\/([^\/]+)\//);
    if (!contractIdMatch) {
      return res.status(403).json({
        success: false,
        message: '无效的文件路径'
      });
    }

    const contractId = contractIdMatch[1];
    
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .eq('user_id', req.user.id);

    if (contractError || !contracts || contracts.length === 0) {
      return res.status(403).json({
        success: false,
        message: '无权访问该文件'
      });
    }

    // 生成公共URL
    const { data } = supabase.storage
      .from('contracts')
      .getPublicUrl(decodedFilePath);

    res.json({
      success: true,
      data: {
        publicUrl: data.publicUrl
      }
    });

  } catch (error) {
    console.error('获取公共URL错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;