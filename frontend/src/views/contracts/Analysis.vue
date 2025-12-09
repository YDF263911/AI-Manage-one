<template>
  <div class="contract-analysis">
    <div class="analysis-header">
      <el-page-header content="合同分析结果" @back="goBack">
        <template #content>
          <h2>合同分析结果</h2>
          <p>AI智能分析报告</p>
        </template>
      </el-page-header>
    </div>

    <div v-loading="loading" class="analysis-content">
      <!-- AI分析步骤进度显示 -->
      <div v-if="progress < 100 && !loading" class="analysis-progress">
        <el-card class="progress-card">
          <template #header>
            <div class="progress-header">
              <el-icon class="rotating"><Loading /></el-icon>
              <span>AI智能分析进行中</span>
            </div>
          </template>
          
          <!-- 分析步骤 -->
          <el-steps :active="currentStepIndex" align-center finish-status="success">
            <el-step title="文本提取" description="2-5秒" />
            <el-step title="AI分析" description="15-30秒" />
            <el-step title="生成报告" description="2-3秒" />
            <el-step title="完成" description="即将完成" />
          </el-steps>
          
          <!-- 进度条 -->
          <div class="progress-bar">
            <el-progress 
              :percentage="progress" 
              :status="progress >= 95 ? 'success' : ''"
              :stroke-width="8"
            />
            <p class="progress-text">
              {{ getCurrentStepText() }} - {{ progress }}%
            </p>
          </div>
        </el-card>
      </div>

      <!-- 分析概览 -->
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="overview-card">
            <div class="overview-item">
              <div class="overview-icon risk-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">
                  {{ getRiskLevelText(analysisResult?.risk_level) || "未知" }}
                </div>
                <div class="overview-label">风险等级</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card class="overview-card">
            <div class="overview-item">
              <div class="overview-icon issue-icon">
                <el-icon><CircleClose /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">{{ riskIssues.length }}</div>
                <div class="overview-label">风险点数量</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card class="overview-card">
            <div class="overview-item">
              <div class="overview-icon score-icon">
                <el-icon><Star /></el-icon>
              </div>
              <div class="overview-content">
                <div class="overview-value">
                  {{ analysisResult?.risk_score || 0 }}
                </div>
                <div class="overview-label">风险评分</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 风险分析详情 -->
      <el-row :gutter="20" class="analysis-details">
        <el-col :span="24">
          <el-card class="risk-analysis-card">
            <template #header>
              <span>风险分析详情</span>
            </template>

            <div class="risk-categories">
              <el-collapse v-model="activeCategory">
                <el-collapse-item
                  v-for="category in riskCategories"
                  :key="category.id"
                  :name="category.id"
                  :title="category.name"
                >
                  <div class="risk-items">
                    <div
                      v-for="item in category.items"
                      :key="item.id"
                      class="risk-item"
                      :class="`risk-severity-${item.severity}`"
                    >
                      <div class="risk-header">
                        <el-icon class="risk-icon">
                          <component :is="getRiskIcon(item.severity)" />
                        </el-icon>
                        <span class="risk-title">{{ item.title }}</span>
                        <el-tag
                          :type="getSeverityType(item.severity)"
                          size="small"
                        >
                          {{ getSeverityText(item.severity) }}
                        </el-tag>
                      </div>
                      <div class="risk-content">
                        <p class="risk-description">{{ item.description }}</p>
                        <div v-if="item.suggestions" class="risk-suggestions">
                          <h4>改进建议：</h4>
                          <ul>
                            <li
                              v-for="(suggestion, idx) in item.suggestions"
                              :key="idx"
                            >
                              {{ suggestion }}
                            </li>
                          </ul>
                        </div>
                        <div v-if="item.reference" class="risk-reference">
                          <el-text type="info" size="small">
                            参考依据：{{ item.reference }}
                          </el-text>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-card>
        </el-col>

        <el-col :span="24">
          <!-- 合同条款分析 -->
          <el-card class="clause-analysis-card">
            <template #header>
              <span>关键条款分析</span>
            </template>

            <el-table :data="clauseAnalysis" stripe>
              <el-table-column prop="clause" label="条款类型" width="120" />
              <el-table-column prop="content" label="内容摘要" />
              <el-table-column prop="assessment" label="评估结果" width="100">
                <template #default="scope">
                  <el-tag :type="getAssessmentType(scope.row.assessment)">
                    {{ scope.row.assessment }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>

      <!-- 分析报告 -->
      <el-row :gutter="20" class="report-section">
        <el-col :span="24">
          <el-card class="report-card">
            <template #header>
              <span>分析报告</span>
            </template>

            <div class="report-content">
              <div class="report-summary">
                <h4>总体评价</h4>
                <p>{{ analysisResult?.summary || "暂无分析结果" }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElProgress } from "element-plus";
import {
  Warning,
  CircleClose,
  Star,
  Clock,
  Loading,
} from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const analysisResult = ref<any>(null);
const progress = ref(0); // 分析进度
const isPolling = ref(false); // 是否正在轮询
const activeCategory = ref(["legal"]);

// 真实风险数据（从AI分析结果动态生成）
const riskIssues = ref<any[]>([]);

// 真实风险分类（从AI分析结果动态生成）
const riskCategories = ref<any[]>([]);

// 关键条款分析数据
const clauseAnalysis = ref([
  {
    clause: "付款条款",
    content: "甲方应在收到货物后30日内支付货款...",
    assessment: "中风险",
    original_text: "完整的付款条款原文...",
    analysis: "付款时间表述不够具体，缺少付款方式说明",
    suggestions: ["明确具体付款日期", "指定付款账户"],
  },
]);

// 分析步骤定义
const analysisSteps = [
  { key: 'extracting', title: '文本提取', duration: '2-5秒', maxProgress: 20 },
  { key: 'analyzing', title: 'AI分析', duration: '15-30秒', maxProgress: 70 },
  { key: 'generating', title: '生成报告', duration: '2-3秒', maxProgress: 95 },
  { key: 'completed', title: '完成', duration: '完成', maxProgress: 100 }
];

// 当前步骤索引
const currentStepIndex = computed(() => {
  if (progress.value <= 20) return 0;
  if (progress.value <= 70) return 1;
  if (progress.value < 100) return 2;
  return 3;
});





const goBack = () => {
  router.back();
};

const loadAnalysisResult = async () => {
  const contractId = route.query.contract_id as string;

  if (!contractId) {
    ElMessage.error("缺少合同ID");
    return;
  }

  try {
    // 使用后端API代理，避免直接调用Supabase REST API
    // 1. 获取合同基本信息和分析结果
    const token = localStorage.getItem('token');
    const authStore = useAuthStore();
    
    const response = await fetch(`/api/analysis/${contractId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'x-user-id': authStore.user?.id || ''
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '获取分析结果失败');
    }

    // 如果后端返回完整数据
    if (result.data) {
      const analysisData = result.data;
      
      // 合并数据
      analysisResult.value = {
        ...analysisData.contract_info || {},
        risk_score: analysisData.confidence_score * 100,
        risk_level: analysisData.overall_risk_level,
        analysis_time: analysisData.analysis_time,
        summary: analysisData.risk_summary || "分析完成",
        analysis_data: analysisData.analysis_result,
        file_path: analysisData.contract_info?.file_path,
        filename: analysisData.contract_info?.filename
      };

      progress.value = 100; // 分析完成
      isPolling.value = false; // 停止轮询

      // 处理分析结果数据
      processAnalysisData(analysisData.analysis_result);
    } else {
      // 没有分析结果，显示分析中状态
      analysisResult.value = {
        risk_score: 0,
        risk_level: "uploaded",
        analysis_time: 0,
        summary: "合同正在分析中，请稍候查看...",
      };

      // 开始轮询检查分析结果
      if (!isPolling.value) {
        startPolling(contractId);
      }
    }
  } catch (error: any) {
    ElMessage.error(`加载分析结果失败: ${error.message}`);
    progress.value = 0;
    isPolling.value = false;
  } finally {
    loading.value = false;
  }
};

// 轮询检查分析结果
const startPolling = (contractId: string) => {
  isPolling.value = true;
  progress.value = 10; // 初始进度

  const pollInterval = setInterval(async () => {
    try {
      // 增加进度显示
      if (progress.value < 90) {
        progress.value += Math.floor(Math.random() * 10) + 5;
      }

      // 使用后端API代理检查分析结果
      const token = localStorage.getItem('token');
      const authStore = useAuthStore();
      
      const response = await fetch(`/api/analysis/${contractId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'x-user-id': authStore.user?.id || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // 如果后端返回数据且状态正常，说明分析已完成
        if (result.success && result.data) {
          // 分析完成
          progress.value = 100;
          isPolling.value = false;
          clearInterval(pollInterval);

          // 重新加载分析结果
          await loadAnalysisResult();

          // 显示成功消息
          ElMessage.success("合同分析已完成");
        }
      }
    } catch (err) {
      console.error("轮询分析结果失败:", err);
      // 轮询失败继续尝试，直到手动停止或分析完成
    }
  }, 3000); // 每3秒轮询一次
};

