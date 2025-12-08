<template>
  <div class="text-extract-viewer">
    <div class="viewer-header">
      <el-page-header @back="goBack">
        <template #breadcrumb>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item :to="{ path: '/contracts' }">合同列表</el-breadcrumb-item>
            <el-breadcrumb-item :to="{ path: `/contracts/${contractId}` }">合同详情</el-breadcrumb-item>
            <el-breadcrumb-item>合同内容提取</el-breadcrumb-item>
          </el-breadcrumb>
        </template>
        <template #content>
          <h2>合同内容智能提取</h2>
          <p>AI智能解析合同文档内容</p>
        </template>
      </el-page-header>
    </div>

    <div v-loading="loading" class="viewer-content">
      <!-- 文件信息 -->
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
            <el-descriptions-item label="上传时间">
              {{ formatDate(currentFile.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="提取状态">
              <el-tag :type="extractionStatus.type">
                {{ extractionStatus.text }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button 
          type="primary" 
          :icon="MagicStick" 
          @click="extractText"
          :loading="extracting"
        >
          {{ fromCache ? '重新提取' : (extractedText ? '重新提取' : '智能提取') }}
        </el-button>
        <el-button 
          type="success" 
          :icon="Download" 
          @click="downloadText"
          :disabled="!extractedText"
        >
          下载文本
        </el-button>
        <el-button 
          type="info" 
          :icon="Refresh" 
          @click="refreshViewer"
        >
          刷新
        </el-button>
        <el-button 
          v-if="fromCache && extractedText"
          type="warning" 
          :icon="MagicStick" 
          @click="forceReExtract"
        >
          强制重提
        </el-button>

      </div>

      <!-- 提取结果 -->
      <el-card class="extraction-result-card">
        <template #header>
          <span>提取结果</span>
          <span v-if="extractedText" class="text-count">
            共 {{ extractedText.length }} 个字符
          </span>
        </template>
        
        <div v-if="extractedText" class="extracted-text">
          <div class="text-controls">
            <el-input
              v-model="searchText"
              placeholder="搜索内容..."
              :prefix-icon="Search"
              clearable
              style="width: 300px; margin-right: 10px;"
            />
            <el-button-group>
              <el-button @click="copyText" :icon="CopyDocument">
                复制文本
              </el-button>
              <el-button @click="clearText" :icon="Delete">
                清空
              </el-button>
            </el-button-group>
          </div>
          
          <div class="text-content">
            <pre ref="textContent" class="text-display">{{ highlightedText }}</pre>
          </div>
        </div>
        
        <div v-else-if="extractionError" class="extraction-error">
          <el-alert
            :title="extractionError"
            type="error"
            show-icon
            :closable="false"
          />
          <div class="error-actions">
            <el-button type="primary" @click="extractText">
              重试提取
            </el-button>

          </div>
        </div>
        
        <div v-else class="no-extraction">
          <el-empty>
            <template #description>
              <p>点击"智能提取"按钮开始分析合同内容</p>
              <p class="hint-text">支持PDF、Word、TXT等格式的文本提取</p>
            </template>
          </el-empty>
        </div>
      </el-card>

      <!-- 智能分析结果 -->
      <el-card v-if="extractedText" class="analysis-card">
        <template #header>
          <span>智能分析</span>
        </template>
        
        <div class="analysis-content">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="analysis-item">
                <div class="analysis-icon">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="analysis-info">
                  <h3>{{ wordCount }}</h3>
                  <p>总字数</p>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="analysis-item">
                <div class="analysis-icon">
                  <el-icon><Collection /></el-icon>
                </div>
                <div class="analysis-info">
                  <h3>{{ paragraphCount }}</h3>
                  <p>段落数</p>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="analysis-item">
                <div class="analysis-icon">
                  <el-icon><Timer /></el-icon>
                </div>
                <div class="analysis-info">
                  <h3>{{ readingTime }}</h3>
                  <p>阅读时间(分钟)</p>
                </div>
              </div>
            </el-col>
          </el-row>
          
          <div class="key-info">
            <h4>关键信息识别</h4>
            <el-tag 
              v-for="info in keyInformation" 
              :key="info" 
              type="info" 
              size="small"
              style="margin: 5px;"
            >
              {{ info }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Document, Download, Refresh, 
  Search, CopyDocument, Delete, Collection, Timer, MagicStick 
} from '@element-plus/icons-vue';
import { supabase } from "@/utils/supabase";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const extracting = ref(false);
const currentFile = ref<any>(null);
const extractedText = ref('');
const extractionError = ref('');
const searchText = ref('');
const fromCache = ref(false);

const contractId = route.query.contract_id as string;

// 计算属性
const extractionStatus = computed(() => {
  if (extracting.value) return { type: 'warning', text: '提取中...' };
  if (extractionError.value) return { type: 'danger', text: '提取失败' };
  if (extractedText.value) return { type: 'success', text: fromCache.value ? '已加载(缓存)' : '已提取' };
  return { type: 'info', text: '未提取' };
});

const wordCount = computed(() => {
  if (!extractedText.value) return 0;
  return extractedText.value.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(Boolean).length;
});

const paragraphCount = computed(() => {
  if (!extractedText.value) return 0;
  return extractedText.value.split(/\n\s*\n/).filter(p => p.trim()).length;
});

const readingTime = computed(() => {
  const wordsPerMinute = 200; // 平均阅读速度
  return Math.ceil(wordCount.value / wordsPerMinute);
});

const highlightedText = computed(() => {
  if (!searchText.value || !extractedText.value) return extractedText.value;
  
  const regex = new RegExp(`(${searchText.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return extractedText.value.replace(regex, '<mark>$1</mark>');
});

const keyInformation = computed(() => {
  if (!extractedText.value) return [];
  
  const keywords = [
    '甲方', '乙方', '合同金额', '付款', '期限', '违约责任',
    '保密', '知识产权', '争议解决', '签署日期'
  ];
  
  return keywords.filter(keyword => 
    extractedText.value.includes(keyword)
  );
});

// 方法
const goBack = () => {
  router.back();
};

const loadContractDetail = async () => {
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

    if (error) throw error;
    if (!contract) throw new Error('合同不存在');

    currentFile.value = {
      filename: contract.filename,
      fileType: contract.file_type,
      fileSize: contract.file_size,
      filePath: contract.file_path,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at
    };
    
  } catch (error: any) {
    console.error('加载合同详情失败:', error);
    ElMessage.error(error.message || '加载合同详情失败');
  } finally {
    loading.value = false;
  }
};

const extractText = async () => {
  if (!contractId) {
    ElMessage.error('缺少合同ID');
    return;
  }

  extracting.value = true;
  extractionError.value = '';
  
  try {
    ElMessage.info('正在获取AI智能分析结果...');
    
    // 1. 优先检查是否有AI分析结果
    const { data: analysisData, error: analysisError } = await supabase
      .from('contract_analysis')
      .select('*')
      .eq('contract_id', contractId)
      .single();

    if (analysisError && analysisError.code !== 'PGRST116') {
      // PGRST116 表示记录不存在，这是正常情况
      console.warn('AI分析查询失败:', analysisError.message);
    }

    if (analysisData && analysisData.analysis_result) {
      // 使用AI分析结果的结构化数据
      const analysisResult = analysisData.analysis_result;
      
      // 构建智能提取的文本内容
      extractedText.value = buildExtractedText(analysisResult);
      
      ElMessage.success('AI智能分析结果提取完成');
    } else {
      // 如果没有AI分析结果，使用传统文本提取
      ElMessage.info('AI分析结果未就绪，使用传统文本提取...');
      
      if (!currentFile.value?.filePath) {
        throw new Error('文件路径不存在');
      }
      
      // 调用后端API进行文件内容提取
      try {
        const token = localStorage.getItem('token') || authStore.user?.access_token || '';
        const headers: any = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else if (authStore.user?.id) {
          // 备用方案：传递用户ID
          headers['X-User-ID'] = authStore.user.id;
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/extract/text/${contractId}`, {
          method: 'POST',
          headers,
          // credentials: 'include' // 移除凭据模式，避免CORS错误
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.data?.extractedText) {
          extractedText.value = result.data.extractedText;
          fromCache.value = result.data.fromCache || false;
          
          if (fromCache.value) {
            ElMessage.success(result.message || '已加载缓存的文本内容');
          } else {
            ElMessage.success('合同内容提取完成');
          }
        } else {
          throw new Error(result.message || '提取结果为空');
        }
      } catch (apiError: any) {
        console.error('API调用失败:', apiError);
        // 如果API调用失败，使用前端备用方法
        ElMessage.warning('后端提取失败，尝试使用前端提取...');
        await extractWithFallbackMethod();
      }
    }
    
  } catch (error: any) {
    console.error('提取失败:', error);
    extractionError.value = error.message || '提取失败，请稍后重试';
    
    // 如果前端备用方法也失败，显示友好的错误信息
    if (error.message.includes('无法') || error.message.includes('失败')) {
      ElMessage.error(`文件提取失败: ${error.message}`);
    } else {
      ElMessage.error('提取过程中发生未知错误');
    }
  } finally {
    extracting.value = false;
  }
};

// 构建基于AI分析结果的智能提取文本
const buildExtractedText = (analysisResult: any) => {
  let extractedText = '';
  
  // 1. 添加总体分析摘要
  if (analysisResult.summary) {
    extractedText += `=== 合同分析摘要 ===\n${analysisResult.summary}\n\n`;
  }
  
  // 2. 添加风险等级信息
  if (analysisResult.risk_level) {
    extractedText += `风险等级: ${analysisResult.risk_level}\n`;
  }
  if (analysisResult.risk_score) {
    extractedText += `风险评分: ${analysisResult.risk_score}\n\n`;
  }
  
  // 3. 添加主要风险点
  if (analysisResult.major_risks && analysisResult.major_risks.length > 0) {
    extractedText += `=== 主要风险点 (${analysisResult.major_risks.length}个) ===\n`;
    analysisResult.major_risks.forEach((risk: any, index: number) => {
      extractedText += `${index + 1}. [${risk.severity || '中等'}] ${risk.description || '风险点'}\n`;
      if (risk.suggestion) {
        extractedText += `   建议: ${risk.suggestion}\n`;
      }
      extractedText += `\n`;
    });
  }
  
  // 4. 添加关键条款信息
  if (analysisResult.key_terms) {
    extractedText += `=== 关键条款提取 ===\n`;
    Object.entries(analysisResult.key_terms).forEach(([key, value]) => {
      const clauseName = getClauseName(key);
      extractedText += `${clauseName}: ${value}\n`;
    });
    extractedText += `\n`;
  }
  
  // 5. 添加缺失条款
  if (analysisResult.missing_clauses && analysisResult.missing_clauses.length > 0) {
    extractedText += `=== 建议补充的条款 (${analysisResult.missing_clauses.length}个) ===\n`;
    analysisResult.missing_clauses.forEach((clause: string, index: number) => {
      extractedText += `${index + 1}. ${clause}\n`;
    });
    extractedText += `\n`;
  }
  
  // 6. 添加合规性问题
  if (analysisResult.compliance_issues && analysisResult.compliance_issues.length > 0) {
    extractedText += `=== 合规性问题 (${analysisResult.compliance_issues.length}个) ===\n`;
    analysisResult.compliance_issues.forEach((issue: any, index: number) => {
      extractedText += `${index + 1}. ${issue.issue || '合规问题'}\n`;
      if (issue.suggestion) {
        extractedText += `   建议: ${issue.suggestion}\n`;
      }
      extractedText += `\n`;
    });
  }
  
  return extractedText;
};

// 条款名称映射
const getClauseName = (key: string) => {
  const clauseMap: { [key: string]: string } = {
    parties: '合同主体',
    amount: '合同金额', 
    duration: '合同期限',
    payment_terms: '付款条款',
    termination: '终止条款',
    effective_date: '生效日期',
    expiration_date: '到期日期',
    sign_date: '签署日期'
  };
  return clauseMap[key] || key;
};

// 备用方法：当后端API不可用时使用前端提取
const extractWithFallbackMethod = async () => {
  try {
    console.log('开始备用文件提取方法...');
    
    if (!currentFile.value?.filePath) {
      throw new Error('文件路径为空，无法提取内容');
    }

    // 首先尝试从Supabase存储中下载文件
    const { data, error } = await supabase.storage
      .from('contracts')
      .download(currentFile.value.filePath);

    if (error) {
      console.error('Supabase存储下载失败:', error);
      throw new Error(`文件下载失败: ${error.message}。请检查文件是否存在或权限是否正确。`);
    }
    
    if (!data) {
      throw new Error('下载的文件内容为空');
    }

    console.log('文件下载成功，大小:', data.size, '字节');
    
    // 根据文件类型处理
    const fileType = currentFile.value.fileType.toLowerCase();
    const fileName = currentFile.value.filename.toLowerCase();
    
    if (fileType.endsWith('.pdf') || fileName.endsWith('.pdf')) {
      await extractPdfTextWithFallback(data);
    } else if (fileType.endsWith('.txt') || fileType.endsWith('.md') || 
               fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      await extractTextFile(data);
    } else if (fileType.endsWith('.doc') || fileType.endsWith('.docx') ||
               fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      await extractWordDocument(data);
    } else {
      // 尝试从二进制数据中提取文本
      await extractFromBinary(data);
    }
    
    ElMessage.success('合同内容提取完成（备用方法）');
  } catch (error: any) {
    console.error('备用提取失败:', error);
    
    // 提供更友好的错误信息
    let errorMessage = error.message || '提取失败';
    
    if (error.message.includes('storage')) {
      errorMessage = '文件存储访问失败，请检查文件是否正确上传';
    } else if (error.message.includes('权限')) {
      errorMessage = '文件访问权限不足，请联系管理员';
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败，请检查网络后重试';
    }
    
    extractionError.value = errorMessage;
    ElMessage.error(`备用提取失败: ${errorMessage}`);
  }
};

// 改进的PDF文本提取方法，包含多重备用方案
const extractPdfTextWithFallback = async (pdfBlob: Blob) => {
  console.log('开始提取PDF文本，文件大小:', pdfBlob.size);
  
  // 方法1: 使用PDF.js
  try {
    console.log('尝试方法1: 使用PDF.js库');
    const text = await extractWithPdfJs(pdfBlob);
    if (text && text.trim().length > 100) {
      extractedText.value = text;
      console.log('PDF.js提取成功，文本长度:', text.length);
      return;
    }
  } catch (error) {
    console.warn('PDF.js提取失败:', error);
  }
  
  // 方法2: 使用简单的二进制提取
  try {
    console.log('尝试方法2: 使用简单二进制提取');
    const text = await extractPdfTextSimple(pdfBlob);
    if (text && text.trim().length > 50) {
      extractedText.value = text;
      console.log('简单二进制提取成功，文本长度:', text.length);
      return;
    }
  } catch (error) {
    console.warn('简单二进制提取失败:', error);
  }
  
  // 方法3: 使用文本解码器
  try {
    console.log('尝试方法3: 使用文本解码器');
    const text = await extractWithTextDecoder(pdfBlob);
    if (text && text.trim().length > 0) {
      extractedText.value = text;
      console.log('文本解码器提取成功，文本长度:', text.length);
      return;
    }
  } catch (error) {
    console.warn('文本解码器提取失败:', error);
  }
  
  // 所有方法都失败，显示友好的错误信息
  throw new Error('无法从PDF文件中提取文本内容。该文件可能包含扫描图像或使用特殊编码。');
};

// 使用PDF.js提取文本（修复版本）
const extractWithPdfJs = async (pdfBlob: Blob): Promise<string> => {
  try {
    console.log('开始使用PDF.js提取文本...');
    
    // 检查PDF.js是否可用
    if (typeof window === 'undefined') {
      throw new Error('PDF.js只能在浏览器环境中使用');
    }
    
    // 动态导入PDF.js库
    const pdfjsLib = await import('pdfjs-dist');
    
    // 设置worker路径 - 使用本地安装的版本
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    // 检查文件大小
    if (arrayBuffer.byteLength === 0) {
      throw new Error('PDF文件为空');
    }
    
    console.log('PDF文件大小:', arrayBuffer.byteLength, '字节');
    
    // 加载PDF文档，使用更简单的配置
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // 禁用复杂的字体处理，简化配置
      disableFontFace: false,
      verbosity: 0 // 减少日志输出
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    console.log(`PDF文档共 ${numPages} 页`);
    
    if (numPages === 0) {
      throw new Error('PDF文档没有页面');
    }
    
    let fullText = '';
    let successPageCount = 0;
    
    // 逐页提取文本
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 提取文本内容
        const pageText = textContent.items
          .map((item: any) => {
            // 处理文本提取，确保中文字符正确处理
            return item.str || '';
          })
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText.length > 0) {
          fullText += pageText + '\n\n';
          successPageCount++;
        }
        
        console.log(`第 ${pageNum} 页提取文本长度:`, pageText.length);
        
        // 释放页面资源
        page.cleanup();
      } catch (pageError) {
        console.warn(`第 ${pageNum} 页提取失败:`, pageError);
        // 继续处理下一页
        continue;
      }
    }
    
    // 释放PDF文档资源
    pdf.destroy();
    
    const result = fullText.trim();
    console.log(`PDF.js提取完成，成功提取 ${successPageCount}/${numPages} 页，总文本长度:`, result.length);
    
    if (result.length === 0) {
      throw new Error('PDF.js未能提取到任何文本内容');
    }
    
    return result;
  } catch (error) {
    console.error('PDF.js提取失败:', error);
    throw new Error(`PDF.js提取失败: ${error.message}`);
  }
};

