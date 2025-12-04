<template>
  <div class="contract-preview">
    <div class="preview-header">
      <el-page-header :content="fileName" @back="goBack">
        <template #content>
          <h2>{{ fileName }}</h2>
          <p>合同预览</p>
        </template>
      </el-page-header>

      <div class="header-actions">
        <el-button type="primary" :icon="Download" @click="downloadFile">
          下载文件
        </el-button>
        <el-button :icon="Printer" @click="printFile">打印</el-button>
      </div>
    </div>

    <div class="preview-content">
      <!-- 使用文本预览方式 -->
      <div v-if="fileUrl" class="text-container">
        <div v-if="loading" class="loading-container">
          <el-loading v-loading="loading" text="正在加载文件内容..." />
        </div>

        <template v-else>
          <div v-if="fileContent" class="text-content">
            <pre class="content-pre">{{ fileContent }}</pre>
          </div>

          <div v-else-if="errorMessage" class="error-container">
            <el-alert
              title="预览失败"
              type="error"
              :description="errorMessage"
              show-icon
            />
            <div class="error-actions">
              <el-button type="primary" @click="reloadContent">
                重试
              </el-button>
              <el-button @click="downloadFile"> 下载文件 </el-button>
            </div>
          </div>
        </template>
      </div>

      <div v-else class="empty-state">
        <el-empty description="未找到文件" />
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Download, Printer } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();

// 从URL参数获取文件信息
const fileUrl = ref("");
const fileName = ref("");
// 加载状态
const loading = ref(true);
// 错误信息
const errorMessage = ref("");
// 文件内容
const fileContent = ref("");

// 构建完整的文件URL
const getFileUrl = async (url: string): Promise<string> => {
  if (!url) return "";

  // 清理URL，移除可能的前后空格
  const cleanUrl = url.trim();

  // 如果已经是完整URL，直接返回
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }

  // 数据库中存储的是简单文件名，构建规范化的本地路径
  let normalizedPath = cleanUrl;

  // 移除开头的 ./ 或其他相对路径前缀
  normalizedPath = normalizedPath.replace(/^\.\//, "");

  // 规范化路径处理
  if (!normalizedPath.startsWith("/")) {
    // 如果路径已经包含uploads或contracts子串，添加前缀
    if (
      normalizedPath.includes("uploads/") ||
      normalizedPath.includes("contracts/")
    ) {
      normalizedPath = `/${normalizedPath}`;
    } else {
      // 对于简单文件名，添加标准路径前缀
      normalizedPath = `/uploads/contracts/${normalizedPath}`;
    }
  }

  // 使用代理配置的路径，确保能正确访问后端静态文件
  const localUrl = `${window.location.origin}${normalizedPath}`;
  console.log("构建的文件访问URL:", localUrl);
  return localUrl;
};

