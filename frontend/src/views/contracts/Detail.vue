<template>
  <div class="contract-detail">
    <div class="detail-header">
      <el-page-header
        @back="goBack"
      >
        <template #breadcrumb>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item :to="{ path: '/contracts' }">合同列表</el-breadcrumb-item>
            <el-breadcrumb-item>合同详情</el-breadcrumb-item>
          </el-breadcrumb>
        </template>
        <template #content>
          <div class="header-content">
            <h2>{{ contractDetail?.contract_title || contractDetail?.filename || '合同详情' }}</h2>
            <div class="contract-status">
              <el-tag :type="getStatusType(contractDetail?.status)">
                {{ getStatusText(contractDetail?.status) }}
              </el-tag>
              <el-tag
                v-if="contractDetail?.risk_level !== 'pending'"
                :type="getRiskType(contractDetail?.risk_level)"
              >
                {{ getRiskText(contractDetail?.risk_level) }}
              </el-tag>
            </div>
          </div>
        </template>
      </el-page-header>

      <div class="header-actions">
          <el-button-group>
            <el-button type="primary" :icon="Download" @click="downloadFile"
              >下载合同</el-button
            >
            <el-button type="success" :icon="Document" @click="viewFile"
              >查看文件</el-button
            >
            <el-button type="warning" :icon="View" @click="viewContract">
              PDF预览
            </el-button>
            <el-button :icon="Edit" @click="editContract">编辑</el-button>
            <el-button :icon="Delete" type="danger" @click="deleteContract"
              >删除</el-button
            >
          </el-button-group>
      </div>
    </div>

    <div class="detail-content">
      <el-row :gutter="20">
        <!-- 基本信息 -->
        <el-col :span="16">
          <el-card class="info-card">
            <template #header>
              <span>合同基本信息</span>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="合同名称">{{
                contractDetail?.contract_title || contractDetail?.filename || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="合同类型">{{
                getTypeText(contractDetail?.category)
              }}</el-descriptions-item>
              <el-descriptions-item label="甲方">{{
                contractDetail?.party_a || "未填写"
              }}</el-descriptions-item>
              <el-descriptions-item label="乙方">{{
                contractDetail?.party_b || "未填写"
              }}</el-descriptions-item>
              <el-descriptions-item label="合同金额">{{
                contractDetail?.amount
                  ? `¥${contractDetail.amount.toLocaleString()}`
                  : "未填写"
              }}</el-descriptions-item>
              <el-descriptions-item label="合同期限">
                {{
                  contractDetail?.start_date
                    ? formatDate(contractDetail.start_date)
                    : "未设置"
                }}
                ~
                {{
                  contractDetail?.end_date
                    ? formatDate(contractDetail.end_date)
                    : "未设置"
                }}
              </el-descriptions-item>
              <el-descriptions-item label="上传时间">{{
                formatDate(contractDetail?.created_at)
              }}</el-descriptions-item>
              <el-descriptions-item label="文件大小">{{
                formatFileSize(contractDetail?.file_size)
              }}</el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">{{
                contractDetail?.remarks || "无"
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 风险分析结果 -->
          <el-card
            v-if="contractDetail?.risk_level && contractDetail?.risk_level !== 'pending'"
            class="analysis-card"
          >
            <template #header>
              <span>风险分析结果</span>
            </template>

            <div class="risk-summary">
              <div class="risk-level">
                <h3 :class="`risk-${contractDetail?.risk_level}`">
                  {{ getRiskLevelText(contractDetail?.risk_level) }}
                </h3>
                <p>总体风险评估</p>
              </div>

              <div v-if="riskDetails.length > 0" class="risk-details">
                <h4>详细风险点</h4>
                <el-timeline>
                  <el-timeline-item
                    v-for="(risk, index) in riskDetails"
                    :key="index"
                    :timestamp="risk.type"
                    :type="getRiskItemType(risk.severity)"
                  >
                    {{ risk.description }}
                    <el-tag size="small" :type="getRiskTagType(risk.severity)">
                      {{ getSeverityText(risk.severity) }}
                    </el-tag>
                  </el-timeline-item>
                </el-timeline>
              </div>
            </div>
          </el-card>
          
          <!-- 未分析状态 -->
          <el-card
            v-else
            class="analysis-card"
          >
            <template #header>
              <span>风险分析结果</span>
            </template>
            <div class="no-analysis">
              <el-empty description="合同尚未进行风险分析" />
              <el-button type="primary" @click="analyzeContract(contractDetail?.id)">
                开始分析
              </el-button>
            </div>
          </el-card>
        </el-col>

        <!-- 侧边栏信息 -->
        <el-col :span="8">
          <!-- 合同预览 -->
          <el-card class="preview-card">
            <template #header>
              <span>合同预览</span>
            </template>

            <div class="preview-content">
              <div v-if="contractDetail?.file_path" class="file-preview">
                <el-icon class="file-icon"><Document /></el-icon>
                <p>{{ contractDetail?.filename }}</p>
                <el-button type="primary" link @click="viewFile"
                  >查看文件</el-button
                >
              </div>
              <div v-else class="no-preview">
                <el-empty description="暂无预览" />
              </div>
            </div>
          </el-card>

          <!-- 操作记录 -->
          <el-card class="log-card">
            <template #header>
              <span>操作记录</span>
            </template>

            <el-timeline>
              <el-timeline-item
                v-for="log in operationLogs"
                :key="log.id"
                :timestamp="formatDate(log.created_at)"
                :type="getLogType(log.action)"
              >
                {{ log.action_text }}
                <br />
                <span class="log-user">操作人: {{ log.operator }}</span>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑合同信息" width="600px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="合同名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="合同类型">
          <el-select v-model="editForm.type" placeholder="请选择合同类型">
            <el-option label="采购合同" value="purchase" />
            <el-option label="销售合同" value="sale" />
            <el-option label="服务合同" value="service" />
            <el-option label="租赁合同" value="lease" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="甲方">
          <el-input v-model="editForm.party_a" />
        </el-form-item>
        <el-form-item label="乙方">
          <el-input v-model="editForm.party_b" />
        </el-form-item>
        <el-form-item label="合同金额">
          <el-input-number v-model="editForm.amount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remarks" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Download,
  Edit,
  Delete,
  Document,
  View,
} from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";
import { useContractStore } from "@/stores/contract";

const route = useRoute();
const router = useRouter();
const contractStore = useContractStore();

const contractId = route.params.id as string;
const contractDetail = ref<any>(null);
const editDialogVisible = ref(false);
const riskDetails = ref<any[]>([]);
const operationLogs = ref<any[]>([]);

const editForm = ref({
  name: "",
  type: "",
  party_a: "",
  party_b: "",
  amount: 0,
  remarks: "",
});

const goBack = () => {
  router.back();
};

const loadContractDetail = async () => {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .single();

    if (error) throw error;
    contractDetail.value = data;

    // 加载编辑表单数据
    Object.assign(editForm.value, {
      name: data.contract_title || data.filename,
      type: data.category,
      party_a: data.party_a,
      party_b: data.party_b,
      amount: data.contract_amount,
      remarks: data.remarks,
    });

    // 加载风险分析详情
    await loadRiskDetails();

    // 加载操作记录
    await loadOperationLogs();
  } catch (error: any) {
    ElMessage.error(`加载合同详情失败: ${error.message}`);
  }
};

