import axios from 'axios';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    
    // 验证API密钥配置
    if (!this.apiKey) {
      throw new Error('DeepSeek API Key未配置，请检查环境变量设置');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60秒超时
    });
  }

  /**
   * 发送消息到DeepSeek API
   * @param {string} message - 用户消息
   * @param {Array} history - 对话历史
   * @param {Object} options - 额外选项
   * @returns {Promise<Object>} - API响应
   */
  async sendMessage(message, history = [], options = {}) {
    try {
      const messages = [
        ...history,
        {
          role: 'user',
          content: message
        }
      ];

      const requestBody = {
        model: this.model,
        messages: messages,
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 0.9,
        stream: options.stream || false
      };

      const response = await this.client.post('/chat/completions', requestBody);
      
      return {
        success: true,
        data: response.data,
        message: response.data.choices[0]?.message?.content || '',
        usage: response.data.usage
      };
    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * 合同风险分析
   * @param {string} contractText - 合同文本
   * @returns {Promise<Object>} - 分析结果
   */
  async analyzeContractRisk(contractText) {
    // 验证合同文本
    if (!contractText || contractText.trim().length < 10) {
      throw new Error('合同文本内容过短，无法进行有效分析');
    }

    // 真实API调用
    const prompt = `
你是一位专业的合同审查律师。请对以下合同文本进行全面的风险分析：

合同内容：
"""
${contractText}
"""

请按照以下格式返回JSON结果：
{
  "risk_level": "low|medium|high|critical",
  "risk_score": 0.0-1.0,
  "summary": "总体风险评估摘要",
  "major_risks": [
    {
      "type": "风险类型",
      "description": "风险描述",
      "clause": "相关条款",
      "severity": "low|medium|high|critical",
      "suggestion": "修改建议"
    }
  ],
  "compliance_issues": [
    {
      "issue": "合规问题描述",
      "clause": "相关条款",
      "standard": "相关法规标准",
      "suggestion": "合规建议"
    }
  ],
  "missing_clauses": ["缺失的重要条款"],
  "key_terms": {
    "parties": "合同主体信息",
    "amount": "合同金额",
    "duration": "合同期限",
    "payment_terms": "付款条款",
    "termination": "终止条款"
  }
}

请确保返回纯JSON格式，不要包含其他文本。
    `;

    const response = await this.sendMessage(prompt);
    
    if (response.success) {
      try {
        // 解析JSON响应
        const jsonContent = response.message.replace(/```json\n?|\n?```/g, '').trim();
        const analysisResult = JSON.parse(jsonContent);
        
        return {
          success: true,
          analysis: analysisResult,
          usage: response.usage
        };
      } catch (parseError) {
        console.error('JSON解析错误:', parseError);
        return {
          success: false,
          error: 'AI响应格式错误',
          raw_response: response.message
        };
      }
    }
    
    return response;
  }

  /**
   * 合同条款提取
   * @param {string} contractText - 合同文本
   * @returns {Promise<Object>} - 提取结果
   */
  async extractContractClauses(contractText) {
    const prompt = `
请从以下合同文本中提取所有重要条款，并按照结构化格式返回：

合同内容：
"""
${contractText}
"""

请返回JSON格式：
{
  "clauses": [
    {
      "clause_number": "条款编号",
      "title": "条款标题",
      "content": "条款内容",
      "type": "条款类型",
      "start_page": 页码,
      "end_page": 页码
    }
  ],
  "metadata": {
    "total_clauses": 条款总数,
    "document_type": "合同类型",
    "parties": ["甲方", "乙方"]
  }
}

请确保返回纯JSON格式。
    `;

    const response = await this.sendMessage(prompt);
    
    if (response.success) {
      try {
        const jsonContent = response.message.replace(/```json\n?|\n?```/g, '').trim();
        const extractionResult = JSON.parse(jsonContent);
        
        return {
          success: true,
          extraction: extractionResult,
          usage: response.usage
        };
      } catch (parseError) {
        console.error('JSON解析错误:', parseError);
        return {
          success: false,
          error: 'AI响应格式错误',
          raw_response: response.message
        };
      }
    }
    
    return response;
  }

  /**
   * 智能合同问答
   * @param {string} question - 用户问题
   * @param {string} contractText - 合同文本
   * @returns {Promise<Object>} - 问答结果
   */
  async contractQa(question, contractText) {
    const prompt = `
基于以下合同文本，回答用户的问题：

合同内容：
"""
${contractText}
"""

用户问题：${question}

请提供准确、专业的回答，并引用合同中的相关条款。
    `;

    return await this.sendMessage(prompt);
  }

  /**
   * 检查API连接状态
   * @returns {Promise<boolean>} - 连接状态
   */
  async checkConnection() {
    try {
      const response = await this.sendMessage('请回复"OK"以确认连接正常。');
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export default new DeepSeekService();