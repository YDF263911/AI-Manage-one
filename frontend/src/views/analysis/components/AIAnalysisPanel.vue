<template>
  <div class="ai-analysis-panel">
    <!-- AI分析控制面板 -->
    <div class="control-panel">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>🤖 AI智能分析</span>
            <el-button
              type="primary"
              size="small"
              :loading="isAnalyzing"
              @click="handleAnalyze"
            >
              {{ isAnalyzing ? "分析中..." : "开始分析" }}
            </el-button>
          </div>
        </template>

        <!-- AI服务状态 -->
        <div class="status-section">
          <el-alert
            :title="aiStatus.title"
            :type="aiStatus.type"
            :description="aiStatus.description"
            :closable="false"
            show-icon
          />
        </div>

        <!-- 分析选项 -->
        <div class="options-section">
          <el-form :model="analysisOptions" label-width="100px">
            <el-form-item label="分析模式">
              <el-radio-group v-model="analysisOptions.mode">
                <el-radio label="full">完整分析</el-radio>
                <el-radio label="risk">风险分析</el-radio>
                <el-radio label="clauses">条款提取</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="风险等级">
              <el-slider
                v-model="analysisOptions.riskThreshold"
                :min="0"
                :max="1"
                :step="0.1"
                show-stops
              />
              <span class="slider-value">{{
                analysisOptions.riskThreshold
              }}</span>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>

    <!-- 分析结果展示 -->
    <div v-if="analysisResult" class="results-panel">
      <!-- 风险分析结果 -->
      <el-card v-if="analysisResult.riskAnalysis" class="result-card">
        <template #header>
          <div class="card-header">
            <span>⚠️ 风险分析结果</span>
            <el-tag
              :type="getRiskLevelType(analysisResult.riskAnalysis.risk_level)"
            >
              {{ analysisResult.riskAnalysis.risk_level.toUpperCase() }}
            </el-tag>
          </div>
        </template>

        <div class="risk-summary">
          <p>{{ analysisResult.riskAnalysis.summary }}</p>
          <div class="risk-score">
            <el-progress
              :percentage="analysisResult.riskAnalysis.risk_score * 100"
              :status="getRiskLevelType(analysisResult.riskAnalysis.risk_level)"
              :stroke-width="8"
            />
            <span
              >风险评分:
              {{
                (analysisResult.riskAnalysis.risk_score * 100).toFixed(1)
              }}%</span
            >
          </div>
        </div>

        <!-- 主要风险 -->
        <div
          v-if="analysisResult.riskAnalysis.major_risks.length > 0"
          class="major-risks"
        >
          <h4>主要风险点</h4>
          <el-collapse>
            <el-collapse-item
              v-for="(risk, index) in analysisResult.riskAnalysis.major_risks"
              :key="index"
              :title="risk.type"
            >
              <div class="risk-detail">
                <p><strong>描述:</strong> {{ risk.description }}</p>
                <p><strong>相关条款:</strong> {{ risk.clause }}</p>
                <p>
                  <strong>严重程度:</strong>
                  <el-tag :type="getRiskLevelType(risk.severity)" size="small">
                    {{ risk.severity.toUpperCase() }}
                  </el-tag>
                </p>
                <p><strong>修改建议:</strong> {{ risk.suggestion }}</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-card>

      <!-- 条款提取结果 -->
      <el-card v-if="analysisResult.clauseExtraction" class="result-card">
        <template #header>
          <div class="card-header">
            <span>📋 合同条款</span>
            <el-tag type="info">
              {{ analysisResult.clauseExtraction.metadata.total_clauses }}
              个条款
            </el-tag>
          </div>
        </template>

        <div class="clauses-list">
          <el-table :data="analysisResult.clauseExtraction.clauses" stripe>
            <el-table-column prop="clause_number" label="编号" width="80" />
            <el-table-column prop="title" label="标题" />
            <el-table-column prop="type" label="类型" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button
                  type="text"
                  size="small"
                  @click="viewClauseDetail(scope.row)"
                >
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </div>

    <!-- 分析历史 -->
    <div v-if="analysisHistory.length > 0" class="history-panel">
      <el-card>
        <template #header>
          <span>📊 分析历史</span>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in analysisHistory"
            :key="index"
            :timestamp="formatTimestamp(item.timestamp)"
          >
            {{ item.description }}
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRouter, useRoute } from "vue-router";
import { useContractStore } from "../../../stores/contract";
import type { ContractAnalysis } from "../../../utils/supabase";

