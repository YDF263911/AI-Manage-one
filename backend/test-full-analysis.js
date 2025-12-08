// 完整的端到端分析测试
import express from 'express';
import cors from 'cors';
import { DatabaseService } from './src/utils/supabase.js';

// 创建测试应用
const app = express();
app.use(express.json());
app.use(cors());

// 模拟用户认证
const testUserId = 'af7decf3-98ad-44c4-95ab-d3bd36cb5b6f';
const testHeaders = {
  'x-user-id': testUserId,
  'content-type': 'application/json'
};

// 导入分析路由
const analysisRouter = (await import('./src/routes/analysis.js')).default;
app.use('/api/analysis', analysisRouter);

async function runAnalysisTest() {
  console.log('=== 完整分析功能测试 ===\n');
  
  const server = app.listen(3001, () => {
    console.log('✅ 测试服务器启动在端口 3001');
  });
  
  try {
    // 1. 获取测试合同
    console.log('1. 获取测试合同...');
    const contracts = await DatabaseService.select('contracts', {
      user_id: testUserId
    }, { limit: 1 });
    
    if (contracts.length === 0) {
      console.log('❌ 没有找到测试合同');
      return;
    }
    
    const testContract = contracts[0];
    console.log('✅ 找到测试合同:', testContract.filename);
    console.log('   合同ID:', testContract.id);
    console.log('   状态:', testContract.status);
    
    // 2. 调用分析API
    console.log('\n2. 调用分析API...');
    
    const response = await fetch(`http://localhost:3001/api/analysis/analyze/${testContract.id}`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    
    console.log('   响应状态:', response.status);
    console.log('   响应数据:', JSON.stringify(result, null, 2));
    
    // 3. 检查结果
    if (result.success) {
      console.log('\n✅ 分析成功完成！');
      console.log('   分析结果ID:', result.data?.id);
      
      // 4. 验证分析结果是否保存
      console.log('\n3. 验证分析结果...');
      const analyses = await DatabaseService.select('contract_analysis', {
        contract_id: testContract.id
      });
      
      if (analyses.length > 0) {
        console.log('✅ 分析结果已保存到数据库');
        const analysis = analyses[0];
        console.log('   风险等级:', analysis.overall_risk_level);
        console.log('   置信度:', analysis.confidence_score);
        console.log('   创建时间:', analysis.created_at);
      } else {
        console.log('❌ 分析结果未找到');
      }
      
      // 5. 验证合同状态更新
      console.log('\n4. 验证合同状态...');
      const updatedContracts = await DatabaseService.select('contracts', {
        id: testContract.id
      });
      
      if (updatedContracts.length > 0) {
        const updatedContract = updatedContracts[0];
        console.log('✅ 合同状态已更新');
        console.log('   新状态:', updatedContract.status);
        console.log('   分析完成时间:', updatedContract.analysis_completed_at);
      } else {
        console.log('❌ 合同状态更新失败');
      }
      
    } else {
      console.log('\n❌ 分析失败');
      console.log('   错误信息:', result.message);
      console.log('   错误代码:', result.error_code);
      console.log('   时间戳:', result.timestamp);
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    // 关闭测试服务器
    server.close(() => {
      console.log('\n=== 测试完成，服务器已关闭 ===');
    });
  }
}

// 运行测试
runAnalysisTest().catch(console.error);