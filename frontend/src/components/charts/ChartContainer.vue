<template>
  <div class="chart-container" :style="{ '--chart-height': height + 'px' }">
    <div class="chart-header">
      <span class="chart-title">{{ title }}</span>
      <div class="chart-actions">
        <el-tooltip content="刷新数据" placement="top">
          <el-button
            link
            size="small"
            :loading="loading"
            @click="$emit('refresh')"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    <div
      ref="chartRef"
      class="chart-canvas"
      :style="{ height: height + 'px' }"
    ></div>
    <div v-if="loading" class="chart-loading">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <div v-else-if="error" class="chart-error">
      <el-icon class="error-icon"><Warning /></el-icon>
      <span>{{ error }}</span>
      <el-button link @click="$emit('refresh')">重试</el-button>
    </div>
    <div v-else-if="!hasData" class="chart-empty">
      <el-icon class="empty-icon"><DataBoard /></el-icon>
      <span>暂无数据</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";
import { Refresh, Loading, Warning, DataBoard } from "@element-plus/icons-vue";

interface Props {
  title: string;
  height?: number;
  loading?: boolean;
  error?: string;
  hasData?: boolean;
  options?: echarts.EChartsOption;
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  loading: false,
  error: "",
  hasData: true,
  options: () => ({}),
});

const emit = defineEmits<{
  refresh: [];
}>();

const chartRef = ref<HTMLDivElement>();
let chartInstance: echarts.ECharts | null = null;

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return;

  chartInstance = echarts.init(chartRef.value);

  // 设置默认选项
  const defaultOptions: echarts.EChartsOption = {
    backgroundColor: "transparent",
    animation: true,
    animationDuration: 1000,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e4e7ed",
      textStyle: {
        color: "#606266",
      },
      extraCssText: "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "15%",
      containLabel: true,
    },
  };

  chartInstance.setOption({
    ...defaultOptions,
    ...props.options,
  });
};

// 更新图表
const updateChart = () => {
  if (!chartInstance || !props.hasData) return;

  chartInstance.setOption(props.options, {
    notMerge: true,
    lazyUpdate: true,
  });
};

// 窗口大小变化时重新调整图表大小
const handleResize = () => {
  chartInstance?.resize();
};

onMounted(async () => {
  await nextTick();
  initChart();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  chartInstance?.dispose();
});

// 监听选项变化
watch(() => props.options, updateChart, { deep: true });

// 监听数据变化
watch(
  () => props.hasData,
  (newVal) => {
    if (newVal && chartInstance) {
      updateChart();
    }
  },
);

// 监听错误状态
watch(
  () => props.error,
  (newVal) => {
    if (newVal && chartInstance) {
      chartInstance.clear();
    }
  },
);
</script>

<style scoped lang="scss">
.chart-container {
  position: relative;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .chart-actions {
      display: flex;
      gap: 8px;
    }
  }

  .chart-canvas {
    width: 100%;
  }

  .chart-loading,
  .chart-error,
  .chart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: var(--chart-height);
    color: #909399;

    .loading-icon,
    .error-icon,
    .empty-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    .error-icon {
      color: #f56c6c;
    }

    .empty-icon {
      color: #c0c4cc;
    }
  }
}
</style>
