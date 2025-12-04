<template>
  <div class="analysis-container">
    <div class="header">
      <h1>智能分析</h1>
      <el-button type="primary" @click="startBatchAnalysis">
        <el-icon><Analysis /></el-icon>
        批量分析
      </el-button>
    </div>

    <!-- 分析任务列表 -->
    <div class="task-list">
      <el-table v-loading="loading" :data="analysisTasks" style="width: 100%">
        <el-table-column prop="contractName" label="合同名称" min-width="200" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{
              getStatusText(row.status)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="riskLevel" label="风险等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getRiskTag(row.riskLevel)">{{
              row.riskLevel
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="riskScore" label="风险评分" width="120">
          <template #default="{ row }">
            <div v-if="row.analyzing" class="analyzing-indicator">
              <el-progress 
                :percentage="50" 
                :stroke-width="6"
                :color="'#409eff'"
                :show-text="false"
              />
              <span class="analyzing-text">分析中...</span>
            </div>
            <div v-else-if="row.hasAnalysis" class="risk-score-display">
              <el-progress 
                :percentage="Math.round(row.riskScore * 100)" 
                :stroke-width="8"
                :color="row.riskScore > 0.7 ? '#f56c6c' : row.riskScore > 0.3 ? '#e6a23c' : '#67c23a'"
                :show-text="false"
              />
              <span class="score-text">{{ Math.round(row.riskScore * 100) }}%</span>
            </div>
            <span v-else class="no-analysis">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="analysisTime" label="分析用时" width="120">
          <template #default="{ row }">
            {{ row.analysisTime }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="completeTime" label="完成时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              :type="getSmartButtonType(row)" 
              @click="handleSmartAnalysis(row)"
              :loading="row.analyzing"
              :disabled="row.analyzing"
            >
              {{ getAnalysisButtonText(row) }}
            </el-button>
            <el-button size="small" type="danger" @click="deleteTask(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分析结果详情 -->
    <el-dialog v-model="showResultDialog" title="分析结果" width="800px">
      <div v-if="currentResult" class="result-content">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="风险分析" name="risk">
            <div class="risk-analysis">
              <h3>
                风险等级:
                <el-tag :type="getRiskTag(currentResult.riskLevel)">{{
                  currentResult.riskLevel
                }}</el-tag>
              </h3>
              <div class="risk-items">
                <div
                  v-for="risk in currentResult.risks"
                  :key="risk.id"
                  class="risk-item"
                  :class="`risk-${risk.severity}`"
                >
                  <div class="risk-header">
                    <span class="risk-title">{{ risk.title }}</span>
                    <el-tag :type="getSeverityTag(risk.severity)" size="small">
                      {{ getSeverityText(risk.severity) }}
                    </el-tag>
                  </div>
                  <p class="risk-description">{{ risk.description }}</p>
                  <div class="risk-suggestion">
                    <strong>建议:</strong> {{ risk.suggestion }}
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="合规检查" name="compliance">
            <div class="compliance-analysis">
              <el-table
                :data="currentResult.complianceChecks"
                style="width: 100%"
              >
                <el-table-column prop="item" label="检查项" width="200" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag
                      :type="row.status === 'pass' ? 'success' : 'danger'"
                    >
                      {{ row.status === "pass" ? "通过" : "不通过" }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="描述" />
              </el-table>
            </div>
          </el-tab-pane>
          <el-tab-pane label="缺失条款" name="missing">
            <div class="missing-analysis">
              <div v-if="currentResult.missingClauses && currentResult.missingClauses.length > 0">
                <h3>缺失的重要条款</h3>
                <el-tag
                  v-for="(clause, index) in currentResult.missingClauses"
                  :key="index"
                  type="warning"
                  style="margin: 5px;"
                >
                  {{ clause }}
                </el-tag>
              </div>
              <div v-else>
                <p>未发现明显缺失条款</p>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="关键信息" name="keyInfo">
            <div class="key-info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="合同金额">{{
                  currentResult.keyInfo.amount
                }}</el-descriptions-item>
                <el-descriptions-item label="合同期限">{{
                  currentResult.keyInfo.duration
                }}</el-descriptions-item>
                <el-descriptions-item label="签署方">{{
                  currentResult.keyInfo.parties
                }}</el-descriptions-item>
                <el-descriptions-item label="生效日期">{{
                  currentResult.keyInfo.effectiveDate
                }}</el-descriptions-item>
                <el-descriptions-item label="到期日期">{{
                  currentResult.keyInfo.expiryDate
                }}</el-descriptions-item>
                <el-descriptions-item label="违约责任">{{
                  currentResult.keyInfo.liability
                }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="showResultDialog = false">关闭</el-button>
        <el-button type="primary" @click="exportAnalysisResult"
          >导出报告</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { Analysis } from "@element-plus/icons-vue";
import { useContractStore } from "../../stores/contract";
import type { Contract, ContractAnalysis } from "../../utils/supabase";

const contractStore = useContractStore();

// 界面状态
const loading = ref(false);
const showResultDialog = ref(false);
const activeTab = ref("risk");
const currentResult = ref<any>(null);
const selectedContract = ref<Contract | null>(null);

// 分析状态管理
const analyzingTasks = ref<Set<string>>(new Set());

// 从contractStore获取合同数据
const contracts = computed(() => contractStore.contracts);
const contractAnalyses = computed(() => contractStore.contractAnalyses);

// 映射到分析任务列表
const analysisTasks = computed(() => {
  return contracts.value.map((contract) => {
    const analysis = contractAnalyses.value.find(
      (a) => a.contract_id === contract.id,
    );
    const analysisResult = analysis?.analysis_result;
    
    // 处理风险等级显示
    let riskLevel = "未分析";
    let riskScore = 0;
    
    if (analysisResult) {
      riskLevel = analysisResult.risk_level || analysisResult.risk_level || "未分析";
      riskScore = analysisResult.risk_score || analysisResult.risk_score || 0;
    }
    
    return {
      id: contract.id,
      contractName: contract.filename || contract.name,
      status: contract.status,
      riskLevel: riskLevel,
      riskScore: riskScore,
      analysisTime: analysis?.analysis_time || "-",
      confidenceScore: analysis?.confidence_score || 0,
      createTime: contract.created_at,
      completeTime: analysis?.completed_at || "-",
      hasAnalysis: !!analysisResult,
      analyzing: analyzingTasks.value.has(contract.id)
    };
  });
});

// 获取状态标签类型
const getStatusTag = (status: string) => {
  const statusMap: { [key: string]: string } = {
    uploaded: "info",
    processing: "warning",
    analyzed: "success",
    reviewed: "primary",
    approved: "success",
    rejected: "danger",
    failed: "danger",
  };
  return statusMap[status] || "info";
};

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    uploaded: "待处理",
    processing: "分析中",
    analyzed: "已完成",
    reviewed: "已审核",
    approved: "已批准",
    rejected: "已拒绝",
    failed: "失败",
  };
  return statusMap[status] || status;
};

// 获取风险等级标签类型
const getRiskTag = (riskLevel: string | null | undefined) => {
  if (!riskLevel) return "info";
  const riskMap: { [key: string]: string } = {
    low: "success",
    medium: "warning",
    high: "danger",
    低: "success",
    中等: "warning",
    高: "danger",
  };
  return riskMap[riskLevel] || "info";
};

// 获取严重性标签类型
const getSeverityTag = (severity: string) => {
  const severityMap: { [key: string]: string } = {
    low: "info",
    medium: "warning",
    high: "danger",
  };
  return severityMap[severity] || "info";
};

// 获取严重性文本
const getSeverityText = (severity: string) => {
  const severityMap: { [key: string]: string } = {
    low: "低",
    medium: "中",
    high: "高",
  };
  return severityMap[severity] || severity;
};

// 开始批量分析
const startBatchAnalysis = async () => {
  try {
    const result = await contractStore.batchAnalyzeContracts();
    if (result.success) {
      ElMessage.success("批量分析已开始");
    } else {
      ElMessage.error(result.error || "批量分析失败");
    }
  } catch (error) {
    console.error("批量分析失败:", error);
    ElMessage.error("批量分析失败，请重试");
  }
};

// 查看分析结果
const viewAnalysisResult = async (task: any) => {
  try {
    // 获取合同详情和分析结果
    const contract = contracts.value.find((c) => c.id === task.id);
    const analysis = contractAnalyses.value.find(
      (a) => a.contract_id === task.id,
    );

    if (!contract || !analysis) {
      ElMessage.warning("未找到分析结果");
      return;
    }

    selectedContract.value = contract;

    // 处理真实AI分析结果
    const analysisResult = analysis.analysis_result;
    
    // 构建更实用的分析结果数据结构
    currentResult.value = {
      riskLevel: getChineseRiskLevel(analysisResult?.risk_level) || "未分析",
      riskScore: analysisResult?.risk_score || task.riskScore || 0,
      summary: analysisResult?.summary || "该合同已完成AI智能分析",
      
      // 风险分析 - 优化显示逻辑
      risks: processRisks(analysisResult?.major_risks || analysisResult?.risks || []),
      
      // 合规检查 - 优化数据结构
      complianceChecks: processCompliance(analysisResult?.compliance_issues || analysisResult?.compliance || []),
      
      // 缺失条款 - 优化显示
      missingClauses: processMissingClauses(analysisResult?.missing_clauses || analysisResult?.missing_terms || []),
      
      // 关键信息 - 优化提取逻辑
      keyInfo: processKeyInfo(analysisResult?.key_terms || analysisResult?.important_info || {}, contract)
    };

    showResultDialog.value = true;
  } catch (error) {
    console.error("获取分析结果失败:", error);
    ElMessage.error("获取分析结果失败");
  }
};

// 辅助函数：处理风险等级显示
const getChineseRiskLevel = (level: string) => {
  const levelMap: { [key: string]: string } = {
    low: "低",
    medium: "中等", 
    high: "高",
    "低": "低",
    "中等": "中等",
    "高": "高"
  };
  return levelMap[level] || level || "未分析";
};

// 处理风险数据
const processRisks = (risks: any[]) => {
  if (!risks || !Array.isArray(risks)) return [];
  
  return risks.map((risk, index) => ({
    id: index + 1,
    title: risk.type || risk.title || `风险项${index + 1}`,
    description: risk.description || risk.details || "风险描述信息",
    severity: risk.severity || risk.level || "medium",
    suggestion: risk.suggestion || risk.recommendation || "建议进行详细审查",
    clause: risk.clause || risk.clause_reference || "相关条款"
  }));
};

// 处理合规检查数据
const processCompliance = (compliance: any[]) => {
  if (!compliance || !Array.isArray(compliance)) {
    return [{
      item: "AI合规检查",
      status: "pass",
      description: "基于AI模型的合规性分析结果"
    }];
  }
  
  return compliance.map((issue, index) => ({
    item: issue.issue || issue.item || `合规检查项${index + 1}`,
    status: issue.status === "fail" ? "fail" : "pass",
    description: issue.suggestion || issue.description || "合规性检查通过",
    details: issue.details || ""
  }));
};

// 处理缺失条款
const processMissingClauses = (clauses: any[]) => {
  if (!clauses || !Array.isArray(clauses)) return [];
  
  return clauses.map(clause => 
    typeof clause === 'string' ? clause : clause.name || clause.clause || "重要条款"
  );
};

// 处理关键信息
const processKeyInfo = (keyTerms: any, contract: any) => {
  return {
    amount: keyTerms?.amount || contract?.amount || "待补充",
    duration: keyTerms?.duration || contract?.duration || "待补充",
    parties: keyTerms?.parties || contract?.parties || "待补充",
    effectiveDate: contract?.effective_date || keyTerms?.effective_date || "待补充",
    expiryDate: contract?.expiration_date || keyTerms?.expiry_date || "待补充",
    liability: keyTerms?.liability || "待补充",
    paymentTerms: keyTerms?.payment_terms || "待补充",
    jurisdiction: keyTerms?.jurisdiction || "待补充"
  };
};

// 重新分析合同
const reAnalyze = async (task: any) => {
  try {
    const result = await contractStore.analyzeContract(task.id);
    if (result.success) {
      ElMessage.success(`开始重新分析合同: ${task.contractName}`);
    } else {
      ElMessage.error(result.error || "重新分析失败");
    }
  } catch (error) {
    console.error("重新分析失败:", error);
    ElMessage.error("重新分析失败，请重试");
  }
};

// 删除分析任务
const deleteTask = async (task: any) => {
  try {
    const result = await contractStore.deleteContract(task.id);
    if (result.success) {
      ElMessage.success(`删除分析任务: ${task.contractName}`);
    } else {
      ElMessage.error(result.error || "删除失败");
    }
  } catch (error) {
    console.error("删除任务失败:", error);
    ElMessage.error("删除失败，请重试");
  }
};

// 导出分析结果
const exportAnalysisResult = async () => {
  if (!selectedContract.value) return;

  try {
    const result = await contractStore.exportContractAnalysis(
      selectedContract.value.id,
    );
    if (result.success) {
      ElMessage.success("分析报告导出成功");
    } else {
      ElMessage.error(result.error || "导出失败");
    }
  } catch (error) {
    console.error("导出失败:", error);
    ElMessage.error("导出失败，请重试");
  }
};

// 获取分析按钮文本
const getAnalysisButtonText = (task: any) => {
  if (task.analyzing) {
    return "分析中...";
  }
  return task.hasAnalysis ? "查看结果" : "智能分析";
};

// 获取智能按钮类型
const getSmartButtonType = (task: any) => {
  if (task.analyzing) {
    return "info";
  }
  return task.hasAnalysis ? "success" : "primary";
};

// 智能分析处理函数
const handleSmartAnalysis = async (task: any) => {
  try {
    // 如果正在分析中，不重复点击
    if (task.analyzing) {
      return;
    }

    // 如果已有分析结果，直接查看结果
    if (task.hasAnalysis) {
      await viewAnalysisResult(task);
      return;
    }

    // 开始分析
    analyzingTasks.value.add(task.id);
    
    const result = await contractStore.analyzeContract(task.id);
    
    if (result.success) {
      ElMessage.success(`开始分析合同: ${task.contractName}`);
      
      // 等待分析完成并刷新数据
      setTimeout(async () => {
        await loadData();
        analyzingTasks.value.delete(task.id);
        
        // 分析完成后自动显示结果
        const updatedTask = analysisTasks.value.find(t => t.id === task.id);
        if (updatedTask?.hasAnalysis) {
          await viewAnalysisResult(updatedTask);
        }
      }, 2000);
      
    } else {
      ElMessage.error(result.error || "分析失败");
      analyzingTasks.value.delete(task.id);
    }
  } catch (error) {
    console.error("智能分析失败:", error);
    ElMessage.error("分析失败，请重试");
    analyzingTasks.value.delete(task.id);
  }
};

// 获取分析按钮文本
const getAnalysisButtonText = (task: any) => {
  if (task.analyzing) {
    return "分析中...";
  }
  return task.hasAnalysis ? "查看结果" : "智能分析";
};

// 获取智能按钮类型
const getSmartButtonType = (task: any) => {
  if (task.analyzing) {
    return "info";
  }
  return task.hasAnalysis ? "success" : "primary";
};

// 智能分析处理函数
const handleSmartAnalysis = async (task: any) => {
  try {
    // 如果正在分析中，不重复点击
    if (task.analyzing) {
      return;
    }

    // 如果已有分析结果，直接查看结果
    if (task.hasAnalysis) {
      await viewAnalysisResult(task);
      return;
    }

    // 开始分析
    analyzingTasks.value.add(task.id);
    
    const result = await contractStore.analyzeContract(task.id);
    
    if (result.success) {
      ElMessage.success(`开始分析合同: ${task.contractName}`);
      
      // 等待分析完成并刷新数据
      setTimeout(async () => {
        await loadData();
        analyzingTasks.value.delete(task.id);
        
        // 分析完成后自动显示结果
        const updatedTask = analysisTasks.value.find(t => t.id === task.id);
        if (updatedTask?.hasAnalysis) {
          await viewAnalysisResult(updatedTask);
        }
      }, 2000);
      
    } else {
      ElMessage.error(result.error || "分析失败");
      analyzingTasks.value.delete(task.id);
    }
  } catch (error) {
    console.error("智能分析失败:", error);
    ElMessage.error("分析失败，请重试");
    analyzingTasks.value.delete(task.id);
  }
};

// 加载合同数据
const loadData = async () => {
  loading.value = true;
  try {
    await Promise.all([
      contractStore.loadContracts(),
      contractStore.loadContractAnalyses(),
    ]);
  } catch (error) {
    console.error("加载数据失败:", error);
    ElMessage.error("获取分析任务失败");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.analysis-container {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  min-height: calc(100vh - 100px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.task-list {
  margin-bottom: 20px;
}

.result-content {
  max-height: 500px;
  overflow-y: auto;
}

.risk-analysis {
  padding: 0 10px;
}

.risk-items {
  margin-top: 20px;
}

.risk-item {
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 4px;
  border-left: 4px solid #e0e0e0;
}

.risk-low {
  border-left-color: #67c23a;
  background-color: #f0f9ff;
}

.risk-medium {
  border-left-color: #e6a23c;
  background-color: #fdf6ec;
}

.risk-high {
  border-left-color: #f56c6c;
  background-color: #fef0f0;
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.risk-title {
  font-weight: bold;
  font-size: 14px;
}

.risk-description {
  color: #666;
  font-size: 13px;
  margin-bottom: 8px;
}

.risk-suggestion {
  font-size: 13px;
  color: #333;
}

.compliance-analysis,
.key-info,
.missing-analysis {
  padding: 0 10px;
}

.missing-analysis h3 {
  margin-bottom: 16px;
  color: #333;
  font-size: 16px;
}

.missing-analysis .el-tag {
  margin: 4px;
  font-size: 12px;
}

.missing-analysis p {
  color: #999;
  font-style: italic;
  text-align: center;
  margin: 20px 0;
}

/* 进度条样式优化 */
.el-progress-bar__outer {
  border-radius: 0;
}

.el-progress-bar__inner {
  border-radius: 0;
}

/* 表格样式优化 */
.task-list .el-table {
  margin-top: 20px;
}

.task-list .el-table th {
  background-color: #f5f7fa;
  font-weight: bold;
}

/* 对话框样式优化 */
.result-content {
  max-height: 500px;
  overflow-y: auto;
}

/* 分析进度指示器样式 */
.analyzing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.analyzing-text {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
}

.risk-score-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-text {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  min-width: 30px;
}

.no-analysis {
  color: #999;
  font-style: italic;
}

/* 表格行状态样式 */
.el-table .analyzing-row {
  background-color: #f0f9ff;
}

.el-table .analyzing-row:hover {
  background-color: #e8f4ff;
}

/* 风险分析结果样式优化 */
.risk-analysis h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.risk-analysis .el-tag {
  font-size: 14px;
  padding: 4px 12px;
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .analysis-container {
    padding: 10px;
  }
  
  .header h1 {
    font-size: 18px;
  }
  
  .analyzing-indicator,
  .risk-score-display {
    flex-direction: column;
    gap: 4px;
  }
}

/* 分析进度指示器样式 */
.analyzing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.analyzing-text {
  font-size: 12px;
  color: #409eff;
  font-weight: 500;
}

.risk-score-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-text {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  min-width: 30px;
}

.no-analysis {
  color: #999;
  font-style: italic;
}

/* 表格行状态样式 */
.el-table .analyzing-row {
  background-color: #f0f9ff;
}

.el-table .analyzing-row:hover {
  background-color: #e8f4ff;
}

/* 风险分析结果样式优化 */
.risk-analysis h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.risk-analysis .el-tag {
  font-size: 14px;
  padding: 4px 12px;
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .analysis-container {
    padding: 10px;
  }
  
  .header h1 {
    font-size: 18px;
  }
  
  .analyzing-indicator,
  .risk-score-display {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
