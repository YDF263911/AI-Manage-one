import axios from "axios";
import { ElMessage } from "element-plus";
import { supabase } from "./supabase";

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api",
  timeout: 90000, // 增加到90秒，适配AI分析耗时
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    try {
      // 检查是否已经设置了x-user-id头，如果有则不覆盖
      if (!config.headers['x-user-id']) {
        // 优先从Supabase会话获取最新token
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!sessionError && session?.access_token) {
          const token = session.access_token;
          localStorage.setItem("token", token);
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // 回退到本地存储的token
          const token = localStorage.getItem("token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      }

      // 添加时间戳防止缓存
      if (config.method === "get") {
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
      }

      return config;
    } catch (error) {
      console.error("请求拦截器错误:", error);
      // 即使出错也继续请求，不阻止正常流程
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data } = response;

    // 统一处理成功响应，支持多种后端响应格式
    if (!data.code || data.code === 200 || data.success) {
      return data.data || data;
    }

    // 处理业务错误
    const errorMsg = data.message || "请求失败";
    ElMessage.error(errorMsg);
    return Promise.reject(new Error(errorMsg));
  },
  async (error) => {
    // 处理HTTP错误
    let message = "网络错误，请稍后重试";
    
    try {
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 401:
            message = "未授权，请重新登录";
            // 清除token
            localStorage.removeItem("token");

            // 尝试刷新会话
            try {
              const { data: refreshData, error: refreshError } =
                await supabase.auth.refreshSession();
              if (refreshData?.session?.access_token) {
                // 如果刷新成功，重试请求
                const token = refreshData.session.access_token;
                localStorage.setItem("token", token);

                // 克隆请求并更新token
                const originalRequest = error.config;
                originalRequest.headers.Authorization = `Bearer ${token}`;

                // 重试请求
                return api(originalRequest);
              }
            } catch (refreshError) {
              console.warn("刷新会话失败:", refreshError);
            }

            // 如果刷新失败或不需要刷新，延迟跳转
            setTimeout(() => {
              if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login";
              }
            }, 1500);
            break;
          case 403:
            message = "权限不足，无法执行此操作";
            break;
          case 404:
            message = "请求的资源不存在";
            break;
          case 500:
            message = "服务器内部错误，请稍后重试";
            break;
          default:
            message = data?.message || data?.error || `请求错误 (${status})`;
        }
      } else if (error.request) {
        message = "网络连接失败，请检查网络设置";
        console.error("请求发送失败:", error.request);
      } else {
        message = error.message;
        console.error("请求配置错误:", error.message);
      }

      // 避免重复显示错误消息
      if (!error.config?.noErrorToast) {
        ElMessage.error(message);
      }
    } catch (handlerError) {
      console.error("响应拦截器错误:", handlerError);
      // 发生处理错误时也显示默认错误消息
      if (!error.config?.noErrorToast) {
        ElMessage.error(message);
      }
    }

    return Promise.reject(error);
  },
);

// 通用API方法
export const apiMethods = {
  // 获取列表
  getList: (url: string, params?: any) => api.get(url, { params }),

  // 获取详情
  getDetail: (url: string, id: string | number) => api.get(`${url}/${id}`),

  // 创建
  create: (url: string, data: any) => api.post(url, data),

  // 更新
  update: (url: string, id: string | number, data: any) =>
    api.put(`${url}/${id}`, data),

  // 删除
  delete: (url: string, id: string | number) => api.delete(`${url}/${id}`),

  // 批量操作
  batchDelete: (url: string, ids: (string | number)[]) =>
    api.post(`${url}/batch-delete`, { ids }),

  // 上传文件
  upload: (
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });
  },

  // AI分析接口（特殊超时设置）
  analyze: (url: string, data: any) => 
    api.post(url, data, {
      timeout: 120000, // AI分析接口单独设置120秒超时
    }),
};

export default api;
