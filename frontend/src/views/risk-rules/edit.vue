<template>
  <div class="rule-edit">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>编辑风险规则</h2>
            <p>修改规则配置信息</p>
          </div>
        </template>
      </el-page-header>
    </div>

    <div v-loading="loading" class="edit-content">
      <rule-form
        ref="ruleFormRef"
        :rule-data="ruleData"
        :is-edit="true"
        @submit="handleRuleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { supabase } from "@/utils/supabase";
import RuleForm from "./components/rule-form.vue";

const router = useRouter();
const route = useRoute();
const ruleFormRef = ref();
const loading = ref(false);
const ruleData = ref<any>(null);

const ruleId = route.params.id as string;

const goBack = () => {
  router.push("/risk-rules");
};

const loadRuleData = async () => {
  if (!ruleId) {
    ElMessage.error("规则ID不存在");
    router.push("/risk-rules");
    return;
  }

  loading.value = true;

  try {
    const { data, error } = await supabase
      .from("risk_rules")
      .select("*")
      .eq("id", ruleId)
      .single();

    if (error) throw error;

    if (!data) {
      ElMessage.error("规则不存在");
      router.push("/risk-rules");
      return;
    }

    ruleData.value = data;
  } catch (error: any) {
    ElMessage.error(`加载规则数据失败: ${error.message}`);
    router.push("/risk-rules");
  } finally {
    loading.value = false;
  }
};

const handleRuleSubmit = (ruleData: any) => {
  ElMessage.success("规则更新成功");
  router.push("/risk-rules");
};

const handleCancel = () => {
  router.push("/risk-rules");
};

onMounted(() => {
  loadRuleData();
});
</script>

<style scoped>
.rule-edit {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-content h2 {
  margin: 0;
  margin-bottom: 5px;
}

.header-content p {
  margin: 0;
  color: #606266;
}

.edit-content {
  max-width: 800px;
  margin: 0 auto;
}

:deep(.el-page-header__content) {
  display: flex;
  align-items: center;
}

:deep(.el-form) {
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
