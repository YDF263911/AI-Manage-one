import { supabase } from "@/utils/supabase";

export interface DashboardStats {
  totalContracts: number;
  pendingContracts: number;
  analyzedContracts: number;
  complianceRate: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  categoryDistribution: Record<string, number>;
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
}

export interface ChartData {
  labels: string[];
  values: number[];
}

class DashboardService {
  /**
   * 获取仪表板统计信息
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // 获取当前用户ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("用户未登录");

      // 并行获取各种统计数据
      const [contractsResult, analysisResult, activityResult] =
        await Promise.all([
          this.getContractStats(user.id),
          this.getAnalysisStats(user.id),
          this.getRecentActivity(user.id),
        ]);

      return {
        totalContracts: contractsResult.total,
        pendingContracts: contractsResult.pending,
        analyzedContracts: contractsResult.analyzed,
        complianceRate: analysisResult.complianceRate,
        riskDistribution: analysisResult.riskDistribution,
        categoryDistribution: contractsResult.categoryDistribution,
        recentActivity: activityResult,
      };
    } catch (error) {
      console.error("获取仪表板统计数据失败:", error);
      throw error;
    }
  }

  /**
   * 获取合同统计信息
   */
  private async getContractStats(userId: string) {
    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const total = contracts?.length || 0;
    const pending =
      contracts?.filter(
        (c) => c.status === "uploaded" || c.status === "processing",
      ).length || 0;
    const analyzed =
      contracts?.filter(
        (c) =>
          c.status === "analyzed" ||
          c.status === "reviewed" ||
          c.status === "approved",
      ).length || 0;

    // 按类别统计
    const categoryDistribution: Record<string, number> = {};
    contracts?.forEach((contract) => {
      categoryDistribution[contract.category] =
        (categoryDistribution[contract.category] || 0) + 1;
    });

    return { total, pending, analyzed, categoryDistribution };
  }

  /**
   * 获取分析统计信息
   */
  private async getAnalysisStats(userId: string) {
    const { data: analyses, error } = await supabase
      .from("contract_analysis")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    const totalAnalyses = analyses?.length || 0;

    // 风险分布统计
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalComplianceScore = 0;

    analyses?.forEach((analysis) => {
      const riskLevel = analysis.overall_risk_level || "medium";
      riskDistribution[riskLevel] = (riskDistribution[riskLevel] || 0) + 1;

      if (analysis.compliance_score) {
        totalComplianceScore += analysis.compliance_score;
      }
    });

    const complianceRate =
      totalAnalyses > 0 ? Math.round(totalComplianceScore / totalAnalyses) : 0;

    return { riskDistribution, complianceRate };
  }

  /**
   * 获取最近活动
   */
  private async getRecentActivity(userId: string) {
    // 获取最近上传的合同
    const { data: recentContracts, error: contractsError } = await supabase
      .from("contracts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (contractsError) throw contractsError;

    // 获取最近的分析结果
    const { data: recentAnalyses, error: analysesError } = await supabase
      .from("contract_analysis")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (analysesError) throw analysesError;

    const activities: Array<{
      id: string;
      action: string;
      description: string;
      timestamp: string;
      user?: string;
    }> = [];

    // 添加合同上传活动
    recentContracts?.forEach((contract) => {
      activities.push({
        id: contract.id,
        action: "upload",
        description: `上传了合同: ${contract.filename}`,
        timestamp: contract.created_at,
      });
    });

    // 添加分析完成活动
    recentAnalyses?.forEach((analysis) => {
      activities.push({
        id: analysis.id,
        action: "analysis",
        description: `完成了合同分析，风险等级: ${analysis.overall_risk_level}`,
        timestamp: analysis.created_at,
      });
    });

    // 按时间排序并返回前5个
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 5);
  }

  /**
   * 获取图表数据 - 合同类别分布
   */
  async getCategoryChartData(): Promise<ChartData> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("用户未登录");

    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("category")
      .eq("user_id", user.id);

    if (error) throw error;

    const categoryCounts: Record<string, number> = {};
    contracts?.forEach((contract) => {
      categoryCounts[contract.category] =
        (categoryCounts[contract.category] || 0) + 1;
    });

    const labels = Object.keys(categoryCounts);
    const values = Object.values(categoryCounts);

    return { labels, values };
  }

  /**
   * 获取图表数据 - 风险分布
   */
  async getRiskChartData(): Promise<ChartData> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("用户未登录");

    const { data: analyses, error } = await supabase
      .from("contract_analysis")
      .select("overall_risk_level")
      .eq("user_id", user.id);

    if (error) throw error;

    const riskCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    analyses?.forEach((analysis) => {
      const riskLevel = analysis.overall_risk_level || "medium";
      riskCounts[riskLevel] = (riskCounts[riskLevel] || 0) + 1;
    });

    const labels = Object.keys(riskCounts).map((key) => {
      const labelsMap: Record<string, string> = {
        low: "低风险",
        medium: "中风险",
        high: "高风险",
        critical: "严重风险",
      };
      return labelsMap[key] || key;
    });

    const values = Object.values(riskCounts);

    return { labels, values };
  }

  /**
   * 获取图表数据 - 月度趋势
   */
  async getMonthlyTrendChartData(): Promise<ChartData> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("用户未登录");

    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("created_at")
      .eq("user_id", user.id)
      .gte(
        "created_at",
        new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error) throw error;

    // 按月份统计
    const monthCounts: Record<string, number> = {};
    const monthNames = [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月",
    ];

    contracts?.forEach((contract) => {
      const date = new Date(contract.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    // 生成最近6个月的标签和数据
    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = monthNames[date.getMonth()];

      labels.push(`${date.getFullYear()}年${monthName}`);
      values.push(monthCounts[monthKey] || 0);
    }

    return { labels, values };
  }
}

export const dashboardService = new DashboardService();
