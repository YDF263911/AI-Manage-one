<template>
  <div class="template-edit">
    <div class="page-header">
      <el-page-header
        :content="templateDetail?.name || '编辑模板'"
        @back="goBack"
      />
    </div>

    <div class="edit-content">
      <template-form
        v-if="templateDetail"
        :template="templateDetail"
        :is-edit="true"
        :visible="true"
        @submit="handleSubmit"
        @cancel="goBack"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useTemplateStore } from "@/stores/template";
import TemplateForm from "./components/template-form.vue";

const route = useRoute();
const router = useRouter();
const templateStore = useTemplateStore();

const templateId = route.params.id as string;
const templateDetail = ref(null);

const goBack = () => {
  router.push(`/templates/${templateId}`);
};

const handleSubmit = async (formData: any) => {
  try {
    await templateStore.updateTemplate(templateId, formData);
    ElMessage.success("模板更新成功");
    router.push(`/templates/${templateId}`);
  } catch (error) {
    ElMessage.error(templateStore.error || "更新模板失败");
  }
};

onMounted(async () => {
  try {
    templateDetail.value = await templateStore.getTemplate(templateId);
  } catch (error) {
    ElMessage.error("加载模板数据失败");
    router.push("/templates");
  }
});
</script>

<style scoped>
.template-edit {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.edit-content {
  max-width: 1000px;
  margin: 0 auto;
}
</style>