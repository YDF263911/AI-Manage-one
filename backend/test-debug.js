import express from 'express';
import { DatabaseService } from './src/utils/supabase.js';
import FileExtractor from './src/utils/fileExtractor.js';
import deepSeekService from './src/services/deepseekService.js';

const app = express();
app.use(express.json());

// 简化的分析路由
app.post('/test-analyze/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = 'af7decf3-98ad-44c4-95ab-d3bd36cb5b6f';
    
    console.log('开始分析，合同ID:', contractId);
    
    // 1. 获取合同
    const contracts = await DatabaseService.select('contracts', {
      id: contractId,
      user_id: userId,
    });
    
    if (!contracts.length) {
      return res.status(404).json({ success: false, message: '合同不存在' });
    }
    
    const contract = contracts[0];
    console.log('找到合同:', contract.filename);
    
    // 2. 生成文本
    const contractText = `合同标题：${contract.contract_title || '未知'}\n金额：${contract.contract_amount || 0}\n期限：${contract.effective_date || '未知'} 至 ${contract.expiration_date || '未知'}`;
    
    console.log('生成文本长度:', contractText.length);
    
    // 3. 调用AI分析
    console.log('开始AI分析...');
    const analysisResult = await deepSeekService.analyzeContractRisk(contractText);
    
    console.log('AI分析结果:', {
      success: analysisResult.success,
      hasAnalysis: !!analysisResult.analysis
    });
    
    if (!analysisResult.success) {
      throw new Error(`AI分析失败: ${analysisResult.error}`);
    }
    
    // 4. 检查AI分析结果
    console.log('检查AI分析结果内容...');
    console.log('analysisResult:', JSON.stringify(analysisResult, null, 2));
    
    if (!analysisResult || !analysisResult.analysis) {
      throw new Error('AI分析结果为空');
    }
    
    // 5. 保存结果
    // 确保风险等级符合数据库约束
    const riskLevel = analysisResult.analysis.risk_level?.toString().toLowerCase() || 'medium';
    const allowedRiskLevels = ['low', 'medium', 'high'];
    let normalizedRiskLevel;
    
    if (riskLevel === 'critical') {
      normalizedRiskLevel = 'high';
    } else if (allowedRiskLevels.includes(riskLevel)) {
      normalizedRiskLevel = riskLevel;
    } else {
      normalizedRiskLevel = 'medium';
    }
    
    console.log('风险等级处理:', {
      original: analysisResult.analysis.risk_level,
      normalized: normalizedRiskLevel
    });
    
    const finalAnalysisResult = {
      contract_id: contractId,
      user_id: userId,
      analysis_result: analysisResult.analysis,
      confidence_score: analysisResult.analysis.risk_score || 0.8,
      overall_risk_level: normalizedRiskLevel,
      risk_summary: analysisResult.analysis.summary,
      created_at: new Date().toISOString(),
    };
    
    console.log('开始保存分析结果...');
    const savedAnalysis = await DatabaseService.insert('contract_analysis', finalAnalysisResult);
    
    console.log('分析保存成功');
    
    // 5. 更新合同状态
    await DatabaseService.update('contracts', contractId, {
      status: 'analyzed',
      analysis_completed_at: new Date().toISOString(),
    });
    
    console.log('分析流程完成');
    
    res.json({
      success: true,
      message: '分析完成',
      data: savedAnalysis
    });
    
  } catch (error) {
    console.error('分析错误:', error.message);
    console.error('错误堆栈:', error.stack);
    
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

app.listen(3002, () => {
  console.log('调试服务器运行在 3002');
  
  setTimeout(async () => {
    try {
      const response = await fetch('http://localhost:3002/test-analyze/9b8a0176-859a-4a0f-b735-dafde2d48fc2', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      });
      
      const result = await response.json();
      console.log('=== 测试结果 ===');
      console.log('状态:', response.status);
      console.log('响应:', JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error('测试失败:', error);
    } finally {
      process.exit(0);
    }
  }, 1000);
});