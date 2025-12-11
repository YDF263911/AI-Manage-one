<template>
  <div class="template-create">
    <div class="page-header">
      <el-page-header @back="goBack">
        <template #content>
          <div class="header-content">
            <h2>创建合同模板</h2>
            <p>创建新的合同模板</p>
          </div>
        </template>
      </el-page-header>
    </div>

    <div class="create-content">
      <el-card class="form-card">
        <el-form
          ref="formRef"
          :model="templateForm"
          :rules="formRules"
          label-width="100px"
          label-position="top"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模板名称" prop="name">
                <el-input
                  v-model="templateForm.name"
                  placeholder="请输入模板名称"
                  maxlength="50"
                  show-word-limit
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="模板类型" prop="type">
                <el-select
                  v-model="templateForm.type"
                  placeholder="请选择模板类型"
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

          <el-form-item label="模板描述" prop="description">
            <el-input
              v-model="templateForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入模板描述信息"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模板状态" prop="status">
                <el-radio-group v-model="templateForm.status">
                  <el-radio label="active">启用</el-radio>
                  <el-radio label="inactive">禁用</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="访问权限" prop="is_public">
                <el-radio-group v-model="templateForm.is_public">
                  <el-radio :label="true">公开</el-radio>
                  <el-radio :label="false">私有</el-radio>
                </el-radio-group>
                <div class="permission-tip">
                  <el-text type="info" size="small">
                    公开模板所有用户可见，私有模板仅创建者可见
                  </el-text>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="模板内容" prop="content">
            <div class="template-editor">
              <div class="editor-toolbar">
                <el-button size="small" type="primary" :loading="generating" @click="generateTemplate">
                  <el-icon><Cpu /></el-icon> AI辅助生成
                </el-button>

                <!-- AI生成进度条 -->
                <div v-if="generating" class="ai-progress-container">
                  <div class="progress-info">
                    <span class="progress-text">{{ progressText }}</span>
                    <span class="progress-percent">{{ progressPercent }}%</span>
                  </div>
                  <el-progress 
                    :percentage="progressPercent" 
                    :status="progressStatus"
                    :stroke-width="6"
                    :show-text="false"
                  />
                  <div class="progress-tips">{{ progressTips }}</div>
                </div>

                <el-button-group style="margin-left: 10px">
                  <el-button size="small" @click="insertText('甲方', '甲方：___________')">甲方</el-button>
                  <el-button size="small" @click="insertText('乙方', '乙方：___________')">乙方</el-button>
                  <el-button size="small" @click="insertText('金额', '金额：___________元')">金额</el-button>
                  <el-button size="small" @click="insertText('日期', '日期：___________')">日期</el-button>
                </el-button-group>

                <el-button-group style="margin-left: 10px">
                  <el-button size="small" @click="formatText('bold')">
                    <el-icon><ArrowUpBold /></el-icon>
                  </el-button>
                  <el-button size="small" @click="formatText('italic')">
                    <el-icon><ArrowRight /></el-icon>
                  </el-button>
                  <el-button size="small" @click="formatText('underline')">
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                </el-button-group>
              </div>

              <el-input
                ref="editorRef"
                v-model="templateForm.content"
                type="textarea"
                :rows="15"
                placeholder="请输入合同模板内容..."
                resize="none"
              />

              <div class="editor-tips">
                <el-text type="info" size="small">
                  提示：使用 {{ '{' }}变量名{{ '}' }} 格式插入动态变量，如
                  {{ '{' }}company_name{{ '}' }}
                </el-text>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="模板变量" prop="variables">
            <div class="variables-section">
              <div class="variables-header">
                <span>预定义变量</span>
                <el-button size="small" @click="addVariable">
                  <el-icon><Plus /></el-icon>
                  添加变量
                </el-button>
              </div>

              <div class="variables-list">
                <div
                  v-for="(variable, index) in templateForm.variables"
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
                    v-model="variable.default_value"
                    placeholder="默认值"
                    style="width: 120px; margin-left: 10px"
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
          <el-button type="primary" :loading="submitting" @click="submitForm">
            {{ submitting ? "创建中..." : "创建模板" }}
          </el-button>
          <el-button @click="saveDraft">保存草稿</el-button>
        </div>
      </el-card>

      <!-- 模板预览 -->
      <el-card class="preview-card">
        <template #header>
          <span>模板预览</span>
        </template>

        <div class="preview-content">
          <div v-if="templateForm.content" class="preview-text">
            <pre>{{ templateForm.content }}</pre>
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
import { ref, reactive, nextTick, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
// 图标已在main.ts中全局注册，无需单独导入
import { useAuthStore } from "@/stores/auth";
import { useTemplateStore } from "@/stores/template";
import { aiApi } from "@/api/aiApi";

const router = useRouter();
const authStore = useAuthStore();
const templateStore = useTemplateStore();

const formRef = ref<FormInstance>();
const editorRef = ref<any>();
const submitting = ref(false);
const generating = ref(false);

// AI生成进度相关
const progressPercent = ref(0);
const progressText = ref('准备开始生成...');
const progressTips = ref('请耐心等待，AI正在为您生成专业的合同模板');
const progressStatus = ref<'success' | 'exception' | 'warning' | ''>('');

// 定义模板类型
type TemplateCategory = "purchase" | "sales" | "service" | "employment" | "nda" | "lease" | "partnership" | "other";

// 定义表单类型
interface TemplateForm {
  name: string;
  type: TemplateCategory;
  description: string;
  status: "active" | "inactive";
  is_public: boolean;
  content: string;
  variables: Array<{
    name: string;
    label: string;
    default_value: string;
  }>;
}

const templateForm = reactive<TemplateForm>({
  name: "",
  type: "purchase",
  description: "",
  status: "active",
  is_public: false,
  content: "",
  variables: [
    { name: "company_name", label: "公司名称", default_value: "" },
    {
      name: "contract_date",
      label: "合同日期",
      default_value: new Date().toLocaleDateString("zh-CN"),
    },
  ],
});

const formRules: FormRules = {
  name: [
    { required: true, message: "请输入模板名称", trigger: "blur" },
    {
      min: 2,
      max: 50,
      message: "模板名称长度在 2 到 50 个字符",
      trigger: "blur",
    },
  ],
  type: [{ required: true, message: "请选择模板类型", trigger: "change" }],
  description: [
    { max: 200, message: "描述长度不能超过 200 个字符", trigger: "blur" },
  ],
  content: [
    { required: true, message: "请输入模板内容", trigger: "blur" },
    { min: 10, message: "模板内容不能少于 10 个字符", trigger: "blur" },
  ],
};

const goBack = () => {
  router.push("/templates");
};

const insertText = (type: string, text: string) => {
  const editor = editorRef.value?.$el.querySelector("textarea");
  if (editor) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const currentValue = templateForm.content;

    templateForm.content =
      currentValue.substring(0, start) + text + currentValue.substring(end);

    // 设置光标位置
    nextTick(() => {
      editor.selectionStart = start + text.length;
      editor.selectionEnd = start + text.length;
      editor.focus();
    });
  }
};

