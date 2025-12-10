<template>
  <div class="contract-editor">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>合同编辑</h2>
            <p>基于模板编辑合同内容</p>
          </div>
        </template>
      </el-page-header>
    </div>

    <div class="editor-content">
      <el-card class="form-card">
        <el-form
          ref="formRef"
          :model="contractForm"
          :rules="formRules"
          label-width="100px"
          label-position="top"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="合同标题" prop="title">
                <el-input
                  v-model="contractForm.title"
                  placeholder="请输入合同标题"
                  maxlength="100"
                  show-word-limit
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="合同类型" prop="category">
                <el-select
                  v-model="contractForm.category"
                  placeholder="请选择合同类型"
                  style="width: 100%"
                >
                  <el-option label="采购合同" value="purchase" />
                  <el-option label="销售合同" value="sales" />
                  <el-option label="服务合同" value="service" />
                  <el-option label="租赁合同" value="lease" />
                  <el-option label="雇佣合同" value="employment" />
                  <el-option label="保密协议" value="nda" />
                  <el-option label="合作协议" value="partnership" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="甲方" prop="party_a">
                <el-input
                  v-model="contractForm.party_a"
                  placeholder="请输入甲方名称"
                />
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="乙方" prop="party_b">
                <el-input
                  v-model="contractForm.party_b"
                  placeholder="请输入乙方名称"
                />
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item label="合同金额" prop="amount">
                <el-input-number
                  v-model="contractForm.amount"
                  :precision="2"
                  :min="0"
                  placeholder="请输入合同金额"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="生效日期" prop="effective_date">
                <el-date-picker
                  v-model="contractForm.effective_date"
                  type="date"
                  placeholder="选择生效日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="到期日期" prop="expiration_date">
                <el-date-picker
                  v-model="contractForm.expiration_date"
                  type="date"
                  placeholder="选择到期日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="合同内容" prop="content">
            <div class="template-editor">
              <div class="editor-toolbar">
                <span class="template-info">基于模板: {{ templateDetail?.name }}</span>
                
                <el-button-group>
                  <el-button size="small" @click="insertText('甲方', '甲方：___________')">甲方</el-button>
                  <el-button size="small" @click="insertText('乙方', '乙方：___________')">乙方</el-button>
                  <el-button size="small" @click="insertText('金额', '金额：___________元')">金额</el-button>
                  <el-button size="small" @click="insertText('日期', '日期：___________')">日期</el-button>
                </el-button-group>
              </div>

              <el-input
                ref="editorRef"
                v-model="contractForm.content"
                type="textarea"
                :rows="15"
                placeholder="请编辑合同内容..."
                resize="none"
              />

              <div class="editor-tips">
                <el-text type="info" size="small">
                  提示：可以编辑合同内容，系统会自动保存您的编辑
                </el-text>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="合同变量" prop="variables">
            <div class="variables-section">
              <div class="variables-header">
                <span>模板变量</span>
                <el-button size="small" @click="addVariable">
                  <el-icon><Plus /></el-icon>
                  添加变量
                </el-button>
              </div>

              <div class="variables-list">
                <div
                  v-for="(variable, index) in contractForm.variables"
                  :key="index"
                  class="variable-item"
                >
                  <el-input
                    v-model="variable.name"
                    placeholder="变量名"
                    style="width: 120px"
                  />
                  <el-input
                    v-model="variable.label"
                    placeholder="显示名称"
                    style="width: 120px; margin-left: 10px"
                  />
                  <el-input
                    v-model="variable.value"
                    placeholder="变量值"
                    style="width: 150px; margin-left: 10px"
                  />
                  <el-button
                    size="small"
                    type="danger"
                    style="margin-left: 10px"
                    @click="removeVariable(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>

        <div class="form-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button @click="saveDraft">保存草稿</el-button>
          <el-button type="primary" :loading="submitting" @click="saveContract">
            {{ submitting ? "保存中..." : "保存合同" }}
          </el-button>
        </div>
      </el-card>

      <!-- 合同预览 -->
      <el-card class="preview-card">
        <template #header>
          <span>合同预览</span>
        </template>

        <div class="preview-content">
          <div v-if="processedContent" class="preview-text">
            <pre>{{ processedContent }}</pre>
          </div>
          <div v-else class="preview-empty">
            <el-empty description="暂无内容预览" />
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useTemplateStore } from "@/stores/template";
import { supabase, type Contract, type Template } from "@/utils/supabase";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const templateStore = useTemplateStore();

