<template>
  <div class="dashboard-container">
    <!-- 页面标题和刷新按钮 -->
    <div class="page-header">
      <h1 class="page-title">仪表板</h1>
      <div class="header-actions">
        <el-button type="primary" :loading="isLoading" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 顶部统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon total-contracts">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ dashboardStats.totalContracts }}</div>
            <div class="stat-label">总合同数</div>
            <div v-if="lastStats" class="stat-trend">
              <span
                :class="
                  getTrendClass(
                    dashboardStats.totalContracts - lastStats.totalContracts,
                  )
                "
              >
                <el-icon
                  v-if="
                    dashboardStats.totalContracts > lastStats.totalContracts
                  "
                >
                  <Top />
                </el-icon>
                <el-icon
                  v-else-if="
                    dashboardStats.totalContracts < lastStats.totalContracts
                  "
                >
                  <Bottom />
                </el-icon>
                <el-icon v-else>
                  <Right />
                </el-icon>
                {{
                  Math.abs(
                    dashboardStats.totalContracts - lastStats.totalContracts,
                  )
                }}
              </span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon pending-contracts">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ dashboardStats.pendingContracts }}</div>
            <div class="stat-label">待处理合同</div>
            <div v-if="lastStats" class="stat-trend">
              <span
                :class="
                  getTrendClass(
                    dashboardStats.pendingContracts -
                      lastStats.pendingContracts,
                  )
                "
              >
                <el-icon
                  v-if="
                    dashboardStats.pendingContracts > lastStats.pendingContracts
                  "
                >
                  <Top />
                </el-icon>
                <el-icon
                  v-else-if="
                    dashboardStats.pendingContracts < lastStats.pendingContracts
                  "
                >
                  <Bottom />
                </el-icon>
                <el-icon v-else>
                  <Right />
                </el-icon>
                {{
                  Math.abs(
                    dashboardStats.pendingContracts -
                      lastStats.pendingContracts,
                  )
                }}
              </span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon analyzed-contracts">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">
              {{ dashboardStats.analyzedContracts }}
            </div>
            <div class="stat-label">已分析合同</div>
            <div v-if="lastStats" class="stat-trend">
              <span
                :class="
                  getTrendClass(
                    dashboardStats.analyzedContracts -
                      lastStats.analyzedContracts,
                  )
                "
              >
                <el-icon
                  v-if="
                    dashboardStats.analyzedContracts >
                    lastStats.analyzedContracts
                  "
                >
                  <Top />
                </el-icon>
                <el-icon
                  v-else-if="
                    dashboardStats.analyzedContracts <
                    lastStats.analyzedContracts
                  "
                >
                  <Bottom />
                </el-icon>
                <el-icon v-else>
                  <Right />
                </el-icon>
                {{
                  Math.abs(
                    dashboardStats.analyzedContracts -
                      lastStats.analyzedContracts,
                  )
                }}
              </span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon risk-level">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ dashboardStats.complianceRate }}%</div>
            <div class="stat-label">合规率</div>
            <div v-if="lastStats" class="stat-trend">
              <span
                :class="
                  getTrendClass(
                    dashboardStats.complianceRate - lastStats.complianceRate,
                  )
                "
              >
                <el-icon
                  v-if="
                    dashboardStats.complianceRate > lastStats.complianceRate
                  "
                >
                  <Top />
                </el-icon>
                <el-icon
                  v-else-if="
                    dashboardStats.complianceRate < lastStats.complianceRate
                  "
                >
                  <Bottom />
                </el-icon>
                <el-icon v-else>
                  <Right />
                </el-icon>
                {{
                  Math.abs(
                    dashboardStats.complianceRate - lastStats.complianceRate,
                  )
                }}%
              </span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 合同类别分布 -->
      <ChartContainer
        title="合同类别分布"
        :height="300"
        :loading="chartLoading.category"
        :error="chartError.category"
        :has-data="hasChartData.category"
        :options="categoryChartOptions"
        @refresh="loadCategoryChartData"
      />

      <!-- 风险分布 -->
      <ChartContainer
        title="风险分布"
        :height="300"
        :loading="chartLoading.risk"
        :error="chartError.risk"
        :has-data="hasChartData.risk"
        :options="riskChartOptions"
        @refresh="loadRiskChartData"
      />

      <!-- 月度趋势 -->
      <ChartContainer
        title="月度合同趋势"
        :height="300"
        :loading="chartLoading.trend"
        :error="chartError.trend"
        :has-data="hasChartData.trend"
        :options="trendChartOptions"
        @refresh="loadTrendChartData"
      />

      <!-- 最近活动 -->
      <el-card class="recent-activity">
        <template #header>
          <span class="card-title">最近活动</span>
        </template>
        <div class="activity-list">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">
              <el-icon v-if="activity.action === 'upload'">
                <Upload />
              </el-icon>
              <el-icon v-else-if="activity.action === 'analysis'">
                <TrendCharts />
              </el-icon>
              <el-icon v-else>
                <Document />
              </el-icon>
            </div>
            <div class="activity-content">
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-time">
                {{ formatTimeAgo(activity.timestamp) }}
              </div>
            </div>
          </div>
          <div v-if="recentActivities.length === 0" class="activity-empty">
            <el-empty description="暂无活动记录" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 最近合同 -->
      <el-card class="recent-contracts">
        <template #header>
          <div class="card-header">
            <span class="card-title">最近合同</span>
            <el-button type="primary" text class="white-text-button" @click="$router.push('/contracts')">
              查看全部
            </el-button>
          </div>
        </template>

        <el-table
          v-loading="isLoading"
          :data="recentContracts"
          style="width: 100%"
        >
          <el-table-column prop="filename" label="文件名" min-width="200">
            <template #default="{ row }">
              <div class="file-info">
                <el-icon class="file-icon">
                  <Document />
                </el-icon>
                <span class="file-name">{{ row.filename }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="category" label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getCategoryTagType(row.category)">
                {{ getCategoryLabel(row.category) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="created_at" label="上传时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link type="primary" class="white-text-button" @click="viewContract(row)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="recentContracts.length === 0" class="empty-state">
          <el-empty description="暂无合同数据">
            <el-button
              type="primary"
              @click="$router.push('/contracts/upload')"
            >
              上传第一个合同
            </el-button>
          </el-empty>
        </div>
      </el-card>

      <!-- 右侧信息 -->
      <div class="right-sidebar">
        <!-- 快速操作 -->
        <el-card class="quick-actions">
          <template #header>
            <span class="card-title">快速操作</span>
          </template>

          <div class="action-buttons">
            <el-button
              type="primary"
              class="action-btn"
              @click="$router.push('/contracts/upload')"
            >
              <el-icon><Upload /></el-icon>
              上传合同
            </el-button>

            <el-button class="action-btn" @click="$router.push('/templates')">
              <el-icon><Files /></el-icon>
              模板管理
            </el-button>

            <el-button class="action-btn" @click="$router.push('/risk-rules')">
              <el-icon><Warning /></el-icon>
              风险规则
            </el-button>
          </div>
        </el-card>

        <!-- 系统状态 -->
        <el-card class="system-status">
          <template #header>
            <span class="card-title">系统状态</span>
          </template>

          <div class="status-list">
            <div class="status-item">
              <div class="status-label">AI分析服务</div>
              <el-tag type="success">正常</el-tag>
            </div>
            <div class="status-item">
              <div class="status-label">数据库连接</div>
              <el-tag type="success">正常</el-tag>
            </div>
            <div class="status-item">
              <div class="status-label">文件存储</div>
              <el-tag type="success">正常</el-tag>
            </div>
            <div class="status-item">
              <div class="status-label">系统版本</div>
              <el-tag>v1.0.0</el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useContractStore } from "@/stores/contract";
import { useAuthStore } from "@/stores/auth";
import { dashboardService, type DashboardStats } from "@/services/dashboard";
import { ChartData } from "@/services/dashboard";
import { useNotification } from "@/composables/useNotification";
import * as echarts from "echarts";
import ChartContainer from "@/components/charts/ChartContainer.vue";
import {
  Document,
  Clock,
  Check,
  Warning,
  Upload,
  Files,
  Refresh,
  Top,
  Bottom,
  Right,
  TrendCharts,
} from "@element-plus/icons-vue";

const router = useRouter();
const contractStore = useContractStore();
const authStore = useAuthStore();
const { showSuccess, showError, showInfo } = useNotification();

// 响应式数据
const isLoading = ref(false);
const dashboardStats = ref<DashboardStats>({
  totalContracts: 0,
  pendingContracts: 0,
  analyzedContracts: 0,
  complianceRate: 0,
  riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
  categoryDistribution: {},
  recentActivity: [],
});
const lastStats = ref<DashboardStats | null>(null);

// 图表数据
const categoryChartData = ref<ChartData>({ labels: [], values: [] });
const riskChartData = ref<ChartData>({ labels: [], values: [] });
const trendChartData = ref<ChartData>({ labels: [], values: [] });

// 图表加载状态
const chartLoading = ref({
  category: false,
  risk: false,
  trend: false,
});

const chartError = ref({
  category: "",
  risk: "",
  trend: "",
});

// 计算最近的合同（最多显示5个）
const recentContracts = computed(() => {
  return contractStore.contracts.slice(0, 5);
});

// 最近活动
const recentActivities = computed(() => {
  return dashboardStats.value.recentActivity.slice(0, 5);
});

// 图表数据检查
const hasChartData = computed(() => ({
  category: categoryChartData.value.values.some((val) => val > 0),
  risk: riskChartData.value.values.some((val) => val > 0),
  trend: trendChartData.value.values.some((val) => val > 0),
}));

// 图表配置
const categoryChartOptions = computed(
  (): echarts.EChartsOption => ({
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "center",
    },
    series: [
      {
        name: "合同类别",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: "bold",
          },
        },
        labelLine: {
          show: false,
        },
        data: categoryChartData.value.labels.map((label, index) => ({
          value: categoryChartData.value.values[index],
          name: label,
        })),
      },
    ],
  }),
);

