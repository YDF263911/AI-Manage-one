import DeepSeekService from '../services/deepseekService.js';

/**
 * AI服务集成工具类
 * 提供合同分析相关的AI功能
 */
class AIService {
  /**
   * 完整的合同分析流程
   * @param {string} contractText - 合同文本
   * @param {string} contractId - 合同ID
   * @returns {Promise<Object>} - 分析结果
   */
  static async analyzeContract(contractText, contractId) {
    try {
      console.log(`开始分析合同 ${contractId}，文本长度: ${contractText.length}`);
      
      // 并行执行风险分析和条款提取
      const [riskAnalysis, clauseExtraction] = await Promise.all([
        DeepSeekService.analyzeContractRisk(contractText),
        DeepSeekService.extractContractClauses(contractText)
      ]);

      // 检查分析结果
      if (!riskAnalysis.success || !clauseExtraction.success) {
        throw new Error(`AI分析失败: ${riskAnalysis.error || clauseExtraction.error}`);
      }

      const analysisResult = {
        contractId: contractId,
        timestamp: new Date().toISOString(),
        riskAnalysis: riskAnalysis.analysis,
        clauseExtraction: clauseExtraction.extraction,
        usage: {
          risk_analysis: riskAnalysis.usage,
          clause_extraction: clauseExtraction.usage
        }
      };

      console.log(`合同 ${contractId} 分析完成`);
      return {
        success: true,
        data: analysisResult
      };

    } catch (error) {
      console.error(`合同 ${contractId} 分析失败:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量分析合同
   * @param {Array} contracts - 合同数组
   * @returns {Promise<Object>} - 批量分析结果
   */
  static async batchAnalyzeContracts(contracts) {
    try {
      const results = [];
      const errors = [];

      // 限制并发数，避免API限制
      const batchSize = 3;
      
      for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (contract) => {
          try {
            const result = await this.analyzeContract(contract.text, contract.id);
            return {
              contractId: contract.id,
              success: result.success,
              data: result.data,
              error: result.error
            };
          } catch (error) {
            return {
              contractId: contract.id,
              success: false,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
        });

        // 添加延迟避免API限制
        if (i + batchSize < contracts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        data: {
          total: contracts.length,
          successful: results.length,
          failed: errors.length,
          results: results,
          errors: errors
        }
      };

    } catch (error) {
      console.error('批量分析合同失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 生成合同摘要
   * @param {string} contractText - 合同文本
   * @returns {Promise<Object>} - 摘要结果
   */
  static async generateContractSummary(contractText) {
    const prompt = `
请为以下合同生成一个简洁的摘要，包括：
1. 合同类型和主要目的
2. 关键条款概述
3. 重要日期和金额
4. 主要权利和义务

合同内容：
"""
${contractText}
"""

请用中文返回，格式简洁明了。
    `;

    const result = await DeepSeekService.sendMessage(prompt);
    
    if (result.success) {
      return {
        success: true,
        summary: result.message
      };
    }
    
    return result;
  }

  /**
   * 比较两个合同的差异
   * @param {string} contract1 - 合同1文本
   * @param {string} contract2 - 合同2文本
   * @returns {Promise<Object>} - 差异分析结果
   */
  static async compareContracts(contract1, contract2) {
    const prompt = `
请比较以下两个合同的差异，重点关注：
1. 条款内容的差异
2. 权利义务的变化
3. 风险等级的变化
4. 合规性差异

合同1：
"""
${contract1}
"""

合同2：
"""
${contract2}
"""

请返回JSON格式：
{
  "differences": [
    {
      "type": "差异类型",
      "description": "差异描述",
      "contract1": "合同1相关内容",
      "contract2": "合同2相关内容",
      "significance": "重要程度"
    }
  ],
  "summary": "总体差异摘要"
}
    `;

    const result = await DeepSeekService.sendMessage(prompt);
    
    if (result.success) {
      try {
        const jsonContent = result.message.replace(/```json\n?|\n?```/g, '').trim();
        const comparison = JSON.parse(jsonContent);
        
        return {
          success: true,
          comparison: comparison
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'AI响应格式错误',
          raw_response: result.message
        };
      }
    }
    
    return result;
  }

  /**
   * 检查AI服务可用性
   * @returns {Promise<boolean>} - 服务状态
   */
  static async checkServiceAvailability() {
    try {
      return await DeepSeekService.checkConnection();
    } catch (error) {
      console.error('检查AI服务可用性失败:', error);
      return false;
    }
  }
}

export default AIService;