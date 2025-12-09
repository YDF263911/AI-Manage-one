<template>
  <div class="preview-container">
    <!-- 导航栏 -->
    <nav class="preview-navbar">
      <div class="nav-brand">
        <h2>AI智能合同分析管理系统</h2>
      </div>
      <div class="nav-actions">
        <el-button
          v-if="!isLoggedIn"
          type="primary"
          size="large"
          class="nav-btn"
          @click="handleLogin"
        >
          登录
        </el-button>
        <el-button
          v-if="!isLoggedIn"
          type="success"
          size="large"
          class="nav-btn"
          @click="handleRegister"
        >
          注册
        </el-button>
        <el-button
          v-if="isLoggedIn"
          type="info"
          size="large"
          class="nav-btn"
          @click="handleLogout"
        >
          注销
        </el-button>
        <el-button
          v-if="isLoggedIn"
          type="primary"
          size="large"
          class="nav-btn"
          @click="handleDashboard"
        >
          进入控制台
        </el-button>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <div class="preview-content">
      <!-- 系统介绍 -->
      <div class="intro-section">
        <h1>企业级合同全生命周期智能化管理平台</h1>
        <p class="intro-description">
          基于AI技术的智能合同分析系统，帮助企业实现合同管理的自动化、智能化和规范化
        </p>
      </div>

      <!-- 合同样本展示 -->
      <div class="samples-section">
        <h2 class="samples-title">合同样本展示</h2>
        <div class="samples-grid">
          <div
            v-for="sample in contractSamples"
            :key="sample.id"
            class="sample-card"
          >
            <div class="sample-icon">
              <el-icon size="32">
                <component :is="sample.icon" />
              </el-icon>
            </div>
            <h3 class="sample-title">{{ sample.title }}</h3>
            <p class="sample-description">{{ sample.description }}</p>
            <div class="sample-tags">
              <el-tag
                v-for="tag in sample.tags"
                :key="tag"
                size="small"
                :type="getTagType(tag)"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 功能特性 -->
      <div class="features-section">
        <h2>核心功能特性</h2>
        <div class="features-grid">
          <div class="feature-item">
            <el-icon size="28" color="#409EFF"><Document /></el-icon>
            <h3>智能解析</h3>
            <p>AI自动识别合同关键条款和风险点</p>
          </div>
          <div class="feature-item">
            <el-icon size="28" color="#67C23A"><TrendCharts /></el-icon>
            <h3>风险评估</h3>
            <p>多维度评估合同风险等级</p>
          </div>
          <div class="feature-item">
            <el-icon size="28" color="#E6A23C"><DocumentCopy /></el-icon>
            <h3>模板管理</h3>
            <p>丰富的标准合同模板库</p>
          </div>
          <div class="feature-item">
            <el-icon size="28" color="#F56C6C"><DataAnalysis /></el-icon>
            <h3>数据分析</h3>
            <p>合同数据可视化和统计分析</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="preview-footer">
      <p>© 2024 AI智能合同分析管理系统 - 技术支持：专业团队</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import api from "@/utils/api";
import {
  Document,
  DataAnalysis,
  OfficeBuilding,
  ShoppingBag,
  User,
  Lock,
  Files,
  HomeFilled,
  TrendCharts,
  DocumentCopy,
} from "@element-plus/icons-vue";

const router = useRouter();
const userStore = useUserStore();

// 计算用户登录状态
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 从API获取合同模板数据
const contractSamples = ref([]);
const loadingSamples = ref(false);

// 加载合同模板数据
const loadContractSamples = async () => {
  try {
    loadingSamples.value = true;
    const response = await api.get('/templates', {
      params: {
        status: 'active',
        limit: 6
      }
    });
    
    if (response.data.success) {
      contractSamples.value = response.data.data.map(template => ({
        id: template.id,
        title: template.name,
        description: template.description || '专业的合同模板',
        tags: template.tags || ['模板'],
        icon: "Files"
      }));
    }
  } catch (error) {
    console.error('加载合同模板失败:', error);
    // 如果API调用失败，显示空列表而不是模拟数据
    contractSamples.value = [];
  } finally {
    loadingSamples.value = false;
  }
};

// 页面加载时获取数据
onMounted(() => {
  loadContractSamples();
});

// 标签类型映射
const getTagType = (tag: string) => {
  const typeMap: Record<string, string> = {
    采购: "primary",
    销售: "success",
    服务: "warning",
    人事: "info",
    保密: "danger",
    租赁: "primary",
    场地: "success",
    商品: "warning",
    雇佣: "info",
    商业: "danger",
    技术: "primary",
    房产: "success",
    交易: "warning",
  };
  return typeMap[tag] || "info";
};

const handleLogin = () => {
  router.push("/login");
};

const handleRegister = () => {
  // 跳转到注册页面
  router.push("/register");
};

const handleLogout = () => {
  userStore.logout();
  // 刷新页面以更新界面状态
  location.reload();
};

const handleDashboard = () => {
  router.push("/dashboard");
};
</script>

<style scoped lang="scss">
.preview-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.preview-navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;

  .nav-brand h2 {
    color: #2c3e50;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .nav-actions {
    display: flex;
    gap: 1rem;

    .nav-btn {
      min-width: 100px;
    }
  }
}

.preview-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.intro-section {
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .intro-description {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.2rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
}

.samples-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  .samples-title {
    text-align: center;
    color: #2c3e50;
    font-size: 1.8rem;
    margin-bottom: 2rem;
  }

  .samples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .sample-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    transition: all 0.3s ease;
    border: 1px solid #e9ecef;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .sample-icon {
      margin-bottom: 1rem;
      color: #667eea;
    }

    .sample-title {
      color: #2c3e50;
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }

    .sample-description {
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.4;
      margin-bottom: 1rem;
    }

    .sample-tags {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }
}

.features-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);

  h2 {
    text-align: center;
    color: #2c3e50;
    font-size: 1.8rem;
    margin-bottom: 2rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }

  .feature-item {
    text-align: center;
    padding: 1.5rem;

    h3 {
      color: #2c3e50;
      font-size: 1.2rem;
      margin: 1rem 0 0.5rem;
    }

    p {
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.4;
    }
  }
}

.preview-footer {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  text-align: center;

  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin: 0;
  }
}

@media (max-width: 768px) {
  .preview-navbar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;

    .nav-actions {
      width: 100%;
      justify-content: center;
    }
  }

  .preview-content {
    padding: 1rem;
  }

  .intro-section h1 {
    font-size: 2rem;
  }

  .samples-grid {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