// 处理分析结果数据
const processAnalysisData = (analysisData: any) => {
  if (!analysisData) return;

  // 1. 处理主要风险点
  if (analysisData.major_risks && Array.isArray(analysisData.major_risks)) {
    riskIssues.value = analysisData.major_risks.map((risk: any, index: number) => ({
      id: index + 1,
      severity: risk.severity || 'medium',
      description: risk.description || '风险点',
      type: risk.type || '未知类型',
      clause: risk.clause || '相关条款',
      suggestion: risk.suggestion || '改进建议'
    }));
  }

  // 2. 处理风险分类（基于AI分析结果动态生成）
  const categoriesMap = new Map();
  
  if (analysisData.major_risks && analysisData.major_risks.length > 0) {
    analysisData.major_risks.forEach((risk: any) => {
      const categoryName = risk.type || '其他风险';
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, {
          id: categoryName.toLowerCase().replace(/\\s+/g, '-'),
          name: categoryName,
          items: []
        });
      }
      
      categoriesMap.get(categoryName).items.push({
        id: riskIssues.value.length + 1,
        title: risk.description || '风险点',
        severity: risk.severity || 'medium',
        description: risk.description || '风险描述',
        suggestions: risk.suggestion ? [risk.suggestion] : ['请关注此风险点'],
        reference: risk.clause || 'AI智能分析结果'
      });
    });
  }
  
  // 添加合规性问题分类
  if (analysisData.compliance_issues && analysisData.compliance_issues.length > 0) {
    categoriesMap.set('合规性检查', {
      id: 'compliance',
      name: '合规性检查',
      items: analysisData.compliance_issues.map((issue: any, index: number) => ({
        id: 1000 + index,
        title: issue.issue || '合规问题',
        severity: 'high',
        description: issue.issue || '合规性问题',
        suggestions: issue.suggestion ? [issue.suggestion] : ['请咨询法律专家'],
        reference: issue.standard || '相关法规标准'
      }))
    });
  }
  
  // 添加缺失条款分类
  if (analysisData.missing_clauses && analysisData.missing_clauses.length > 0) {
    categoriesMap.set('缺失条款', {
      id: 'missing-clauses',
      name: '缺失条款',
      items: analysisData.missing_clauses.map((clause: string, index: number) => ({
        id: 2000 + index,
        title: clause,
        severity: 'medium',
        description: `合同缺少${clause}`,
        suggestions: ['建议补充此条款以完善合同内容'],
        reference: '标准合同模板'
      }))
    });
  }
  
  // 确保至少有一个分类
  if (categoriesMap.size === 0) {
    categoriesMap.set('总体风险', {
      id: 'general',
      name: '总体风险',
      items: [{
        id: 1,
        title: '合同风险概述',
        severity: analysisData.risk_level || 'medium',
        description: analysisData.summary || '合同风险分析已完成',
        suggestions: ['请仔细审阅合同条款'],
        reference: 'AI智能分析结果'
      }]
    });
  }
  
  riskCategories.value = Array.from(categoriesMap.values());

  // 3. 处理关键条款
  if (analysisData.key_terms) {
    clauseAnalysis.value = Object.entries(analysisData.key_terms).map(
      ([key, value]: [string, any]) => ({
        clause: getClauseName(key),
        content: String(value),
        assessment: getAssessmentByKey(key, value),
        original_text: String(value),
        analysis: getClauseAnalysis(key, value),
        suggestions: getClauseSuggestions(key, value),
      }),
    );
  }

  console.log('处理完成的分析数据:', {
    riskIssues: riskIssues.value,
    riskCategories: riskCategories.value,
    clauseAnalysis: clauseAnalysis.value
  });
};

