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
                v-if="contractDetail?.status === 'analyzed' && contractDetail?.risk_level"
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
              >查看详情</el-button
            >
            <el-button :icon="Edit" @click="editContract">编辑基本信息</el-button>
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
                contractDetail?.contract_parties?.party_a || "未填写"
              }}</el-descriptions-item>
              <el-descriptions-item label="乙方">{{
                contractDetail?.contract_parties?.party_b || "未填写"
              }}</el-descriptions-item>
              <el-descriptions-item label="合同金额">{{
                contractDetail?.contract_amount
                  ? `¥${contractDetail.contract_amount.toLocaleString()}`
                  : "未填写"
              }}</el-descriptions-item>
              <el-descriptions-item label="合同期限">
                {{
                  contractDetail?.effective_date
                    ? formatDate(contractDetail.effective_date)
                    : "未设置"
                }}
                ~
                {{
                  contractDetail?.expiration_date
                    ? formatDate(contractDetail.expiration_date)
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
            v-if="contractDetail?.status === 'analyzed' || riskDetails.length > 0"
            class="analysis-card"
          >
            <template #header>
              <span>风险分析结果</span>
            </template>

            <div class="risk-summary">
              <div class="risk-level">
                <h3 :class="`risk-${contractDetail?.risk_level || 'medium'}`">
                  {{ getRiskLevelText(contractDetail?.risk_level || 'medium') }}
                </h3>
                <p>总体风险评估</p>
              </div>

              <div v-if="riskDetails.length > 0" class="risk-details">
                <h4>详细风险分析</h4>
                <el-collapse v-model="activeRiskPanel">
                  <el-collapse-item
                    v-for="(risk, index) in riskDetails"
                    :key="index"
                    :title="risk.type"
                    :name="index"
                  >
                    <div class="risk-item-detail">
                      <div class="risk-severity">
                        <el-tag :type="getRiskItemType(risk.severity)" size="small">
                          {{ getRiskLevelText(risk.severity) }}
                        </el-tag>
                      </div>
                      
                      <div class="risk-description">
                        <p><strong>风险描述：</strong>{{ risk.description }}</p>
                      </div>
                      
                      <div v-if="risk.clause" class="risk-clause">
                        <p><strong>相关条款：</strong>{{ risk.clause }}</p>
                      </div>
                      
                      <div v-if="risk.suggestion" class="risk-suggestion">
                        <p><strong>修改建议：</strong>{{ risk.suggestion }}</p>
                      </div>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </el-card>
          
          <!-- 未分析状态 -->
          <el-card
            v-if="contractDetail?.status !== 'analyzed' && riskDetails.length === 0"
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
} from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";
import { useContractStore } from "@/stores/contract";
import api from "@/utils/api";

const route = useRoute();
const router = useRouter();
const contractStore = useContractStore();

const contractId = route.params.id as string;
const contractDetail = ref<any>(null);
const editDialogVisible = ref(false);
const riskDetails = ref<any[]>([]);
const operationLogs = ref<any[]>([]);
const activeRiskPanel = ref<string[]>([]);
const isRiskLoading = ref(false);

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
      party_a: data.contract_parties?.party_a || '',
      party_b: data.contract_parties?.party_b || '',
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
  try {
    // 防重复调用：如果正在加载中或已加载数据，直接返回
    if (riskDetails.value.length > 0 || isRiskLoading.value) {
      console.log('风险详情已加载或正在加载，跳过重复调用');
      return;
    }
    
    isRiskLoading.value = true;
    
    // 使用后端API代理查询分析结果，绕过RLS限制
    const response = await api.get(`/analysis/${contractId}`) as any;
    
    if (response.success && response.data) {
      const analysisData = response.data;
      
      // 从analysis_result字段中提取风险点
      const analysisResult = analysisData.analysis_result;
      
      // 兼容多种AI分析结果格式
      let majorRisks = [];
      
      // 1. 优先检查 major_risks 字段（新格式）
      if (analysisResult?.major_risks && Array.isArray(analysisResult.major_risks)) {
        majorRisks = analysisResult.major_risks;
      }
      // 2. 检查 risks 字段（另一种格式）
      else if (analysisResult?.risks && Array.isArray(analysisResult.risks)) {
        // 兼容risks数组格式
        majorRisks = analysisResult.risks.map((item: any) => ({
          type: item.title || item.type || "合同风险",
          description: item.description || "风险描述",
          clause: item.clause || "相关条款",
          severity: item.severity || item.risk_level || "medium",
          suggestion: item.suggestion || "修改建议"
        }));
      }
      // 3. 检查 risk_assessment.risk_items 字段（旧格式）
      else if (analysisResult?.risk_assessment?.risk_items && Array.isArray(analysisResult.risk_assessment.risk_items)) {
        // 兼容旧格式
        majorRisks = analysisResult.risk_assessment.risk_items.map((item: any) => ({
          type: item.risk_type || "合同风险",
          description: item.description || item.risk_description || "风险描述",
          clause: item.clause || "相关条款",
          severity: item.severity || item.risk_level || "medium",
          suggestion: item.suggestion || "修改建议"
        }));
      }
      // 4. 检查直接的 risk_items 字段
      else if (analysisResult?.risk_items && Array.isArray(analysisResult.risk_items)) {
        // 兼容其他格式
        majorRisks = analysisResult.risk_items;
      }
      // 5. 检查合规性问题
      else if (analysisResult?.compliance_issues && Array.isArray(analysisResult.compliance_issues)) {
        majorRisks = analysisResult.compliance_issues.map((issue: any) => ({
          type: "合规问题",
          description: issue.issue || issue.description || "合规性问题",
          clause: issue.clause || "相关条款",
          severity: "medium",
          suggestion: issue.suggestion || "建议进行合规性审查"
        }));
      }
      // 6. 检查缺失条款
      else if (analysisResult?.missing_clauses && Array.isArray(analysisResult.missing_clauses)) {
        majorRisks = analysisResult.missing_clauses.map((clause: string, index: number) => ({
          type: "缺失条款",
          description: `缺失重要条款：${clause}`,
          clause: "合同整体",
          severity: "medium",
          suggestion: "建议补充缺失的合同条款"
        }));
      }
      // 7. 检查compliance_checks字段
      else if (analysisResult?.compliance_checks && Array.isArray(analysisResult.compliance_checks)) {
        majorRisks = analysisResult.compliance_checks
          .filter((check: any) => check.status !== 'pass') // 只显示不通过的项目
          .map((check: any) => ({
            type: "合规检查",
            description: check.description || check.item || "合规性问题",
            clause: "合同整体",
            severity: "medium",
            suggestion: "请进行合规性审查"
          }));
      }
      
      if (majorRisks.length > 0) {
        riskDetails.value = majorRisks.map((risk: any, index: number) => ({
          type: risk.type || risk.risk_type || "未知风险",
          description: risk.description || risk.risk_description || "风险描述",
          clause: risk.clause || "",
          severity: risk.severity || risk.risk_level || "medium",
          suggestion: risk.suggestion || "",
        }));
      } else {
        // 如果没有风险点数据，创建更详细的默认显示
        const riskLevel = analysisData.overall_risk_level || analysisResult?.risk_level || "未知";
        const riskSummary = analysisData.risk_summary || analysisResult?.summary || "暂无详细分析";
        const confidenceScore = analysisData.confidence_score || analysisResult?.risk_score || "未知";
        
        riskDetails.value = [
          {
            type: "总体风险评估",
            description: `风险等级：${riskLevel}，置信度：${confidenceScore}`,
            severity: riskLevel.toLowerCase() || "medium",
          },
          {
            type: "风险摘要",
            description: riskSummary,
            severity: "info",
          }
        ];
      }

      // 更新合同详情中的风险等级（如果存在）
      if (analysisData.overall_risk_level && contractDetail.value) {
        contractDetail.value.risk_level = analysisData.overall_risk_level;
      } else if (analysisResult?.risk_level && contractDetail.value) {
        contractDetail.value.risk_level = analysisResult.risk_level;
      }

      console.log("成功加载分析结果:", { 
        riskDetails: riskDetails.value, 
        analysisData,
        analysisResult 
      });
    } else {
      // 没有分析结果，清空风险详情
      riskDetails.value = [];
      console.log("暂无分析结果");
    }
  } catch (error: any) {
    console.error("加载风险详情失败:", error);
    // 不再显示错误提示，避免干扰用户体验
    riskDetails.value = [];
  } finally {
    // 确保加载状态被重置
    isRiskLoading.value = false;
  }
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



const editContract = () => {
  editDialogVisible.value = true;
};

const saveEdit = async () => {
  try {
    // 构建正确的数据结构，映射前端字段到数据库字段
    const updateData = {
      contract_title: editForm.value.name,
      category: editForm.value.type,
      contract_parties: {
        party_a: editForm.value.party_a,
        party_b: editForm.value.party_b
      },
      contract_amount: editForm.value.amount,
      remarks: editForm.value.remarks
    };

    const { error } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", contractId);

    if (error) throw error;

    ElMessage.success("合同信息更新成功");
    editDialogVisible.value = false;
    await loadContractDetail();
  } catch (error: any) {
    console.error('更新失败详情:', error);
    ElMessage.error(`更新失败: ${error.message}`);
  }
};

// 智能文件查看功能
const viewFile = () => {
  console.log('查看文件详情被点击，合同详情:', contractDetail.value);
  
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
  
  // 智能判断：支持的文档格式，统一使用文本提取功能
  const supportedFormats = ['.pdf', '.doc', '.docx', '.txt', '.md'];
  const isSupported = supportedFormats.some(format => fileName.endsWith(format));
  
  if (isSupported) {
    // 跳转到智能文本提取页面，支持PDF、Word、文本等多种格式的文档内容提取
    router.push({
      path: '/contracts/text-extract',
      query: { 
        contract_id: contractDetail.value.id,
        filename: fileName
      }
    });
    
    // 显示提示信息
    if (fileExtension === '.pdf') {
      ElMessage.info('正在使用智能PDF文本提取功能');
    } else if (fileExtension === '.doc' || fileExtension === '.docx') {
      ElMessage.info('正在使用智能Word文档提取功能');
    } else {
      ElMessage.info('正在使用智能文本提取功能');
    }
  } else {
    ElMessage.warning(`不支持的文件格式: ${fileExtension}，支持的格式: PDF、Word、TXT`);
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
      const errorMessage = (result as any).error || "分析失败";
      ElMessage.error(`分析失败: ${errorMessage}`);
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
