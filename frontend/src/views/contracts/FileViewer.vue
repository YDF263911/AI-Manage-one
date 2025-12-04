<template>
  <div class="file-viewer">
    <div class="viewer-header">
      <el-page-header @back="goBack">
        <template #content>
          <h2>文件内容查看</h2>
          <p>查看合同文件的原始内容</p>
        </template>
      </el-page-header>
    </div>

    <div v-loading="loading" class="viewer-content">
      <!-- 文件信息卡片 -->
      <el-card class="file-info-card">
        <template #header>
          <span>文件信息</span>
        </template>
        
        <div v-if="currentFile" class="file-details">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="文件名">
              <el-icon><Document /></el-icon>
              {{ currentFile.filename }}
            </el-descriptions-item>
            <el-descriptions-item label="文件类型">
              <el-tag>{{ currentFile.fileType.toUpperCase() }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="文件大小">
              {{ formatFileSize(currentFile.fileSize) }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(currentFile.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="支持预览">
              <el-tag :type="canPreview ? 'success' : 'warning'">
                {{ canPreview ? '支持' : '不支持' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button 
          type="primary" 
          :icon="Download" 
          @click="downloadFile"
        >
          下载文件
        </el-button>
        <el-button 
          type="info" 
          :icon="Refresh" 
          @click="refreshViewer"
        >
          刷新
        </el-button>
      </div>

      <!-- 预览区域 -->
      <el-card class="preview-card">
        <template #header>
          <span>文件预览</span>
        </template>
        
        <div v-if="canPreview" class="preview-content">
          <!-- PDF文件预览 -->
          <div v-if="isPdfFile" class="pdf-preview">
            <iframe 
              :src="pdfViewerUrl" 
              width="100%" 
              height="600" 
              frameborder="0"
            ></iframe>
          </div>
          
          <!-- 文本文件预览 -->
          <div v-else-if="isTextFile" class="text-preview">
            <pre v-if="fileContent" class="text-content">{{ fileContent }}</pre>
            <el-empty v-else description="无法加载文件内容" />
          </div>
          
          <!-- 不支持的文件类型 -->
          <div v-else class="unsupported-preview">
            <el-empty description="该文件类型不支持在线预览" />
            <div class="unsupported-actions">
              <el-button type="primary" @click="downloadFile">
                下载文件查看
              </el-button>
            </div>
          </div>
        </div>
        
        <div v-else class="no-preview">
          <el-empty description="该文件类型不支持预览" />
          <div class="no-preview-actions">
            <el-button type="primary" @click="downloadFile">
              下载文件查看
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Document, Download, Refresh } from '@element-plus/icons-vue';
import { supabase } from "@/utils/supabase";

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const currentFile = ref<any>(null);
const fileContent = ref('');

// 计算属性
const canPreview = computed(() => {
  if (!currentFile.value) return false;
  const fileType = currentFile.value.fileType.toLowerCase();
  return fileType.endsWith('.pdf') || fileType.endsWith('.txt') || 
         fileType.endsWith('.md') || fileType.endsWith('.json') ||
         fileType.endsWith('.xml') || fileType.endsWith('.html');
});

const isPdfFile = computed(() => {
  return currentFile.value?.fileType.toLowerCase().endsWith('.pdf');
});

const isTextFile = computed(() => {
  const fileType = currentFile.value?.fileType.toLowerCase();
  return fileType?.endsWith('.txt') || fileType?.endsWith('.md') || 
         fileType?.endsWith('.json') || fileType?.endsWith('.xml') ||
         fileType?.endsWith('.html');
});

const pdfViewerUrl = computed(() => {
  if (!currentFile.value?.filePath) return '';
  
  // 直接从Supabase获取公共URL
  const fileUrl = getFileUrl();
  console.log('PDF预览URL:', fileUrl);
  
  // 返回直接的文件URL，让浏览器原生处理PDF预览
  return fileUrl;
});

// 方法
const goBack = () => {
  router.back();
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: string | Date): string => {
  if (!date) return '未知';
  return new Date(date).toLocaleString('zh-CN');
};

const getFileUrl = (): string => {
  if (!currentFile.value?.filePath) return '';
  
  // 从Supabase获取文件下载URL
  const { data } = supabase.storage
    .from('contracts')
    .getPublicUrl(currentFile.value.filePath);
  
  console.log('文件路径:', currentFile.value.filePath);
  console.log('生成的URL:', data.publicUrl);
  
  return data.publicUrl;
};

const loadContractDetail = async () => {
  const contractId = route.query.contract_id as string;
  if (!contractId) {
    ElMessage.error('缺少合同ID');
    return;
  }

  loading.value = true;
  try {
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!contract) {
      throw new Error('合同不存在');
    }

    currentFile.value = {
      filename: contract.filename,
      fileType: contract.file_type,
      fileSize: contract.file_size,
      filePath: contract.file_path,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at
    };

    // 如果是文本文件，尝试加载内容
    if (isTextFile.value) {
      await loadTextFileContent();
    }
    
  } catch (error: any) {
    console.error('加载合同详情失败:', error);
    ElMessage.error(error.message || '加载合同详情失败');
  } finally {
    loading.value = false;
  }
};

const loadTextFileContent = async () => {
  if (!currentFile.value?.filePath) return;

  try {
    const { data, error } = await supabase.storage
      .from('contracts')
      .download(currentFile.value.filePath);

    if (error) {
      throw new Error(error.message);
    }

    // 将文件内容转换为文本
    const text = await data.text();
    fileContent.value = text;
  } catch (error: any) {
    console.error('加载文件内容失败:', error);
    ElMessage.warning('无法加载文件内容，请下载文件查看');
  }
};

const downloadFile = async () => {
  if (!currentFile.value?.filePath) {
    ElMessage.error('文件路径不存在');
    return;
  }

  try {
    const { data, error } = await supabase.storage
      .from('contracts')
      .download(currentFile.value.filePath);

    if (error) {
      throw new Error(error.message);
    }

    // 创建下载链接
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.value.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    ElMessage.success('开始下载文件');
  } catch (error: any) {
    console.error('下载文件失败:', error);
    ElMessage.error(error.message || '下载文件失败');
  }
};

const refreshViewer = () => {
  loadContractDetail();
};

// 生命周期
onMounted(() => {
  loadContractDetail();
});
</script>

<style scoped>
.file-viewer {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.viewer-header {
  margin-bottom: 30px;
}

.file-info-card {
  margin-bottom: 20px;
}

.file-details {
  padding: 10px 0;
}

.action-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-card {
  margin-bottom: 20px;
}

.preview-content {
  min-height: 400px;
}

.pdf-preview {
  width: 100%;
  height: 600px;
}

.pdf-preview iframe {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.text-preview {
  max-height: 600px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
}

.text-content {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  line-height: 1.5;
  font-size: 14px;
}

.unsupported-preview,
.no-preview {
  text-align: center;
  padding: 40px 0;
}

.unsupported-actions,
.no-preview-actions {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .file-viewer {
    padding: 10px;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .pdf-preview {
    height: 400px;
  }
}
</style>