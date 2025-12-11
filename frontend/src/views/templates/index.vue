<template>
  <div class="templates-container">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>合同模板管理</h2>
            <p>管理常用的合同模板</p>
          </div>
        </template>
      </el-page-header>

      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/templates/create')">
          <el-icon><Plus /></el-icon>
          创建模板
        </el-button>
      </div>
    </div>

    <!-- 模板分类 -->
    <div class="template-categories">
      <el-tabs v-model="activeCategory" @tab-change="loadTemplates">
        <el-tab-pane label="全部模板" name="all" />
        <el-tab-pane label="采购合同" name="purchase" />
        <el-tab-pane label="销售合同" name="sale" />
        <el-tab-pane label="服务合同" name="service" />
        <el-tab-pane label="租赁合同" name="lease" />
        <el-tab-pane label="其他模板" name="other" />
      </el-tabs>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称、描述"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filterStatus"
            placeholder="状态"
            clearable
            @change="loadTemplates"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="sortBy"
            placeholder="排序方式"
            clearable
            @change="loadTemplates"
          >
            <el-option label="创建时间" value="created_at" />
            <el-option label="使用次数" value="usage_count" />
            <el-option label="最近更新" value="updated_at" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <div class="filter-actions">
            <el-button @click="resetFilters">重置</el-button>
            <el-button type="primary" @click="loadTemplates">搜索</el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 模板列表 -->
    <div v-loading="loading" class="templates-grid">
      <el-row :gutter="20">
        <el-col
          v-for="template in templates.filter(t => t && t.id)"
          :key="template.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
        >
          <el-card class="template-card" shadow="hover" @click="viewTemplate(template)">
            <template #header>
              <div class="template-header">
                <div class="template-title">
                  <el-icon><Document /></el-icon>
                  <span>{{ template.name }}</span>
                </div>
                <el-button
                  size="small"
                  type="info"
                  :icon="Delete"
                  @click.stop="deleteTemplate(template)"
                  circle
                  title="删除模板"
                  class="delete-button"
                />
              </div>
            </template>

            <div class="template-content">
              <div class="template-description">
                {{ template.description || "暂无描述" }}
              </div>

              <div class="template-meta">
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>创建者: {{ template.created_by_name || "系统" }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Clock /></el-icon>
                  <span>创建时间: {{ formatDate(template.created_at) }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><TrendCharts /></el-icon>
                  <span>使用次数: {{ template.usage_count || 0 }}</span>
                </div>
              </div>

              <div class="template-tags">
                <el-tag :type="getTypeTag(template.type)" size="small">
                  {{ getTypeText(template.type) }}
                </el-tag>
                <el-tag v-if="template.is_public" type="success" size="small"
                  >公开</el-tag
                >
                <el-tag v-else type="info" size="small">私有</el-tag>
              </div>
            </div>


          </el-card>
        </el-col>
      </el-row>

      <!-- 空状态 -->
      <div v-if="!loading && templates.length === 0" class="empty-state">
        <el-empty description="暂无模板数据">
          <el-button type="primary" @click="$router.push('/templates/create')">
            创建第一个模板
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48, 96]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Plus,
  Document,
  User,
  Clock,
  TrendCharts,
  ArrowDown,
  Delete,
} from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useTemplateStore } from "@/stores/template";
import { supabase } from "@/utils/supabase";

const router = useRouter();
const authStore = useAuthStore();
const templateStore = useTemplateStore();

// 状态管理
const activeCategory = ref("all");
const searchKeyword = ref("");
const filterStatus = ref("");
const sortBy = ref("created_at");
const currentPage = ref(1);
const pageSize = ref(12);

const currentUser = ref(authStore.user);

// 从store获取数据
const templates = computed(() => templateStore.templates);
const total = computed(() => templateStore.totalTemplates);
const loading = computed(() => templateStore.isLoading);

// 权限检查函数
const hasPermission = (template: any, action: string) => {
  if (!template || !currentUser.value) return false;
  
  // 管理员可以执行所有操作
  if (currentUser.value.role === "admin") return true;
  
  // 模板创建者可以编辑、删除、状态切换
  if (action === 'edit' || action === 'delete' || action === 'toggleStatus') {
    return template.created_by === currentUser.value.id;
  }
  
  return true;
};

