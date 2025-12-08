import api from "@/utils/api";
import type { AxiosResponse } from "axios";

// AI分析结果类型定义
export interface RiskAnalysisResult {
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  summary: string;
  major_risks: Array<{
    type: string;
    description: string;
    clause: string;
    severity: string;
    suggestion: string;
  }>;
  compliance_issues: Array<{
    issue: string;
    clause: string;
    standard: string;
    suggestion: string;
  }>;
  missing_clauses: string[];
  key_terms: {
    parties: string;
    amount: string;
    duration: string;
    payment_terms: string;
    termination: string;
  };
}

export interface ClauseExtractionResult {
  clauses: Array<{
    clause_number: string;
    title: string;
    content: string;
    type: string;
    start_page?: number;
    end_page?: number;
  }>;
  metadata: {
    total_clauses: number;
    document_type: string;
    parties: string[];
  };
}

export interface QAResult {
  question: string;
  answer: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// AI API调用类
export class AIApi {
  private baseURL = "/ai";

  /**
   * 分析合同风险
   */
  async analyzeContractRisk(
    contractText: string,
    contractId?: string,
  ): Promise<AxiosResponse> {
    return api.post(`${this.baseURL}/analyze-risk`, {
      contractText,
      contractId,
    });
  }

  /**
   * 提取合同条款
   */
  async extractContractClauses(
    contractText: string,
    contractId?: string,
  ): Promise<AxiosResponse> {
    return api.post(`${this.baseURL}/extract-clauses`, {
      contractText,
      contractId,
    });
  }

  /**
   * 合同智能问答
   */
  async contractQa(
    question: string,
    contractText: string,
    contractId?: string,
  ): Promise<AxiosResponse> {
    return api.post(`${this.baseURL}/contract-qa`, {
      question,
      contractText,
      contractId,
    });
  }

  /**
   * 通用AI聊天
   */
  async chat(message: string, history: any[] = []): Promise<AxiosResponse> {
    return api.post(`${this.baseURL}/chat`, {
      message,
      history,
    });
  }

  /**
   * 检查AI服务健康状态
   */
  async checkHealth(): Promise<AxiosResponse> {
    return api.get(`${this.baseURL}/health`);
  }

  /**
   * 完整的合同分析（风险分析 + 条款提取）
   */
  async analyzeContract(contractText: string, contractId?: string) {
    try {
      const [riskAnalysis, clauseExtraction] = await Promise.all([
        this.analyzeContractRisk(contractText, contractId),
        this.extractContractClauses(contractText, contractId),
      ]);

      return {
        success: true,
        data: {
          riskAnalysis: riskAnalysis.data.data,
          clauseExtraction: clauseExtraction.data.data,
          usage: {
            risk_analysis: riskAnalysis.data.usage,
            clause_extraction: clauseExtraction.data.usage,
          },
        },
        contractId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "AI分析失败",
        contractId,
      };
    }
  }

  /**
   * 辅助生成合同模板
   */
  async generateContractTemplate(
    templateType: string,
    description: string = "",
  ) {
    return api.post(`${this.baseURL}/generate-template`, {
      templateType,
      description,
    }, {
      headers: {
        'x-user-id': 'test-user-id-123'
      }
    });
  }
}

// 创建单例实例
export const aiApi = new AIApi();
