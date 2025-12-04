<template>
  <div class="register-container">
    <div class="register-form">
      <div class="register-header">
        <h1>AI智能合同分析管理系统</h1>
        <p>企业级合同全生命周期智能化管理平台</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form-content"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱"
            size="large"
            prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请确认密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item prop="department">
          <el-select
            v-model="registerForm.department"
            placeholder="请选择部门"
            size="large"
            style="width: 100%"
          >
            <el-option label="法务部" value="legal" />
            <el-option label="财务部" value="finance" />
            <el-option label="采购部" value="purchase" />
            <el-option label="销售部" value="sales" />
            <el-option label="管理层" value="management" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="register-btn"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <p>
          已有账号？<el-link type="primary" @click="goToLogin"
            >立即登录</el-link
          >
        </p>
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
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();

const registerFormRef = ref();
const loading = ref(false);

const registerForm = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  department: "",
});

const validatePassword = (rule: any, value: string, callback: Function) => {
  if (value === "") {
    callback(new Error("请确认密码"));
  } else if (value !== registerForm.password) {
    callback(new Error("两次输入密码不一致"));
  } else {
    callback();
  }
};

const registerRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      min: 3,
      max: 20,
      message: "用户名长度在 3 到 20 个字符",
      trigger: "blur",
    },
  ],
  email: [
    { required: true, message: "请输入邮箱地址", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱地址", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, validator: validatePassword, trigger: "blur" },
  ],
  department: [{ required: true, message: "请选择部门", trigger: "change" }],
};

const handleRegister = async () => {
  if (!registerFormRef.value) return;

  try {
    const valid = await registerFormRef.value.validate();
    if (!valid) return;

    loading.value = true;

    // 使用auth store进行注册
    const result = await authStore.signUp(
      registerForm.email,
      registerForm.password,
      {
        username: registerForm.username,
        department: registerForm.department,
      },
    );

    if (!result.success) {
      throw new Error(result.error || "注册失败");
    }

    if (result.requiresEmailVerification) {
      // 需要邮箱验证
      ElMessage.success("注册成功，请检查邮箱完成验证");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } else {
      // 注册成功并自动登录
      ElMessage.success("注册成功，已自动登录");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }

    // 清空表单
    Object.keys(registerForm).forEach((key) => {
      registerForm[key] = "";
    });
  } catch (error: any) {
    console.error("注册失败:", error);
    ElMessage.error(error.message || "注册失败，请稍后重试");
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push("/login");
};

onMounted(() => {
  // 如果已登录，直接跳转到首页
  if (userStore.isLoggedIn) {
    router.push("/dashboard");
  }
});
</script>

<style scoped lang="scss">
.register-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;

  .register-form {
    background: white;
    border-radius: 12px;
    padding: 40px;
    width: 400px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);

    .register-header {
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

    .register-form-content {
      .register-btn {
        width: 100%;
        margin-top: 10px;
      }
    }

    .register-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;

      p {
        color: #999;
        font-size: 12px;
        margin: 5px 0;

        &:first-child {
          font-size: 14px;
          color: #666;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .register-container .register-form {
    width: 90%;
    margin: 20px;
    padding: 30px 20px;
  }
}
</style>
