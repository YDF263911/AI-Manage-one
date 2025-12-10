import axios from 'axios';
import dotenv from 'dotenv';
import { jsonrepair } from 'jsonrepair';

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
      timeout: 60000, // 减少到60秒超时，配合优化后的生成逻辑
    });

    // 延迟预生成常见模板（避免阻塞服务启动）
    setTimeout(() => {
      this.preGenerateCommonTemplates().catch(err => {
        console.log('预生成模板失败:', err);
      });
    }, 5000); // 服务启动5秒后开始预生成
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

    // 使用缓存机制，相同参数直接返回缓存结果
    const cacheKey = `template_${templateType}_${description}`;
    if (this.templateCache && this.templateCache.has(cacheKey)) {
      console.log('使用缓存结果:', cacheKey);
      return this.templateCache.get(cacheKey);
    }

    // 使用优化的API调用参数
    const response = await this.sendMessage(prompt, [], {
      max_tokens: 1500,  // 进一步减少最大token数
      temperature: 0.1,  // 进一步降低温度，提高一致性
      stream: false,     // 确保不使用流式响应，提高单次响应速度
    });
    
    if (response.success) {
      return this.parseAnalysisResponse(response);
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

    // 使用缓存机制，相同参数直接返回缓存结果
    const cacheKey = `template_${templateType}_${description}`;
    if (this.templateCache && this.templateCache.has(cacheKey)) {
      console.log('使用缓存结果:', cacheKey);
      return this.templateCache.get(cacheKey);
    }

    // 使用优化的API调用参数
    const response = await this.sendMessage(prompt, [], {
      max_tokens: 1500,  // 进一步减少最大token数
      temperature: 0.1,  // 进一步降低温度，提高一致性
      stream: false,     // 确保不使用流式响应，提高单次响应速度
    });
    
    if (response.success) {
      try {
        let jsonContent = response.message.replace(/```json\n?|\n?```/g, '').trim();
        const extractionResult = JSON.parse(jsonContent);
        
        return {
          success: true,
          extraction: extractionResult,
          usage: response.usage
        };
      } catch (parseError) {
        console.error('JSON解析错误:', parseError);
        
        // 获取原始响应并处理
        let jsonContent = response.message;
        console.log('Raw AI response:', jsonContent);
        
        // 移除可能的JSON标记和多余空白
        jsonContent = jsonContent.replace(/```json\n?|\n?```/g, '').trim();
        console.error('Processed JSON content:', jsonContent);
        
        // 使用jsonrepair库修复JSON
        try {
          const repairedJson = jsonrepair(jsonContent);
          console.log('Repaired JSON content:', repairedJson);
          
          const fixedResult = JSON.parse(repairedJson);
          return {
            success: true,
            extraction: fixedResult,
            usage: response.usage,
            warning: 'AI响应格式存在问题，已使用jsonrepair自动修复'
          };
        } catch (repairError) {
          console.error('JSON修复失败:', repairError);
          
          // 修复失败，返回详细错误信息
          return {
            success: false,
            error: 'AI响应格式错误',
            parse_error: parseError.message,
            repair_error: repairError.message,
            raw_response: response.message,
            processed_response: jsonContent
          };
        }
      }
    }
    
    return response;
  }

  /**
   * 辅助生成合同模板
   * @param {string} templateType - 模板类型
   * @param {string} description - 模板描述
   * @returns {Promise<Object>} - 生成结果
   */
  async generateContractTemplate(templateType, description = '') {
    // 使用缓存机制，相同参数直接返回缓存结果
    const cacheKey = `template_${templateType}_${description}`;
    if (this.templateCache && this.templateCache.has(cacheKey)) {
      console.log('使用缓存结果:', cacheKey);
      return this.templateCache.get(cacheKey);
    }

    // 检查预生成缓存（常见模板类型）
    const commonTemplates = ['劳动合同', '采购合同', '销售合同'];
    const baseCacheKey = `template_${templateType}_`;
    if (commonTemplates.includes(templateType) && this.templateCache && this.templateCache.has(baseCacheKey + 'base')) {
      console.log('使用预生成基础模板:', templateType);
      const baseTemplate = this.templateCache.get(baseCacheKey + 'base');
      
      // 如果有描述，异步生成完整版本，同时返回基础版本
      if (description && description.trim()) {
        // 异步生成完整版本（不等待）
        this.generateFullVersion(templateType, description).catch(err => {
          console.log('异步生成完整版本失败:', err);
        });
      }
      
      return baseTemplate;
    }

    // 极简提示词，最大化减少token和处理时间
    const prompt = `生成${templateType}合同模板${description ? `：${description}` : ''}。

JSON格式：
{"content":"正文{{变量}}","variables":[{"name":"var","label":"显示名","default_value":""}],"tips":["提示"]}

要求简洁规范，纯JSON。`;

    // 使用优化的API调用参数
    const response = await this.sendMessage(prompt, [], {
      max_tokens: 1500,  // 进一步减少最大token数
      temperature: 0.1,  // 进一步降低温度，提高一致性
      stream: false,     // 确保不使用流式响应，提高单次响应速度
    });
    
    if (response.success) {
      try {
        let jsonContent = response.message;
        
        // 快速JSON解析和清理
        jsonContent = jsonContent.replace(/```json\n?|\n?```/g, '').trim();
        
        // 优化JSON解析：先尝试直接解析，失败再修复
        let templateResult;
        try {
          templateResult = JSON.parse(jsonContent);
        } catch (parseError) {
          // 快速JSON修复
          try {
            const repairedJson = jsonrepair(jsonContent);
            templateResult = JSON.parse(repairedJson);
          } catch (repairError) {
            throw new Error('JSON格式错误，请重试');
          }
        }
        
        // 缓存结果（最多缓存20个结果）
        if (!this.templateCache) {
          this.templateCache = new Map();
        }
        if (this.templateCache.size >= 20) {
          const firstKey = this.templateCache.keys().next().value;
          this.templateCache.delete(firstKey);
        }
        this.templateCache.set(cacheKey, {
          success: true,
          template: templateResult,
          usage: response.usage
        });
        
        return {
          success: true,
          template: templateResult,
          usage: response.usage
        };
      } catch (error) {
        console.error('模板解析错误:', error);
        return {
          success: false,
          error: error.message || '模板解析失败',
          fallback: this.getFallbackTemplate(templateType)
        };
      }
    }
    
    return {
      success: false,
      error: response.error || '生成模板失败',
      fallback: this.getFallbackTemplate(templateType)
    };
  }

  // 提供备用模板，确保服务可用性
  getFallbackTemplate(templateType) {
    const templates = {
      '劳动合同': {
        content: '劳动合同\n\n甲方：{{company_name}}\n乙方：{{employee_name}}\n\n根据《中华人民共和国劳动法》，甲乙双方经平等协商，签订本合同：\n\n1. 合同期限：自{{start_date}}至{{end_date}}\n2. 工作内容：{{job_description}}\n3. 工作地点：{{work_location}}\n4. 工作时间：{{work_hours}}\n5. 劳动报酬：{{salary}}元/月\n\n甲方（盖章）：\n乙方（签字）：\n\n日期：{{sign_date}}',
        variables: [
          { name: 'company_name', label: '公司名称', default_value: '' },
          { name: 'employee_name', label: '员工姓名', default_value: '' },
          { name: 'start_date', label: '合同开始日期', default_value: '' },
          { name: 'end_date', label: '合同结束日期', default_value: '' },
          { name: 'job_description', label: '工作内容', default_value: '' },
          { name: 'work_location', label: '工作地点', default_value: '' },
          { name: 'work_hours', label: '工作时间', default_value: '' },
          { name: 'salary', label: '劳动报酬', default_value: '' },
          { name: 'sign_date', label: '签订日期', default_value: '' }
        ],
        tips: ['请填写完整的甲乙双方信息', '合同期限应明确起止时间', '劳动报酬应包含具体金额']
      }
    };
    
    return templates[templateType] || {
      content: `${templateType}模板\n\n请根据实际情况填写相关内容。`,
      variables: [],
      tips: ['这是一个基础模板，请根据需要完善内容']
    };
  }

  // 异步生成完整版本
  async generateFullVersion(templateType, description) {
    const cacheKey = `template_${templateType}_${description}`;
    
    // 极简提示词，最大化减少token和处理时间
    const prompt = `生成${templateType}合同模板：${description}。

JSON格式：
{"content":"正文{{变量}}","variables":[{"name":"var","label":"显示名","default_value":""}],"tips":["提示"]}

要求简洁规范，纯JSON。`;

    // 使用优化的API调用参数
    const response = await this.sendMessage(prompt, [], {
      max_tokens: 1500,  // 进一步减少最大token数
      temperature: 0.1,  // 进一步降低温度，提高一致性
      stream: false,     // 确保不使用流式响应，提高单次响应速度
    });
    
    if (response.success) {
      try {
        let jsonContent = response.message;
        jsonContent = jsonContent.replace(/```json\n?|\n?```/g, '').trim();
        
        let templateResult;
        try {
          templateResult = JSON.parse(jsonContent);
        } catch (parseError) {
          const repairedJson = jsonrepair(jsonContent);
          templateResult = JSON.parse(repairedJson);
        }
        
        // 缓存完整版本
        if (!this.templateCache) {
          this.templateCache = new Map();
        }
        if (this.templateCache.size >= 20) {
          const firstKey = this.templateCache.keys().next().value;
          this.templateCache.delete(firstKey);
        }
        this.templateCache.set(cacheKey, {
          success: true,
          template: templateResult,
          usage: response.usage
        });
        
        console.log('异步生成完整版本成功:', cacheKey);
      } catch (error) {
        console.error('异步生成完整版本失败:', error);
      }
    }
  }

  // 预生成常见模板
  async preGenerateCommonTemplates() {
    if (this.preGenerated) return;
    
    const commonTemplates = ['劳动合同', '采购合同', '销售合同'];
    
    for (const templateType of commonTemplates) {
      try {
        const result = await this.generateContractTemplate(templateType, '');
        const baseCacheKey = `template_${templateType}_base`;
        
        if (!this.templateCache) {
          this.templateCache = new Map();
        }
        
        this.templateCache.set(baseCacheKey, result);
        console.log('预生成模板完成:', templateType);
      } catch (error) {
        console.error('预生成模板失败:', templateType, error);
      }
    }
    
    this.preGenerated = true;
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
   * 解析AI分析响应
   * @param {Object} response - AI响应对象
   * @returns {Object} - 解析结果
   */
  parseAnalysisResponse(response) {
    try {
      // 第一步：基础清理
      let jsonContent = response.message;
      
      // 移除markdown代码块标记
      jsonContent = jsonContent.replace(/```json\n?|\n?```/g, '');
      
      // 移除前后空白
      jsonContent = jsonContent.trim();
      
      console.log('Step 1 - Cleaned content length:', jsonContent.length);
      
      // 第二步：尝试直接解析
      try {
        const analysisResult = JSON.parse(jsonContent);
        console.log('✅ Direct JSON parsing successful');
        return {
          success: true,
          analysis: analysisResult,
          usage: response.usage
        };
      } catch (directParseError) {
        console.log('Direct parsing failed, trying repair...');
      }
      
      // 第三步：使用jsonrepair修复
      try {
        const repairedJson = jsonrepair(jsonContent);
        console.log('Step 2 - JSON repair attempted');
        
        const fixedResult = JSON.parse(repairedJson);
        console.log('✅ JSON repair successful');
        return {
          success: true,
          analysis: fixedResult,
          usage: response.usage,
          warning: 'AI响应格式存在问题，已使用jsonrepair自动修复'
        };
      } catch (repairError) {
        console.log('JSON repair failed, trying fallback...');
      }
      
      // 第四步：尝试手动修复常见问题
      const manualFixed = this.manualJsonFix(jsonContent);
      if (manualFixed.success) {
        console.log('✅ Manual fix successful');
        return {
          success: true,
          analysis: manualFixed.data,
          usage: response.usage,
          warning: 'AI响应格式存在问题，已使用手动修复'
        };
      }
      
      // 第五步：生成默认分析结果
      console.log('All parsing methods failed, generating fallback result');
      const fallbackResult = this.generateFallbackAnalysis(response.message);
      
      return {
        success: true,
        analysis: fallbackResult,
        usage: response.usage,
        warning: '无法解析AI响应，已生成默认分析结果'
      };
      
    } catch (error) {
      console.error('All parsing methods failed:', error);
      return {
        success: false,
        error: 'AI响应解析完全失败',
        parse_error: error.message,
        raw_response: response.message
      };
    }
  }

  /**
   * 手动修复JSON常见问题
   * @param {string} content - JSON内容
   * @returns {Object} - 修复结果
   */
  manualJsonFix(content) {
    try {
      let fixed = content;
      
      // 修复常见的JSON问题
      fixed = fixed.replace(/，/g, ','); // 中文逗号
      fixed = fixed.replace(/：/g, ':'); // 中文冒号
      fixed = fixed.replace(/'/g, '"'); // 单引号转双引号
      fixed = fixed.replace(/"/g, '"'); // 智能引号转普通引号
      
      // 修复尾随逗号
      fixed = fixed.replace(/,\s*}/g, '}');
      fixed = fixed.replace(/,\s*]/g, ']');
      
      // 修复换行符问题
      fixed = fixed.replace(/\n/g, '\\n');
      
      const result = JSON.parse(fixed);
      return { success: true, data: result };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 生成备用分析结果
   * @param {string} rawResponse - 原始AI响应
   * @returns {Object} - 默认分析结果
   */
  generateFallbackAnalysis(rawResponse) {
    return {
      risk_level: 'medium',
      risk_score: 0.6,
      summary: '系统生成：AI分析响应格式异常，请进行人工审查。原始分析内容：' + (rawResponse?.substring(0, 200) || '无内容') + '...',
      major_risks: [
        {
          type: '系统风险',
          description: 'AI分析响应格式异常，建议人工审查',
          clause: '技术条款',
          severity: 'medium',
          suggestion: '请进行人工合同审查以确保风险识别完整'
        }
      ],
      compliance_issues: [
        {
          issue: '分析系统异常',
          clause: '技术条款',
          standard: '合同审查标准',
          suggestion: '请重新尝试分析或进行人工审查'
        }
      ],
      missing_clauses: ['系统无法识别缺失条款'],
      key_terms: {
        parties: '无法识别',
        amount: '无法识别',
        duration: '无法识别',
        payment_terms: '无法识别',
        termination: '无法识别'
      }
    };
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