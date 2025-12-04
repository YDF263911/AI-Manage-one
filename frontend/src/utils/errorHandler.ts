import { ElMessage, ElMessageBox } from "element-plus";
import { supabase } from "./supabase";

// 错误类型枚举
export enum ErrorType {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  PERMISSION = "permission",
  VALIDATION = "validation",
  SERVER = "server",
  UNKNOWN = "unknown",
}

// 错误处理选项
interface ErrorHandlerOptions {
  showMessage?: boolean;
  redirectOnAuthError?: boolean;
  logError?: boolean;
  errorType?: ErrorType;
  customMessage?: string;
}

// 错误信息接口
interface ErrorInfo {
  message: string;
  type: ErrorType;
  code?: string;
  details?: any;
}

/**
 * 解析错误信息
 */
export const parseError = (error: any): ErrorInfo => {
  // 处理null或undefined错误
  if (error === null || error === undefined) {
    return {
      message: "未知错误，请稍后重试",
      type: ErrorType.UNKNOWN,
    };
  }

  // 处理Supabase错误
  if (error?.code || error?.error || error?.status) {
    // Supabase认证错误
    if (
      error.code === "401" ||
      error.status === 401 ||
      error.code === "auth/invalid-credential" ||
      error.error?.status === 401
    ) {
      return {
        message: "认证失败，请重新登录",
        type: ErrorType.AUTHENTICATION,
        code: error.code || "401",
      };
    }

    // 权限错误
    if (
      error.code === "403" ||
      error.status === 403 ||
      error.error?.status === 403
    ) {
      return {
        message: "权限不足，无法执行此操作",
        type: ErrorType.PERMISSION,
        code: error.code || "403",
      };
    }

    // 网络错误
    if (
      error.code === "network-error" ||
      error.message?.includes("Network Error") ||
      error.message?.includes("网络错误") ||
      error.message?.includes("网络连接失败")
    ) {
      return {
        message: "网络连接失败，请检查您的网络设置",
        type: ErrorType.NETWORK,
        code: error.code || "NETWORK_ERROR",
      };
    }

    // 服务器错误
    if (
      error.code >= 500 ||
      error.status >= 500 ||
      error.error?.status >= 500
    ) {
      return {
        message: "服务器错误，请稍后重试",
        type: ErrorType.SERVER,
        code: error.code || "SERVER_ERROR",
      };
    }

    // 验证错误
    if (
      error.code === "400" ||
      error.status === 400 ||
      error.error?.status === 400 ||
      error.message?.includes("Validation")
    ) {
      return {
        message: error.message || "数据验证失败",
        type: ErrorType.VALIDATION,
        code: error.code || "VALIDATION_ERROR",
        details: error.details || error.data,
      };
    }

    // Supabase特定错误码处理
    if (error.code === "23505" || error.code === "auth/email-already-exists") {
      return {
        message: "该邮箱已被注册",
        type: ErrorType.VALIDATION,
        code: error.code,
      };
    }

    if (error.code === "auth/invalid-email") {
      return {
        message: "邮箱格式不正确",
        type: ErrorType.VALIDATION,
        code: error.code,
      };
    }

    if (error.code === "auth/user-not-found") {
      return {
        message: "用户不存在",
        type: ErrorType.AUTHENTICATION,
        code: error.code,
      };
    }
  }

  // 默认错误处理
  return {
    message: error?.message || "操作失败，请稍后重试",
    type: ErrorType.UNKNOWN,
  };
};

/**
 * 全局错误处理器
 */
export const handleError = (
  error: any,
  options: ErrorHandlerOptions = {},
): void => {
  const {
    showMessage = true,
    redirectOnAuthError = true,
    logError = true,
    customMessage,
    errorType,
  } = options;

  // 解析错误信息
  const errorInfo = errorType
    ? { ...parseError(error), type: errorType }
    : parseError(error);

  // 使用自定义消息如果提供
  const displayMessage = customMessage || errorInfo.message;

  // 记录错误
  if (logError) {
    console.error("Error caught:", error);
    console.error("Error info:", errorInfo);
  }

  // 显示错误消息
  if (showMessage) {
    ElMessage.error(displayMessage);
  }

  // 处理认证错误
  if (errorInfo.type === ErrorType.AUTHENTICATION && redirectOnAuthError) {
    // 清除认证状态
    localStorage.removeItem("token");

    // 延迟跳转，让用户看到错误消息
    setTimeout(() => {
      // 如果当前不在登录页，重定向到登录页
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }, 1500);
  }
};

/**
 * 异步操作错误捕获包装器
 */
export const catchAsyncError = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: any) => any,
  finallyHandler?: () => void,
): ((...args: Parameters<T>) => Promise<ReturnType<T> extends Promise<infer U> ? U : any>) => {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        return errorHandler(error);
      }
      handleError(error);
      return null;
    } finally {
      if (finallyHandler) {
        finallyHandler();
      }
    }
  };
};

/**
 * 显示确认对话框
 */
export const confirmAction = async (
  message: string,
  title: string = "确认操作",
  confirmButtonText: string = "确定",
  cancelButtonText: string = "取消",
): Promise<boolean> => {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText,
      cancelButtonText,
      type: "warning",
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * 处理文件上传错误
 */
export const handleUploadError = (error: any, file: File): string => {
  const errorInfo = parseError(error);

  // 文件大小错误
  if (
    errorInfo.message.includes("size") ||
    errorInfo.message.includes("大小")
  ) {
    return `文件 ${file.name} 大小超出限制`;
  }

  // 文件类型错误
  if (
    errorInfo.message.includes("type") ||
    errorInfo.message.includes("格式")
  ) {
    return `文件 ${file.name} 格式不支持`;
  }

  return `文件 ${file.name} 上传失败: ${errorInfo.message}`;
};

/**
 * 初始化全局错误处理器
 */
export const initGlobalErrorHandler = (): void => {
  // 监听未捕获的Promise错误
  window.addEventListener("unhandledrejection", (event) => {
    handleError(event.reason, {
      customMessage: "发生未处理的异步错误",
    });
  });

  // 监听未捕获的错误
  window.addEventListener("error", (event) => {
    // 只处理非null的错误
    if (event.error !== null) {
      handleError(event.error, {
        customMessage: "发生未处理的错误",
      });
    }
  });
};

/**
 * 清除认证状态并重新登录
 */
export const clearAuthAndReload = async (): Promise<void> => {
  try {
    // 清除本地存储
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // 尝试登出Supabase
    await supabase.auth.signOut();
  } catch (error) {
    console.error("清除认证状态失败:", error);
  } finally {
    // 重定向到登录页
    window.location.href = "/login";
  }
};
