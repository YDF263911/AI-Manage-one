// 测试分析功能诊断脚本
import dotenv from 'dotenv';
import deepSeekService from './src/services/deepseekService.js';

// 加载环境变量
dotenv.config();

async function testAnalysis() {
  console.log('=== AI分析功能诊断 ===\n');
  
  // 1. 检查环境变量
  console.log('1. 环境变量检查:');
  console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已配置' : '❌ 未配置');
  console.log('DEEPSEEK_API_URL:', process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1');
  console.log('DEEPSEEK_MODEL:', process.env.DEEPSEEK_MODEL || 'deepseek-chat');
  
  // 2. 测试DeepSeek服务初始化
  try {
    console.log('\n2. DeepSeek服务初始化:');
    console.log('✅ DeepSeek服务初始化成功');
    
    // 3. 测试API连接
    console.log('\n3. 测试API连接:');
    const isConnected = await deepSeekService.checkConnection();
    console.log(isConnected ? '✅ API连接正常' : '❌ API连接失败');
    
    // 4. 测试简单分析
    console.log('\n4. 测试合同分析:');
    const testContractText = `
甲方：张三
乙方：李四

合同金额：10000元
合同期限：2024年1月1日至2024年12月31日

本合同约定甲方向乙方提供货物，乙方支付相应款项。
    `;
    
    console.log('测试合同文本长度:', testContractText.length);
    const result = await deepSeekService.analyzeContractRisk(testContractText);
    
    if (result.success) {
      console.log('✅ 分析测试成功');
      console.log('风险等级:', result.analysis.risk_level);
      console.log('风险评分:', result.analysis.risk_score);
      console.log('分析摘要:', result.analysis.summary);
    } else {
      console.log('❌ 分析测试失败');
      console.log('错误信息:', result.error);
      if (result.parse_error) {
        console.log('解析错误:', result.parse_error);
      }
      if (result.raw_response) {
        console.log('原始响应:', result.raw_response.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.log('❌ 服务初始化失败:', error.message);
  }
}

// 运行测试
testAnalysis().catch(console.error);