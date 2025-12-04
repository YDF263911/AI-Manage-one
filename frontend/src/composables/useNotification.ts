import { ElNotification } from "element-plus";

export const useNotification = () => {
  /**
   * 显示成功通知
   */
  const showSuccess = (message: string, title: string = "操作成功") => {
    ElNotification({
      title,
      message,
      type: "success",
      duration: 3000,
    });
  };

  /**
   * 显示错误通知
   */
  const showError = (message: string, title: string = "操作失败") => {
    ElNotification({
      title,
      message,
      type: "error",
      duration: 5000,
    });
  };

  /**
   * 显示警告通知
   */
  const showWarning = (message: string, title: string = "警告") => {
    ElNotification({
      title,
      message,
      type: "warning",
      duration: 4000,
    });
  };

  /**
   * 显示信息通知
   */
  const showInfo = (message: string, title: string = "提示") => {
    ElNotification({
      title,
      message,
      type: "info",
      duration: 3000,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
