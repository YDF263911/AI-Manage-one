<template>
  <div class="risk-rules">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>风险规则配置</h2>
            <p>配置合同风险分析规则</p>
          </div>
        </template>
      </el-page-header>

      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建规则
        </el-button>
        <el-button @click="addDemoRules">
          <el-icon><Star /></el-icon>
          添加示例规则
        </el-button>
        <el-button @click="importRules">
          <el-icon><Upload /></el-icon>
          导入规则
        </el-button>
        <el-button @click="exportRules">
          <el-icon><Download /></el-icon>
          导出规则
        </el-button>
      </div>
    </div>

    <!-- 规则分类 -->
    <div class="rule-categories">
      <el-tabs v-model="activeCategory" @tab-change="loadRules">
        <el-tab-pane label="全部规则" name="all" />
        <el-tab-pane label="法律合规" name="legal" />
        <el-tab-pane label="财务风险" name="financial" />
        <el-tab-pane label="操作风险" name="operational" />
        <el-tab-pane label="格式规范" name="format" />
        <el-tab-pane label="自定义规则" name="custom" />
      </el-tabs>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索规则名称、描述"
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
            @change="loadRules"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filterSeverity"
            placeholder="风险等级"
            clearable
            @change="loadRules"
          >
            <el-option label="低风险" value="low" />
            <el-option label="中风险" value="medium" />
            <el-option label="高风险" value="high" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <div class="filter-actions">
            <el-button @click="resetFilters">重置</el-button>
            <el-button type="primary" @click="loadRules">搜索</el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 规则列表 -->
    <div v-loading="loading" class="rules-list">
      <el-table :data="rules" style="width: 100%" empty-text="暂无规则数据">
        <el-table-column type="selection" width="55" />

        <el-table-column prop="name" label="规则名称" min-width="200">
          <template #default="{ row }">
            <div class="rule-name">
              <el-icon><Document /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag :type="getCategoryTag(row.category)">
              {{ getCategoryText(row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="severity" label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityTag(row.severity)">
              {{ getSeverityText(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="规则描述" min-width="250" />

        <el-table-column prop="is_active" label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.is_active"
              @change="toggleRuleStatus(row)"
            />
          </template>
        </el-table-column>

        <el-table-column
          prop="trigger_count"
          label="触发次数"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            {{ row.trigger_count || 0 }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewRule(row)">查看</el-button>
            <el-button size="small" type="primary" @click="editRule(row)"
              >编辑</el-button
            >
            <el-dropdown @command="handleCommand($event, row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="test">测试规则</el-dropdown-item>
                  <el-dropdown-item command="duplicate"
                    >复制规则</el-dropdown-item
                  >
                  <el-dropdown-item command="delete" divided
                    >删除</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <div v-if="!loading && rules.length === 0" class="empty-state">
        <el-empty description="暂无规则数据">
          <el-button type="primary" @click="showCreateDialog = true">
            创建第一条规则
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 批量操作 -->
    <div v-if="selectedRules.length > 0" class="batch-actions">
      <el-space>
        <span>已选择 {{ selectedRules.length }} 条规则</span>
        <el-button size="small" @click="batchEnable">批量启用</el-button>
        <el-button size="small" @click="batchDisable">批量禁用</el-button>
        <el-button size="small" type="danger" @click="batchDelete"
          >批量删除</el-button
        >
      </el-space>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 创建规则对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="新建风险规则"
      width="800px"
      :before-close="handleCreateDialogClose"
    >
      <RuleForm
        ref="ruleFormRef"
        @submit="handleRuleSubmit"
        @cancel="showCreateDialog = false"
      />
    </el-dialog>

    <!-- 规则详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="规则详情" width="900px">
      <RuleDetail
        v-if="selectedRule"
        :rule="selectedRule"
        @close="showDetailDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Plus,
  Upload,
  Download,
  Document,
  ArrowDown,
  Star,
} from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";
import RuleForm from "./components/rule-form.vue";
import RuleDetail from "./components/rule-detail.vue";

const router = useRouter();

const loading = ref(false);
const activeCategory = ref("all");
const searchKeyword = ref("");
const filterStatus = ref("");
const filterSeverity = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const rules = ref<any[]>([]);
const selectedRules = ref<any[]>([]);
const selectedRule = ref<any>(null);

const showCreateDialog = ref(false);
const showDetailDialog = ref(false);

const goBack = () => {
  router.push("/dashboard");
};

const loadRules = async () => {
  loading.value = true;

  try {
    // 构建查询条件
    let query = supabase.from("risk_rules").select("*", { count: "exact" });

    // 添加筛选条件
    if (activeCategory.value !== "all") {
      query = query.eq("category", activeCategory.value);
    }

    if (searchKeyword.value) {
      query = query.or(
        `name.ilike.%${searchKeyword.value}%,description.ilike.%${searchKeyword.value}%`,
      );
    }

    if (filterStatus.value) {
      query = query.eq("status", filterStatus.value);
    }

    if (filterSeverity.value) {
      query = query.eq("severity", filterSeverity.value);
    }

    // 排序
    query = query.order("created_at", { ascending: false });

    // 分页
    const from = (currentPage.value - 1) * pageSize.value;
    const to = from + pageSize.value - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    rules.value = data || [];
    total.value = count || 0;
  } catch (error: any) {
    ElMessage.error(`加载规则列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadRules();
};

const resetFilters = () => {
  activeCategory.value = "all";
  searchKeyword.value = "";
  filterStatus.value = "";
  filterSeverity.value = "";
  currentPage.value = 1;
  loadRules();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadRules();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadRules();
};

const toggleRuleStatus = async (rule: any) => {
  try {
    const { error } = await supabase
      .from("risk_rules")
      .update({ is_active: rule.is_active })
      .eq("id", rule.id);

    if (error) throw error;

    ElMessage.success(`规则已${rule.is_active ? "启用" : "禁用"}`);
  } catch (error: any) {
    ElMessage.error(`操作失败: ${error.message}`);
    // 恢复状态
    rule.is_active = !rule.is_active;
  }
};

const viewRule = (rule: any) => {
  selectedRule.value = rule;
  showDetailDialog.value = true;
};

const editRule = (rule: any) => {
  // 跳转到编辑页面
  router.push(`/risk-rules/${rule.id}/edit`);
};

const handleCommand = async (command: string, rule: any) => {
  switch (command) {
    case "test":
      await testRule(rule);
      break;
    case "duplicate":
      await duplicateRule(rule);
      break;
    case "delete":
      await deleteRule(rule);
      break;
  }
};

const testRule = async (rule: any) => {
  ElMessage.info(`测试规则: ${rule.name}`);
  // 这里可以实现规则测试功能
};

const duplicateRule = async (rule: any) => {
  try {
    const { data, error } = await supabase
      .from("risk_rules")
      .insert([
        {
          ...rule,
          id: undefined,
          name: `${rule.name} - 副本`,
          trigger_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    ElMessage.success("规则复制成功");
    loadRules();
  } catch (error: any) {
    ElMessage.error(`复制失败: ${error.message}`);
  }
};

const deleteRule = async (rule: any) => {
  try {
    await ElMessageBox.confirm("确定要删除此规则吗？此操作不可恢复。", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const { error } = await supabase
      .from("risk_rules")
      .delete()
      .eq("id", rule.id);

    if (error) throw error;

    ElMessage.success("规则删除成功");
    loadRules();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`删除失败: ${error.message}`);
    }
  }
};

const addDemoRules = () => {
  router.push('/risk-rules/add-demo');
};

const importRules = () => {
  ElMessage.info("导入规则功能开发中...");
};

const exportRules = () => {
  ElMessage.info("导出规则功能开发中...");
};

const batchEnable = async () => {
  try {
    const ruleIds = selectedRules.value.map((rule) => rule.id);

    const { error } = await supabase
      .from("risk_rules")
      .update({ is_active: true })
      .in("id", ruleIds);

    if (error) throw error;

    ElMessage.success("批量启用成功");
    selectedRules.value = [];
    loadRules();
  } catch (error: any) {
    ElMessage.error(`批量启用失败: ${error.message}`);
  }
};

const batchDisable = async () => {
  try {
    const ruleIds = selectedRules.value.map((rule) => rule.id);

    const { error } = await supabase
      .from("risk_rules")
      .update({ is_active: false })
      .in("id", ruleIds);

    if (error) throw error;

    ElMessage.success("批量禁用成功");
    selectedRules.value = [];
    loadRules();
  } catch (error: any) {
    ElMessage.error(`批量禁用失败: ${error.message}`);
  }
};

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      "确定要删除选中的规则吗？此操作不可恢复。",
      "警告",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    const ruleIds = selectedRules.value.map((rule) => rule.id);

    const { error } = await supabase
      .from("risk_rules")
      .delete()
      .in("id", ruleIds);

    if (error) throw error;

    ElMessage.success("批量删除成功");
    selectedRules.value = [];
    loadRules();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`批量删除失败: ${error.message}`);
    }
  }
};

const handleCreateDialogClose = (done: () => void) => {
  ElMessageBox.confirm("确定要关闭吗？未保存的内容将丢失。", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      done();
    })
    .catch(() => {
      // 取消关闭
    });
};

const handleRuleSubmit = (ruleData: any) => {
  // 处理规则提交
  showCreateDialog.value = false;
  loadRules();
};

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

const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN");
};

onMounted(() => {
  loadRules();
});
</script>

<style scoped>
.risk-rules {
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

.rule-categories {
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

.rules-list {
  min-height: 400px;
}

.rule-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-name .el-icon {
  color: #409eff;
}

.empty-state {
  padding: 60px 0;
}

.batch-actions {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
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

:deep(.el-table .cell) {
  line-height: 1.5;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
}
</style>