const riskChartOptions = computed(
  (): echarts.EChartsOption => ({
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    xAxis: {
      type: "category",
      data: riskChartData.value.labels,
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "风险数量",
        type: "bar",
        barWidth: "60%",
        data: riskChartData.value.values.map((value, index) => ({
          value,
          itemStyle: {
            color: getRiskColor(riskChartData.value.labels[index]),
          },
        })),
      },
    ],
  }),
);

const trendChartOptions = computed(
  (): echarts.EChartsOption => ({
    tooltip: {
      trigger: "axis",
    },
    xAxis: {
      type: "category",
      data: trendChartData.value.labels,
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "合同数量",
        type: "line",
        data: trendChartData.value.values,
        smooth: true,
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(64, 158, 255, 0.3)" },
            { offset: 1, color: "rgba(64, 158, 255, 0.1)" },
          ]),
        },
      },
    ],
  }),
);

// 获取风险颜色
const getRiskColor = (riskLabel: string) => {
  const colors: Record<string, string> = {
    低风险: "#67c23a",
    中风险: "#e6a23c",
    高风险: "#f56c6c",
    严重风险: "#f56c6c",
  };
  return colors[riskLabel] || "#909399";
};

// 获取趋势样式
const getTrendClass = (difference: number) => {
  if (difference > 0) return "trend-up";
  if (difference < 0) return "trend-down";
  return "trend-neutral";
};