// 使用文本解码器提取
const extractWithTextDecoder = async (blob: Blob): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    
    // 尝试不同的编码
    const encodings = ['utf-8', 'gbk', 'gb2312', 'big5', 'latin1'];
    
    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding);
        const text = decoder.decode(arrayBuffer);
        
        // 检查是否包含可读文本
        const readableText = text
          .replace(/[^\x20-\x7E\n\r\t\u4e00-\u9fa5]/g, '')
          .trim();
        
        if (readableText.length > 100) {
          return readableText;
        }
      } catch (e) {
        // 继续尝试下一个编码
        continue;
      }
    }
    
    throw new Error('所有编码尝试都失败');
  } catch (error) {
    throw error;
  }
};



// 更可靠的PDF文本提取方法 - 专门处理二进制数据并确保可读性
const extractPdfTextSimple = async (pdfBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('PDF文件大小:', uint8Array.length, '字节');
        
        // 方法1: 尝试从PDF二进制数据中直接提取文本内容
        // PDF文件格式：查找文本对象 (BT ... ET) 之间的内容
        let text = '';
        
        // 将二进制数据转换为字符串以便搜索
        const binaryString = Array.from(uint8Array).map(byte => 
          String.fromCharCode(byte)).join('');
        
        // 查找PDF中的文本对象
        const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
        let match;
        
        while ((match = textObjectRegex.exec(binaryString)) !== null) {
          const textContent = match[1];
          
          // 提取文本操作符 Tj, TJ, " 等
          const textOperators = [
            /Tj\s*\(([^)]+)\)/g,    // (text) Tj
            /TJ\s*\[([^\]]+)\]/g,   // [text] TJ
            /"\s*\(([^)]+)\)/g,    // (text) "
            /'\s*\(([^)]+)\)/g     // (text) '
          ];
          
          for (const regex of textOperators) {
            let textMatch;
            while ((textMatch = regex.exec(textContent)) !== null) {
              const extractedText = textMatch[1];
              // 清理转义字符
              const cleanedText = extractedText
                .replace(/\\([\\()nrtbf])/g, (match, escape) => {
                  switch (escape) {
                    case 'n': return '\n';
                    case 'r': return '\r';
                    case 't': return '\t';
                    case 'b': return '\b';
                    case 'f': return '\f';
                    default: return escape;
                  }
                })
                .replace(/\\\n/g, '') // 移除行继续符
                .trim();
              
              if (cleanedText.length > 0) {
                text += cleanedText + ' ';
              }
            }
          }
        }
        
        // 如果通过PDF对象提取失败，尝试简单的二进制提取
        if (text.trim().length < 50) {
          console.log('PDF对象提取失败，尝试二进制提取');
          text = '';
          
          // 直接提取ASCII和UTF-8可打印字符
          for (let i = 0; i < uint8Array.length; i++) {
            const byte = uint8Array[i];
            
            // ASCII可打印字符 (32-126)
            if (byte >= 32 && byte <= 126) {
              text += String.fromCharCode(byte);
            }
            // 中文UTF-8编码 (3字节)
            else if (byte >= 0xE0 && byte <= 0xEF && i + 2 < uint8Array.length) {
              const nextByte1 = uint8Array[i + 1];
              const nextByte2 = uint8Array[i + 2];
              
              if (nextByte1 >= 0x80 && nextByte1 <= 0xBF && 
                  nextByte2 >= 0x80 && nextByte2 <= 0xBF) {
                try {
                  const decoder = new TextDecoder('utf-8');
                  const chineseChar = decoder.decode(new Uint8Array([byte, nextByte1, nextByte2]));
                  text += chineseChar;
                  i += 2; // 跳过后续两个字节
                } catch (e) {
                  // 忽略无效编码
                }
              }
            }
            // 换行和空格处理
            else if (byte === 10 || byte === 13) {
              text += '\n';
            } else if (byte === 9 || byte === 32) {
              text += ' ';
            }
          }
        }
        
        // 清理和格式化文本
        const cleanText = text
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 移除控制字符
          .replace(/\s+/g, ' ') // 压缩多余空格
          .replace(/\n{3,}/g, '\n\n') // 整理换行
          .replace(/^\s+|\s+$/g, '') // 去除首尾空白
          .trim();
        
        console.log('PDF二进制提取结果，长度:', cleanText.length);
        
        if (cleanText.length < 10) {
          reject(new Error('PDF文件中未找到可读文本内容'));
          return;
        }
        
        // 检查文本质量
        if (!isTextQualityGood(cleanText)) {
          reject(new Error('提取的PDF文本质量较低，可能包含大量乱码'));
          return;
        }
        
        resolve(cleanText);
        
      } catch (error: any) {
        console.error('PDF简单提取错误:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('PDF文件读取失败'));
    };
    
    reader.readAsArrayBuffer(pdfBlob);
  });
};

