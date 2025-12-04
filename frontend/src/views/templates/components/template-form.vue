<template>
  <el-dialog
    :model-value="visible"
    :title="formData.id ? '编辑模板' : '创建模板'"
    width="800px"
    :before-close="handleClose"
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="模板名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入模板名称" />
      </el-form-item>

      <el-form-item label="模板类型" prop="type">
        <el-select v-model="formData.type" placeholder="请选择模板类型">
          <el-option label="采购合同" value="purchase" />
          <el-option label="销售合同" value="sale" />
          <el-option label="服务合同" value="service" />
          <el-option label="租赁合同" value="lease" />
          <el-option label="其他模板" value="other" />
        </el-select>
      </el-form-item>

      <el-form-item label="模板描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入模板描述"
        />
      </el-form-item>

      <el-form-item label="模板内容" prop="content">
        <el-input
          v-model="formData.content"
          type="textarea"
          :rows="10"
          placeholder="请输入模板内容（支持Markdown格式）"
        />
      </el-form-item>

      <el-form-item label="模板状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio label="active">启用</el-radio>
          <el-radio label="inactive">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="公开模板" prop="is_public">
        <el-switch
          v-model="formData.is_public"
          active-text="公开"
          inactive-text="私有"
        />
        <div class="form-tip">公开模板所有用户可见，私有模板仅创建者可见</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ form.id ? "更新" : "创建" }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { supabase } from "@/utils/supabase";

interface Props {
  visible: boolean;
  form?: any;
}

interface Emits {
  (e: "update:visible", value: boolean): void;
  (e: "success"): void;
  (e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  form: () => ({
    name: "",
    type: "purchase",
    description: "",
    content: "",
    status: "active",
    is_public: false,
  }),
});

const emit = defineEmits<Emits>();

const formRef = ref<FormInstance>();
const loading = ref(false);
const submitting = ref(false);

const formData = reactive({
  id: "",
  name: "",
  type: "purchase",
  description: "",
  content: "",
  status: "active",
  is_public: false,
});

const rules: FormRules = {
  name: [
    { required: true, message: "请输入模板名称", trigger: "blur" },
    { min: 2, max: 50, message: "长度在 2 到 50 个字符", trigger: "blur" },
  ],
  type: [{ required: true, message: "请选择模板类型", trigger: "change" }],
  description: [
    { max: 200, message: "长度不能超过 200 个字符", trigger: "blur" },
  ],
  content: [
    { required: true, message: "请输入模板内容", trigger: "blur" },
    { min: 10, message: "模板内容至少需要 10 个字符", trigger: "blur" },
  ],
};

// 监听props变化
watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetForm();
      if (props.form.id) {
        Object.assign(formData, props.form);
      }
    }
  },
);

watch(
  () => props.form,
  (val) => {
    if (val.id) {
      Object.assign(formData, val);
    }
  },
  { deep: true },
);

const resetForm = () => {
  formData.id = "";
  formData.name = "";
  formData.type = "purchase";
  formData.description = "";
  formData.content = "";
  formData.status = "active";
  formData.is_public = false;

  if (formRef.value) {
    formRef.value.clearValidate();
  }
};

const handleClose = () => {
  emit("update:visible", false);
  emit("close");
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;

  try {
    const templateData = {
      name: formData.name,
      type: formData.type,
      description: formData.description,
      content: formData.content,
      status: formData.status,
      is_public: formData.is_public,
    };

    let result;
    if (formData.id) {
      // 更新模板
      result = await supabase
        .from("contract_templates")
        .update(templateData)
        .eq("id", formData.id);
    } else {
      // 创建模板
      result = await supabase.from("contract_templates").insert([templateData]);
    }

    if (result.error) throw result.error;

    ElMessage.success(formData.id ? "模板更新成功" : "模板创建成功");
    emit("success");
    handleClose();
  } catch (error: any) {
    ElMessage.error(`操作失败: ${error.message}`);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