const props = defineProps<{
  contractId?: string;
  contractText?: string;
}>();

const router = useRouter();
const route = useRoute();
const contractStore = useContractStore();

// 响应式数据
const isAnalyzing = ref(false);
const analysisCompleted = ref(false);

const analysisOptions = ref({
  mode: "full", // full, risk, clauses
  riskThreshold: 0.5,
});

const aiStatus = ref({
  title: "AI服务状态",
  type: "info" as string,
  description: "DeepSeek AI服务连接正常，可以进行分析",
});

// 从contractStore获取分析结果
const contractAnalyses = computed(() => contractStore.contractAnalyses);
const currentContract = computed(() => contractStore.currentContract);

// 获取当前合同的分析结果
const analysisResult = computed(() => {
  if (!props.contractId) return null;
  const analysis = contractAnalyses.value.find(
    (a) => a.contract_id === props.contractId,
  );
  if (!analysis) return null;

  const data = analysis.analysis_result;
  return {
    riskAnalysis: {
      risk_level: analysis.overall_risk_level || "low",
      summary: data.summary || "",
      risk_score: data.compliance_score ? 1 - data.compliance_score : 0,
      major_risks: data.risks || [],
    },
    clauseExtraction: {
      metadata: {
        total_clauses: data.key_info ? Object.keys(data.key_info).length : 0,
      },
      clauses: data.key_info
        ? Object.entries(data.key_info).map(([key, value], index) => ({
            clause_number: index + 1,
            title: key,
            type: "general",
            content: String(value),
          }))
        : [],
    },
  };
});

// 分析历史记录
const analysisHistory = computed(() => {
  if (!props.contractId) return [];

  return contractAnalyses.value
    .filter((a) => a.contract_id === props.contractId)
    .map((analysis) => ({
      timestamp: analysis.created_at,
      description: `对合同 ${props.contractId} 进行了完整分析，风险等级: ${analysis.overall_risk_level || "未知"}`,
    }));
});

const getRiskLevelType = (level: string) => {
  const types: any = {
    low: "success",
    medium: "warning",
    high: "danger",
    critical: "danger",
  };
  return types[level] || "info";
};

const viewClauseDetail = (clause: any) => {
  ElMessage.info(`查看条款: ${clause.title}`);
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString("zh-CN");
};

const handleAnalyze = async () => {
  if (!props.contractId) {
    ElMessage.warning("请先选择合同");
    return;
  }

  isAnalyzing.value = true;

  try {
    const result = await contractStore.analyzeContract(props.contractId);

    if (result.success) {
      ElMessage.success("合同分析已开始，请稍候查看结果");

      // 模拟3秒后加载结果
      setTimeout(async () => {
        await contractStore.loadContractAnalyses(props.contractId);
        analysisCompleted.value = true;
      }, 3000);
    } else {
      ElMessage.error(result.error || "分析失败");
    }
  } catch (error: any) {
    ElMessage.error("分析失败: " + (error.message || "未知错误"));
  } finally {
    isAnalyzing.value = false;
  }
};

// 监听contractId变化，加载分析结果
watch(
  () => props.contractId,
  async (newId) => {
    if (newId) {
      await contractStore.loadContractAnalyses(newId);
      analysisCompleted.value = !!contractAnalyses.value.find(
        (a) => a.contract_id === newId,
      );
    }
  },
  { immediate: true },
);

// 生命周期
onMounted(() => {
  if (props.contractId) {
    contractStore.loadContractAnalyses(props.contractId);
    analysisCompleted.value = !!contractAnalyses.value.find(
      (a) => a.contract_id === props.contractId,
    );
  }
});
</script>

<style scoped>
.ai-analysis-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.control-panel {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-section {
  margin-bottom: 20px;
}

.options-section {
  margin-top: 20px;
}

.slider-value {
  margin-left: 10px;
  color: #409eff;
  font-weight: bold;
}

.results-panel {
  margin-top: 20px;
}

.result-card {
  margin-bottom: 20px;
}

.risk-summary {
  margin-bottom: 20px;
}

.risk-score {
  margin-top: 10px;
}

.major-risks h4 {
  margin-bottom: 10px;
  color: #606266;
}

.risk-detail p {
  margin: 5px 0;
}

.history-panel {
  margin-top: 20px;
}

.clauses-list {
  max-height: 400px;
  overflow-y: auto;
}
</style>