// 辅助函数：从解码文本中提取可读内容
const extractReadableText = (text: string): string => {
  // 提取包含中文、英文、数字、空格和基本标点的内容
  const readablePattern = /[\u4e00-\u9fa5a-zA-Z0-9\s，。！？；："'《》【】（）“”‘’.,!?;:()\[\]{}]/g;
  const matches = text.match(readablePattern) || [];
  
  // 将匹配的内容连接起来
  let result = matches.join('');
  
  // 清理文本格式
  result = result
    .replace(/\s+/g, ' ') // 压缩多余空格
    .replace(/\n{3,}/g, '\n\n') // 整理换行
    .replace(/^\s+|\s+$/g, '') // 去除首尾空白
    .trim();
  
  return result;
};

// 辅助函数：检查文本质量
const isTextQualityGood = (text: string): boolean => {
  if (text.length < 10) return false;
  
  const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
  const digitCount = (text.match(/[0-9]/g) || []).length;
  const spaceCount = (text.match(/\s/g) || []).length;
  
  const totalMeaningfulChars = chineseCount + englishCount + digitCount + spaceCount;
  const qualityRatio = totalMeaningfulChars / text.length;
  
  console.log('文本质量检查 - 中文:', chineseCount, '英文:', englishCount, 
              '数字:', digitCount, '空格:', spaceCount, '质量比例:', qualityRatio.toFixed(2));
  
  // 如果有足够的中文或英文内容，或者整体质量比例较高
  return (chineseCount > 10 || englishCount > 20) && qualityRatio > 0.4;
};

const extractTextFile = async (textBlob: Blob) => {
  try {
    const text = await textBlob.text();
    if (text.trim().length === 0) {
      throw new Error('文本文件内容为空');
    }
    extractedText.value = text;
  } catch (error: any) {
    throw new Error(`文本文件读取失败: ${error.message}`);
  }
};

const extractWordDocument = async (wordBlob: Blob) => {
  try {
    console.log('开始处理Word文档，文件大小:', wordBlob.size);
    
    // 检查文件扩展名
    const fileName = currentFile.value?.filename || '';
    const isDocx = fileName.toLowerCase().endsWith('.docx');
    const isDoc = fileName.toLowerCase().endsWith('.doc');
    
    // 方法1: 对于DOCX文件，尝试使用mammoth.js库解析
    if (isDocx) {
      try {
        console.log('检测到DOCX文件，尝试使用mammoth.js解析');
        
        // 动态导入mammoth库
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        
        const arrayBuffer = await wordBlob.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result.value && result.value.trim().length > 10) {
          extractedText.value = result.value.trim();
          console.log('mammoth.js解析成功，文本长度:', result.value.length);
          return;
        } else {
          console.warn('mammoth.js解析结果为空或太短，尝试备用方法');
        }
      } catch (mammothError: any) {
        console.warn('mammoth.js解析失败:', mammothError.message);
        console.log('继续使用二进制提取方法');
      }
    } else if (isDoc) {
      console.log('检测到DOC文件，跳过mammoth.js，直接使用二进制提取');
    }
    
    // 方法2: 对于DOC文件或mammoth解析失败的情况，使用二进制提取
    console.log('使用二进制方法提取Word文档内容');
    await extractFromBinary(wordBlob);
    
  } catch (error: any) {
    console.error('Word文档提取失败:', error);
    throw new Error(`Word文档处理失败: ${error.message}`);
  }
};