const formatText = (format: string) => {
  const editor = editorRef.value?.$el.querySelector("textarea");
  if (editor) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = templateForm.content.substring(start, end);

    let formattedText = selectedText;

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "underline":
        formattedText = `__${selectedText}__`;
        break;
    }

    templateForm.content =
      templateForm.content.substring(0, start) +
      formattedText +
      templateForm.content.substring(end);

    nextTick(() => {
      editor.selectionStart = start;
      editor.selectionEnd = start + formattedText.length;
      editor.focus();
    });
  }
};

const addVariable = () => {
  templateForm.variables.push({
    name: "",
    label: "",
    default_value: "",
  });
};

const removeVariable = (index: number) => {
  templateForm.variables.splice(index, 1);
};

// AI辅助生成模板
const generateTemplate = async () => {
  let loadingMessage: any = null;
  let progressTimer: any = null;
  
  try {
    // 确认是否覆盖当前内容
    if (templateForm.content.trim() || templateForm.variables.length > 2) {
      await ElMessageBox.confirm(
        'AI生成模板将覆盖当前内容，是否继续？',
        '确认生成',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    }

    generating.value = true;
    
    // 初始化进度
    progressPercent.value = 0;
    progressText.value = '正在连接AI服务...';
    progressTips.value = '正在初始化生成任务';
    progressStatus.value = '';
    
    // 显示加载提示，包含优化后的时间预估
    loadingMessage = ElMessage({
      message: 'AI正在生成模板，预计需要20-40秒...',
      type: 'info',
      duration: 0, // 不自动消失
      showClose: false
    });

    // 启动进度更新定时器
    let progressStep = 0;
    const progressSteps = [
      { percent: 10, text: '分析模板类型...', tips: '正在分析您的模板需求' },
      { percent: 25, text: '构建合同结构...', tips: 'AI正在设计专业的合同框架' },
      { percent: 45, text: '生成条款内容...', tips: '正在编写具体的合同条款' },
      { percent: 65, text: '设置变量标记...', tips: '正在标记可替换的动态内容' },
      { percent: 80, text: '优化格式规范...', tips: '正在调整格式和排版' },
      { percent: 95, text: '验证模板完整性...', tips: '正在检查模板的完整性和合规性' },
      { percent: 100, text: '生成完成！', tips: '模板生成成功，正在处理结果' }
    ];

    progressTimer = setInterval(() => {
      if (progressStep < progressSteps.length) {
        const step = progressSteps[progressStep];
        progressPercent.value = step.percent;
        progressText.value = step.text;
        progressTips.value = step.tips;
        
        // 更新消息提示
        if (loadingMessage) {
          loadingMessage.message = step.text;
        }
        
        progressStep++;
      } else {
        clearInterval(progressTimer);
      }
    }, 3500); // 每3.5秒更新一次进度，总计约24秒完成进度条

    // 调用AI API生成模板
    const response = await aiApi.generateContractTemplate(
      templateForm.type,
      templateForm.description
    );
    
    // 调试：打印API响应结构
    console.log('API响应:', response);
    
    // 多种方式获取模板数据，适应不同的API响应结构
    let templateData: any;
    
    // 尝试不同的响应结构
    if (response.data && response.data.data) {
      // 结构1: { data: { data: {...} } }
      templateData = response.data.data;
    } else if (response.data && response.data.content) {
      // 结构2: { data: { content: ... } }
      templateData = response.data;
    } else if (response && (response as any).content) {
      // 结构3: { content: ... } (直接返回)
      templateData = response as any;
    } else {
      // 结构4: 直接返回数据
      templateData = response.data || response;
    }
    
    console.log('解析后的模板数据:', templateData);
    
    // 完成进度条
    if (progressTimer) {
      clearInterval(progressTimer);
    }
    progressPercent.value = 100;
    progressText.value = '生成完成！';
    progressTips.value = '正在处理生成的模板数据';
    progressStatus.value = 'success';
    
    // 立即更新消息，然后快速关闭
    if (loadingMessage) {
      loadingMessage.message = '模板生成成功，正在展示结果...';
      loadingMessage.type = 'success';
      
      // 500ms后关闭，快速过渡
      setTimeout(() => {
        if (loadingMessage && typeof loadingMessage.close === 'function') {
          loadingMessage.close();
        }
      }, 500);
    }
    
    // 检查是否有备用模板
    if (templateData?.fallback) {
      // 使用备用模板
      const fallbackData = templateData.fallback;
      templateForm.content = fallbackData.content;
      
      if (fallbackData.variables && Array.isArray(fallbackData.variables)) {
        templateForm.variables = fallbackData.variables.map((v: any) => ({
          name: v.name || '',
          label: v.label || '',
          default_value: v.default_value || '',
        }));
      }
      
      progressText.value = '使用备用模板';
      progressStatus.value = 'warning';
      ElMessage.warning('AI生成超时，已为您加载基础模板');
      
      // 延迟重置进度状态
      setTimeout(() => {
        generating.value = false;
        progressPercent.value = 0;
      }, 3000);
      return;
    }
    
    // 立即更新模板内容，消除真空期
    templateForm.content = templateData?.content || '';
    
    // 立即更新模板变量
    if (templateData?.variables && Array.isArray(templateData.variables)) {
      templateForm.variables = templateData.variables.map((v: any) => ({
        name: v.name || '',
        label: v.label || '',
        default_value: v.default_value || '',
      }));
    }

    // 更新进度提示为数据处理
    progressText.value = '数据处理完成';
    progressTips.value = `已成功生成${templateForm.type}模板，包含${templateData?.variables?.length || 0}个变量`;

    // 使用nextTick确保DOM更新后再显示成功提示
    await nextTick();
    
    // 显示生成成功提示和使用建议
    const tips = templateData?.tips || [];
    if (tips.length > 0) {
      const tipsContent = tips.map((tip: string, index: number) => `${index + 1}. ${tip}`).join('\n');
      ElMessage({
        message: `模板生成成功！已为您生成${templateData?.variables?.length || 0}个可变字段`,
        type: 'success',
        duration: 3000,
        showClose: true
      });
      
      // 延迟显示详细建议，避免阻塞界面
      setTimeout(async () => {
        await ElMessageBox.alert(`已生成完整的${templateForm.type}模板\n\n使用提示：\n${tipsContent}`, '模板生成成功', {
          type: 'success',
        });
      }, 800);
    } else {
      ElMessage({
        message: `${templateForm.type}模板生成成功！`,
        type: 'success',
        duration: 3000,
        showClose: true
      });
    }
    
    // 立即重置进度状态，让用户能再次使用
    setTimeout(() => {
      generating.value = false;
      progressPercent.value = 0;
      progressText.value = '准备开始生成...';
      progressStatus.value = '';
    }, 1000);
  } catch (error: any) {
    // 清理定时器
    if (progressTimer) {
      clearInterval(progressTimer);
    }
    
    // 更新进度状态为错误
    progressPercent.value = 100;
    progressText.value = '生成失败';
    progressTips.value = '模板生成过程中遇到问题';
    progressStatus.value = 'exception';
    
    // 关闭加载提示
    if (loadingMessage && typeof loadingMessage.close === 'function') {
      loadingMessage.close();
    }
    
    if (error !== 'cancel') {
      const errorMessage = error.response?.data?.message || error.message || '模板生成失败，请重试';
      
      // 检查是否有备用模板可用
      if (error.response?.data?.fallback) {
        const fallbackData = error.response.data.fallback;
        
        try {
          await ElMessageBox.confirm(
            'AI生成遇到问题，是否使用基础模板？',
            '提示',
            {
              confirmButtonText: '使用基础模板',
              cancelButtonText: '重试',
              type: 'warning',
            }
          );
          
          // 使用备用模板
          templateForm.content = fallbackData.content;
          
          if (fallbackData.variables && Array.isArray(fallbackData.variables)) {
            templateForm.variables = fallbackData.variables.map((v: any) => ({
              name: v.name || '',
              label: v.label || '',
              default_value: v.default_value || '',
            }));
          }
          
          progressText.value = '使用备用模板';
          progressStatus.value = 'warning';
          ElMessage.warning('已为您加载基础模板');
          
          // 延迟重置进度状态
          setTimeout(() => {
            generating.value = false;
            progressPercent.value = 0;
            progressText.value = '准备开始生成...';
            progressStatus.value = '';
          }, 3000);
          return;
        } catch (confirmError) {
          // 用户选择重试
        }
      }
      
      ElMessage.error(errorMessage);
    }
    
    // 延迟重置进度状态
    setTimeout(() => {
      generating.value = false;
      progressPercent.value = 0;
      progressText.value = '准备开始生成...';
      progressStatus.value = '';
    }, 2000);
  }
};


const submitForm = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();

    submitting.value = true;

    const user = authStore.user;
    if (!user) {
      throw new Error("用户未登录");
    }



    // 准备模板数据
    const templateData = {
      name: templateForm.name,
      category: templateForm.type,
      description: templateForm.description,
      is_public: templateForm.is_public,
      content: templateForm.content,
      variables: templateForm.variables,
      tags: [], // 默认空标签数组
      created_by: user.id,
      is_active: templateForm.status === "active",
      status: templateForm.status,
    };

    // 使用templateStore创建模板
    await templateStore.createTemplate(templateData);

    ElMessage.success("模板创建成功");

    // 清除草稿
    localStorage.removeItem("contract_template_draft");

    router.push("/templates");
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error(templateStore.error || "创建模板失败");
    }
  } finally {
    submitting.value = false;
  }
};

