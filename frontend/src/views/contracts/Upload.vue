<template>
  <div class="contract-upload">
    <div class="upload-header">
      <h2>合同上传</h2>
      <p>上传合同文件进行智能分析</p>
    </div>

    <div class="upload-content">
      <el-card class="upload-card">
        <div
          class="upload-area"
          @drop.prevent="handleDrop"
          @dragover.prevent
        >
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
            :accept="acceptTypes"
            :limit="1"
            action="#"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 PDF、DOC、DOCX 格式文件，大小不超过10MB
              </div>
            </template>
          </el-upload>
        </div>

        <div v-if="currentFile" class="file-info">
          <div class="file-details">
            <el-icon><document /></el-icon>
            <span class="file-name">{{ currentFile.name }}</span>
            <span class="file-size">{{
              formatFileSize(currentFile.size)
            }}</span>
          </div>
          <div class="upload-actions">
            <el-button
              type="primary"
              :loading="uploading"
              @click="handleUpload"
            >
              {{ uploading ? "上传中..." : "开始分析" }}
            </el-button>
            <el-button @click="clearFile">重新选择</el-button>
          </div>
        </div>

        <!-- 合同信息表单 -->
        <div v-if="currentFile" class="contract-form">
          <el-divider>合同基本信息</el-divider>
          <el-form :model="contractForm" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="合同名称" required>
                  <el-input
                    v-model="contractForm.name"
                    placeholder="请输入合同名称"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="合同类型" required>
                  <el-select
                    v-model="contractForm.type"
                    placeholder="请选择合同类型"
                  >
                    <el-option label="采购合同" value="purchase" />
                    <el-option label="销售合同" value="sale" />
                    <el-option label="服务合同" value="service" />
                    <el-option label="租赁合同" value="lease" />
                    <el-option label="其他" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="甲方">
                  <el-input
                    v-model="contractForm.partyA"
                    placeholder="甲方名称"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="乙方">
                  <el-input
                    v-model="contractForm.partyB"
                    placeholder="乙方名称"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="合同金额">
              <el-input-number
                v-model="contractForm.amount"
                :min="0"
                :precision="2"
              />
              <span class="amount-unit">元</span>
            </el-form-item>
            <el-form-item label="合同期限">
              <el-date-picker
                v-model="contractForm.period"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
              />
            </el-form-item>
            <el-form-item label="备注">
              <el-input
                v-model="contractForm.remarks"
                type="textarea"
                :rows="3"
                placeholder="请输入合同备注信息"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { ElMessage, type UploadInstance, type UploadFile } from "element-plus";
import { UploadFilled, Document } from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";
import api from "@/utils/api";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const uploadRef = ref<UploadInstance>();
const fileList = ref<UploadFile[]>([]);
const currentFile = ref<File | null>(null);
const uploading = ref(false);

const authStore = useAuthStore();
const user = authStore.user;
const token = localStorage.getItem("token");
const router = useRouter();

const acceptTypes = ".pdf,.doc,.docx";

const contractForm = reactive({
  name: "",
  type: "",
  partyA: "",
  partyB: "",
  amount: 0,
  period: [],
  category: "",
  remarks: "",
});

const triggerUpload = () => {
  uploadRef.value?.$el.querySelector('input[type="file"]')?.click();
};

const handleDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFileSelect(files[0]);
  }
};

const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    handleFileSelect(file.raw);
  }
};

const handleFileSelect = (file: File) => {
  // 验证文件类型
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error("不支持的文件格式，请上传PDF或Word文档");
    return;
  }

  // 验证文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("文件大小不能超过10MB");
    return;
  }

  currentFile.value = file;

  // 自动生成合同名称
  if (!contractForm.name) {
    contractForm.name = file.name.replace(/\.[^\.]+$/, "");
  }
};

const clearFile = () => {
  currentFile.value = null;
  fileList.value = [];
  Object.assign(contractForm, {
    name: "",
    type: "",
    partyA: "",
    partyB: "",
    amount: 0,
    period: [],
    remarks: "",
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const handleUpload = async () => {
  if (!currentFile.value || !token) {
    ElMessage.warning("请先登录并选择文件");
    return;
  }

  uploading.value = true;
  ElMessage.info("正在上传合同并启动分析，请稍候...");

  try {
    // 确保用户已登录且有token
    if (!user || !token) {
      throw new Error("用户未登录或缺少认证信息");
    }

    // 1. 上传文件到存储
    const fileExt = currentFile.value.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const uploadData = await supabase.storage
      .from("contracts")
      .upload(`contracts/${user.id}/${fileName}`, currentFile.value, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadData.error) throw uploadData.error;

    // 2. 创建合同记录
    const { data: contractData, error: contractError } = await supabase
      .from("contracts")
      .insert([
        {
          contract_title: contractForm.name,
          file_type: contractForm.type,
          contract_parties: {
            party_a: contractForm.partyA,
            party_b: contractForm.partyB,
          },
          contract_amount: contractForm.amount,
          effective_date: contractForm.period[0],
          expiration_date: contractForm.period[1],
          category:
            contractForm.type === "sale"
              ? "sales"
              : contractForm.type || "other",
          file_path: uploadData.data.path,
          filename: currentFile.value.name,
          file_size: currentFile.value.size,
          status: "uploaded",
          user_id: user.id,
        },
      ])
      .select();

    if (contractError) throw contractError;

    ElMessage.success("合同上传成功，正在进行分析...");

    // 3. 触发AI分析 - 等待分析请求完成后再跳转
    await triggerAnalysis(contractData[0].id);

    // 跳转到分析结果页面
    router.push(`/contracts/analysis?contract_id=${contractData[0].id}`);
  } catch (error: any) {
    console.error("上传失败:", error);
    ElMessage.error(`上传失败: ${error.message || "未知错误"}`);
  } finally {
    uploading.value = false;
  }
};

// 触发AI分析
const triggerAnalysis = async (contractId: string) => {
  try {
    // 使用axios实例替代fetch，确保认证信息正确传递
    const data = await api.post(`/analysis/analyze/${contractId}`);
    console.log("分析任务已启动:", data);
    return data;
  } catch (error: any) {
    console.error("触发分析失败:", error);
    // axios拦截器已经处理了错误显示，这里只需要记录日志
    throw error; // 重新抛出错误，让调用者知道分析请求失败
  }
};
</script>

<style scoped>
.contract-upload {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.upload-header {
  text-align: center;
  margin-bottom: 30px;
}

.upload-header h2 {
  margin-bottom: 10px;
  color: #303133;
}

.upload-header p {
  color: #606266;
}

.upload-card {
  border-radius: 8px;
}

.upload-area {
  cursor: pointer;
  padding: 40px 20px;
  text-align: center;
}

.file-info {
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.file-details {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.file-details .el-icon {
  margin-right: 10px;
  font-size: 20px;
  color: #409eff;
}

.file-name {
  font-weight: 500;
  margin-right: 10px;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.upload-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.contract-form {
  margin-top: 30px;
}

.amount-unit {
  margin-left: 10px;
  color: #606266;
}

:deep(.el-upload-dragger) {
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  background-color: #fafafa;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409eff;
}
</style>
