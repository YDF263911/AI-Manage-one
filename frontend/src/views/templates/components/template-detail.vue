<template>
  <el-dialog
    :model-value="visible"
    title="模板详情"
    width="900px"
    :before-close="handleClose"
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <div v-loading="loading" class="template-detail">
      <!-- 模板基本信息 -->
      <el-card class="template-info">
        <template #header>
          <div class="header-title">
            <el-icon><Document /></el-icon>
            <span>模板基本信息</span>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{
            template.name || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="模板类型">
            <el-tag :type="getTypeTag(template.type)">
              {{ getTypeText(template.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模板状态">
            <el-tag :type="template.status === 'active' ? 'success' : 'info'">
              {{ template.status === "active" ? "启用" : "禁用" }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="公开状态">
            <el-tag :type="template.is_public ? 'success' : 'info'">
              {{ template.is_public ? "公开" : "私有" }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建者">{{
            template.created_by_name || "系统"
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            formatDate(template.created_at)
          }}</el-descriptions-item>
          <el-descriptions-item label="使用次数">{{
            template.usage_count || 0
          }}</el-descriptions-item>
          <el-descriptions-item label="最后更新">{{
            formatDate(template.updated_at)
          }}</el-descriptions-item>
        </el-descriptions>

        <div class="template-description">
          <h4>模板描述</h4>
          <p>{{ template.description || "暂无描述" }}</p>
        </div>
      </el-card>

      <!-- 模板内容预览 -->
      <el-card class="template-preview">
        <template #header>
          <div class="header-title">
            <el-icon><View /></el-icon>
            <span>模板内容预览</span>
          </div>
        </template>

        <div class="preview-content">
          <div v-if="template.content" class="content-view">
            <pre>{{ template.content }}</pre>
          </div>
          <div v-else class="empty-content">
            <el-empty description="暂无模板内容" />
          </div>
        </div>
      </el-card>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button
          v-if="template.status === 'active'"
          type="primary"
          @click="handleUseTemplate"
        >
          使用模板
        </el-button>
        <el-button v-if="hasPermission" type="primary" @click="handleEdit">
          编辑模板
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import { Document, View } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";

interface Props {
  visible: boolean;
  template: any;
}

interface Emits {
  (e: "update:visible", value: boolean): void;
  (e: "close"): void;
  (e: "edit", template: any): void;
  (e: "use", template: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  template: () => ({}),
});

const emit = defineEmits<Emits>();

const authStore = useAuthStore();
const loading = ref(false);

// 权限验证
const hasPermission = computed(() => {
  if (!authStore.user) return false;
  return (
    authStore.user.role === "admin" ||
    props.template.created_by === authStore.user.id
  );
});

// 工具函数
const getTypeTag = (type: string) => {
  const typeMap: any = {
    purchase: "success",
    sale: "warning",
    service: "info",
    lease: "primary",
    other: "default",
  };
  return typeMap[type] || "info";
};

const getTypeText = (type: string) => {
  const typeMap: any = {
    purchase: "采购合同",
    sale: "销售合同",
    service: "服务合同",
    lease: "租赁合同",
    other: "其他模板",
  };
  return typeMap[type] || type;
};

const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN");
};

const handleClose = () => {
  emit("update:visible", false);
  emit("close");
};

const handleEdit = () => {
  if (!hasPermission.value) {
    ElMessage.warning("您没有编辑此模板的权限");
    return;
  }
  emit("edit", props.template);
  handleClose();
};

const handleUseTemplate = () => {
  ElMessage.success(`开始使用模板: ${props.template.name}`);
  emit("use", props.template);
  handleClose();
};
</script>

<style scoped>
.template-detail {
  max-height: 600px;
  overflow-y: auto;
}

.template-info {
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.header-title .el-icon {
  color: #409eff;
}

.template-description {
  margin-top: 20px;
}

.template-description h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.template-description p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.preview-content {
  min-height: 200px;
}

.content-view pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 14px;
  line-height: 1.5;
  max-height: 300px;
  overflow-y: auto;
}

.empty-content {
  padding: 40px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