const extractFromBinary = async (blob: Blob) => {
  try {
    console.log('开始二进制提取，文件大小:', blob.size);
    
    // 尝试从二进制数据中提取文本
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let text = '';
    
    // 方法1: 尝试UTF-8解码
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      text = decoder.decode(uint8Array);
      console.log('UTF-8解码成功，文本长度:', text.length);
    } catch (utf8Error) {
      console.warn('UTF-8解码失败:', utf8Error);
    }
    
    // 方法2: 如果UTF-8解码失败，尝试GBK解码（处理中文Word文档）
    if (text.length < 50) {
      try {
        // 使用简化的GBK解码逻辑
        text = '';
        for (let i = 0; i < uint8Array.length; i++) {
          const byte = uint8Array[i];
          
          // ASCII字符
          if (byte >= 32 && byte <= 126) {
            text += String.fromCharCode(byte);
          }
          // GBK双字节字符（简体中文）
          else if (byte >= 0x81 && byte <= 0xFE && i + 1 < uint8Array.length) {
            const nextByte = uint8Array[i + 1];
            if (nextByte >= 0x40 && nextByte <= 0xFE) {
              // 简化的GBK转Unicode（仅处理常见字符）
              const gbCode = (byte << 8) | nextByte;
              // 这里使用简单的映射，实际应用中需要完整的GBK码表
              if (gbCode >= 0xB0A1 && gbCode <= 0xF7FE) {
                // 假设是中文字符，使用占位符
                text += '中';
                i++; // 跳过下一个字节
              } else {
                i++; // 跳过下一个字节
              }
            }
          }
          // 换行和空格处理
          else if (byte === 10 || byte === 13) {
            text += '\n';
          } else if (byte === 9 || byte === 32) {
            text += ' ';
          }
        }
        console.log('GBK处理完成，文本长度:', text.length);
      } catch (gbkError) {
        console.warn('GBK处理失败:', gbkError);
      }
    }
    
    // 方法3: 最后的通用二进制提取
    if (text.length < 50) {
      console.log('尝试通用二进制提取');
      text = '';
      
      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];
        
        // 提取可打印字符
        if (byte >= 32 && byte <= 126) {
          text += String.fromCharCode(byte);
        }
        // 尝试提取UTF-8中文
        else if (byte >= 0xE0 && byte <= 0xEF && i + 2 < uint8Array.length) {
          const nextByte1 = uint8Array[i + 1];
          const nextByte2 = uint8Array[i + 2];
          
          if (nextByte1 >= 0x80 && nextByte1 <= 0xBF && 
              nextByte2 >= 0x80 && nextByte2 <= 0xBF) {
            try {
              const decoder = new TextDecoder('utf-8');
              const chineseChar = decoder.decode(new Uint8Array([byte, nextByte1, nextByte2]));
              if (/[\u4e00-\u9fa5]/.test(chineseChar)) {
                text += chineseChar;
              }
              i += 2; // 跳过后续两个字节
            } catch (e) {
              // 忽略无效编码
            }
          }
        }
        // 换行和空格
        else if (byte === 10 || byte === 13) {
          text += '\n';
        } else if (byte === 9 || byte === 32) {
          text += ' ';
        }
      }
      console.log('通用二进制提取完成，文本长度:', text.length);
    }
    
    // 清理文本
    const cleanText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 移除控制字符
      .replace(/\s+/g, ' ') // 压缩多余空格
      .replace(/\n{3,}/g, '\n\n') // 整理换行
      .trim();
    
    console.log('清理后文本长度:', cleanText.length);
    
    if (cleanText.length > 10) {
      extractedText.value = cleanText;
    } else {
      // 如果无法提取有效文本，显示文件信息和提示
      const fileType = currentFile.value.fileType;
      const isWordDoc = fileType.toLowerCase().includes('doc');
      
      extractedText.value = `
文件名称：${currentFile.value.filename}
文件格式：${currentFile.value.fileType}
文件大小：${formatFileSize(currentFile.value.fileSize)}

${isWordDoc ? 
`该Word文档可能包含特殊格式或二进制内容，无法直接提取文本。

建议：
1. 确保文档包含可编辑的文本内容
2. 检查文档是否为扫描件或图片格式
3. 尝试将文档另存为纯文本格式后重新上传` :
`该文件格式暂不支持自动文本提取，建议使用支持的文件格式（如PDF、TXT等）。`}

如需查看文件内容，请重新上传支持的文件格式。

支持的文件格式：
- PDF文档 (.pdf) - 支持智能文本提取
- Word文档 (.doc, .docx) - 支持智能文本提取  
- 文本文件 (.txt, .md) - 完全支持
      `.trim();
    }
    
  } catch (error: any) {
    console.error('二进制提取失败:', error);
    throw new Error(`文件内容提取失败: ${error.message}`);
  }
};