// 获取文件文本内容
const fetchFileContent = async () => {
  loading.value = true;
  errorMessage.value = "";
  fileContent.value = "";

  try {
    // 验证文件路径是否存在
    if (!fileUrl.value) {
      throw new Error("文件路径不存在");
    }

    // 保存原始文件名用于构建路径
    const originalFileName = fileUrl.value;
    console.log("原始文件名:", originalFileName);

    // 定义所有可能的文件访问路径（按优先级排序）
    const possiblePaths = [
      // 1. 直接使用getFileUrl生成的URL（规范化本地路径）
      await getFileUrl(originalFileName),
      // 2. 尝试API路径格式
      `${window.location.origin}/api/uploads/contracts/${originalFileName}`,
    ];

    // 尝试添加Supabase路径作为备选
    try {
      const { supabase } = await import("@/utils/supabase");
      const { data } = supabase.storage
        .from("contracts")
        .getPublicUrl(originalFileName);
      if (data?.publicUrl) {
        possiblePaths.push(data.publicUrl);
      }
    } catch (error) {
      console.warn("Supabase路径生成失败，跳过:", error);
    }

    // 去重路径列表
    const uniquePaths = Array.from(new Set(possiblePaths)).filter(
      (path) => path,
    );
    console.log("尝试的路径列表:", uniquePaths);

    // 依次尝试所有可能的路径
    for (let i = 0; i < uniquePaths.length; i++) {
      const currentUrl = uniquePaths[i];
      console.log(`尝试路径 ${i + 1}/${uniquePaths.length}:`, currentUrl);

      try {
        const response = await fetch(currentUrl, {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
          signal: AbortSignal.timeout(8000), // 减少超时时间为8秒，更合理的响应速度
        });

        if (response.ok) {
          // 根据内容类型处理不同文件
          const contentType = response.headers.get("content-type") || "";
          const contentLength = response.headers.get("content-length") || "0";

          // 尝试以文本形式读取内容
          try {
            const content = await response.text();

            // 改进二进制文件检测逻辑
            const isBinary =
              contentType.includes("pdf") ||
              contentType.includes("image") ||
              contentType.includes("application/octet-stream") ||
              parseInt(contentLength) > 100000 ||
              /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content.substring(0, 200)) ||
              originalFileName
                .toLowerCase()
                .match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/);

            if (isBinary) {
              console.log(
                `路径 ${i + 1} 成功，但文件可能是二进制格式，类型: ${contentType}`,
              );
              fileContent.value = `文件内容已加载，但无法以文本形式显示（可能是二进制文件）。文件名: ${fileName.value}`;
            } else {
              fileContent.value = content;
              console.log(`路径 ${i + 1} 成功，文件内容长度:`, content.length);
            }
            return; // 成功获取内容，直接返回
          } catch (readError) {
            console.error(`读取文件内容失败:`, readError);
            // 即使内容读取失败，至少文件存在，提示用户下载
            fileContent.value = `文件已找到，但无法读取内容。请尝试下载文件。文件名: ${fileName.value}`;
            return;
          }
        } else {
          const statusText = response.statusText || `状态码 ${response.status}`;
          console.warn(
            `路径 ${i + 1} 失败，HTTP状态码:`,
            response.status,
            statusText,
          );
          // 继续尝试下一个路径
          continue;
        }
      } catch (pathError) {
        // 分类错误类型
        let errorMsg = "";
        if (pathError instanceof Error) {
          if (pathError.name === "AbortError") {
            errorMsg = `超时（8秒）`;
          } else if (
            pathError.message.includes("Network") ||
            pathError.message.includes("fetch")
          ) {
            errorMsg = `网络错误: ${pathError.message}`;
          } else if (pathError.message.includes("URL")) {
            errorMsg = `URL格式错误: ${pathError.message}`;
          } else {
            errorMsg = pathError.message;
          }
        }
        console.warn(`路径 ${i + 1} 访问异常:`, errorMsg || pathError);
        // 继续尝试下一个路径
        continue;
      }
    }

    // 如果所有路径都尝试失败
    throw new Error(
      `无法访问文件。请检查文件是否存在或联系管理员。文件名: ${originalFileName}`,
    );
  } catch (error) {
    try {
      const errorMessageText =
        error instanceof Error ? error.message : "获取文件内容失败";
      console.error("获取文件内容错误:", error);

      // 提供更友好、更具体的错误消息
      if (errorMessageText.includes("超时")) {
        errorMessage.value = `文件加载超时。请检查网络连接或尝试直接下载文件。`;
      } else if (errorMessageText.includes("Network")) {
        errorMessage.value = `网络连接错误。请检查您的网络设置后重试。`;
      } else if (errorMessageText.includes("URL")) {
        errorMessage.value = `无效的文件链接。请确认链接格式是否正确。`;
      } else {
        errorMessage.value = `无法读取文件内容: ${errorMessageText}`;
      }

      fileContent.value = "";
    } catch (innerError) {
      console.error("处理错误消息时发生异常:", innerError);
      errorMessage.value = "文件加载过程中发生未知错误";
    }
  } finally {
    loading.value = false;
  }
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 下载文件
const downloadFile = async () => {
  try {
    // 验证文件路径是否存在
    if (!fileUrl.value) {
      throw new Error("文件路径不存在");
    }

    // 保存原始文件名
    const originalFileName = fileUrl.value;
    console.log("下载文件原始文件名:", originalFileName);

    // 定义所有可能的文件访问路径（按优先级排序）
    const possiblePaths = [
      // 1. 直接使用getFileUrl生成的URL（规范化本地路径）
      await getFileUrl(originalFileName),
      // 2. 尝试API路径格式
      `${window.location.origin}/api/uploads/contracts/${originalFileName}`,
    ];

    // 尝试添加Supabase路径作为备选
    try {
      const { supabase } = await import("@/utils/supabase");
      const { data } = supabase.storage
        .from("contracts")
        .getPublicUrl(originalFileName);
      if (data?.publicUrl) {
        possiblePaths.push(data.publicUrl);
      }
    } catch (error) {
      console.warn("Supabase路径生成失败，跳过:", error);
    }

    // 去重路径列表，过滤无效路径
    const uniquePaths = Array.from(new Set(possiblePaths)).filter(
      (path) => path && path.startsWith("http"),
    );
    console.log("下载尝试的路径列表:", uniquePaths);

    // 依次尝试所有可能的路径
    for (let i = 0; i < uniquePaths.length; i++) {
      const currentUrl = uniquePaths[i];
      console.log(`尝试下载路径 ${i + 1}/${uniquePaths.length}:`, currentUrl);

      try {
        // 先验证URL是否可访问，减少HEAD请求超时时间
        const response = await fetch(currentUrl, {
          method: "HEAD", // 使用HEAD方法只检查头信息，不下载整个文件
          signal: AbortSignal.timeout(6000), // 减少超时时间为6秒
        });

        if (response.ok) {
          // 确保文件名有效
          let downloadFileName = fileName.value;
          if (!downloadFileName || downloadFileName.trim() === "") {
            downloadFileName = "download_file";
          }

          // URL可访问，创建下载链接
          const link = document.createElement("a");
          link.href = currentUrl;
          link.download = downloadFileName.replace(/[^a-zA-Z0-9._-]/g, "_"); // 清理文件名中的非法字符
          link.style.display = "none"; // 隐藏链接

          // 更安全的DOM操作
          try {
            document.body.appendChild(link);

            // 确保点击事件正确触发
            const clickEvent = new MouseEvent("click", {
              view: window,
              bubbles: true,
              cancelable: true,
            });

            // 同步方式触发下载，避免异步问题
            link.dispatchEvent(clickEvent);

            console.log(`路径 ${i + 1} 下载成功`);
            ElMessage.success("文件下载开始");

            // 安全移除DOM元素
            setTimeout(() => {
              try {
                document.body.removeChild(link);
              } catch (domError) {
                console.warn("移除下载链接时发生错误:", domError);
              }
            }, 100);

            return true;
          } catch (domError) {
            console.error("创建下载链接时发生错误:", domError);
            // 如果DOM操作失败，尝试直接打开链接
            window.open(currentUrl, "_blank");
            ElMessage.info("尝试在新窗口打开文件");
            return true;
          }
        } else {
          const statusText = response.statusText || `状态码 ${response.status}`;
          console.warn(
            `下载路径 ${i + 1} 不可访问，HTTP状态码:`,
            response.status,
            statusText,
          );
          // 继续尝试下一个路径
          continue;
        }
      } catch (pathError) {
        // 分类错误类型
        let errorMsg = "";
        if (pathError instanceof Error) {
          if (pathError.name === "AbortError") {
            errorMsg = `超时（6秒）`;
          } else if (
            pathError.message.includes("Network") ||
            pathError.message.includes("fetch")
          ) {
            errorMsg = `网络错误: ${pathError.message}`;
          } else {
            errorMsg = pathError.message;
          }
        }
        console.warn(`下载路径 ${i + 1} 访问异常:`, errorMsg || pathError);
        // 继续尝试下一个路径
        continue;
      }
    }

    // 如果所有路径都尝试失败，提供更详细的错误信息
    throw new Error(
      `无法下载文件。已尝试 ${uniquePaths.length} 个可能的位置。请联系管理员获取支持。`,
    );
  } catch (error) {
    console.error("下载文件失败:", error);
    const errorMessageText =
      error instanceof Error ? error.message : "下载失败";

    // 提供更友好的错误提示
    if (errorMessageText.includes("无法下载文件")) {
      ElMessage.error("文件下载失败，请稍后重试或联系管理员");
    } else if (errorMessageText.includes("路径")) {
      ElMessage.error("找不到有效文件路径，请检查文件是否存在");
    } else {
      ElMessage.error(`下载文件失败: ${errorMessageText}`);
    }

    return false;
  }
};

// 打印文件
const printFile = () => {
  window.print();
};

// 重新加载内容
const reloadContent = () => {
  fetchFileContent();
};

onMounted(async () => {
  console.log("====== Preview页面加载开始 ======");

  try {
    // 解析URL参数
    const url = decodeURIComponent((route.query.fileUrl as string) || "");
    const name = decodeURIComponent(
      (route.query.fileName as string) || "document",
    );

    console.log("从URL参数获取的fileUrl:", url);
    console.log("从URL参数获取的fileName:", name);

    if (!url) {
      console.error("URL参数中未找到fileUrl");
      ElMessage.error("无效的文件链接");
      router.back();
      return;
    }

    // 设置文件信息
    fileUrl.value = url;
    fileName.value = name;

    console.log("设置的fileUrl:", fileUrl.value);
    // 获取并打印文件URL
    const fullUrl = await getFileUrl(fileUrl.value);
    console.log("完整的文件访问URL:", fullUrl);
    console.log("设置的fileName:", fileName.value);

    // 开始获取文件内容
    fetchFileContent();
  } catch (error) {
    console.error("页面加载错误:", error);
    ElMessage.error("页面加载失败，请重试");
    loading.value = false;
  }

  console.log("====== Preview页面加载结束 ======");
});
</script>

<style scoped>
.contract-preview {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.preview-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.text-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.loading-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.text-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.content-pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background-color: #fafafa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #eaeaea;
}

.content-pre:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.error-container {
  padding: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.error-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

@media print {
  .preview-header {
    display: none !important;
  }

  .contract-preview {
    padding: 0;
    background-color: #ffffff;
  }

  .preview-content {
    box-shadow: none;
    border-radius: 0;
  }
}

@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .header-actions {
    justify-content: center;
  }

  .error-container {
    padding: 20px;
  }
}
</style>
