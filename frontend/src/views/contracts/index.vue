<template>
  <div class="contracts-container">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>合同管理</h2>
            <p>管理所有上传的合同文件</p>
          </div>
        </template>
      </el-page-header>

      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/contracts/upload')">
          <el-icon><Upload /></el-icon>
          上传合同
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon total-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总合同数</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon pending-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">待分析</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon completed-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.completed }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon risk-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.risky }}</div>
              <div class="stat-label">高风险</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索合同名称、当事人"
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
            placeholder="分析状态"
            clearable
            @change="loadContracts"
          >
            <el-option label="待分析" value="pending" />
            <el-option label="分析中" value="analyzing" />
            <el-option label="已完成" value="completed" />
            <el-option label="分析失败" value="failed" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filterType"
            placeholder="合同类型"
            clearable
            @change="loadContracts"
          >
            <el-option label="采购合同" value="purchase" />
            <el-option label="销售合同" value="sale" />
            <el-option label="服务合同" value="service" />
            <el-option label="租赁合同" value="lease" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filterRisk"
            placeholder="风险等级"
            clearable
            @change="loadContracts"
          >
            <el-option label="低风险" value="low" />
            <el-option label="中风险" value="medium" />
            <el-option label="高风险" value="high" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <div class="filter-actions">
            <el-button @click="resetFilters">重置</el-button>
            <el-button type="primary" @click="loadContracts">搜索</el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 合同列表 -->
    <el-card class="contracts-list">
      <el-table
        v-loading="loading"
        :data="contracts"
        style="width: 100%"
        empty-text="暂无合同数据"
      >
        <el-table-column prop="contract_title" label="合同名称" min-width="200">
          <template #default="{ row }">
            <div class="contract-name">
              <el-icon><Document /></el-icon>
              <span>{{ row.contract_title || row.filename }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="category" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.category)">{{
              getTypeText(row.category)
            }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="甲方" width="150">
          <template #default="{ row }">
            {{ row.contract_parties?.party_a || "-" }}
          </template>
        </el-table-column>

        <el-table-column label="乙方" width="150">
          <template #default="{ row }">
            {{ row.contract_parties?.party_b || "-" }}
          </template>
        </el-table-column>

        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">
            {{
              row.contract_amount
                ? `¥${formatAmount(row.contract_amount)}`
                : "-"
            }}
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{
              getStatusText(row.status)
            }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag
              v-if="
                row.analysis && row.analysis.overall_risk_level !== 'pending'
              "
              :type="getRiskTag(row.analysis.overall_risk_level)"
            >
              {{ getRiskText(row.analysis.overall_risk_level) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="上传时间" width="150">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewContractDetail(row)" type="primary">查看详情</el-button>
            <el-button
              size="small"
              type="success"
              :disabled="row.status === 'analyzing'"
              @click="analyzeContract(row)"
            >
              {{ row.status === "analyzing" ? "分析中" : "分析" }}
            </el-button>
            <el-button size="small" type="warning" @click="viewContractFile(row)">
              查看文件
            </el-button>
            <el-button size="small" type="danger" @click="deleteContract(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Search,
  Upload,
  Document,
  Clock,
  CircleCheck,
  Warning,
} from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";
import { apiMethods } from "@/utils/api";

const router = useRouter();

const loading = ref(false);
const searchKeyword = ref("");
const filterStatus = ref("");
const filterType = ref("");
const filterRisk = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const contracts = ref<any[]>([]);
const stats = ref({
  total: 0,
  pending: 0,
  completed: 0,
  risky: 0,
});

const goBack = () => {
  router.push("/dashboard");
};

const loadContracts = async () => {
  loading.value = true;

  try {
    // 构建查询条件，包含关联的分析数据
    let query = supabase
      .from("contracts")
      .select(
        `
        *,
        contract_analysis (
          contract_id,
          overall_risk_level,
          analysis_result,
          created_at
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // 添加筛选条件
    if (searchKeyword.value) {
      query = query.or(
        `contract_title.ilike.%${searchKeyword.value}%,contract_parties.party_a.ilike.%${searchKeyword.value}%,contract_parties.party_b.ilike.%${searchKeyword.value}%`,
      );
    }

    if (filterStatus.value) {
      query = query.eq("status", filterStatus.value);
    }

    if (filterType.value) {
      query = query.eq("category", filterType.value);
    }

    // 风险等级过滤需要在客户端处理
    // 因为Supabase不支持直接关联表过滤，我们将在获取数据后在客户端过滤

    // 分页
    const from = (currentPage.value - 1) * pageSize.value;
    const to = from + pageSize.value - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    // 在客户端应用风险等级过滤
    let filteredData = data || [];
    if (filterRisk.value) {
      filteredData = filteredData.filter((contract) => {
        const riskLevel = contract.contract_analysis?.[0]?.overall_risk_level;
        return riskLevel === filterRisk.value;
      });
    }

    contracts.value = filteredData;
    total.value = filterRisk.value ? filteredData.length : count || 0;

    // 加载统计信息
    await loadStats();
  } catch (error: any) {
    ElMessage.error(`加载合同列表失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    // 首先获取所有合同的基本信息
    const { data: contractsData, error: contractsError } = await supabase
      .from("contracts")
      .select("id, status");

    if (contractsError) throw contractsError;

    // 获取所有合同分析的风险等级信息
    const { data: analysisData, error: analysisError } = await supabase
      .from("contract_analysis")
      .select("contract_id, overall_risk_level");

    if (analysisError) throw analysisError;

    // 创建风险等级映射
    const riskLevelMap = new Map();
    analysisData?.forEach((item) => {
      riskLevelMap.set(item.contract_id, item.overall_risk_level);
    });

    const statsData = {
      total: contractsData?.length || 0,
      pending:
        contractsData?.filter((item) => item.status === "uploaded").length || 0,
      completed:
        contractsData?.filter((item) => item.status === "analyzed").length || 0,
      risky:
        contractsData?.filter((item) => riskLevelMap.get(item.id) === "high")
          .length || 0,
    };

    stats.value = statsData;
  } catch (error: any) {
    console.error("加载统计信息失败:", error);
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  loadContracts();
};

const resetFilters = () => {
  searchKeyword.value = "";
  filterStatus.value = "";
  filterType.value = "";
  filterRisk.value = "";
  currentPage.value = 1;
  loadContracts();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadContracts();
};

const handleCurrentChange = (page: number) => {
  currentPage.value = page;
  loadContracts();
};

const viewContractDetail = (contract: any) => {
  router.push(`/contracts/${contract.id}`);
};

const viewContractFile = (contract: any) => {
  if (!contract.file_path) {
    ElMessage.warning('该合同没有上传文件');
    return;
  }
  
  // 智能判断文件类型，选择合适的查看方式
  const fileName = contract.filename || contract.file_path.split(/[\\/]/).pop() || '';
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  console.log('查看文件:', { fileName, fileExtension, file_path: contract.file_path });
  
  // 如果是PDF文件，使用PDF预览
  if (fileExtension === '.pdf') {
    router.push({
      path: '/contracts-preview',
      query: { 
        contract_id: contract.id,
        fileUrl: contract.file_path,
        fileName: fileName
      }
    });
  } else {
    // 其他格式使用文本提取或文件查看器
    router.push({
      path: '/contracts/text-extract',
      query: { contract_id: contract.id }
    });
  }
};

const analyzeContract = async (contract: any) => {
  try {
    // 更新合同状态为分析中
    const { error } = await supabase
      .from("contracts")
      .update({ status: "processing" })
      .eq("id", contract.id);

    if (error) throw error;

    ElMessage.success("开始分析合同...");

    // 使用统一的API方法调用分析API
    await apiMethods.create(`/analysis/analyze/${contract.id}`, {});

    ElMessage.success("合同分析完成");
    // 刷新合同列表
    loadContracts();
    // 跳转到分析结果页面
    router.push(`/contracts/analysis?contract_id=${contract.id}`);
  } catch (error: any) {
    // 恢复合同状态
    try {
      await supabase
        .from("contracts")
        .update({ status: "uploaded" })
        .eq("id", contract.id);
    } catch (updateError) {
      console.error("恢复合同状态失败:", updateError);
    }

    ElMessage.error(`分析失败: ${error.message}`);
  }
};

const deleteContract = async (contract: any) => {
  try {
    await ElMessageBox.confirm("确定要删除此合同吗？此操作不可恢复。", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contract.id);

    if (error) throw error;

    ElMessage.success("合同删除成功");
    loadContracts();
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`删除失败: ${error.message}`);
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
    purchase: "采购",
    sale: "销售",
    service: "服务",
    lease: "租赁",
    other: "其他",
  };
  return typeMap[type] || type;
};

const getStatusTag = (status: string) => {
  const statusMap: any = {
    pending: "info",
    analyzing: "warning",
    completed: "success",
    failed: "danger",
  };
  return statusMap[status] || "info";
};

const getStatusText = (status: string) => {
  const statusMap: any = {
    pending: "待分析",
    analyzing: "分析中",
    completed: "已完成",
    failed: "分析失败",
  };
  return statusMap[status] || status;
};

const getRiskTag = (risk: string | null | undefined) => {
  if (!risk) return "info";
  const riskMap: any = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return riskMap[risk] || "info";
};

const getRiskText = (risk: string | null | undefined) => {
  if (!risk) return "未知";
  const riskMap: any = {
    low: "低风险",
    medium: "中风险", 
    high: "高风险",
  };
  return riskMap[risk] || risk;
};

const formatAmount = (amount: number) => {
  return amount.toLocaleString();
};

const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("zh-CN");
};

onMounted(() => {
  loadContracts();
});
</script>

<style scoped>
.contracts-container {
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

.stats-cards {
  margin-bottom: 30px;
}

.stat-card {
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.stat-icon {
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

.total-icon {
  background: #409eff;
}
.pending-icon {
  background: #e6a23c;
}
.completed-icon {
  background: #67c23a;
}
.risk-icon {
  background: #f56c6c;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
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

.contracts-list {
  border-radius: 8px;
}

.contract-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contract-name .el-icon {
  color: #409eff;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

:deep(.el-table .cell) {
  line-height: 1.5;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
}
</style>
