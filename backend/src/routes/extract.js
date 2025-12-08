import express from 'express';
import { DatabaseService, supabaseAdmin } from '../utils/supabase.js';
import FileExtractor from '../utils/fileExtractor.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/extract/text/:contractId
 * @desc 提取合同文件的文本内容（带缓存）
 * @access Private
 */
router.post('/text/:contractId', protect, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { force = false } = req.body; // 是否强制重新提取

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

    let extractedText;
    let fromCache = false;
    let cacheHit = false;

    try {
      // 1. 检查缓存（除非强制重新提取）
      if (!force) {
        const cachedResult = await DatabaseService.select('contract_text_cache', {
          contract_id: contractId
        });

        if (cachedResult.length > 0) {
          const cache = cachedResult[0];
          
          // 检查文件是否已修改（通过更新时间）
          const fileChanged = contract.updated_at && 
                          cache.contract_updated_at && 
                          new Date(contract.updated_at) > new Date(cache.contract_updated_at);

          if (!fileChanged) {
            extractedText = cache.cached_content;
            fromCache = true;
            cacheHit = true;
            
            console.log(`使用缓存文本内容，合同ID: ${contractId}`);
            
            // 更新缓存访问时间
            await DatabaseService.update('contract_text_cache', cache.id, {
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      // 2. 如果没有缓存或需要重新提取，进行实际提取
      if (!fromCache) {
        console.log(`重新提取文本内容，合同ID: ${contractId}`);
        
        // 开始提取
        await DatabaseService.update('contracts', contractId, {
          extraction_status: 'processing'
        });

        extractedText = await FileExtractor.extractText(
          contract.file_path,
          contract.file_type
        );

        // 计算文本统计信息
        const wordCount = extractedText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(Boolean).length;
        const characterCount = extractedText.length;
        
        // 评估提取质量
        let quality = 'unknown';
        if (characterCount > 1000) {
          const chineseChars = (extractedText.match(/[\u4e00-\u9fa5]/g) || []).length;
          const englishChars = (extractedText.match(/[a-zA-Z]/g) || []).length;
          const meaningfulRatio = (chineseChars + englishChars) / characterCount;
          
          if (meaningfulRatio > 0.8) quality = 'excellent';
          else if (meaningfulRatio > 0.6) quality = 'good';
          else if (meaningfulRatio > 0.4) quality = 'fair';
          else quality = 'poor';
        }

        // 3. 存储到缓存
        const cacheData = {
          contract_id: contractId,
          cached_content: extractedText,
          content_length: extractedText.length,
          word_count: wordCount,
          extraction_method: 'auto',
          contract_updated_at: contract.updated_at || new Date().toISOString(),
          quality_score: quality === 'excellent' ? 0.95 : 
                        quality === 'good' ? 0.80 : 
                        quality === 'fair' ? 0.60 : 0.40,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // 使用UPSERT（更新或插入）
        await DatabaseService.upsert('contract_text_cache', 'contract_id', cacheData);
        
        console.log(`文本提取完成并已缓存，质量: ${quality}`);
      }

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

        // 即使是备用结果也缓存
        const fallbackCacheData = {
          contract_id: contractId,
          cached_content: extractedText,
          content_length: extractedText.length,
          word_count: 0,
          extraction_method: 'fallback',
          contract_updated_at: contract.updated_at || new Date().toISOString(),
          quality_score: 0.20,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await DatabaseService.upsert('contract_text_cache', 'contract_id', fallbackCacheData);
        
      } catch (fallbackError) {
        throw new Error(`文件内容提取失败: ${extractError.message}`);
      }
    }

    // 更新合同状态
    await DatabaseService.update('contracts', contractId, {
      extraction_status: 'completed',
      extraction_completed_at: new Date().toISOString(),
    });

    const message = cacheHit ? '已加载缓存的文本内容' : '文件内容提取完成';

    res.json({
      success: true,
      message,
      data: {
        contractId,
        extractedText,
        fromCache,
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