const saveDraft = () => {
  // 保存草稿到本地存储
  const draft = {
    ...templateForm,
    saved_at: new Date().toISOString(),
  };

  localStorage.setItem("contract_template_draft", JSON.stringify(draft));
  ElMessage.success("草稿已保存");
};

// 加载草稿
const loadDraft = () => {
  try {
    const draft = localStorage.getItem("contract_template_draft");
    if (draft) {
      const draftData = JSON.parse(draft);
      Object.assign(templateForm, {
        name: draftData.name || "",
        type: draftData.type || "",
        description: draftData.description || "",
        status: draftData.status || "active",
        is_public: draftData.is_public || false,
        content: draftData.content || "",
        variables: draftData.variables || [
          { name: "company_name", label: "公司名称", default_value: "" },
          {
            name: "contract_date",
            label: "合同日期",
            default_value: new Date().toLocaleDateString("zh-CN"),
          },
        ],
      });
      ElMessage.info("已加载保存的草稿");
    }
  } catch (error) {
    console.error("加载草稿失败:", error);
  }
};

// 组件挂载时加载草稿
onMounted(() => {
  loadDraft();
});
</script>

<style scoped>
.template-create {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.header-content h2 {
  margin: 0;
  margin-bottom: 5px;
}

/* AI生成进度条样式 */
.ai-progress-container {
  margin-top: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-text {
  font-weight: 500;
  color: #409eff;
  font-size: 14px;
}

.progress-percent {
  font-weight: 600;
  color: #409eff;
  font-size: 16px;
}

.progress-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

/* 进度条动画 */
:deep(.el-progress-bar__outer) {
  background-color: #ebeef5;
}

:deep(.el-progress-bar__inner) {
  transition: all 0.3s ease;
}

:deep(.el-progress.is-success .el-progress-bar__inner) {
  background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
}

:deep(.el-progress.is-exception .el-progress-bar__inner) {
  background: linear-gradient(90deg, #f56c6c 0%, #f78989 100%);
}

:deep(.el-progress.is-warning .el-progress-bar__inner) {
  background: linear-gradient(90deg, #e6a23c 0%, #ebb563 100%);
}

.header-content p {
  margin: 0;
  color: #606266;
}

.create-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  align-items: start;
}

.form-card {
  border-radius: 8px;
}

.permission-tip {
  margin-top: 5px;
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
  .create-content {
    grid-template-columns: 1fr;
  }

  .preview-card {
    position: static;
  }
}
</style>