// 获取分类标签类型
const getCategoryTagType = (category: string) => {
  const types: Record<string, string> = {
    purchase: "primary",
    sales: "success",
    service: "warning",
    employment: "danger",
    nda: "info",
    lease: "",
    partnership: "success",
    other: "info",
  };
  return types[category] || "info";
};

// 获取分类标签文本
const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    purchase: "采购合同",
    sales: "销售合同",
    service: "服务合同",
    employment: "劳动合同",
    nda: "保密协议",
    lease: "租赁合同",
    partnership: "合作协议",
    other: "其他",
  };
  return labels[category] || "未知";
};

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const types: Record<string, string> = {
    uploaded: "info",
    processing: "warning",
    analyzed: "success",
    reviewed: "primary",
    approved: "success",
    rejected: "danger",
  };
  return types[status] || "info";
};

// 获取状态标签文本
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    uploaded: "已上传",
    processing: "处理中",
    analyzed: "已分析",
    reviewed: "已审核",
    approved: "已批准",
    rejected: "已拒绝",
  };
  return labels[status] || "未知";
};

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 格式化时间差
const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return "刚刚";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  return formatDate(timestamp);
};

// 查看合同详情
const viewContract = (contract: any) => {
  router.push(`/contracts/${contract.id}`);
};

// 加载仪表板数据
const loadDashboardStats = async () => {
  try {
    isLoading.value = true;
    const stats = await dashboardService.getDashboardStats();
    lastStats.value = { ...dashboardStats.value };
    dashboardStats.value = stats;
  } catch (error: any) {
    console.error("加载仪表板数据失败:", error);
    showError("加载仪表板数据失败，请检查网络连接或稍后重试", "数据加载失败");
  } finally {
    isLoading.value = false;
  }
};

// 加载图表数据
const loadCategoryChartData = async () => {
  try {
    chartLoading.value.category = true;
    chartError.value.category = "";
    categoryChartData.value = await dashboardService.getCategoryChartData();
  } catch (error: any) {
    console.error("加载类别图表数据失败:", error);
    chartError.value.category = error.message || "加载失败";
    showError("加载类别分布图表失败", "图表加载失败");
  } finally {
    chartLoading.value.category = false;
  }
};

