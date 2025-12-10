<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '250px'" class="sidebar">
      <div class="logo">
        <h2 v-if="!isCollapse">AI合同管理系统</h2>
        <h3 v-else>AI</h3>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        class="sidebar-menu"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><House /></el-icon>
          <span>仪表板</span>
        </el-menu-item>

        <el-sub-menu index="contracts">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>合同管理</span>
          </template>
          <el-menu-item index="/contracts">合同列表</el-menu-item>
          <el-menu-item index="/contracts/upload">上传合同</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="templates">
          <template #title>
            <el-icon><Files /></el-icon>
            <span>模板管理</span>
          </template>
          <el-menu-item index="/templates">模板列表</el-menu-item>
          <el-menu-item index="/templates/create">创建模板</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/risk-rules">
          <el-icon><Warning /></el-icon>
          <span>风险规则</span>
        </el-menu-item>

        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-button
            :icon="isCollapse ? 'Expand' : 'Fold'"
            text
            size="small"
            @click="toggleSidebar"
          />
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item :to="{ path: '/dashboard' }"
              >首页</el-breadcrumb-item
            >
            <el-breadcrumb-item>{{ currentRouteName }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" :src="authStore.profile?.avatar_url" />
              <span class="username">{{ authStore.userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="settings">账户设置</el-dropdown-item>
                <el-dropdown-item divided command="logout"
                  >退出登录</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  House,
  Document,
  Files,
  Warning,
  Setting,
  Expand,
  Fold,
  ArrowDown,
} from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isCollapse = ref(false);

// 计算当前激活的菜单项
const activeMenu = computed(() => route.path);

  // 计算当前路由名称
const currentRouteName = computed(() => {
  const routeMap: Record<string, string> = {
    "/dashboard": "仪表板",
    "/contracts": "合同列表",
    "/contracts/upload": "上传合同",
    "/templates": "模板列表",
    "/templates/create": "创建模板",
    "/risk-rules": "风险规则",
    "/settings": "系统设置",
  };
  
  // 处理动态路由
  const path = route.path;
  if (path.startsWith('/templates/') && path !== '/templates/create') {
    return "模板详情";
  }
  if (path.startsWith('/contracts/') && !['/contracts/upload', '/contracts/analysis', '/contracts/file-viewer', '/contracts/text-extract'].includes(path)) {
    return "合同详情";
  }
  
  return routeMap[path] || "未知页面";
});

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value;
};

// 处理用户操作
const handleCommand = async (command: string) => {
  switch (command) {
    case "profile":
      router.push("/profile");
      break;
    case "settings":
      router.push("/settings");
      break;
    case "logout":
      await authStore.signOut();
      router.push("/login");
      break;
  }
};

onMounted(() => {
  // 检查用户是否已登录
  if (!authStore.isAuthenticated) {
    router.push("/login");
  }
});
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;

  .sidebar {
    background-color: #001529;
    transition: width 0.3s;

    .logo {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      border-bottom: 1px solid #2c3e50;

      h2,
      h3 {
        margin: 0;
        color: white;
      }
    }

    .sidebar-menu {
      border: none;
      height: calc(100vh - 60px);
    }
  }

  .header {
    background-color: white;
    border-bottom: 1px solid #e6e6e6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;

    .header-left {
      display: flex;
      align-items: center;

      .breadcrumb {
        margin-left: 16px;
      }
    }

    .header-right {
      .user-info {
        display: flex;
        align-items: center;
        cursor: pointer;

        .username {
          margin: 0 8px;
          color: #333;
        }
      }
    }
  }

  .main-content {
    background-color: #f5f5f5;
    padding: 20px;
    overflow-y: auto;
  }
}
</style>