// 获取权限提示信息
const getPermissionMessage = (template: any, action: string): string => {
  if (!currentUser.value) return "请先登录";

  if (currentUser.value.role === "admin") return "";

  if (template.created_by !== currentUser.value.id) {
    switch (action) {
      case "edit":
        return "您只能编辑自己创建的模板";
      case "delete":
        return "您只能删除自己创建的模板";
      case "toggleStatus":
        return "您只能修改自己创建的模板状态";
      default:
        return "权限不足";
    }
  }

  return "";
};

const goBack = () => {
  router.push("/dashboard");
};

const loadTemplates = async () => {
  try {
    // 使用templateStore加载模板数据
    await templateStore.loadTemplates({
      category:
        activeCategory.value === "all" ? undefined : activeCategory.value,
      keyword: searchKeyword.value,
      status: filterStatus.value,
      sortBy: sortBy.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    });
  } catch (error) {
    ElMessage.error(templateStore.error || "加载模板列表失败");
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadTemplates();
};

const resetFilters = () => {
  activeCategory.value = "all";
  searchKeyword.value = "";
  filterStatus.value = "";
  sortBy.value = "created_at";
  currentPage.value = 1;
  loadTemplates();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadTemplates();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadTemplates();
};

const viewTemplate = async (template: any) => {
  try {
    if (!template || !template.id) {
      ElMessage.error('模板数据无效');
      return;
    }
    console.log('查看模板详情:', template.id, template.name);
    // 直接跳转到详情页，数据在详情页加载
    await router.push(`/templates/${template.id}`);
  } catch (error) {
    console.error('跳转失败:', error);
    ElMessage.error('跳转失败');
  }
};

const useTemplate = (template: any) => {
  ElMessage.success(`开始使用模板: ${template.name}`);
  // 这里可以跳转到合同创建页面，并预填充模板内容
};

const editTemplate = (template: any) => {
  if (!hasPermission(template, "edit")) {
    ElMessage.warning(getPermissionMessage(template, "edit"));
    return;
  }
  router.push(`/templates/${template.id}/edit`);
};

const handleCommand = async (command: string, template: any) => {
  // 权限验证
  if (!hasPermission(template, command)) {
    ElMessage.warning(getPermissionMessage(template, command));
    return;
  }

  switch (command) {
    case "edit":
      editTemplate(template);
      break;
    case "toggleStatus":
      await toggleTemplateStatus(template);
      break;
    case "delete":
      await deleteTemplate(template);
      break;
  }
};

const toggleTemplateStatus = async (template: any) => {
  try {
    // 设置loading状态
    template.loading = true;
    
    const newStatus = template.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("contract_templates")
      .update({ status: newStatus })
      .eq("id", template.id);

    if (error) throw error;

    // 立即更新本地状态，无需重新加载
    template.status = newStatus;
    
    ElMessage.success(`模板已${newStatus === "active" ? "启用" : "禁用"}`);
  } catch (error: any) {
    ElMessage.error(`操作失败: ${error.message}`);
  } finally {
    template.loading = false;
  }
};

const deleteTemplate = async (template: any) => {
  try {
    // 权限检查
    if (!hasPermission(template, "delete")) {
      ElMessage.warning(getPermissionMessage(template, "delete"));
      return;
    }

    await ElMessageBox.confirm(
      `确定要删除模板「${template.name}」吗？此操作不可恢复。`,
      "删除确认",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await templateStore.deleteTemplate(template.id);
    ElMessage.success("模板删除成功");
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(templateStore.error || "删除模板失败");
    }
  }
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
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN");
};

onMounted(() => {
  loadTemplates();
});
</script>

<style scoped>
.templates-container {
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
  margin-bottom: 5px;
}

.header-content p {
  margin: 0;
  color: #606266;
}

.template-categories {
  margin-bottom: 20px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  height: 100%;
}

.templates-grid {
  min-height: 400px;
}

.template-card {
  margin-bottom: 20px;
  height: auto;
  min-height: 200px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.template-title .el-icon {
  color: #409eff;
}

.template-content {
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.template-description {
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
}

.template-meta {
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.meta-item .el-icon {
  font-size: 14px;
}

.template-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}



.empty-state {
  padding: 60px 0;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

:deep(.el-tabs__nav-wrap) {
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-tabs__item) {
  font-weight: 500;
}

.delete-button {
  color: #909399;
  border-color: #e4e7ed;
  background-color: #f5f7fa;
  transition: all 0.3s ease;
}

.delete-button:hover {
  color: #f56c6c;
  border-color: #f56c6c;
  background-color: #fef0f0;
}
</style>
