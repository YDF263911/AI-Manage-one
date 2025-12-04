<template>
  <div class="contract-qa-panel">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>💬 合同智能问答</span>
          <el-button
            type="primary"
            size="small"
            :loading="isAnswering"
            @click="handleAsk"
          >
            提问
          </el-button>
        </div>
      </template>

      <!-- 问题输入 -->
      <div class="question-input">
        <el-input
          v-model="question"
          type="textarea"
          :rows="3"
          placeholder="请输入关于合同的问题，例如：付款条款是什么？违约责任如何规定？"
          :maxlength="500"
          show-word-limit
        />
      </div>

      <!-- 问答历史 -->
      <div v-if="qaHistory.length > 0" class="qa-history">
        <el-divider>问答历史</el-divider>

        <div v-for="(qa, index) in qaHistory" :key="index" class="qa-item">
          <div class="question">
            <strong>Q: </strong>{{ qa.question }}
            <span class="timestamp">{{ formatTimestamp(qa.timestamp) }}</span>
          </div>
          <div class="answer">
            <strong>A: </strong>
            <div v-html="formatAnswer(qa.answer)"></div>

            <!-- 回答质量评估 -->
            <div v-if="qa.usage" class="answer-meta">
              <el-tag size="small" type="info">
                消耗Token: {{ qa.usage.total_tokens }}
              </el-tag>
              <el-tag size="small" :type="getConfidenceType(qa.confidence)">
                置信度: {{ (qa.confidence * 100).toFixed(1) }}%
              </el-tag>
            </div>
          </div>
          <el-divider v-if="index < qaHistory.length - 1" />
        </div>
      </div>

      <!-- 当前回答 -->
      <div v-if="currentAnswer" class="current-answer">
        <el-divider>AI回答</el-divider>

        <div class="answer-content">
          <div v-html="formatAnswer(currentAnswer.answer)"></div>

          <div class="answer-actions">
            <el-button-group>
              <el-button type="success" size="small" @click="markAsHelpful">
                👍 有帮助
              </el-button>
              <el-button type="warning" size="small" @click="markAsInaccurate">
                👎 不准确
              </el-button>
              <el-button type="info" size="small" @click="copyAnswer">
                📋 复制
              </el-button>
            </el-button-group>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isAnswering" class="loading">
        <el-skeleton :rows="3" animated />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useContractStore } from "../../../stores/contract";

// 响应式数据
const question = ref("");
const isAnswering = ref(false);
const currentAnswer = ref<any>(null);
const contractStore = useContractStore();

interface QAItem {
  question: string;
  answer: string;
  timestamp: string;
  usage?: any;
  confidence?: number;
  id?: string;
}

const qaHistory = ref<QAItem[]>([]);

// 方法
const handleAsk = async () => {
  if (!question.value.trim()) {
    ElMessage.warning("请输入问题");
    return;
  }

  if (!props.contractId) {
    ElMessage.warning("请先选择合同");
    return;
  }

  isAnswering.value = true;

  try {
    // 获取合同详情（如果需要）
    if (
      !contractStore.currentContract ||
      contractStore.currentContract.id !== props.contractId
    ) {
      await contractStore.getContract(props.contractId);
    }

    // 调用后端问答API
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/analysis/qa`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          contract_id: props.contractId,
          question: question.value,
        }),
      },
    );

    const result = await response.json();

    if (result.success) {
      const answerData = result.data;

      currentAnswer.value = answerData;

      // 添加到历史记录
      qaHistory.value.unshift({
        id: `qa-${Date.now()}`,
        question: question.value,
        answer: answerData.answer,
        timestamp: new Date().toISOString(),
        usage: answerData.usage,
        confidence: answerData.confidence || 0.85,
      });

      // 保存到Supabase
      saveQAHistory(
        props.contractId,
        question.value,
        answerData.answer,
        answerData.confidence || 0.85,
      );

      // 清空问题
      question.value = "";

      ElMessage.success("回答生成完成");
    } else {
      ElMessage.error("问答失败: " + result.message);
    }
  } catch (error: any) {
    console.error("问答失败:", error);
    ElMessage.error("问答失败: " + (error.message || "未知错误"));
  } finally {
    isAnswering.value = false;
  }
};

// 保存问答历史到Supabase
const saveQAHistory = async (
  contractId: string,
  question: string,
  answer: string,
  confidence: number,
) => {
  try {
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analysis/save-qa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        contract_id: contractId,
        question: question,
        answer: answer,
        confidence: confidence,
      }),
    });
  } catch (error) {
    console.error("保存问答历史失败:", error);
  }
};

const formatAnswer = (answer: string) => {
  // 简单的格式化处理
  return answer
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString("zh-CN");
};

const getConfidenceType = (confidence: number) => {
  if (confidence >= 0.8) return "success";
  if (confidence >= 0.6) return "warning";
  return "danger";
};

const markAsHelpful = () => {
  ElMessage.success("感谢您的反馈！");
  // 这里可以发送反馈到后端
};

const markAsInaccurate = () => {
  ElMessage.info("已记录不准确反馈，我们将持续改进");
  // 这里可以发送反馈到后端
};

const copyAnswer = async () => {
  try {
    await navigator.clipboard.writeText(currentAnswer.value.answer);
    ElMessage.success("答案已复制到剪贴板");
  } catch (error) {
    ElMessage.error("复制失败");
  }
};

// Props
const props = defineProps<{
  contractId?: string;
}>();

// 加载合同问答历史
const loadQAHistory = async () => {
  if (!props.contractId) return;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/analysis/qa-history`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          contract_id: props.contractId,
        }),
      },
    );

    const result = await response.json();
    if (result.success) {
      qaHistory.value = result.data || [];
    }
  } catch (error) {
    console.error("加载问答历史失败:", error);
  }
};

// 初始化
onMounted(() => {
  if (props.contractId) {
    loadQAHistory();
  }
});
</script>

<style scoped>
.contract-qa-panel {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-input {
  margin-bottom: 20px;
}

.qa-history {
  margin-top: 20px;
}

.qa-item {
  margin-bottom: 20px;
}

.question {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  position: relative;
}

.timestamp {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 12px;
  color: #909399;
}

.answer {
  padding: 15px;
  background-color: #ecf5ff;
  border-radius: 4px;
  margin-top: 10px;
}

.answer-meta {
  margin-top: 10px;
}

.answer-meta .el-tag {
  margin-right: 5px;
}

.answer-content {
  line-height: 1.6;
}

.answer-actions {
  margin-top: 15px;
  text-align: right;
}

.loading {
  margin-top: 20px;
}

:deep(.el-divider__text) {
  background-color: #fff;
}
</style>