const formRef = ref<FormInstance>();
const editorRef = ref<any>();
const submitting = ref(false);
const templateDetail = ref<Template | null>(null);

// 定义合同类型
type ContractCategory = "purchase" | "sales" | "service" | "employment" | "nda" | "lease" | "partnership" | "other";

// 定义表单类型
interface ContractForm {
  title: string;
  category: ContractCategory;
  party_a: string;
  party_b: string;
  amount: number;
  effective_date: string;
  expiration_date: string;
  content: string;
  variables: Array<{
    name: string;
    label: string;
    value: string;
  }>;
}

const contractForm = reactive<ContractForm>({
  title: "",
  category: "purchase",
  party_a: "",
  party_b: "",
  amount: 0,
  effective_date: "",
  expiration_date: "",
  content: "",
  variables: [],
});

const formRules: FormRules = {
  title: [
    { required: true, message: "请输入合同标题", trigger: "blur" },
    {
      min: 2,
      max: 100,
      message: "合同标题长度在 2 到 100 个字符",
      trigger: "blur",
    },
  ],
  category: [{ required: true, message: "请选择合同类型", trigger: "change" }],
  content: [
    { required: true, message: "请输入合同内容", trigger: "blur" },
    { min: 10, message: "合同内容不能少于 10 个字符", trigger: "blur" },
  ],
  // 添加日期字段的验证规则
  effective_date: [
    { 
      validator: (rule, value, callback) => {
        if (value && value.trim() === '') {
          callback(new Error('请选择有效的生效日期'));
        } else {
          callback();
        }
      }, 
      trigger: 'change' 
    }
  ],
  expiration_date: [
    { 
      validator: (rule, value, callback) => {
        if (value && value.trim() === '') {
          callback(new Error('请选择有效的到期日期'));
        } else if (value && contractForm.effective_date && value < contractForm.effective_date) {
          callback(new Error('到期日期不能早于生效日期'));
        } else {
          callback();
        }
      }, 
      trigger: 'change' 
    }
  ],
};

// 处理模板内容，替换变量
const processedContent = computed(() => {
  let content = contractForm.content;
  
  // 替换表单中的变量
  contractForm.variables.forEach(variable => {
    if (variable.value) {
      const regex = new RegExp(`{{${variable.name}}}`, 'g');
      content = content.replace(regex, variable.value);
    }
  });
  
  // 替换基础变量
  if (contractForm.party_a) {
    content = content.replace(/{{party_a}}/g, contractForm.party_a);
  }
  if (contractForm.party_b) {
    content = content.replace(/{{party_b}}/g, contractForm.party_b);
  }
  if (contractForm.amount) {
    content = content.replace(/{{amount}}/g, contractForm.amount.toString());
  }
  
  return content;
});

const goBack = () => {
  router.push("/templates");
};

const loadTemplate = async () => {
  const templateId = route.params.id as string;
  
  if (!templateId) {
    ElMessage.error("模板ID不能为空");
    goBack();
    return;
  }

  try {
    templateDetail.value = await templateStore.getTemplateDetail(templateId);
    
    // 初始化表单数据
    contractForm.title = `基于${templateDetail.value.name}的合同`;
    contractForm.category = templateDetail.value.category as ContractCategory;
    contractForm.content = templateDetail.value.content;
    
    // 初始化模板变量
    if (templateDetail.value.variables && Array.isArray(templateDetail.value.variables)) {
      contractForm.variables = templateDetail.value.variables.map(v => ({
        name: v.name || '',
        label: v.label || '',
        value: v.default_value || ''
      }));
    }
    
  } catch (error) {
    console.error("加载模板失败:", error);
    ElMessage.error("加载模板失败，请重试");
    goBack();
  }
};

const insertText = (type: string, text: string) => {
  const editor = editorRef.value?.$el.querySelector("textarea");
  if (editor) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const currentValue = contractForm.content;

    contractForm.content =
      currentValue.substring(0, start) + text + currentValue.substring(end);

    // 设置光标位置
    nextTick(() => {
      editor.selectionStart = start + text.length;
      editor.selectionEnd = start + text.length;
      editor.focus();
    });
  }
};

const addVariable = () => {
  contractForm.variables.push({
    name: "",
    label: "",
    value: "",
  });
};

const removeVariable = (index: number) => {
  contractForm.variables.splice(index, 1);
};

