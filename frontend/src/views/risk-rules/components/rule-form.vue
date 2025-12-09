<template>
  <div class="rule-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      :disabled="submitting"
    >
      <el-form-item label="规则名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入规则名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="规则分类" prop="category">
        <el-select
          v-model="formData.category"
          placeholder="请选择分类"
          style="width: 100%"
        >
          <el-option label="法律合规" value="legal" />
          <el-option label="财务风险" value="financial" />
          <el-option label="操作风险" value="operational" />
          <el-option label="格式规范" value="format" />
          <el-option label="自定义规则" value="custom" />
        </el-select>
      </el-form-item>

      <el-form-item label="风险等级" prop="severity">
        <el-radio-group v-model="formData.severity">
          <el-radio label="low">低风险</el-radio>
          <el-radio label="medium">中风险</el-radio>
          <el-radio label="high">高风险</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="规则描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入规则描述"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="规则条件" prop="condition">
        <el-input
          v-model="formData.condition"
          type="textarea"
          :rows="4"
          placeholder="请输入规则条件表达式（JSON格式）"
        />
        <div class="form-tip">
          <el-icon><InfoFilled /></el-icon>
          支持JSON格式的条件表达式，用于合同文本分析
        </div>
      </el-form-item>

      <el-form-item label="匹配模式" prop="pattern_type">
        <el-select
          v-model="formData.pattern_type"
          placeholder="请选择匹配模式"
          style="width: 100%"
        >
          <el-option label="关键词匹配" value="keyword" />
          <el-option label="正则表达式" value="regex" />
          <el-option label="语义分析" value="semantic" />
          <el-option label="逻辑组合" value="logic" />
        </el-select>
      </el-form-item>

      <el-form-item label="匹配内容" prop="pattern_content">
        <el-input
          v-model="formData.pattern_content"
          type="textarea"
          :rows="3"
          placeholder="请输入匹配内容"
        />
      </el-form-item>

      <el-form-item label="阈值设置" prop="threshold">
        <el-input-number
          v-model="formData.threshold"
          :min="0"
          :max="1"
          :step="0.1"
          placeholder="请输入阈值（0-1）"
        />
        <div class="form-tip">匹配阈值，0表示不匹配，1表示完全匹配</div>
      </el-form-item>

      <el-form-item label="处理建议" prop="suggestion">
        <el-input
          v-model="formData.suggestion"
          type="textarea"
          :rows="3"
          placeholder="请输入处理建议"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="是否启用" prop="is_active">
        <el-switch
          v-model="formData.is_active"
          :active-value="true"
          :inactive-value="false"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          提交
        </el-button>
        <el-button @click="handleCancel">取消</el-button>
        <el-button v-if="!isEdit" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { InfoFilled } from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";
import type { FormInstance, FormRules } from "element-plus";

interface Props {
  ruleData?: any;
  isEdit?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  ruleData: null,
  isEdit: false,
});

const emit = defineEmits<{
  submit: [data: any];
  cancel: [];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const formData = reactive({
  name: "",
  category: "",
  severity: "medium",
  description: "",
  condition: "",
  pattern_type: "keyword",
  pattern_content: "",
  threshold: 0.8,
  suggestion: "",
  is_active: true,
});

const rules: FormRules = {
  name: [
    { required: true, message: "请输入规则名称", trigger: "blur" },
    { min: 2, max: 100, message: "长度在 2 到 100 个字符", trigger: "blur" },
  ],
  category: [{ required: true, message: "请选择规则分类", trigger: "change" }],
  severity: [{ required: true, message: "请选择风险等级", trigger: "change" }],
  description: [
    { required: true, message: "请输入规则描述", trigger: "blur" },
    { min: 10, max: 500, message: "长度在 10 到 500 个字符", trigger: "blur" },
  ],
  pattern_type: [
    { required: true, message: "请选择匹配模式", trigger: "change" },
  ],
  pattern_content: [
    { required: true, message: "请输入匹配内容", trigger: "blur" },
  ],
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    const valid = await formRef.value.validate();
    if (!valid) return;

    submitting.value = true;

    const submitData = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    if (props.isEdit && props.ruleData?.id) {
      // 编辑模式
      const { error } = await supabase
        .from("risk_rules")
        .update(submitData)
        .eq("id", props.ruleData.id);

      if (error) throw error;
      ElMessage.success("规则更新成功");
    } else {
      // 创建模式
      const { error } = await supabase.from("risk_rules").insert([
        {
          ...submitData,
          created_at: new Date().toISOString(),
          trigger_count: 0,
        },
      ]);

      if (error) throw error;
      ElMessage.success("规则创建成功");
    }

    emit("submit", submitData);
  } catch (error: any) {
    ElMessage.error(`提交失败: ${error.message}`);
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  emit("cancel");
};

const handleReset = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 初始化表单数据
const initFormData = () => {
  if (props.ruleData) {
    Object.keys(formData).forEach((key) => {
      if (props.ruleData[key] !== undefined) {
        formData[key] = props.ruleData[key];
      }
    });
  }
};

onMounted(() => {
  initFormData();
});
</script>

<style scoped>
.rule-form {
  padding: 20px 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-textarea) {
  resize: vertical;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 20px;
}
</style>
