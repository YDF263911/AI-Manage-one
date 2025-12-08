// 测试前端数据提取修复的脚本
import dotenv from 'dotenv';
import { DatabaseService } from './src/utils/supabase.js';

// 加载环境变量
dotenv.config();

// 模拟前端数据提取逻辑
function simulateFrontendDataExtraction(analysisResult) {
  console.log('=== 模拟前端数据提取逻辑 ===\n');
  
  // 兼容多种AI分析结果格式
  let majorRisks = [];
  
  // 1. 优先检查 major_risks 字段（新格式）
  if (analysisResult?.major_risks && Array.isArray(analysisResult.major_risks)) {
    console.log('✅ 使用 major_risks 字段');
    majorRisks = analysisResult.major_risks;
  }
  // 2. 检查 risks 字段（另一种格式）
  else if (analysisResult?.risks && Array.isArray(analysisResult.risks)) {
    console.log('✅ 使用 risks 字段');
    // 兼容risks数组格式
    majorRisks = analysisResult.risks.map((item) => ({
      type: item.title || item.type || "合同风险",
      description: item.description || "风险描述",
      clause: item.clause || "相关条款",
      severity: item.severity || item.risk_level || "medium",
      suggestion: item.suggestion || "修改建议"
    }));
  }
  // 3. 检查 risk_assessment.risk_items 字段（旧格式）
  else if (analysisResult?.risk_assessment?.risk_items && Array.isArray(analysisResult.risk_assessment.risk_items)) {
    console.log('✅ 使用 risk_assessment.risk_items 字段');
    // 兼容旧格式
    majorRisks = analysisResult.risk_assessment.risk_items.map((item) => ({
      type: item.risk_type || "合同风险",
      description: item.description || item.risk_description || "风险描述",
      clause: item.clause || "相关条款",
      severity: item.severity || item.risk_level || "medium",
      suggestion: item.suggestion || "修改建议"
    }));
  }
  // 4. 检查直接的 risk_items 字段
  else if (analysisResult?.risk_items && Array.isArray(analysisResult.risk_items)) {
    console.log('✅ 使用 risk_items 字段');
    // 兼容其他格式
    majorRisks = analysisResult.risk_items;
  }
  // 5. 检查合规性问题
  else if (analysisResult?.compliance_issues && Array.isArray(analysisResult.compliance_issues)) {
    console.log('✅ 使用 compliance_issues 字段');
    majorRisks = analysisResult.compliance_issues.map((issue) => ({
      type: "合规问题",
      description: issue.issue || issue.description || "合规性问题",
      clause: issue.clause || "相关条款",
      severity: "medium",
      suggestion: issue.suggestion || "建议进行合规性审查"
    }));
  }
  // 6. 检查缺失条款
  else if (analysisResult?.missing_clauses && Array.isArray(analysisResult.missing_clauses)) {
    console.log('✅ 使用 missing_clauses 字段');
    majorRisks = analysisResult.missing_clauses.map((clause, index) => ({
      type: "缺失条款",
      description: `缺失重要条款：${clause}`,
      clause: "合同整体",
      severity: "medium",
      suggestion: "建议补充缺失的合同条款"
    }));
  }
  // 7. 检查compliance_checks字段
  else if (analysisResult?.compliance_checks && Array.isArray(analysisResult.compliance_checks)) {
    console.log('✅ 使用 compliance_checks 字段');
    majorRisks = analysisResult.compliance_checks
      .filter((check) => check.status !== 'pass') // 只显示不通过的项目
      .map((check) => ({
        type: "合规检查",
        description: check.description || check.item || "合规性问题",
        clause: "合同整体",
        severity: "medium",
        suggestion: "请进行合规性审查"
      }));
  }
  
  if (majorRisks.length > 0) {
    const result = majorRisks.map((risk, index) => ({
      type: risk.type || risk.risk_type || "未知风险",
      description: risk.description || risk.risk_description || "风险描述",
      clause: risk.clause || "",
      severity: risk.severity || risk.risk_level || "medium",
      suggestion: risk.suggestion || "",
    }));
    
    console.log(`✅ 成功提取 ${result.length} 条风险记录`);
    return result;
  } else {
    console.log('⚠️ 没有找到详细风险数据，使用默认显示');
    // 如果没有风险点数据，创建更详细的默认显示
    const riskLevel = analysisResult?.risk_level || "未知";
    const riskSummary = analysisResult?.summary || "暂无详细分析";
    const confidenceScore = analysisResult?.risk_score || "未知";
    
    return [
      {
        type: "总体风险评估",
        description: `风险等级：${riskLevel}，置信度：${confidenceScore}`,
        severity: riskLevel.toLowerCase() || "medium",
      },
      {
        type: "风险摘要",
        description: riskSummary,
        severity: "info",
      }
    ];
  }
}

async function testFrontendFix() {
  console.log('=== 测试前端数据提取修复 ===\n');
  
  try {
    // 查询所有分析结果
    const analyses = await DatabaseService.select('contract_analysis', {}, { 
      limit: 3,
      order_by: { created_at: 'desc' }
    });
    
    if (analyses.length === 0) {
      console.log('❌ 没有找到分析结果数据');
      return;
    }
    
    console.log(`✅ 找到 ${analyses.length} 条分析记录\n`);
    
    analyses.forEach((analysis, index) => {
      console.log(`=== 测试记录 ${index + 1} ===`);
      console.log('分析ID:', analysis.id);
      console.log('合同ID:', analysis.contract_id);
      console.log('总体风险等级:', analysis.overall_risk_level);
      
      if (analysis.analysis_result) {
        const extractedRisks = simulateFrontendDataExtraction(analysis.analysis_result);
        
        console.log('\n提取结果:');
        console.log(`- 风险数量: ${extractedRisks.length}`);
        if (extractedRisks.length > 0) {
          console.log('- 风险类型分布:');
          const typeCounts = {};
          extractedRisks.forEach(risk => {
            typeCounts[risk.type] = (typeCounts[risk.type] || 0) + 1;
          });
          Object.entries(typeCounts).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} 条`);
          });
          
          console.log('\n前3条风险详情:');
          extractedRisks.slice(0, 3).forEach((risk, i) => {
            console.log(`  ${i + 1}. ${risk.type} (${risk.severity})`);
            console.log(`     描述: ${risk.description.substring(0, 50)}...`);
            if (risk.suggestion) {
              console.log(`     建议: ${risk.suggestion.substring(0, 50)}...`);
            }
          });
        }
      }
      
      console.log('\n' + '='.repeat(40) + '\n');
    });
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testFrontendFix().catch(console.error);