<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="not-found-icon">
        <el-icon><Search /></el-icon>
      </div>
      <h1>404</h1>
      <p>抱歉，您访问的页面不存在</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const goHome = () => {
  router.push("/");
};
</script>

<style scoped lang="scss">
.not-found-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;

  .not-found-content {
    text-align: center;

    .not-found-icon {
      width: 100px;
      height: 100px;
      background: #ecf5ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;

      .el-icon {
        font-size: 48px;
        color: #409eff;
      }
    }

    h1 {
      font-size: 72px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 16px;
    }

    p {
      font-size: 16px;
      color: #606266;
      margin-bottom: 30px;
    }
  }
}

@media (max-width: 768px) {
  .not-found-container {
    .not-found-content {
      h1 {
        font-size: 48px;
      }

      p {
        font-size: 14px;
      }
    }
  }
}
</style>
