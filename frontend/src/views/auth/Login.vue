<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>AI合同管理系统</h1>
        <p>智能合同分析与风险管理平台</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="email">
          <el-input
            v-model="loginForm.email"
            placeholder="请输入邮箱"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="authStore.isLoading"
            @click="handleLogin"
          >
            {{ authStore.isLoading ? "登录中..." : "登录" }}
          </el-button>
        </el-form-item>

        <div class="login-footer">
          <span>还没有账号？</span>
          <el-link type="primary" @click="$router.push('/register')"
            >立即注册</el-link
          >
        </div>
      </el-form>
    </div>

    <!-- 背景装饰 -->
    <div class="login-background">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const loginFormRef = ref();
const loginForm = reactive({
  email: "",
  password: "",
});

const loginRules = {
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱地址", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" },
  ],
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    await loginFormRef.value.validate();

    const result = await authStore.signIn(loginForm.email, loginForm.password);

    if (result.success) {
      ElMessage({
        message: "登录成功！欢迎回来 👋",
        type: "success",
        duration: 1500
      });
      
      // 检查是否为首次登录
      const isFirstTime = localStorage.getItem(`first_login_${authStore.user?.id}`);
      if (isFirstTime === "pending") {
        // 首次登录，清除pending状态
        localStorage.setItem(`first_login_${authStore.user?.id}`, "completed");
      }
      
      router.push("/dashboard");
    } else {
      ElMessage({
        message: result.error || "登录失败，请检查邮箱和密码",
        type: "error",
        duration: 3000
      });
    }
  } catch (error) {
    // 验证失败
    console.error("表单验证失败:", error);
  }
};

onMounted(() => {
  // 如果已经登录，直接跳转到首页
  if (authStore.isAuthenticated) {
    router.push("/dashboard");
  }
});
</script>

<style scoped lang="scss">
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 400px;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    color: #333;
    margin-bottom: 8px;
    font-size: 28px;
    font-weight: 600;
  }

  p {
    color: #666;
    margin: 0;
    font-size: 14px;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .login-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    border-radius: 8px;
  }
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  color: #666;

  .el-link {
    margin-left: 8px;
  }
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  .bg-shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }

  .shape-1 {
    width: 300px;
    height: 300px;
    top: -150px;
    right: -150px;
  }

  .shape-2 {
    width: 200px;
    height: 200px;
    bottom: -100px;
    left: -100px;
  }

  .shape-3 {
    width: 150px;
    height: 150px;
    top: 50%;
    left: 20%;
  }
}

@media (max-width: 480px) {
  .login-card {
    width: 90vw;
    padding: 30px 20px;
  }
}
</style>
