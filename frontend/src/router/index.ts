import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/preview",
    name: "Preview",
    component: () => import("@/views/preview/index.vue"),
    meta: { title: "系统预览" },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/auth/Login.vue"),
    meta: { title: "登录", guestOnly: true },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/views/auth/Register.vue"),
    meta: { title: "注册", guestOnly: true },
  },
  {
    path: "/contracts-preview",
    name: "ContractPreview",
    component: () => import("@/views/contracts/Preview.vue"),
    meta: { title: "合同预览" },
  },
  {
    path: "/",
    component: () => import("@/views/layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        meta: { title: "仪表板" },
      },
      {
        path: "contracts",
        name: "Contracts",
        component: () => import("@/views/contracts/index.vue"),
        meta: { title: "合同列表" },
      },
      {
        path: "contracts/upload",
        name: "ContractUpload",
        component: () => import("@/views/contracts/Upload.vue"),
        meta: { title: "上传合同" },
      },
      {
        path: "contracts/:id",
        name: "ContractDetail",
        component: () => import("@/views/contracts/Detail.vue"),
        meta: { title: "合同详情" },
      },
      {
        path: "contracts/analysis",
        name: "ContractAnalysis",
        component: () => import("@/views/contracts/Analysis.vue"),
        meta: { title: "分析结果" },
      },
      {
        path: "contracts/file-viewer",
        name: "FileViewer",
        component: () => import("@/views/contracts/FileViewer.vue"),
        meta: { title: "文件内容查看" },
      },
      {
        path: "contracts/text-extract",
        name: "TextExtract",
        component: () => import("@/views/contracts/TextExtract.vue"),
        meta: { title: "合同内容提取" },
      },
      {
        path: "contracts/file-viewer",
        name: "FileViewer",
        component: () => import("@/views/contracts/FileViewer.vue"),
        meta: { title: "文件内容查看" },
      },
      {
        path: "contracts/text-extract",
        name: "TextExtract",
        component: () => import("@/views/contracts/TextExtract.vue"),
        meta: { title: "合同内容提取" },
      },

      {
        path: "templates",
        name: "Templates",
        component: () => import("@/views/templates/index.vue"),
        meta: { title: "模板列表" },
      },
      {
        path: "templates/create",
        name: "TemplateCreate",
        component: () => import("@/views/templates/Create.vue"),
        meta: { title: "创建模板" },
      },
      {
        path: "templates/:id",
        name: "TemplateDetail",
        component: () => import("@/views/templates/Detail.vue"),
        meta: { title: "模板详情" },
      },
      {
        path: "risk-rules",
        name: "RiskRules",
        component: () => import("@/views/risk-rules/index.vue"),
        meta: { title: "风险规则" },
      },
      {
        path: "risk-rules/:id/edit",
        name: "RiskRuleEdit",
        component: () => import("@/views/risk-rules/edit.vue"),
        meta: { title: "编辑规则" },
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("@/views/settings/index.vue"),
        meta: { title: "系统设置" },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("@/views/settings/index.vue"),
        meta: { title: "个人资料" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/error/404.vue"),
    meta: { title: "页面不存在" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI合同管理系统`;
  }

  // 初始化认证状态
  const authStore = useAuthStore();

  // 如果需要认证的页面
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next("/login");
      return;
    }
  }

  // 如果只允许访客访问的页面（如登录、注册）
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    next("/dashboard");
    return;
  }

  next();
});

export default router;
