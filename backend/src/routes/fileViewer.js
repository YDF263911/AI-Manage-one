import express from 'express';
import FileExtractor from '../utils/fileExtractor.js';
import { DatabaseService, supabase } from '../utils/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * 获取合同文件内容
 */
router.get('/contract/:contractId/content', protect, async (req, res) => {
  try {
    const { contractId } = req.params;

    // 获取合同信息
    const contracts = await DatabaseService.select('contracts', {
      id: contractId,
      user_id: req.user.id,
    });

    if (!contracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    const contract = contracts[0];

    if (!contract.file_path) {
      return res.status(400).json({
        success: false,
        message: '合同没有关联的文件',
      });
    }

    // 提取文件内容
    const content = await FileExtractor.extractText(
      contract.file_path,
      contract.file_type
    );

    res.json({
      success: true,
      data: {
        contractId,
        filename: contract.filename,
        fileType: contract.file_type,
        fileSize: contract.file_size,
        content,
        contentLength: content.length,
        extractedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('获取合同文件内容失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件内容失败',
      error: error.message,
    });
  }
});

/**
 * 获取合同文件预览信息
 */
router.get('/contract/:contractId/preview', protect, async (req, res) => {
  try {
    const { contractId } = req.params;

    // 获取合同信息
    const contracts = await DatabaseService.select('contracts', {
      id: contractId,
      user_id: req.user.id,
    });

    if (!contracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    const contract = contracts[0];

    // 获取文件基本信息
    const fileInfo = await FileExtractor.getFileInfo(
      contract.file_path,
      contract.filename,
      contract.file_size
    );

    // 获取文件内容的前500字符作为预览
    let previewContent = '';
    let hasMoreContent = false;
    
    if (contract.file_path) {
      try {
        const fullContent = await FileExtractor.extractText(
          contract.file_path,
          contract.file_type
        );
        
        previewContent = fullContent.substring(0, 500);
        hasMoreContent = fullContent.length > 500;
        
        // 如果内容有换行，确保预览内容完整
        if (hasMoreContent && previewContent.lastIndexOf('\n') > 450) {
          previewContent = previewContent.substring(0, previewContent.lastIndexOf('\n'));
        }
      } catch (error) {
        console.warn('文件内容提取失败，使用基本信息:', error.message);
        previewContent = `文件格式: ${contract.file_type}\n文件大小: ${contract.file_size}字节\n文件名: ${contract.filename}`;
      }
    }

    res.json({
      success: true,
      data: {
        contractId,
        ...fileInfo,
        previewContent,
        hasMoreContent,
        canPreview: FileExtractor.isSupportedFormat(contract.filename),
        supportedFormats: FileExtractor.getSupportedFormats(),
      },
    });
  } catch (error) {
    console.error('获取合同文件预览失败:', error);
    res.status(500).json({
      success: false,
      message: '获取文件预览失败',
      error: error.message,
    });
  }
});

/**
 * 获取合同文件下载链接
 */
router.get('/contract/:contractId/download', protect, async (req, res) => {
  try {
    const { contractId } = req.params;

    // 获取合同信息
    const contracts = await DatabaseService.select('contracts', {
      id: contractId,
      user_id: req.user.id,
    });

    if (!contracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    const contract = contracts[0];

    if (!contract.file_path) {
      return res.status(400).json({
        success: false,
        message: '合同没有关联的文件',
      });
    }

    let downloadUrl;
    
    if (contract.file_path.startsWith('contracts/')) {
      // Supabase存储文件
      const { data } = supabase.storage
        .from('contracts')
        .getPublicUrl(contract.file_path);
      downloadUrl = data.publicUrl;
    } else {
      // 本地文件 - 提供下载接口
      downloadUrl = `/api/file/download/${contractId}`;
    }

    res.json({
      success: true,
      data: {
        contractId,
        filename: contract.filename,
        fileType: contract.file_type,
        fileSize: contract.file_size,
        downloadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时有效期
      },
    });
  } catch (error) {
    console.error('获取下载链接失败:', error);
    res.status(500).json({
      success: false,
      message: '获取下载链接失败',
      error: error.message,
    });
  }
});

/**
 * 下载合同文件
 */
router.get('/download/:contractId', protect, async (req, res) => {
  try {
    const { contractId } = req.params;

    // 获取合同信息
    const contracts = await DatabaseService.select('contracts', {
      id: contractId,
      user_id: req.user.id,
    });

    if (!contracts.length) {
      return res.status(404).json({
        success: false,
        message: '合同不存在',
      });
    }

    const contract = contracts[0];

    if (!contract.file_path || contract.file_path.startsWith('contracts/')) {
      return res.status(400).json({
        success: false,
        message: '文件存储在Supabase，请使用下载链接',
      });
    }

    // 设置响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${contract.filename}"`);
    res.setHeader('Content-Length', contract.file_size);

    // 发送文件
    res.download(contract.file_path, contract.filename);
  } catch (error) {
    console.error('下载文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载文件失败',
      error: error.message,
    });
  }
});

/**
 * 批量获取合同文件信息
 */
router.post('/batch-preview', protect, async (req, res) => {
  try {
    const { contractIds } = req.body;

    if (!contractIds || !Array.isArray(contractIds)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的合同ID列表',
      });
    }

    const fileInfos = [];

    for (const contractId of contractIds) {
      try {
        const contracts = await DatabaseService.select('contracts', {
          id: contractId,
          user_id: req.user.id,
        });

        if (contracts.length) {
          const contract = contracts[0];
          const fileInfo = await FileExtractor.getFileInfo(
            contract.file_path,
            contract.filename,
            contract.file_size
          );

          fileInfos.push({
            contractId,
            ...fileInfo,
            canPreview: FileExtractor.isSupportedFormat(contract.filename),
          });
        }
      } catch (error) {
        console.warn(`获取合同 ${contractId} 文件信息失败:`, error.message);
        // 继续处理其他合同
      }
    }

    res.json({
      success: true,
      data: fileInfos,
      total: fileInfos.length,
    });
  } catch (error) {
    console.error('批量获取文件信息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取文件信息失败',
      error: error.message,
    });
  }
});

export default router;