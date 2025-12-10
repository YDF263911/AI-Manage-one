<template>
  <div class="template-detail">
    <div class="page-header">
      <el-page-header
        :content="templateDetail?.name || '模板详情'"
        @back="goBack"
      >
        <template #content>
          <div class="header-content">
            <h2>{{ templateDetail?.name }}</h2>
            <div class="template-status">
              <el-tag
                :type="templateDetail?.status === 'active' ? 'success' : 'info'"
              >
                {{ templateDetail?.status === "active" ? "启用" : "禁用" }}
              </el-tag>
              <el-tag :type="templateDetail?.is_public ? 'success' : 'info'">
                {{ templateDetail?.is_public ? "公开" : "私有" }}
              </el-tag>
              <el-tag :type="getTypeTag(templateDetail?.type)">
                {{ getTypeText(templateDetail?.type) }}
              </el-tag>
            </div>
          </div>
        </template>
      </el-page-header>

      <div class="header-actions">
        <el-button-group>
          <el-button type="primary" @click="useTemplate">使用模板</el-button>
          <el-button :disabled="!canEdit" @click="editTemplate">编辑</el-button>
          <el-button type="danger" :disabled="!canEdit" @click="deleteTemplate"
            >删除</el-button
          >
        </el-button-group>
      </div>
    </div>

    <div class="detail-content">
      <el-row :gutter="20">
        <!-- 基本信息 -->
        <el-col :span="16">
          <el-card class="info-card">
            <template #header>
              <span>模板基本信息</span>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="模板名称">{{
                templateDetail?.name
              }}</el-descriptions-item>
              <el-descriptions-item label="模板类型">{{
                getTypeText(templateDetail?.type)
              }}</el-descriptions-item>
              <el-descriptions-item label="创建者">{{
                templateDetail?.created_by_name || "系统"
              }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{
                formatDate(templateDetail?.created_at)
              }}</el-descriptions-item>
              <el-descriptions-item label="使用次数"
                >{{ templateDetail?.usage_count || 0 }} 次</el-descriptions-item
              >
              <el-descriptions-item label="最近更新">{{
                formatDate(templateDetail?.updated_at)
              }}</el-descriptions-item>
              <el-descriptions-item label="模板描述" :span="2">
                {{ templateDetail?.description || "暂无描述" }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 模板内容 -->
          <el-card class="content-card">
            <template #header>
              <span>模板内容</span>
            </template>

            <div class="template-content">
              <pre>{{ templateDetail?.content }}</pre>
            </div>

            <div class="content-actions">
              <el-button @click="copyContent">复制内容</el-button>
              <el-button type="primary" @click="downloadTemplate"
                >下载模板</el-button
              >
            </div>
          </el-card>

          <!-- 变量定义 -->
          <el-card
            v-if="
              (templateDetail as any)?.variables && (templateDetail as any).variables.length > 0
            "
            class="variables-card"
          >
            <template #header>
              <span>预定义变量</span>
            </template>

            <el-table :data="(templateDetail as any).variables" stripe>
              <el-table-column prop="name" label="变量名" width="120" />
              <el-table-column prop="label" label="显示名称" width="120" />
              <el-table-column prop="default_value" label="默认值" />
            </el-table>
          </el-card>
        </el-col>

        <!-- 侧边栏信息 -->
        <el-col :span="8">
          <!-- 使用统计 -->
          <el-card class="stats-card">
            <template #header>
              <span>使用统计</span>
            </template>

            <div class="stats-content">
              <div class="stat-item">
                <div class="stat-value">
                  {{ templateDetail?.usage_count || 0 }}
                </div>
                <div class="stat-label">总使用次数</div>
              </div>

              <div class="stat-item">
                <div class="stat-value">{{ recentUsage }}</div>
                <div class="stat-label">最近30天使用</div>
              </div>

              <div class="stat-item">
                <div class="stat-value">
                  {{ formatDate((templateDetail as any)?.last_used_at) }}
                </div>
                <div class="stat-label">最后使用时间</div>
              </div>
            </div>
          </el-card>

          <!-- 相关模板 -->
          <el-card class="related-card">
            <template #header>
              <span>相关模板</span>
            </template>

            <div class="related-templates">
              <div
                v-for="template in relatedTemplates"
                :key="template.id"
                class="related-item"
                @click="viewRelatedTemplate(template)"
              >
                <div class="template-info">
                  <el-icon><Document /></el-icon>
                  <span class="template-name">{{ template.name }}</span>
                </div>
                <el-tag :type="getTypeTag(template.type)" size="small">
                  {{ getTypeText(template.type) }}
                </el-tag>
              </div>
            </div>
          </el-card>

          <!-- 操作记录 -->
          <el-card class="log-card">
            <template #header>
              <span>操作记录</span>
            </template>

            <el-timeline>
              <el-timeline-item
                v-for="log in operationLogs"
                :key="log.id"
                :timestamp="formatDate(log.created_at)"
                :type="getLogType(log.action)"
              >
                {{ log.action_text }}
                <br />
                <span class="log-user">操作人: {{ log.operator }}</span>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Document } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useTemplateStore } from "@/stores/template";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const templateStore = useTemplateStore();