const downloadText = async () => {
  if (!extractedText.value) {
    ElMessage.warning('没有可下载的文本内容');
    return;
  }

  try {
    const blob = new Blob([extractedText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFile.value.filename.replace(/\.[^/.]+$/, '')}_提取内容.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    ElMessage.success('文本下载成功');
  } catch (error: any) {
    ElMessage.error('下载失败');
  }
};

const copyText = async () => {
  if (!extractedText.value) {
    ElMessage.warning('没有可复制的文本内容');
    return;
  }

  try {
    await navigator.clipboard.writeText(extractedText.value);
    ElMessage.success('文本已复制到剪贴板');
  } catch (error) {
    // 兼容性处理
    const textArea = document.createElement('textarea');
    textArea.value = extractedText.value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    ElMessage.success('文本已复制到剪贴板');
  }
};

const clearText = () => {
  ElMessageBox.confirm('确定要清空提取的文本内容吗？', '确认清空', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    extractedText.value = '';
    searchText.value = '';
    ElMessage.success('文本内容已清空');
  });
};

const refreshViewer = () => {
  extractedText.value = '';
  extractionError.value = '';
  searchText.value = '';
  fromCache.value = false;
  loadContractDetail();
};

const forceReExtract = async () => {
  try {
    await ElMessageBox.confirm(
      '强制重新提取将忽略缓存，重新从源文件提取内容，确定要继续吗？',
      '确认强制重新提取',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 清除缓存状态
    fromCache.value = false;
    extractedText.value = '';
    extractionError.value = '';
    
    // 调用带force参数的API
    await forceExtractWithCache();
    
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`强制重新提取失败: ${error.message}`);
    }
  }
};