const loadRiskDetails = async () => {
  // 模拟风险分析数据
  riskDetails.value = [
    {
      type: "条款风险",
      description: "付款条款存在模糊描述",
      severity: "medium",
    },
    {
      type: "法律合规",
      description: "缺少必要的法律条款",
      severity: "high",
    },
    {
      type: "格式规范",
      description: "合同格式符合标准",
      severity: "low",
    },
  ];
};

const loadOperationLogs = async () => {
  // 模拟操作记录
  operationLogs.value = [
    {
      id: 1,
      action: "upload",
      action_text: "上传合同文件",
      operator: "系统管理员",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      action: "analyze",
      action_text: "完成风险分析",
      operator: "AI分析系统",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
};

const downloadFile = async () => {
  if (!contractDetail.value?.file_path) {
    ElMessage.warning("合同文件不存在");
    return;
  }

  try {
    const { data, error } = await supabase.storage
      .from("contracts")
      .download(contractDetail.value.file_path);

    if (error) throw error;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = contractDetail.value.filename;
    a.click();
    URL.revokeObjectURL(url);

    ElMessage.success("文件下载成功");
  } catch (error: any) {
    ElMessage.error(`下载失败: ${error.message}`);
  }
};

// 测试配置 - 可以通过URL参数启用测试模式
const getTestConfig = () => {
  const urlParams = new URLSearchParams(window.location.search);
  // 从URL参数获取测试模式状态，优先级最高
  const urlTestMode = urlParams.get("testMode") === "true";
  // 默认配置
  const defaultConfig = {
    enabled: urlTestMode || false, // 默认关闭测试模式
    pdfPath: "/api/uploads/contracts/test.pdf",
    pdfName: "test.pdf",
  };
  return defaultConfig;
};

// 预览合同
const viewContract = () => {
  console.log(
    "%c====== 查看合同开始 ======",
    "background: #4285f4; color: white; padding: 2px 6px; border-radius: 3px;",
  );
  console.log("合同详情:", contractDetail.value);

  // 获取测试配置
  const testConfig = getTestConfig();

  // 确定要使用的PDF路径
  let pdfPath = "";
  let pdfName = "";

  // 从contractDetail获取实际数据
  const actualFilePath = contractDetail.value?.file_path;
  const actualFileName = contractDetail.value?.filename || "document.pdf";

  // 验证文件格式（测试模式除外）
  if (
    !testConfig.enabled &&
    actualFileName &&
    !actualFileName.toLowerCase().endsWith(".pdf")
  ) {
    const fileExtension = actualFileName
      .toLowerCase()
      .substring(actualFileName.lastIndexOf("."));
    ElMessage.error(`不支持的文件格式: ${fileExtension}，仅支持PDF文件预览`);
    console.log(`文件格式不支持预览: ${fileExtension}`);
    console.log(
      "%c====== 查看合同结束 ======",
      "background: #4285f4; color: white; padding: 2px 6px; border-radius: 3px;",
    );
    return;
  }

  // 获取文件URL
  const getFileUrl = (filePath: string) => {
    console.log("====== PDF URL生成开始 ======");
    console.log("原始文件路径:", filePath);
    console.log("文件路径类型:", typeof filePath);

    // 测试模式下直接返回测试路径
    if (testConfig.enabled) {
      console.log(
        "%c测试模式激活，返回测试PDF路径",
        "background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px;",
      );
      console.log("实际记录ID:", contractId);
      console.log("实际文件路径:", filePath);
      console.log("====== PDF URL生成结束 ======");
      return testConfig.pdfPath;
    }

    if (!filePath) {
      console.log("文件路径为空，返回空字符串");
      console.log("====== PDF URL生成结束 ======");
      return "";
    }

    // 如果是Supabase存储路径，需要转换
    if (filePath.startsWith("contracts/")) {
      console.log("检测到Supabase存储路径，生成公共URL");
      const { data } = supabase.storage
        .from("contracts")
        .getPublicUrl(filePath);
      console.log("Supabase URL:", data.publicUrl);
      console.log("完整访问路径:", window.location.origin + data.publicUrl);
      console.log("====== PDF URL生成结束 ======");
      return data.publicUrl;
    }

    // 处理本地文件路径，提取文件名并拼接正确的API代理前缀
    console.log("进行本地文件路径处理");
    const fileName = filePath.split(/[\\/]/).pop() || "";
    console.log("提取的文件名:", fileName);
    const localFileUrl = `/api/uploads/contracts/${fileName}`;

    // 检查并修复URL路径
    if (!localFileUrl.startsWith("http") && !localFileUrl.startsWith("/")) {
      const fixedUrl = "/" + localFileUrl;
      console.log("修复了相对路径:", fixedUrl);
      console.log("完整访问路径:", window.location.origin + fixedUrl);
      console.log("====== PDF URL生成结束 ======");
      return fixedUrl;
    }

    console.log("本地文件URL:", localFileUrl);
    console.log("完整访问路径:", window.location.origin + localFileUrl);
    console.log("====== PDF URL生成结束 ======");
    return localFileUrl;
  };

  // 检查是否有实际文件路径
  if (!actualFilePath) {
    if (testConfig.enabled) {
      // 在测试模式下即使没有实际文件也可以预览测试PDF
      pdfPath = testConfig.pdfPath;
      pdfName = testConfig.pdfName;

      console.log(
        "%c使用测试PDF文件进行预览",
        "background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px;",
      );
      ElMessage({
        message: "正在使用测试模式预览PDF",
        type: "warning",
        duration: 5000,
      });
    } else {
      ElMessage.warning("合同文件不存在");
      console.log("====== 查看合同结束 ======");
      return;
    }
  } else {
    // 使用实际文件路径
    pdfPath = getFileUrl(actualFilePath);
    pdfName = testConfig.enabled ? testConfig.pdfName : actualFileName;

    if (testConfig.enabled) {
      console.log(
        "%c使用测试模式PDF文件",
        "background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px;",
      );
      ElMessage({
        message: "正在使用测试模式预览PDF",
        type: "warning",
        duration: 5000,
      });
    } else {
      console.log("使用实际PDF文件:", pdfPath, pdfName);
    }
  }

  console.log("获取的文件URL:", pdfPath);
  console.log("编码后的文件URL:", encodeURIComponent(pdfPath));

  // 打开预览页面
  const previewUrl = `/contracts-preview?fileUrl=${encodeURIComponent(pdfPath)}&fileName=${encodeURIComponent(pdfName)}`;
  console.log("预览页面完整URL:", window.location.origin + previewUrl);
  window.open(previewUrl, "_blank");
  console.log(
    "%c====== 查看合同结束 ======",
    "background: #4285f4; color: white; padding: 2px 6px; border-radius: 3px;",
  );
};

const editContract = () => {
  editDialogVisible.value = true;
};

const saveEdit = async () => {
  try {
    const { error } = await supabase
      .from("contracts")
      .update(editForm.value)
      .eq("id", contractId);

    if (error) throw error;

    ElMessage.success("合同信息更新成功");
    editDialogVisible.value = false;
    await loadContractDetail();
  } catch (error: any) {
    ElMessage.error(`更新失败: ${error.message}`);
  }
};

// 智能文件查看功能
const viewFile = () => {
  console.log('查看文件被点击，合同详情:', contractDetail.value);
  
  if (!contractDetail.value?.file_path) {
    ElMessage.warning("该合同没有上传文件");
    return;
  }
  
  // 智能文件名提取：优先使用filename字段，如果为空则从file_path中提取
  let fileName = '';
  
  if (contractDetail.value.filename) {
    // 使用数据库中的filename字段
    fileName = contractDetail.value.filename;
  } else if (contractDetail.value.file_path) {
    // 从file_path中提取文件名作为后备方案
    const pathParts = contractDetail.value.file_path.split(/[\\/]/);
    fileName = pathParts[pathParts.length - 1];
    console.log('从file_path中提取的文件名:', fileName);
  }
  
  if (!fileName) {
    console.warn('无法提取文件名，合同详情:', contractDetail.value);
    ElMessage.warning("无法获取文件名，请检查合同记录");
    return;
  }
  
  console.log('检测到文件名:', fileName, '文件路径:', contractDetail.value.file_path);
  
  // 获取文件扩展名
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  // 智能判断：优先使用文本提取功能，支持更多格式
  const extractableFormats = ['.pdf', '.doc', '.docx', '.txt', '.md'];
  const canExtract = extractableFormats.some(format => fileName.endsWith(format));
  
  if (canExtract) {
    // 跳转到智能文本提取页面，支持文本预览和内容提取
    router.push({
      path: '/contracts/text-extract',
      query: { 
        contract_id: contractDetail.value.id,
        filename: fileName
      }
    });
  } else if (fileExtension === '.pdf') {
    // PDF文件：使用专门的PDF预览页面
    router.push({
      path: '/contracts-preview',
      query: { 
        contract_id: contractDetail.value.id,
        fileUrl: contractDetail.value.file_path,
        fileName: fileName
      }
    });
  } else {
    // 其他格式：跳转到文件查看器页面
    router.push({
      path: '/contracts/file-viewer',
      query: { 
        contract_id: contractDetail.value.id,
        filename: fileName
      }
    });
  }
};

// 分析合同
const analyzeContract = async (contractId: string) => {
  try {
    if (!contractId) {
      ElMessage.warning("合同ID不存在");
      return;
    }

    // 使用contractStore中的analyzeContract方法
    const result = await contractStore.analyzeContract(contractId);
    
    if (result.success) {
      ElMessage.success("合同分析任务已启动");
      
      // 等待分析完成，然后重新加载数据
      setTimeout(() => {
        loadContractDetail();
      }, 3000);
    } else {
      ElMessage.error(`分析失败: ${result.error}`);
    }
  } catch (error: any) {
    ElMessage.error(`分析合同失败: ${error.message}`);
  }
};

const deleteContract = async () => {
  try {
    await ElMessageBox.confirm("确定要删除此合同吗？此操作不可恢复。", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contractId);

    if (error) throw error;

    ElMessage.success("合同删除成功");
    router.push("/contracts");
  } catch (error: any) {
    if (error !== "cancel") {
      ElMessage.error(`删除失败: ${error.message}`);
    }
  }
};

// 工具函数
const getStatusType = (status: string) => {
  const types: any = {
    pending: "info",
    analyzing: "warning",
    completed: "success",
    failed: "danger",
  };
  return types[status] || "info";
};

const getStatusText = (status: string) => {
  const texts: any = {
    pending: "待分析",
    analyzing: "分析中",
    completed: "已完成",
    failed: "分析失败",
  };
  return texts[status] || status;
};

const getRiskType = (risk: string) => {
  const types: any = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return types[risk] || "info";
};

const getRiskText = (risk: string) => {
  const texts: any = {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
  };
  return texts[risk] || risk;
};

const getTypeText = (type: string) => {
  const texts: any = {
    purchase: "采购合同",
    sale: "销售合同",
    service: "服务合同",
    lease: "租赁合同",
    other: "其他",
  };
  return texts[type] || type;
};

const formatDate = (date: string) => {
  if (!date) return "未设置";
  return new Date(date).toLocaleDateString("zh-CN");
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getRiskLevelText = (level: string) => {
  const texts: any = {
    low: "低风险",
    medium: "中风险",
    high: "高风险",
  };
  return texts[level] || (level ? level : "未分析");
};

const getRiskItemType = (severity: string) => {
  const types: any = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return types[severity] || "info";
};

const getRiskTagType = (severity: string) => {
  const types: any = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return types[severity] || "info";
};

const getSeverityText = (severity: string) => {
  const texts: any = {
    low: "低",
    medium: "中",
    high: "高",
  };
  return texts[severity] || severity;
};

const getLogType = (action: string) => {
  const types: any = {
    upload: "primary",
    analyze: "success",
    edit: "warning",
    delete: "danger",
  };
  return types[action] || "info";
};

onMounted(() => {
  loadContractDetail();
});
</script>

<style scoped>
.contract-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.header-content h2 {
  margin: 0;
  margin-bottom: 10px;
}

.contract-status {
  display: flex;
  gap: 10px;
}

.detail-content {
  margin-top: 20px;
}

.info-card,
.analysis-card,
.preview-card,
.log-card {
  margin-bottom: 20px;
}

.risk-summary {
  padding: 10px 0;
}

.risk-level {
  text-align: center;
  margin-bottom: 20px;
}

.risk-level h3 {
  margin: 0;
  font-size: 24px;
}

.risk-low {
  color: #67c23a;
}
.risk-medium {
  color: #e6a23c;
}
.risk-high {
  color: #f56c6c;
}

.risk-details h4 {
  margin-bottom: 15px;
  color: #606266;
}

.file-preview {
  text-align: center;
  padding: 20px;
}

.file-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 10px;
}

.no-preview {
  padding: 40px 0;
}

.log-user {
  font-size: 12px;
  color: #909399;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

:deep(.el-timeline-item__timestamp) {
  color: #909399;
  font-size: 12px;
}
</style>
