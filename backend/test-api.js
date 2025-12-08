// 测试完整分析API流程
import dotenv from 'dotenv';
import { DatabaseService } from './src/utils/supabase.js';
import FileExtractor from './src/utils/fileExtractor.js';
import deepSeekService from './src/services/deepseekService.js';

// 加载环境变量
dotenv.config();

async function testCompleteAnalysis() {
  console.log('=== 完整分析API流程测试 ===\n');
  
  try {
    // 1. 使用实际的用户ID
    const testUserId = 'af7decf3-98ad-44c4-95ab-d3bd36cb5b6f';
    
    // 2. 获取一个测试合同
    console.log('1. 获取测试合同:');
    const contracts = await DatabaseService.select('contracts', {}, { limit: 1 });
    
    if (contracts.length === 0) {
      console.log('❌ 没有找到测试合同，先创建一个');
      
      // 创建一个测试合同
      const testContract = {
        user_id: testUserId,
        filename: 'test-contract.txt',
        file_type: 'txt',
        file_path: null, // 没有文件，直接使用文本内容
        contract_title: '测试采购合同',
        contract_amount: '10000元',
        effective_date: '2024-01-01',
        expiration_date: '2024-12-31',
        status: 'uploaded',
        created_at: new Date().toISOString()
      };
      
      const insertResult = await DatabaseService.insert('contracts', testContract);
      const contractId = insertResult[0]?.id;
      console.log('✅ 创建测试合同成功，ID:', contractId);
      
      if (!contractId) {
        console.log('❌ 创建合同失败，无法继续测试');
        return;
      }
      
      // 3. 直接测试分析流程
      await testAnalysisFlow(contractId, testContract, testUserId);
      
    } else {
      const contract = contracts[0];
      console.log('✅ 找到测试合同:', contract.filename);
      console.log('合同ID:', contract.id);
      console.log('文件路径:', contract.file_path);
      console.log('文件类型:', contract.file_type);
      
      await testAnalysisFlow(contract.id, contract, testUserId);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('详细错误:', error);
  }
}

async function testAnalysisFlow(contractId, contract, testUserId) {
  console.log('\n=== 分析流程测试 ===');
  
  try {
    // 1. 更新合同状态为分析中
    console.log('2. 更新合同状态为分析中:');
    await DatabaseService.update('contracts', contractId, {
      status: 'processing',
      analysis_started_at: new Date().toISOString(),
    });
    console.log('✅ 状态更新成功');
    
    // 2. 提取合同文本内容
    console.log('3. 提取合同文本内容:');
    let contractText = '';
    
    try {
      if (contract.file_path) {
        console.log('从文件提取内容:', contract.file_path);
        contractText = await FileExtractor.extractText(
          contract.file_path, 
          contract.file_type
        );
        console.log('✅ 文件内容提取成功，长度:', contractText.length);
      } else {
        // 使用基本信息构建文本
        contractText = `${contract.contract_title || '合同'}\n\n合同金额: ${contract.contract_amount || '未填写'}\n合同期限: ${contract.effective_date || '未填写'} 至 ${contract.expiration_date || '未填写'}`;
        console.log('✅ 使用基本信息构建文本，长度:', contractText.length);
      }
      
      if (contractText.length < 10) {
        throw new Error('合同文本内容过短，无法进行有效分析');
      }
      
    } catch (extractError) {
      console.log('❌ 文本提取失败:', extractError.message);
      throw extractError;
    }
    
    // 3. 调用AI服务进行分析
    console.log('4. 调用AI服务进行分析:');
    let analysisResult;
    
    try {
      analysisResult = await deepSeekService.analyzeContractRisk(contractText);
      
      if (!analysisResult.success) {
        throw new Error(`AI分析失败: ${analysisResult.error}`);
      }
      
      console.log('✅ AI分析成功');
      console.log('风险等级:', analysisResult.analysis.risk_level);
      console.log('风险评分:', analysisResult.analysis.risk_score);
      console.log('分析摘要:', analysisResult.analysis.summary?.substring(0, 100) + '...');
      
    } catch (aiError) {
      console.log('❌ AI分析失败:', aiError.message);
      throw aiError;
    }
    
    // 4. 构建分析结果数据
    console.log('5. 构建分析结果数据:');
    const finalAnalysisResult = {
      contract_id: contractId,
      user_id: testUserId,
      analysis_result: analysisResult.analysis,
      confidence_score: analysisResult.analysis.risk_score || 0.8,
      overall_risk_level: analysisResult.analysis.risk_level,
      risk_summary: analysisResult.analysis.summary,
      compliance_status: analysisResult.analysis.compliance_issues?.length === 0,
      compliance_issues: analysisResult.analysis.compliance_issues || [],
      analysis_time: '1.5 seconds',
      created_at: new Date().toISOString(),
    };
    
    // 5. 保存分析结果
    console.log('6. 保存分析结果:');
    const savedAnalysis = await DatabaseService.insert('contract_analysis', finalAnalysisResult);
    console.log('✅ 分析结果保存成功');
    
    // 6. 更新合同状态为已分析
    console.log('7. 更新合同状态为已分析:');
    await DatabaseService.update('contracts', contractId, {
      status: 'analyzed',
      analysis_completed_at: new Date().toISOString(),
    });
    console.log('✅ 合同状态更新成功');
    
    console.log('\n=== 分析流程测试完成 ===');
    console.log('✅ 所有步骤都成功执行');
    console.log('分析结果ID:', savedAnalysis[0]?.id);
    
  } catch (error) {
    // 错误恢复：重置合同状态
    console.log('\n❌ 分析流程失败，正在恢复状态...');
    try {
      await DatabaseService.update('contracts', contractId, {
        status: 'uploaded',
        analysis_started_at: null,
      });
      console.log('✅ 合同状态已恢复');
    } catch (recoveryError) {
      console.log('❌ 状态恢复失败:', recoveryError.message);
    }
    
    throw error;
  }
}

// 运行测试
testCompleteAnalysis().catch(console.error);