<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1>注册账户</h1>
        <p>创建您的AI合同管理账户</p>
      </div>

      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
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
          />
        </el-form-item>

        <el-form-item prop="department">
          <el-select
            v-model="registerForm.department"
            placeholder="请选择部门"
            size="large"
            style="width: 100%"
          >
            <el-option label="法务部" value="法务部" />
            <el-option label="业务部" value="业务部" />
            <el-option label="财务部" value="财务部" />
            <el-option label="行政部" value="行政部" />
            <el-option label="技术部" value="技术部" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <el-form-item prop="phone">
          <el-input
            v-model="registerForm.phone"
            placeholder="请输入手机号码（可选）"
            size="large"
            prefix-icon="Phone"
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="registerForm.agreeTerms">
            我已阅读并同意 <el-link type="primary">服务协议</el-link> 和
            <el-link type="primary">隐私政策</el-link>
          </el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="register-btn"
            :loading="authStore.isLoading"
            @click="handleRegister"
          >
            {{ authStore.isLoading ? "注册中..." : "注册" }}
          </el-button>
        </el-form-item>

        <div class="register-footer">
          <span>已有账号？</span>
          <el-link type="primary" @click="$router.push('/login')"
            >立即登录</el-link
          >
        </div>
      </el-form>
    </div>

    <!-- 背景装饰 -->
    <div class="register-background">
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
import type { UserProfile } from "@/utils/supabase";

const router = useRouter();
const authStore = useAuthStore();

const registerFormRef = ref();
const registerForm = reactive({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  department: "",
  phone: "",
  agreeTerms: false,
});

const validateConfirmPassword = (rule: any, value: string, callback: any) => {
  if (value !== registerForm.password) {
    callback(new Error("两次输入的密码不一致"));
  } else {
    callback();
  }
};

const validateAgreeTerms = (rule: any, value: boolean, callback: any) => {
  if (!value) {
    callback(new Error("请同意服务协议和隐私政策"));
  } else {
    callback();
  }
};

const registerRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      min: 2,
      max: 20,
      message: "用户名长度在 2 到 20 个字符",
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
    { required: true, message: "请确认密码", trigger: "blur" },
    { validator: validateConfirmPassword, trigger: "blur" },
  ],
  department: [{ required: true, message: "请选择部门", trigger: "change" }],
  agreeTerms: [{ validator: validateAgreeTerms, trigger: "change" }],
};

const handleRegister = async () => {
  if (!registerFormRef.value) return;

  try {
    await registerFormRef.value.validate();

    const profileData: Partial<UserProfile> = {
      username: registerForm.username,
      department: registerForm.department,
      phone: registerForm.phone || undefined,
    };

    const result = await authStore.signUp(
      registerForm.email,
      registerForm.password,
      profileData,
    );

    if (result.success) {
      if (result.requiresEmailVerification) {
        ElMessage({
          message: "注册成功！请前往邮箱验证您的账户后再登录",
          type: "warning",
          duration: 3000,
          showClose: true
        });
        router.push("/login");
      } else if (result.isFirstTime) {
        // 首次注册成功，自动登录并跳转
        ElMessage({
          message: "注册成功！欢迎加入AI合同管理系统 🎉",
          type: "success",
          duration: 2000,
          showClose: true
        });
        
        // 短暂延迟，让用户看到成功提示
        setTimeout(() => {
          router.push("/dashboard");
        }, 800);
      } else {
        // 注册成功但需要手动登录
        ElMessage({
          message: "注册成功！请登录以开始使用",
          type: "info",
          duration: 2000,
          showClose: true
        });
        router.push("/login");
      }
    } else {
      const errorMessage = (result as any).error || "注册失败";
      ElMessage.error(errorMessage);
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
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.register-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 420px;
  z-index: 1;
  max-height: 90vh;
  overflow-y: auto;
}

.register-header {
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

.register-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .register-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    border-radius: 8px;
  }

  .el-checkbox {
    width: 100%;

    :deep(.el-checkbox__label) {
      font-size: 14px;
    }
  }
}

.register-footer {
  text-align: center;
  margin-top: 20px;
  color: #666;

  .el-link {
    margin-left: 8px;
  }
}

.register-background {
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
  .register-card {
    width: 90vw;
    padding: 30px 20px;
  }
}
</style>
