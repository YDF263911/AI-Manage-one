import deepSeekService from './src/services/deepseekService.js';

const testText = '合同标题：采购合同模板\n金额：0\n期限：未知 至 未知';

deepSeekService.analyzeContractRisk(testText)
  .then(result => {
    console.log('=== AI分析结果 ===');
    console.log('成功:', result.success);
    
    if (result.success) {
      console.log('风险等级:', result.analysis.risk_level);
      console.log('风险等级类型:', typeof result.analysis.risk_level);
      console.log('风险等级长度:', result.analysis.risk_level?.length);
      
      const analysis = result.analysis;
      console.log('完整分析结果:', JSON.stringify(analysis, null, 2));
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });