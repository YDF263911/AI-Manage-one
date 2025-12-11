<template>
  <div class="rule-detail">
    <div class="detail-header">
      <h3>{{ rule.name }}</h3>
      <div class="header-tags">
        <el-tag :type="getCategoryTag(rule.category)">
          {{ getCategoryText(rule.category) }}
        </el-tag>
        <el-tag :type="getSeverityTag(rule.severity)">
          {{ getSeverityText(rule.severity) }}
        </el-tag>
        <el-tag :type="rule.status === 'active' ? 'success' : 'info'">
          {{ rule.status === "active" ? "启用" : "禁用" }}
        </el-tag>
      </div>
    </div>

    <div class="detail-content">
      <el-descriptions title="基本信息" :column="2" border>
        <el-descriptions-item label="规则名称">{{
          rule.name
        }}</el-descriptions-item>
        <el-descriptions-item label="规则分类">
          <el-tag :type="getCategoryTag(rule.category)">
            {{ getCategoryText(rule.category) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="风险等级">
          <el-tag :type="getSeverityTag(rule.severity)">
            {{ getSeverityText(rule.severity) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{
          formatDate(rule.created_at)
        }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{
          formatDate(rule.updated_at)
        }}</el-descriptions-item>
        <el-descriptions-item label="触发次数">{{
          rule.trigger_count || 0
        }}</el-descriptions-item>
        <el-descriptions-item label="规则状态">
          <el-tag :type="rule.status === 'active' ? 'success' : 'info'">
            {{ rule.status === "active" ? "启用" : "禁用" }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-descriptions
        title="规则详情"
        :column="1"
        border
        class="detail-section"
      >
        <el-descriptions-item label="规则描述">
          <div class="description-content">
            {{ rule.description || "暂无描述" }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="匹配模式">
          <el-tag type="info">{{ getPatternTypeText(rule.pattern_type) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="匹配内容">
          <div class="code-block">
            <pre>{{ rule.pattern_content || "无" }}</pre>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="阈值设置">
          {{ rule.threshold || 0.8 }}
        </el-descriptions-item>
        <el-descriptions-item label="规则条件">
          <div class="code-block">
            <pre>{{
              rule.condition
                ? (typeof rule.condition === 'string' 
                    ? JSON.stringify(JSON.parse(rule.condition), null, 2)
                    : JSON.stringify(rule.condition, null, 2))
                : "无"
            }}</pre>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="处理建议">
          <div class="suggestion-content">
            {{ rule.suggestion || "暂无建议" }}
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 触发历史 -->
      <div class="detail-section">
        <h4>触发历史</h4>
        <el-table
          v-loading="loadingHistory"
          :data="triggerHistory"
          style="width: 100%"
        >
          <el-table-column
            prop="contract_name"
            label="合同名称"
            min-width="200"
          />
          <el-table-column prop="trigger_time" label="触发时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.trigger_time) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="matched_content"
            label="匹配内容"
            min-width="300"
          />
          <el-table-column prop="confidence" label="置信度" width="100">
            <template #default="{ row }">
              <el-progress
                :percentage="Math.round(row.confidence * 100)"
                :show-text="false"
                :stroke-width="8"
              />
              <span style="margin-left: 8px"
                >{{ Math.round(row.confidence * 100) }}%</span
              >
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button
                size="small"
                link
                @click="viewContract(row.contract_id)"
              >
                查看合同
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div
          v-if="!loadingHistory && triggerHistory.length === 0"
          class="empty-history"
        >
          <el-empty description="暂无触发记录" />
        </div>
      </div>
    </div>

    <div class="detail-actions">
      <el-button type="primary" @click="handleEdit">编辑规则</el-button>
      <el-button type="danger" @click="handleDelete">删除规则</el-button>
      <el-button @click="handleClose">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { supabase } from "@/utils/supabase";

interface Props {
  rule: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const loadingHistory = ref(false);
const triggerHistory = ref<any[]>([]);

// 工具函数
const getCategoryTag = (category: string) => {
  const categoryMap: any = {
    legal: "success",
    financial: "warning",
    operational: "danger",
    format: "info",
    custom: "primary",
  };
  return categoryMap[category] || "info";
};

const getCategoryText = (category: string) => {
  const categoryMap: any = {
    legal: "法律合规",
    financial: "财务风险",
    operational: "操作风险",
    format: "格式规范",
    custom: "自定义规则",
  };
  return categoryMap[category] || category;
};

const getSeverityTag = (severity: string) => {
  const severityMap: any = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return severityMap[severity] || "info";
};

const getSeverityText = (severity: string) => {
  const severityMap: any = {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
  };
  return severityMap[severity] || severity;
};

const getPatternTypeText = (patternType: string) => {
  const patternMap: any = {
    keyword: "关键词匹配",
    regex: "正则表达式",
    semantic: "语义分析",
    logic: "逻辑组合",
  };
  return patternMap[patternType] || patternType;
};

const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN");
};

const formatDateTime = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("zh-CN");
};

// 加载触发历史
const loadTriggerHistory = async () => {
  if (!props.rule?.id) return;

  loadingHistory.value = true;

  try {
    // 这里需要根据实际的数据表结构来查询触发历史
    // 假设有一个 risk_rule_triggers 表来记录规则触发历史
    const { data, error } = await supabase
      .from("risk_rule_triggers")
      .select(
        `
        *,
        contracts (filename, contract_title)
      `,
      )
      .eq("rule_id", props.rule.id)
      .order("trigger_time", { ascending: false })
      .limit(20);

    if (error) throw error;

    triggerHistory.value =
      data?.map((item) => ({
        ...item,
        contract_name: item.contracts?.contract_title || item.contracts?.filename || "未知合同",
      })) || [];
  } catch (error: any) {
    ElMessage.error(`加载触发历史失败: ${error.message}`);
  } finally {
    loadingHistory.value = false;
  }
};

// 查看合同
const viewContract = (contractId: string) => {
  router.push(`/contracts/${contractId}`);
};

// 编辑规则
const handleEdit = () => {
  router.push(`/risk-rules/${props.rule.id}/edit`);
};

// 测试规则
const handleTest = async () => {
  try {
    ElMessage.info("测试规则功能开发中...");
    // 这里可以实现规则测试功能
  } catch (error: any) {
    ElMessage.error(`测试失败: ${error.message}`);
  }
};

// 复制规则
const handleDuplicate = async () => {
  try {
    // 确保所有必填字段都有值
    const ruleData = {
      name: `${props.rule.name} - 副本`,
      description: props.rule.description || '',
      category: props.rule.category || 'custom',
      severity: props.rule.severity || 'low',
      pattern_type: props.rule.pattern_type || 'keyword',
      pattern_content: props.rule.pattern_content || '',
      threshold: props.rule.threshold || 0.8,
      condition: props.rule.condition || null,
      suggestion: props.rule.suggestion || '',
      is_active: props.rule.is_active !== undefined ? props.rule.is_active : true,
      trigger_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: props.rule.created_by || null,
    };

    const { data, error } = await supabase
      .from("risk_rules")
      .insert([ruleData])
      .select();

    if (error) throw error;

    ElMessage.success("规则复制成功");
    emit("close");
  } catch (error: any) {
    ElMessage.error(`复制失败: ${error.message}`);
  }
};

// 删除规则
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm("确定要删除此规则吗？此操作不可恢复。", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const { error } = await supabase
      .from("risk_rules")
      .delete()
      .eq("id", props.rule.id);

    if (error) throw error;

    ElMessage.success("规则删除成功");
    emit("close");
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`删除失败: ${error.message}`);
    }
  }
};

// 关闭
const handleClose = () => {
  emit("close");
};

onMounted(() => {
  loadTriggerHistory();
});
</script>

<style scoped>
.rule-detail {
  padding: 0 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.detail-header h3 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-tags {
  display: flex;
  gap: 10px;
}

.detail-content {
  margin-bottom: 30px;
}

.detail-section {
  margin-top: 30px;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #303133;
  font-weight: 600;
}

.description-content,
.suggestion-content {
  line-height: 1.6;
  color: #606266;
}

.code-block {
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  font-family: "Courier New", monospace;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-all;
}

.code-block pre {
  margin: 0;
}

.empty-history {
  padding: 40px 0;
}

.detail-actions {
  text-align: center;
  padding: 20px 0;
  border-top: 1px solid #e4e7ed;
}

.detail-actions .el-button {
  margin: 0 5px;
}

:deep(.el-descriptions__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

:deep(.el-table) {
  margin-top: 15px;
}

:deep(.el-progress) {
  display: inline-block;
  width: 60px;
  vertical-align: middle;
}
</style>
