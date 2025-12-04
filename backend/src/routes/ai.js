import express from 'express';
import DeepSeekService from '../services/deepseekService.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 应用认证中间件
router.use(protect);

/**
 * @route POST /api/ai/analyze-risk
 * @desc 使用DeepSeek AI分析合同风险
 * @access Private
 */
router.post('/analyze-risk', async (req, res) => {
  try {
    const { contractText, contractId } = req.body;

    if (!contractText) {
      return res.status(400).json({
        success: false,
        message: '合同文本不能为空'
      });
    }

    // 调用DeepSeek服务进行风险分析
    const result = await DeepSeekService.analyzeContractRisk(contractText);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'AI分析失败',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.analysis,
      usage: result.usage,
      contractId: contractId
    });

  } catch (error) {
    console.error('合同风险分析错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * @route POST /api/ai/extract-clauses
 * @desc 使用DeepSeek AI提取合同条款
 * @access Private
 */
router.post('/extract-clauses', async (req, res) => {
  try {
    const { contractText, contractId } = req.body;

    if (!contractText) {
      return res.status(400).json({
        success: false,
        message: '合同文本不能为空'
      });
    }

    // 调用DeepSeek服务进行条款提取
    const result = await DeepSeekService.extractContractClauses(contractText);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '条款提取失败',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.extraction,
      usage: result.usage,
      contractId: contractId
    });

  } catch (error) {
    console.error('合同条款提取错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * @route POST /api/ai/contract-qa
 * @desc 使用DeepSeek AI进行合同智能问答
 * @access Private
 */
router.post('/contract-qa', async (req, res) => {
  try {
    const { question, contractText, contractId } = req.body;

    if (!question || !contractText) {
      return res.status(400).json({
        success: false,
        message: '问题和合同文本不能为空'
      });
    }

    // 调用DeepSeek服务进行智能问答
    const result = await DeepSeekService.contractQa(question, contractText);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: '智能问答失败',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        question: question,
        answer: result.message,
        usage: result.usage
      },
      contractId: contractId
    });

  } catch (error) {
    console.error('合同智能问答错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * @route GET /api/ai/health
 * @desc 检查DeepSeek API连接状态
 * @access Private
 */
router.get('/health', async (req, res) => {
  try {
    const isConnected = await DeepSeekService.checkConnection();
    
    res.json({
      success: true,
      data: {
        service: 'DeepSeek AI',
        status: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'AI服务健康检查失败',
      error: error.message
    });
  }
});

/**
 * @route POST /api/ai/chat
 * @desc 通用DeepSeek AI聊天接口
 * @access Private
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    // 调用DeepSeek服务进行聊天
    const result = await DeepSeekService.sendMessage(message, history);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'AI聊天失败',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        message: result.message,
        usage: result.usage,
        response_id: result.data.id
      }
    });

  } catch (error) {
    console.error('AI聊天错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

export default router;