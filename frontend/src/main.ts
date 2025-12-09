import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

import App from "./App.vue";
import router from "./router";
import { initGlobalErrorHandler } from "./utils/errorHandler";
import { useAuthStore } from "./stores/auth";

import "./styles/index.scss";

const app = createApp(App);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 初始化全局错误处理器
initGlobalErrorHandler();

const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus);

// 添加全局错误边界
app.config.errorHandler = (err, instance, info) => {
  console.error("Vue应用错误:", err);
  console.error("错误信息:", info);
  
  // 如果是模板相关的错误，提供更详细的信息
  if (err.message && err.message.includes("id")) {
    console.error("模板数据错误详情:", {
      errorType: "TemplateIdError",
      errorMessage: err.message,
      component: instance?.$options?.name || "Unknown",
      renderInfo: info
    });
    
    // 尝试获取当前路由信息
    if (window.location.pathname.includes('/templates')) {
      console.warn("模板页面数据异常，建议刷新页面重新加载数据");
    }
  }
};

// 初始化认证状态并挂载应用
const initApp = async () => {
  const authStore = useAuthStore();
  await authStore.initAuth();

  // 应用挂载
  app.mount("#app");
};

// 启动应用初始化
initApp();
