<template>
  <div class="pdf-viewer-container">
    <!-- 工具栏 -->
    <div class="pdf-toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button
            :disabled="currentPage <= 1"
            size="small"
            :icon="ArrowLeft"
            @click="prevPage"
          >
            上一页
          </el-button>
          <el-button
            :disabled="currentPage >= totalPages"
            size="small"
            :icon="ArrowRight"
            @click="nextPage"
          >
            下一页
          </el-button>
        </el-button-group>

        <span class="page-info">
          第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
        </span>

        <el-input-number
          v-if="totalPages > 0"
          v-model="jumpPage"
          :min="1"
          :max="totalPages"
          size="small"
          style="width: 80px; margin-left: 10px"
          @change="jumpToPage"
        />
      </div>

      <div class="toolbar-right">
        <el-button-group>
          <el-button
            size="small"
            :icon="Minus"
            :disabled="scale <= 0.5"
            @click="zoomOut"
          >
            缩小
          </el-button>
          <el-button
            size="small"
            :icon="Plus"
            :disabled="scale >= 3"
            @click="zoomIn"
          >
            放大
          </el-button>
          <el-button size="small" :icon="Refresh" @click="resetZoom">
            重置
          </el-button>
        </el-button-group>

        <el-button
          type="primary"
          size="small"
          :icon="Download"
          style="margin-left: 10px"
          @click="downloadFile"
        >
          下载文件
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="pdf-loading">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>正在加载PDF文档...</span>
    </div>

    <!-- PDF显示区域 -->
    <div v-show="!loading" class="pdf-content">
      <div class="pdf-canvas-container">
        <canvas
          ref="canvasRef"
          class="pdf-canvas"
          :style="{ transform: `scale(${scale})` }"
        />
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="pdf-error">
      <el-alert
        title="PDF加载失败"
        :description="error"
        type="error"
        show-icon
        closable
        @close="error = ''"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Refresh,
  Download,
  Loading,
} from "@element-plus/icons-vue";
import { supabase } from "@/utils/supabase";

// PDF.js 导入
import * as pdfjsLib from "pdfjs-dist";

// 配置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Props {
  fileUrl?: string;
  fileBlob?: Blob;
  fileName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  fileName: "document.pdf",
});

const emit = defineEmits<{
  loaded: [pageCount: number];
  error: [message: string];
}>();

// 响应式数据
const loading = ref(false);
const error = ref("");
const currentPage = ref(1);
const totalPages = ref(0);
const scale = ref(1.0);
const jumpPage = ref(1);

// DOM引用
const canvasRef = ref<HTMLCanvasElement>();

// PDF实例
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

// 构建文件URL的辅助函数
const buildFileUrl = (baseUrl: string): string[] => {
  const urls: string[] = [];

  // 尝试添加API基础URL前缀（如果环境变量存在）
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  // 规范化URL - 移除重复的斜杠
  const normalizeUrl = (url: string): string => {
    return url.replace(/\/\+/g, "/").replace(/^\/|\/$/g, "");
  };

  // 基础URL处理
  let cleanBaseUrl = normalizeUrl(baseUrl);

  // 如果URL已经包含完整域名，直接添加
  if (
    cleanBaseUrl.startsWith("http://") ||
    cleanBaseUrl.startsWith("https://")
  ) {
    urls.push(cleanBaseUrl);
  } else {
    // 尝试多种URL构建策略
    // 1. 直接API路径
    if (cleanBaseUrl.startsWith("api/")) {
      urls.push(
        `${normalizeUrl(apiBaseUrl).replace("api", "")}/${cleanBaseUrl}`,
      );
    } else if (!cleanBaseUrl.startsWith("uploads/")) {
      // 2. 添加API前缀
      urls.push(`${apiBaseUrl}/${cleanBaseUrl}`);
    }

    // 3. 直接uploads路径
    if (!cleanBaseUrl.startsWith("uploads/")) {
      urls.push(`${apiBaseUrl}/uploads/${cleanBaseUrl}`);
    } else {
      urls.push(`${apiBaseUrl}/${cleanBaseUrl}`);
    }

    // 检查是否是Supabase存储路径
    if (cleanBaseUrl.startsWith("contracts/")) {
      // Supabase存储路径，生成公共URL
      try {
        const { data } = supabase.storage
          .from("contracts")
          .getPublicUrl(cleanBaseUrl);
        if (data.publicUrl) {
          urls.push(data.publicUrl);
        }
      } catch (error) {
        console.warn('Supabase URL生成失败:', error);
      }
    }
    
    // 4. 可能的本地开发路径
    urls.push(`http://localhost:5000/${cleanBaseUrl}`);
  }

  // 去重并返回
  return Array.from(new Set(urls));
};

// 带重试机制的fetch函数
const fetchWithRetry = async (
  url: string,
  retries = 2,
  delay = 1000,
): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    try {
      // 检查是否为Supabase存储URL，如果是则使用后端代理
      if (url.includes('supabase.co/storage/v1/object/public/')) {
        // 使用后端API代理下载PDF文件，避免CORS问题
        const filePath = url.split('public/')[1];
        const proxyUrl = `/api/storage/download/${encodeURIComponent(filePath)}`;
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/pdf",
            "Cache-Control": "no-cache",
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          credentials: "same-origin", // 同源请求
        });

        clearTimeout(timeoutId);
        return response;
      } else {
        // 其他URL使用常规请求
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/pdf",
            "Cache-Control": "no-cache",
          },
          credentials: "same-origin", // 同源请求
        });

        clearTimeout(timeoutId);
        return response;
      }

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error: any) {
    if (retries > 0 && error.name !== "AbortError") {
      console.warn(
        `尝试 ${url} 失败，剩余重试次数: ${retries}，${delay}ms 后重试...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 2); // 指数退避
    }
    throw error;
  }
};

// 加载PDF文档
const loadPdf = async () => {
  console.log("====== PDF加载开始 ======");
  console.log("文件URL:", props.fileUrl);
  console.log("是否有Blob文件:", !!props.fileBlob);

  if (!props.fileUrl && !props.fileBlob) {
    console.log("未提供PDF文件");
    error.value = "未提供PDF文件";
    emit("error", "未提供PDF文件");
    return;
  }

  // 检查文件格式，只允许PDF文件
  if (props.fileUrl) {
    const fileExtension = props.fileUrl
      .toLowerCase()
      .substring(props.fileUrl.lastIndexOf("."));
    if (fileExtension !== ".pdf") {
      const errorMessage = `不支持的文件格式: ${fileExtension}，仅支持PDF格式预览`;
      console.log(errorMessage);
      error.value = `不支持预览${fileExtension}格式文件，请上传PDF格式的合同文档`;
      emit(
        "error",
        `不支持预览${fileExtension}格式文件，请上传PDF格式的合同文档`,
      );
      return;
    }
  }

  loading.value = true;
  error.value = "";

  try {
    let pdfData: ArrayBuffer;

    if (props.fileBlob) {
      console.log("从Blob加载PDF...");
      // 从Blob加载
      try {
        pdfData = await props.fileBlob.arrayBuffer();
        console.log("Blob数据加载完成，大小:", pdfData.byteLength, "字节");
      } catch (blobError: any) {
        throw new Error(`Blob解析失败: ${blobError.message}`);
      }
    } else if (props.fileUrl) {
      console.log("从URL加载PDF...");
      // 生成多种可能的URL
      const possibleUrls = buildFileUrl(props.fileUrl);
      console.log("尝试的URL列表:", possibleUrls);

      let lastError: Error | null = null;

      // 尝试所有可能的URL
      for (const url of possibleUrls) {
        try {
          console.log(`尝试URL: ${url}`);
          const response = await fetchWithRetry(url);

          console.log("Fetch响应状态:", response.status);
          console.log("响应URL:", response.url);
          console.log(
            "响应头Content-Type:",
            response.headers.get("Content-Type"),
          );

          if (response.ok) {
            // 检查内容类型
            const contentType = response.headers.get("Content-Type");
            if (contentType && !contentType.includes("pdf")) {
              console.warn("返回的内容类型不是PDF:", contentType);
              // 继续尝试处理，可能是没有正确设置Content-Type的情况
            }

            pdfData = await response.arrayBuffer();
            console.log("URL数据加载完成，大小:", pdfData.byteLength, "字节");
            // 成功获取数据，跳出循环
            break;
          } else {
            lastError = new Error(
              `HTTP错误! 状态码: ${response.status}, 状态文本: ${response.statusText}`,
            );
            console.error(`URL ${url} 加载失败:`, lastError.message);
            // 继续尝试下一个URL
            continue;
          }
        } catch (fetchError: any) {
          lastError = fetchError;
          console.error(`尝试URL ${url} 时发生错误:`, fetchError);
          // 继续尝试下一个URL
          continue;
        }
      }

      // 如果所有URL都尝试失败，抛出最后一个错误
      if (!pdfData && lastError) {
        throw lastError;
      }
    } else {
      throw new Error("无效的文件源");
    }

    // 加载PDF文档
    console.log("开始使用PDF.js解析文档...");
    pdfDoc = await pdfjsLib.getDocument({
      data: pdfData,
      useWorkerFetch: false,
    }).promise;

    console.log("PDF解析成功，总页数:", pdfDoc.numPages);
    totalPages.value = pdfDoc.numPages;
    jumpPage.value = 1;
    currentPage.value = 1;

    emit("loaded", totalPages.value);

    // 渲染第一页
    console.log("渲染第一页...");
    await renderPage(1);
    console.log("第一页渲染完成");
  } catch (err: any) {
    console.error("PDF加载错误:", err);
    console.error("错误类型:", typeof err);
    console.error("错误名称:", err.name || "未知错误");
    console.error("错误堆栈:", err.stack || "无堆栈信息");
    console.error("错误对象:", err);

    // 提供更友好的错误消息
    let errorMessage = "PDF加载失败";
    if (err.message) {
      if (err.message.includes("HTTP") || err.message.includes("404")) {
        errorMessage = `文件访问失败: 文件不存在或权限不足。请检查文件路径或联系管理员。`;
      } else if (err.name === "AbortError") {
        errorMessage = "PDF加载超时，请检查网络连接或文件大小";
      } else if (err.message.includes("Blob")) {
        errorMessage = `文件解析错误: ${err.message}`;
      } else if (err.message.includes("fetch")) {
        errorMessage = `网络请求失败: 可能是服务器连接问题。请检查网络连接或稍后重试。`;
      } else {
        errorMessage = err.message;
      }
    }

    error.value = errorMessage;
    emit("error", errorMessage);
  } finally {
    loading.value = false;
    console.log("====== PDF加载过程结束 ======");
  }
};

// 渲染指定页面
const renderPage = async (pageNumber: number) => {
  if (!pdfDoc || !canvasRef.value) return;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const canvas = canvasRef.value;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // 获取PDF页面的视口
    const viewport = page.getViewport({ scale: scale.value });

    // 设置Canvas尺寸
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // 渲染PDF页面到Canvas
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
  } catch (err: any) {
    error.value = `页面渲染失败: ${err.message}`;
    console.error("页面渲染错误:", err);
  }
};

// 翻页功能
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    jumpPage.value = currentPage.value;
    renderPage(currentPage.value);
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    jumpPage.value = currentPage.value;
    renderPage(currentPage.value);
  }
};

const jumpToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    renderPage(page);
  }
};

// 缩放功能
const zoomIn = () => {
  if (scale.value < 3) {
    scale.value = Math.min(scale.value + 0.1, 3);
    renderPage(currentPage.value);
  }
};

const zoomOut = () => {
  if (scale.value > 0.5) {
    scale.value = Math.max(scale.value - 0.1, 0.5);
    renderPage(currentPage.value);
  }
};

const resetZoom = () => {
  scale.value = 1.0;
  renderPage(currentPage.value);
};

// 下载文件
const downloadFile = () => {
  if (!props.fileUrl && !props.fileBlob) {
    ElMessage.warning("无法下载文件：文件不存在");
    return;
  }

  try {
    let downloadUrl: string;

    if (props.fileBlob) {
      // 从Blob创建下载链接
      downloadUrl = URL.createObjectURL(props.fileBlob);
    } else if (props.fileUrl) {
      // 直接使用URL
      downloadUrl = props.fileUrl;
    } else {
      throw new Error("无效的文件源");
    }

    // 创建下载链接
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = props.fileName;
    link.target = "_blank";

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理Blob URL
    if (props.fileBlob) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    }

    ElMessage.success("文件下载开始");
  } catch (err: any) {
    ElMessage.error(`下载失败: ${err.message}`);
    console.error("下载错误:", err);
  }
};

// 监听文件变化
watch(
  () => props.fileUrl,
  (newUrl) => {
    if (newUrl) {
      loadPdf();
    }
  },
);

watch(
  () => props.fileBlob,
  (newBlob) => {
    if (newBlob) {
      loadPdf();
    }
  },
);

// 组件生命周期
onMounted(() => {
  if (props.fileUrl || props.fileBlob) {
    loadPdf();
  }
});

onUnmounted(() => {
  // 清理资源
  if (pdfDoc) {
    pdfDoc.destroy();
    pdfDoc = null;
  }
});

// 暴露方法给父组件
defineExpose({
  loadPdf,
  prevPage,
  nextPage,
  jumpToPage,
  zoomIn,
  zoomOut,
  resetZoom,
  downloadFile,
});
</script>

<style scoped>
.pdf-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #fff;
}

.pdf-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-info {
  font-size: 14px;
  color: #606266;
  margin: 0 10px;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.loading-icon {
  font-size: 32px;
  margin-bottom: 10px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pdf-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  overflow: auto;
  background: #f8f9fa;
}

.pdf-canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pdf-canvas {
  display: block;
  transform-origin: 0 0;
}

.pdf-error {
  padding: 15px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pdf-toolbar {
    flex-direction: column;
    gap: 10px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }

  .pdf-content {
    padding: 10px;
  }
}
</style>
