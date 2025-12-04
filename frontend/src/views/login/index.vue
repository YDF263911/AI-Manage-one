<template>
  <div class="login-container">
    <div class="login-form">
      <div class="login-header">
        <h1>AI智能合同分析管理系统</h1>
        <p>企业级合同全生命周期智能化管理平台</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form-content"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
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
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <p>技术支持：AI智能合同分析管理系统团队</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const userStore = useUserStore();

const loginFormRef = ref();
const loading = ref(false);

const loginForm = reactive({
  username: "",
  password: "",
});

const loginRules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" },
  ],
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    const valid = await loginFormRef.value.validate();
    if (!valid) return;

    loading.value = true;

    const result = await userStore.login(loginForm);

    if (result.success) {
      ElMessage.success("登录成功");
      router.push("/dashboard");
    } else {
      ElMessage.error("登录失败，请检查用户名和密码");
    }
  } catch (error) {
    ElMessage.error("登录失败，请稍后重试");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  // 如果已登录，直接跳转到首页
  if (userStore.isLoggedIn) {
    router.push("/dashboard");
  }
});
</script>

<style scoped lang="scss">
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;

  .login-form {
    background: white;
    border-radius: 12px;
    padding: 40px;
    width: 400px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);

    .login-header {
      text-align: center;
      margin-bottom: 30px;

      h1 {
        color: #333;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      p {
        color: #666;
        font-size: 14px;
      }
    }

    .login-form-content {
      .login-btn {
        width: 100%;
        margin-top: 10px;
      }
    }

    .login-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;

      p {
        color: #999;
        font-size: 12px;
      }
    }
  }
}

@media (max-width: 480px) {
  .login-container .login-form {
    width: 90%;
    margin: 20px;
    padding: 30px 20px;
  }
}
</style>