const templateId = route.params.id as string;
const operationLogs = ref<any[]>([]);
const relatedTemplates = ref<any[]>([]);
const recentUsage = ref(0);

// 从store获取模板详情
const templateDetail = computed(() => templateStore.currentTemplate);

const canEdit = computed(() => {
  if (!templateDetail.value || !authStore.user) return false;
  return templateDetail.value.created_by === authStore.user.id;
});

const goBack = () => {
  router.push("/templates");
};

const loadTemplateDetail = async () => {
  try {
    console.log('加载模板详情，ID:', templateId);
    const template = await templateStore.getTemplate(templateId);
    console.log('获取到的模板数据:', template);
    if (template) {
      // 加载相关模板
      await loadRelatedTemplates();

      // 加载操作记录
      await loadOperationLogs();

      // 使用统计功能暂未实现，设置为默认值
      recentUsage.value = 0;
    } else {
      ElMessage.error('模板不存在');
    }
  } catch (error) {
    console.error('加载模板详情失败:', error);
    ElMessage.error(templateStore.error || "加载模板详情失败");
  }
};

const loadOperationLogs = async () => {
  // 模拟操作记录
  operationLogs.value = [
    {
      id: 1,
      action: "create",
      action_text: "创建模板",
      operator: "系统管理员",
      created_at: templateDetail.value?.created_at,
    },
    {
      id: 2,
      action: "update",
      action_text: "更新模板内容",
      operator: "系统管理员",
      created_at: templateDetail.value?.updated_at,
    },
  ];
};

const loadRelatedTemplates = async () => {
  try {
    if (!templateDetail.value?.category) return;

    // 使用templateStore加载相关模板
    await templateStore.loadTemplates({
      category: templateDetail.value.category,
      status: "active",
      pageSize: 5,
    });

    // 从store中获取相关模板，排除当前模板
    relatedTemplates.value = templateStore.templates.filter(
      (t: any) => t.id !== templateId
    );
  } catch (error) {
    console.error("加载相关模板失败:", templateStore.error || error);
  }
};



const useTemplate = async () => {
  try {
    // 增加使用次数
    try {
      await templateStore.incrementUsageCount(templateId);
    } catch (error) {
      console.error("增加使用次数失败:", error);
    }

    ElMessage.success(`开始使用模板: ${templateDetail.value?.name}`);
    
    // 跳转到合同编辑页面
    router.push(`/contracts/create/${templateId}`);
  } catch (error) {
    console.error('使用模板失败:', error);
    ElMessage.error("操作失败");
  }
};

const editTemplate = () => {
  router.push(`/templates/${templateId}/edit`);
};



const deleteTemplate = async () => {
  try {
    await ElMessageBox.confirm("确定要删除此模板吗？此操作不可恢复。", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    await templateStore.deleteTemplate(templateId);
    ElMessage.success("模板删除成功");
    router.push("/templates");
  } catch (error: any) {
    if (error !== "cancel" && error.name !== "CanceledError") {
      ElMessage.error(templateStore.error || "删除模板失败");
    }
  }
};

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(templateDetail.value?.content || "");
    ElMessage.success("模板内容已复制到剪贴板");
  } catch (error) {
    ElMessage.error("复制失败，请手动复制");
  }
};

const downloadTemplate = () => {
  const content = templateDetail.value?.content || "";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${templateDetail.value?.name}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  ElMessage.success("模板下载成功");
};

const viewRelatedTemplate = (template: any) => {
  router.push(`/templates/${template.id}`);
};

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
  if (!date) return "未设置";
  return new Date(date).toLocaleDateString("zh-CN");
};

const getLogType = (action: string) => {
  const types: any = {
    create: "primary",
    update: "success",
    delete: "danger",
    use: "warning",
  };
  return types[action] || "info";
};

onMounted(() => {
  console.log('Detail页面已加载，路由参数:', route.params);
  console.log('当前路由路径:', route.path);
  loadTemplateDetail();
});
</script>

<style scoped>
.template-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-content h2 {
  margin: 0;
  margin-bottom: 10px;
}

.template-status {
  display: flex;
  gap: 10px;
}

.detail-content {
  margin-top: 20px;
}

.info-card,
.content-card,
.variables-card,
.stats-card,
.related-card,
.log-card {
  margin-bottom: 20px;
}

.template-content {
  font-family: "Courier New", monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.content-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.stats-content {
  padding: 10px 0;
}

.stat-item {
  text-align: center;
  margin-bottom: 20px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.related-templates {
  max-height: 200px;
  overflow-y: auto;
}

.related-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.related-item:hover {
  background-color: #f5f7fa;
}

.related-item:last-child {
  border-bottom: none;
}

.template-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-info .el-icon {
  color: #409eff;
}

.template-name {
  font-size: 14px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-user {
  font-size: 12px;
  color: #909399;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

:deep(.el-timeline-item__timestamp) {
  color: #909399;
  font-size: 12px;
}
</style>