const saveDraft = () => {
  // 保存草稿到本地存储
  const draft = {
    ...contractForm,
    templateId: route.params.id,
    saved_at: new Date().toISOString(),
  };

  localStorage.setItem("contract_draft", JSON.stringify(draft));
  ElMessage.success("草稿已保存");
};

const saveContract = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    submitting.value = true;

    const user = authStore.user;
    if (!user) {
      throw new Error("用户未登录");
    }

    // 数据清理函数
    const cleanContractData = (data: any) => {
      return {
        ...data,
        // 清理字符串字段
        filename: data.filename?.substring(0, 50),
        contract_title: data.contract_title?.substring(0, 100),
        file_path: data.file_path?.substring(0, 200),
        // 确保日期字段正确处理
        effective_date: data.effective_date?.trim() || null,
        expiration_date: data.expiration_date?.trim() || null,
        // 确保数值字段
        contract_amount: data.contract_amount ? Number(data.contract_amount) : null,
        // 确保必要字段
        status: data.status || 'uploaded',
        category: data.category || 'other',
        file_type: data.file_type || 'text/plain'
      };
    };

    // 创建合同数据并清理
    const rawData: Partial<Contract> = {
      user_id: user.id,
      filename: `${contractForm.title}.txt`,
      file_path: `/contracts/${Date.now()}_${contractForm.title}.txt`,
      file_size: new Blob([processedContent.value]).size,
      file_type: "text/plain",
      category: contractForm.category,
      status: "uploaded",
      contract_title: contractForm.title,
      contract_parties: {
        party_a: contractForm.party_a,
        party_b: contractForm.party_b,
      },
      contract_amount: contractForm.amount,
      effective_date: contractForm.effective_date || null,
      expiration_date: contractForm.expiration_date || null,
      created_at: new Date().toISOString(),
    };

    const contractData = cleanContractData(rawData);

    // 保存到数据库
    let saveData = { ...contractData };
    let retryCount = 0;
    let saveError: any = null;

    while (retryCount < 3) {
      try {
        const { data, error } = await supabase
          .from("contracts")
          .insert([saveData])
          .select();

        if (error) {
          // 检查是否是长度错误
          if (error.message.includes('value too long') && retryCount === 0) {
            // 尝试截断过长的字段
            saveData = {
              ...saveData,
              filename: saveData.filename?.substring(0, 50),
              contract_title: saveData.contract_title?.substring(0, 100),
              file_path: saveData.file_path?.substring(0, 200)
            };
            retryCount++;
            continue;
          } else if (error.message.includes('invalid input syntax for type date') && retryCount === 1) {
            // 处理日期格式错误，确保日期为null而不是空字符串
            saveData = {
              ...saveData,
              effective_date: saveData.effective_date || null,
              expiration_date: saveData.expiration_date || null
            };
            retryCount++;
            continue;
          } else {
            throw error;
          }
        }

        saveError = null;
        break;
      } catch (error) {
        retryCount++;
        saveError = error;
      }
    }

    if (saveError) {
      throw saveError;
    }

    // 清除草稿
    localStorage.removeItem("contract_draft");

    ElMessage.success("合同已保存成功！");

    // 跳转到合同列表
    router.push("/contracts");

  } catch (error) {
    console.error("保存合同失败:", error);
    ElMessage.error("保存合同失败，请重试");
  } finally {
    submitting.value = false;
  }
};

// 组件挂载时加载模板
onMounted(() => {
  loadTemplate();
});
</script>

<style scoped>
.contract-editor {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.header-content h2 {
  margin: 0;
  margin-bottom: 5px;
}

.header-content p {
  margin: 0;
  color: #606266;
}

.editor-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  align-items: start;
}

.form-card {
  border-radius: 8px;
}

.template-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.editor-toolbar {
  padding: 10px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.template-info {
  color: #606266;
  font-size: 14px;
}

.editor-tips {
  padding: 10px;
  background-color: #f8f9fa;
  border-top: 1px solid #e4e7ed;
}

.variables-section {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
}

.variables-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.variable-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.variable-item:last-child {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.preview-card {
  border-radius: 8px;
  position: sticky;
  top: 20px;
}

.preview-content {
  max-height: 500px;
  overflow-y: auto;
}

.preview-text {
  font-family: "Courier New", monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-empty {
  padding: 40px 0;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-textarea__inner) {
  font-family: "Courier New", monospace;
  border: none;
  border-radius: 0;
}

@media (max-width: 1200px) {
  .editor-content {
    grid-template-columns: 1fr;
  }

  .preview-card {
    position: static;
  }
}
</style>