const loadRiskChartData = async () => {
  try {
    chartLoading.value.risk = true;
    chartError.value.risk = "";
    riskChartData.value = await dashboardService.getRiskChartData();
  } catch (error: any) {
    console.error("加载风险图表数据失败:", error);
    chartError.value.risk = error.message || "加载失败";
    showError("加载风险分布图表失败", "图表加载失败");
  } finally {
    chartLoading.value.risk = false;
  }
};

const loadTrendChartData = async () => {
  try {
    chartLoading.value.trend = true;
    chartError.value.trend = "";
    trendChartData.value = await dashboardService.getMonthlyTrendChartData();
  } catch (error: any) {
    console.error("加载趋势图表数据失败:", error);
    chartError.value.trend = error.message || "加载失败";
    showError("加载月度趋势图表失败", "图表加载失败");
  } finally {
    chartLoading.value.trend = false;
  }
};

// 刷新所有数据
const refreshData = async () => {
  try {
    showInfo("正在刷新数据...", "数据刷新中");
    await Promise.all([
      loadDashboardStats(),
      loadCategoryChartData(),
      loadRiskChartData(),
      loadTrendChartData(),
      contractStore.loadContracts(),
    ]);
    showSuccess("数据刷新成功", "刷新完成");
  } catch (error: any) {
    showError("数据刷新失败，请稍后重试", "刷新失败");
  }
};

// 定时刷新数据
let refreshInterval: number | null = null;

const startAutoRefresh = () => {
  refreshInterval = window.setInterval(() => {
    loadDashboardStats();
  }, 30000); // 每30秒刷新一次统计数据
};

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

onMounted(async () => {
  // 加载所有数据
  await Promise.all([
    loadDashboardStats(),
    loadCategoryChartData(),
    loadRiskChartData(),
    loadTrendChartData(),
    contractStore.loadContracts(),
  ]);

  // 启动自动刷新
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped lang="scss">
.dashboard-container {
  padding: 0;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;

          &.total-contracts {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.pending-contracts {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.analyzed-contracts {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.risk-level {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }

        .stat-info {
          flex: 1;

          .stat-number {
            font-size: 24px;
            font-weight: 600;
            color: #333;
            line-height: 1;
          }

          .stat-label {
            font-size: 14px;
            color: #666;
            margin-top: 4px;
          }

          .stat-trend {
            margin-top: 4px;

            span {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              padding: 2px 6px;
              border-radius: 4px;

              &.trend-up {
                color: #67c23a;
                background-color: rgba(103, 194, 58, 0.1);
              }

              &.trend-down {
                color: #f56c6c;
                background-color: rgba(245, 108, 108, 0.1);
              }

              &.trend-neutral {
                color: #909399;
                background-color: rgba(144, 147, 153, 0.1);
              }
            }
          }
        }
      }
    }
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;

    .recent-activity {
      grid-column: span 2;

      .activity-list {
        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          .activity-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f5f7fa;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #409eff;
            flex-shrink: 0;
          }

          .activity-content {
            flex: 1;

            .activity-description {
              font-size: 14px;
              color: #303133;
              margin-bottom: 4px;
            }

            .activity-time {
              font-size: 12px;
              color: #909399;
            }
          }
        }

        .activity-empty {
          padding: 40px 0;
        }
      }
    }
  }

  .main-content {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 20px;

    .recent-contracts {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .card-title {
          font-size: 16px;
          font-weight: 600;
        }
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .file-icon {
          color: #409eff;
        }

        .file-name {
          font-weight: 500;
        }
      }

      .empty-state {
        padding: 40px 0;
      }
    }

    .right-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .quick-actions {
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;

          .action-btn {
            width: 100%;
            justify-content: flex-start;
            height: 48px;

            .el-icon {
              margin-right: 8px;
            }
          }
        }
      }

      .system-status {
        .status-list {
          .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;

            &:last-child {
              border-bottom: none;
            }

            .status-label {
              font-size: 14px;
              color: #666;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 1200px) {
  .dashboard-container {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .charts-grid {
      grid-template-columns: 1fr;

      .recent-activity {
        grid-column: span 1;
      }
    }

    .main-content {
      grid-template-columns: 1fr;

      .right-sidebar {
        grid-row: 1;
      }
    }
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
}

/* 白色字体按钮样式 */
.white-text-button {
  color: white !important;
}

/* 为文字按钮添加背景色 */
.white-text-button.el-button--text {
  background-color: #409eff;
  border-color: #409eff;
}

.white-text-button.el-button--text:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
}

/* 为链接按钮添加背景色 */
.white-text-button.el-button--link {
  background-color: #409eff;
  border-color: #409eff;
  color: white !important;
}

.white-text-button.el-button--link:hover {
  background-color: #66b1ff;
  border-color: #66b1ff;
  color: white !important;
}
</style>
