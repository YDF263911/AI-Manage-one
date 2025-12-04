<template>
  <div id="app" :class="{ 'dark-theme': isDarkMode }">
    <el-config-provider :locale="zhCn">
      <router-view />
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElConfigProvider } from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";

const isDarkMode = ref(false);

onMounted(() => {
  // 检查系统主题偏好
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  isDarkMode.value = prefersDark;

  // 监听系统主题变化
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      isDarkMode.value = e.matches;
    });
});
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  transition: all 0.3s ease;
}

:global(.dark-theme) {
  --el-bg-color: #1a1a1a;
  --el-color-primary: #409eff;
}
</style>