const forceExtractWithCache = async () => {
  if (!contractId) {
    ElMessage.error('缺少合同ID');
    return;
  }

  extracting.value = true;
  extractionError.value = '';
  fromCache.value = false;
  
  try {
    ElMessage.info('正在强制重新提取合同内容...');
    
    if (!currentFile.value?.filePath) {
      throw new Error('文件路径不存在');
    }
    
    // 调用后端API进行强制重新提取
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/extract/text/${contractId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('token') || ''
      },
      body: JSON.stringify({ force: true }),
      // credentials: 'include' // 移除凭据模式，避免CORS错误
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.data?.extractedText) {
      extractedText.value = result.data.extractedText;
      fromCache.value = false; // 强制提取肯定是新的
      ElMessage.success('合同内容强制重新提取完成');
    } else {
      throw new Error(result.message || '提取结果为空');
    }
    
  } catch (error: any) {
    console.error('强制重新提取失败:', error);
    extractionError.value = error.message || '强制重新提取失败，请稍后重试';
    ElMessage.error(`强制重新提取失败: ${error.message}`);
  } finally {
    extracting.value = false;
  }
};



const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: string | Date): string => {
  if (!date) return '未知';
  return new Date(date).toLocaleString('zh-CN');
};

// 生命周期
onMounted(() => {
  loadContractDetail();
});