const getRiskIcon = (severity: string) => {
  const icons: any = {
    low: "CircleCheck",
    medium: "Warning",
    high: "CircleClose",
  };
  return icons[severity] || "InfoFilled";
};

const getSeverityType = (severity: string) => {
  const types: any = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return types[severity] || "info";
};

const getSeverityText = (severity: string) => {
  const texts: any = {
    low: "低",
    medium: "中",
    high: "高",
  };
  return texts[severity] || severity;
};

const getAssessmentType = (assessment: string) => {
  const types: any = {
    低风险: "success",
    中风险: "warning",
    高风险: "danger",
  };
  return types[assessment] || "info";
};

// 辅助函数
const getClauseName = (key: string) => {
  const clauseMap: { [key: string]: string } = {
    parties: "合同主体",
    amount: "合同金额",
    duration: "合同期限",
    payment_terms: "付款条款",
    termination: "终止条款",
    effective_date: "生效日期",
    expiration_date: "到期日期",
    sign_date: "签署日期"
  };
  return clauseMap[key] || key;
};

const getAssessmentByKey = (key: string, value: any) => {
  // 根据字段内容和上下文进行智能评估
  const strValue = String(value);
  
  if (strValue === '待补充' || strValue === '未填写' || !strValue.trim()) {
    return '高风险';
  }
  
  if (strValue.length < 5) {
    return '中风险';
  }
  
  return '低风险';
};

