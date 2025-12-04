import express from 'express';
import { DatabaseService, supabase } from '../utils/supabase.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 获取仪表板统计数据
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取合同统计
    const contracts = await DatabaseService.select('contracts', { user_id: userId });
    
    const contractStats = {
      total: contracts.length,
      uploaded: contracts.filter(c => c.status === 'uploaded').length,
      processing: contracts.filter(c => c.status === 'processing').length,
      analyzed: contracts.filter(c => c.status === 'analyzed').length,
      reviewed: contracts.filter(c => c.status === 'reviewed').length,
      approved: contracts.filter(c => c.status === 'approved').length,
      rejected: contracts.filter(c => c.status === 'rejected').length,
    };

    // 获取分析统计
    const analysis = await DatabaseService.select('contract_analysis', { user_id: userId });
    
    const riskStats = {
      high: analysis.filter(a => a.analysis_result?.risk_assessment?.risk_level === 'high').length,
      medium: analysis.filter(a => a.analysis_result?.risk_assessment?.risk_level === 'medium').length,
      low: analysis.filter(a => a.analysis_result?.risk_assessment?.risk_level === 'low').length,
    };

    // 获取最近活动
    const recentContracts = await DatabaseService.select('contracts', { user_id: userId }, {
      limit: 5,
      orderBy: 'created_at',
      ascending: false,
    });

    const stats = {
      contract_stats: contractStats,
      risk_stats: riskStats,
      total_analysis: analysis.length,
      average_analysis_time: '2.3秒', // 模拟数据
      recent_activity: recentContracts,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
    });
  }
});

// 获取合同分析趋势
router.get('/trends', protect, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user.id;

    // 模拟趋势数据
    const trends = {
      daily: [
        { date: '2024-01-01', contracts: 5, analysis: 4 },
        { date: '2024-01-02', contracts: 8, analysis: 7 },
        { date: '2024-01-03', contracts: 12, analysis: 10 },
        { date: '2024-01-04', contracts: 7, analysis: 6 },
        { date: '2024-01-05', contracts: 15, analysis: 12 },
      ],
      risk_distribution: {
        high: 15,
        medium: 35,
        low: 50,
      },
      category_distribution: {
        purchase: 25,
        sales: 30,
        service: 20,
        employment: 15,
        other: 10,
      },
    };

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取趋势数据失败',
    });
  }
});

// 获取风险预警
router.get('/risk-alerts', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取高风险合同
    const highRiskAnalysis = await DatabaseService.select('contract_analysis', { 
      user_id: userId 
    }).then(analysis => 
      analysis.filter(a => a.analysis_result?.risk_assessment?.risk_level === 'high')
    );

    const riskAlerts = highRiskAnalysis.map(analysis => ({
      id: analysis.id,
      contract_id: analysis.contract_id,
      risk_level: 'high',
      title: '高风险合同需要关注',
      description: `合同 ${analysis.contract_id} 存在高风险项，建议立即审查`,
      created_at: analysis.created_at,
      urgency: 'high',
    }));

    res.json({
      success: true,
      data: riskAlerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取风险预警失败',
    });
  }
});

// 获取性能指标
router.get('/performance', protect, async (req, res) => {
  try {
    const performanceMetrics = {
      analysis_speed: {
        average: '2.3秒',
        fastest: '0.8秒',
        slowest: '5.2秒',
        trend: 'improving',
      },
      accuracy: {
        overall: '92%',
        risk_detection: '89%',
        compliance_check: '95%',
        trend: 'stable',
      },
      efficiency: {
        contracts_per_day: 15,
        analysis_completion_rate: '98%',
        user_satisfaction: '4.8/5',
      },
    };

    res.json({
      success: true,
      data: performanceMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取性能指标失败',
    });
  }
});

// 获取用户活动日志
router.get('/activity-log', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user.id;

    // 模拟活动日志
    const activityLog = [
      {
        id: 1,
        type: 'contract_upload',
        description: '上传了采购合同文件',
        timestamp: '2024-01-05T10:30:00Z',
        contract_id: 'contract_001',
      },
      {
        id: 2,
        type: 'analysis_complete',
        description: '完成了销售合同分析',
        timestamp: '2024-01-05T09:15:00Z',
        contract_id: 'contract_002',
      },
      {
        id: 3,
        type: 'template_used',
        description: '使用了服务合同模板',
        timestamp: '2024-01-04T16:45:00Z',
        template_id: 'template_001',
      },
    ];

    res.json({
      success: true,
      data: activityLog.slice(0, parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取活动日志失败',
    });
  }
});

export default router;