// 监听搜索文本变化
watch(searchText, () => {
  if (searchText.value && extractedText.value) {
    // 高亮搜索文本
    const textContent = document.querySelector('.text-display');
    if (textContent) {
      textContent.innerHTML = highlightedText.value;
    }
  }
});
</script>

<style scoped>
.text-extract-viewer {
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

.extraction-result-card {
  margin-bottom: 20px;
}

.text-count {
  float: right;
  color: #909399;
  font-size: 14px;
}

.extracted-text {
  min-height: 400px;
}

.text-controls {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.text-content {
  max-height: 500px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  border: 1px solid #e4e7ed;
}

.text-display {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  line-height: 1.6;
  font-size: 14px;
  color: #333;
}

.text-display mark {
  background-color: #ffeb3b;
  padding: 2px 4px;
  border-radius: 2px;
}

.extraction-error,
.no-extraction {
  text-align: center;
  padding: 40px 0;
}

.error-actions {
  margin-top: 20px;
}

.hint-text {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
}

.analysis-card {
  margin-bottom: 20px;
}

.analysis-content {
  padding: 10px 0;
}

.analysis-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 6px;
}

.analysis-icon {
  margin-right: 15px;
  font-size: 24px;
  color: #409eff;
}

.analysis-info h3 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.analysis-info p {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.key-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.key-info h4 {
  margin-bottom: 10px;
  color: #303133;
}

@media (max-width: 768px) {
  .text-extract-viewer {
    padding: 10px;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .text-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .text-content {
    max-height: 300px;
  }
}
</style>