const getClauseAnalysis = (key: string, value: any) => {
  const strValue = String(value);
  
  if (strValue === '待补充' || strValue === '未填写') {
    return `合同${getClauseName(key)}信息不完整，需要补充具体内容`;
  }
  
  return `对${getClauseName(key)}的分析：${strValue}`;
};

const getClauseSuggestions = (key: string, value: any) => {
  const strValue = String(value);
  
  if (strValue === '待补充' || strValue === '未填写') {
    return ['建议补充具体的合同条款内容'];
  }
  
  const suggestions = [];
  
  if (key === 'payment_terms' && strValue.length < 20) {
    suggestions.push('付款条款可以更详细，明确付款时间和方式');
  }
  
  if (key === 'parties' && !strValue.includes('公司') && !strValue.includes('个人')) {
    suggestions.push('合同主体信息需要更明确');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('条款内容基本完整');
  }
  
  return suggestions;
};

const getRiskLevelText = (level: string) => {
  const texts: any = {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
    uploaded: "待分析",
    pending: "分析中",
  };
  return texts[level] || "未知";
};

const formatAnalysisTime = (timeInput: number | string) => {
  if (!timeInput || timeInput === '' || timeInput === null) return "计算中...";
  
  // 如果是字符串格式，尝试解析
  if (typeof timeInput === 'string') {
    const timeStr = timeInput.trim();
    
    // 格式1: "00:00:01.5" (时:分:秒.毫秒)
    if (timeStr.includes(':')) {
      const timeParts = timeStr.split(':');
      if (timeParts.length >= 3) {
        try {
          const hours = parseFloat(timeParts[0]) || 0;
          const minutes = parseFloat(timeParts[1]) || 0;
          const secondsStr = timeParts[2];
          const seconds = parseFloat(secondsStr) || 0;
          
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          
          if (totalSeconds < 1) {
            return `${(totalSeconds * 1000).toFixed(0)}毫秒`;
          } else if (totalSeconds < 60) {
            return `${totalSeconds.toFixed(1)}秒`;
          } else {
            const displayMinutes = Math.floor(totalSeconds / 60);
            const remainingSeconds = totalSeconds % 60;
            return `${displayMinutes}分${remainingSeconds.toFixed(0)}秒`;
          }
        } catch (parseError) {
          console.warn('时间解析失败:', parseError);
          return timeStr;
        }
      }
    }
    
    // 格式2: "1.5秒" 
    if (timeStr.includes('秒')) {
      return timeStr;
    }
    
    // 如果无法解析，返回原值
    return timeStr;
  }
  
  // 如果是数字
  const seconds = timeInput as number;
  if (isNaN(seconds)) return "格式错误";
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}毫秒`;
  if (seconds < 60) return `${seconds.toFixed(1)}秒`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}分${remainingSeconds.toFixed(0)}秒`;
};

