import deepSeekService from './src/services/deepseekService.js';

console.log('测试DeepSeek服务...');

deepSeekService.analyzeContractRisk('这是一份测试合同，金额10000元，期限1年')
  .then(result => {
    console.log('✅ DeepSeek测试成功:', result.success);
    if (result.success) {
      console.log('风险等级:', result.analysis.risk_level);
      console.log('风险评分:', result.analysis.risk_score);
    } else {
      console.log('错误:', result.error);
    }
  })
  .catch(error => {
    console.log('❌ DeepSeek测试失败:', error.message);
  })
  .finally(() => {
    process.exit(0);
  });