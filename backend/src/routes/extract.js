import express from 'express';
import { DatabaseService } from '../utils/supabase.js';
import FileExtractor from '../utils/fileExtractor.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/extract/text/:contractId
 * @desc 提取合同文件的文本内容
 * @access Private
 */
router.post('/text/:contractId', protect, async (req, res) => {
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

    // 检查文件路径
    if (!contract.file_path) {
      return res.status(400).json({
        success: false,
        message: '合同文件路径不存在',
      });
    }

    // 检查文件格式是否支持
    if (!FileExtractor.isSupportedFormat(contract.filename)) {
      return res.status(400).json({
        success: false,
        message: `不支持的文件格式: ${contract.file_type}`,
      });
    }

    // 提取文件内容
    let extractedText;
    try {
      extractedText = await FileExtractor.extractText(
        contract.file_path,
        contract.file_type
      );
    } catch (extractError) {
      console.error('文件内容提取失败:', extractError);
      
      // 如果提取失败，尝试备用方法
      try {
        // 获取文件基本信息作为备用
        const fileInfo = await FileExtractor.getFileInfo(
          contract.file_path,
          contract.filename,
          contract.file_size
        );
        
        extractedText = `
文件格式：${fileInfo.fileType}
文件大小：${contract.file_size} 字节
文件名：${contract.filename}

由于文件格式特殊或内容加密，无法直接提取文本内容。
建议使用可编辑的文档格式（如PDF、Word、TXT）重新上传。

支持的文件格式：
- PDF文档 (.pdf)
- Word文档 (.doc, .docx)
- 文本文件 (.txt)
        `.trim();
      } catch (fallbackError) {
        throw new Error(`文件内容提取失败: ${extractError.message}`);
      }
    }

    // 更新合同状态
    await DatabaseService.update('contracts', contractId, {
      extraction_status: 'completed',
      extraction_completed_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: '文件内容提取完成',
      data: {
        contractId,
        extractedText,
        fileInfo: {
          filename: contract.filename,
          fileType: contract.file_type,
          fileSize: contract.file_size,
          extractionStatus: 'completed',
        },
      },
    });

  } catch (error) {
    console.error('文件内容提取失败:', error);
    
    // 更新合同状态为提取失败
    try {
      await DatabaseService.update('contracts', req.params.contractId, {
        extraction_status: 'failed',
        extraction_error: error.message,
      });
    } catch (updateError) {
      console.error('更新合同状态失败:', updateError);
    }
    
    res.status(500).json({
      success: false,
      message: `文件内容提取失败: ${error.message}`,
    });
  }
});

/**
 * @route GET /api/extract/supported-formats
 * @desc 获取支持的文件格式列表
 * @access Private
 */
router.get('/supported-formats', protect, async (req, res) => {
  try {
    const supportedFormats = FileExtractor.getSupportedFormats();
    
    res.json({
      success: true,
      data: supportedFormats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取支持格式列表失败',
    });
  }
});

/**
 * @route POST /api/extract/upload
 * @desc 上传文件并直接提取内容
 * @access Private
 */
router.post('/upload', protect, async (req, res) => {
  try {
    const { filename, fileContent, fileType } = req.body;

    if (!filename || !fileContent) {
      return res.status(400).json({
        success: false,
        message: '文件名和文件内容不能为空',
      });
    }

    // 检查文件格式是否支持
    if (!FileExtractor.isSupportedFormat(filename)) {
      return res.status(400).json({
        success: false,
        message: `不支持的文件格式: ${fileType || path.extname(filename)}`,
      });
    }

    // 将Base64内容转换为Buffer
    const fileBuffer = Buffer.from(fileContent, 'base64');
    
    // 根据文件类型提取内容
    let extractedText;
    const ext = fileType || path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.pdf':
        extractedText = await FileExtractor.extractFromPDF(fileBuffer);
        break;
      case '.docx':
        extractedText = await FileExtractor.extractFromDOCX(fileBuffer);
        break;
      case '.doc':
        extractedText = await FileExtractor.extractFromDOC(fileBuffer);
        break;
      case '.txt':
        extractedText = await FileExtractor.extractFromTXT(fileBuffer);
        break;
      default:
        throw new Error(`不支持的文件格式: ${ext}`);
    }

    res.json({
      success: true,
      message: '文件内容提取完成',
      data: {
        extractedText,
        fileInfo: {
          filename,
          fileType: ext,
          fileSize: fileBuffer.length,
        },
      },
    });

  } catch (error) {
    console.error('文件内容提取失败:', error);
    res.status(500).json({
      success: false,
      message: `文件内容提取失败: ${error.message}`,
    });
  }
});

export default router;