// 获取当前步骤文本
const getCurrentStepText = () => {
  const step = analysisSteps[currentStepIndex.value];
  return step ? step.title : '准备中...';
};

onMounted(() => {
  loadAnalysisResult();
});
</script>

<style scoped>
.contract-analysis {
  padding: 20px;
}

.analysis-header {
  margin-bottom: 30px;
}

.overview-card {
  margin-bottom: 20px;
}

.overview-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.overview-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.risk-icon {
  background: #f56c6c;
}
.issue-icon {
  background: #e6a23c;
}
.score-icon {
  background: #409eff;
}
.time-icon {
  background: #67c23a;
}

.overview-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.overview-label {
  color: #909399;
  font-size: 14px;
}

.analysis-details {
  margin-top: 20px;
}

.risk-analysis-card,
.clause-analysis-card {
  margin-bottom: 20px;
}

.report-section {
  margin-top: 20px;
}

.risk-item {
  padding: 15px;
  margin-bottom: 10px;
  border-left: 4px solid #e4e7ed;
  background: #f8f9fa;
  border-radius: 4px;
}

.risk-severity-high {
  border-left-color: #f56c6c;
}
.risk-severity-medium {
  border-left-color: #e6a23c;
}
.risk-severity-low {
  border-left-color: #67c23a;
}

.risk-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.risk-icon {
  margin-right: 10px;
  font-size: 18px;
}

.risk-severity-high .risk-icon {
  color: #f56c6c;
}
.risk-severity-medium .risk-icon {
  color: #e6a23c;
}
.risk-severity-low .risk-icon {
  color: #67c23a;
}

.risk-title {
  font-weight: 500;
  margin-right: 10px;
}

.risk-content {
  margin-left: 28px;
}

.risk-description {
  margin-bottom: 10px;
  color: #606266;
}

.risk-suggestions {
  background: white;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.risk-suggestions h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.risk-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.risk-reference {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e4e7ed;
}

.report-content {
  padding: 10px 0;
}

.report-summary {
  margin-bottom: 20px;
}

.report-summary h4 {
  margin-bottom: 10px;
}

@media print {
  .analysis-header {
    display: none;
  }
}

.analysis-progress {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.progress-text {
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
}

.progress-card {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.rotating {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-bar {
  margin-top: 20px;
  text-align: center;
}

.progress-bar .el-steps {
  margin-bottom: 20px;
}
</style>
