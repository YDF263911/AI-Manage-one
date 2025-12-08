// 检查分析数据格式的脚本
import dotenv from 'dotenv';
import { DatabaseService } from './src/utils/supabase.js';

// 加载环境变量
dotenv.config();

async function checkAnalysisData() {
  console.log('=== 检查分析数据格式 ===\n');
  
  try {
    // 查询所有分析结果
    const analyses = await DatabaseService.select('contract_analysis', {}, { 
      limit: 5,
      order_by: { created_at: 'desc' }
    });
    
    if (analyses.length === 0) {
      console.log('❌ 没有找到分析结果数据');
      return;
    }
    
    console.log(`✅ 找到 ${analyses.length} 条分析记录\n`);
    
    analyses.forEach((analysis, index) => {
      console.log(`=== 分析记录 ${index + 1} ===`);
      console.log('分析ID:', analysis.id);
      console.log('合同ID:', analysis.contract_id);
      console.log('总体风险等级:', analysis.overall_risk_level);
      console.log('置信度评分:', analysis.confidence_score);
      console.log('风险摘要:', analysis.risk_summary?.substring(0, 100) + '...');
      console.log('分析结果数据类型:', typeof analysis.analysis_result);
      
      // 检查analysis_result字段的具体结构
      if (analysis.analysis_result) {
        const result = analysis.analysis_result;
        console.log('\n分析结果结构:');
        console.log('- risk_level:', result.risk_level);
        console.log('- risk_score:', result.risk_score);
        console.log('- summary:', result.summary?.substring(0, 100) + '...');
        
        // 检查主要风险字段
        console.log('- major_risks 存在:', !!result.major_risks);
        if (result.major_risks && Array.isArray(result.major_risks)) {
          console.log('- major_risks 数量:', result.major_risks.length);
          if (result.major_risks.length > 0) {
            console.log('  第一个风险:');
            console.log('    - type:', result.major_risks[0].type);
            console.log('    - description:', result.major_risks[0].description?.substring(0, 50) + '...');
            console.log('    - severity:', result.major_risks[0].severity);
          }
        }
        
        // 检查其他可能的风险字段
        console.log('- risk_items 存在:', !!result.risk_items);
        console.log('- risk_assessment 存在:', !!result.risk_assessment);
        console.log('- compliance_issues 存在:', !!result.compliance_issues);
        console.log('- missing_clauses 存在:', !!result.missing_clauses);
        
        // 如果risk_assessment存在，检查其结构
        if (result.risk_assessment) {
          console.log('\nrisk_assessment结构:');
          console.log('  - risk_level:', result.risk_assessment.risk_level);
          console.log('  - risk_items 存在:', !!result.risk_assessment.risk_items);
          if (result.risk_assessment.risk_items && Array.isArray(result.risk_assessment.risk_items)) {
            console.log('  - risk_items 数量:', result.risk_assessment.risk_items.length);
          }
        }
        
        // 显示完整的JSON结构（前1000字符）
        console.log('\n完整分析结果JSON（截取）:');
        const jsonStr = JSON.stringify(result, null, 2);
        console.log(jsonStr.substring(0, 1000) + (jsonStr.length > 1000 ? '...' : ''));
      }
      
      console.log('\n' + '='.repeat(40) + '\n');
    });
    
    // 查询对应的合同信息
    console.log('=== 对应的合同信息 ===');
    for (const analysis of analyses) {
      const contracts = await DatabaseService.select('contracts', {
        id: analysis.contract_id
      });
      
      if (contracts.length > 0) {
        const contract = contracts[0];
        console.log(`合同ID: ${contract.id}`);
        console.log(`文件名: ${contract.filename}`);
        console.log(`合同标题: ${contract.contract_title || '无'}`);
        console.log(`状态: ${contract.status}`);
        console.log('---');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查分析数据失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行检查
checkAnalysisData().catch(console.error);